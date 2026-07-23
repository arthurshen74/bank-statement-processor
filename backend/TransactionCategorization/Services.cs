using Backend.TransactionReporting;
using System.Text.Json;
using System.Text;

namespace Backend.TransactionCategorization;

public interface ITransactionCategorizationService
{
    Task<bool> CategorizeTransactionAsync(string transactionId, string category);
    Task<BulkCategorizeResponse> CategorizeMultipleTransactionsAsync(List<string> transactionIds, string category);
    Task<SearchSimilarTransactionsResponse> SearchSimilarTransactionsAsync(string reportId, string pattern);
    Task<CategorizationStatistics> GetCategorizationStatisticsAsync(string reportId);
}

public class TransactionCategorizationService : ITransactionCategorizationService
{
    private readonly ITransactionCategorizationRepository _repository;

    public TransactionCategorizationService(ITransactionCategorizationRepository repository)
    {
        _repository = repository;
    }

    public async Task<bool> CategorizeTransactionAsync(string transactionId, string category)
    {
        return await _repository.UpdateTransactionCategoryAsync(transactionId, category);
    }

    public async Task<BulkCategorizeResponse> CategorizeMultipleTransactionsAsync(
        List<string> transactionIds,
        string category)
    {
        return await _repository.UpdateMultipleTransactionCategoriesAsync(transactionIds, category);
    }

    public async Task<SearchSimilarTransactionsResponse> SearchSimilarTransactionsAsync(
        string reportId,
        string pattern)
    {
        try
        {
            var matchingTransactions = await _repository.SearchTransactionsByPatternAsync(reportId, pattern);

            var transactionDtos = matchingTransactions.Select(t => new SimilarTransactionDto
            {
                Id = t.Id,
                Date = t.Date,
                Description = t.Description,
                Amount = t.Amount,
                Category = t.Category,
                StatementType = StatementTypeHelper.ToString(t.StatementType),
                IsMatch = true
            }).ToList();

            return new SearchSimilarTransactionsResponse
            {
                Success = true,
                MatchCount = transactionDtos.Count,
                Transactions = transactionDtos
            };
        }
        catch (Exception ex)
        {
            return new SearchSimilarTransactionsResponse
            {
                Success = false,
                MatchCount = 0,
                Transactions = new List<SimilarTransactionDto>(),
                Error = ex.Message
            };
        }
    }

    public async Task<CategorizationStatistics> GetCategorizationStatisticsAsync(string reportId)
    {
        return await _repository.GetCategorizationStatisticsAsync(reportId);
    }
}

public interface IPatternGeneratorService
{
    Task<GeneratePatternResponse> GeneratePatternAsync(string buchungstext);
}

public class PatternGeneratorService : IPatternGeneratorService
{
    private readonly IConfiguration _configuration;
    private readonly HttpClient _httpClient;
    private readonly ILogger<PatternGeneratorService> _logger;
    private readonly string _promptTemplate;

    public PatternGeneratorService(
        IConfiguration configuration,
        HttpClient httpClient,
        ILogger<PatternGeneratorService> logger,
        IWebHostEnvironment env)
    {
        _configuration = configuration;
        _httpClient = httpClient;
        _logger = logger;

        // Load prompt template on startup
        var promptPath = Path.Combine(env.ContentRootPath, "derivePatternPrompt.md");
        _promptTemplate = File.ReadAllText(promptPath);
        _logger.LogInformation("Loaded prompt template from {PromptPath}", promptPath);
    }

    public async Task<GeneratePatternResponse> GeneratePatternAsync(string buchungstext)
    {
        try
        {
            var apiKey = _configuration["OPENAI_API_KEY"];
            if (string.IsNullOrEmpty(apiKey))
            {
                _logger.LogError("OpenAI API key not configured");
                return new GeneratePatternResponse
                {
                    Success = false,
                    Error = "OpenAI API key not configured"
                };
            }

            var prompt = _promptTemplate.Replace("{buchungstext}", buchungstext);

            var requestBody = new
            {
                model = "gpt-4.1-2025-04-14",
                input = prompt,
                temperature = 0.0,
                max_output_tokens = 1000
            };

            var jsonContent = JsonSerializer.Serialize(requestBody);
            var httpContent = new StringContent(jsonContent, Encoding.UTF8, "application/json");

            _httpClient.DefaultRequestHeaders.Clear();
            _httpClient.DefaultRequestHeaders.Add("Authorization", $"Bearer {apiKey}");

            var response = await _httpClient.PostAsync(
                "https://api.openai.com/v1/responses",
                httpContent);

            if (!response.IsSuccessStatusCode)
            {
                var errorContent = await response.Content.ReadAsStringAsync();
                _logger.LogError($"OpenAI API error: {response.StatusCode} - {errorContent}");
                return new GeneratePatternResponse
                {
                    Success = false,
                    Error = $"OpenAI API error: {response.StatusCode}"
                };
            }

            var responseContent = await response.Content.ReadAsStringAsync();
            var responseJson = JsonSerializer.Deserialize<JsonElement>(responseContent);

            var pattern = responseJson
                .GetProperty("output")[0]
                .GetProperty("content")[0]
                .GetProperty("text")
                .GetString()?.Trim() ?? "";

            // Remove leading/trailing slashes if present (common in regex notation)
            if (pattern.StartsWith("/") && pattern.EndsWith("/"))
            {
                pattern = pattern.Substring(1, pattern.Length - 2);
            }

            _logger.LogInformation($"Generated pattern for buchungstext: {pattern}");

            return new GeneratePatternResponse
            {
                Success = true,
                Pattern = pattern
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating pattern with ChatGPT");
            return new GeneratePatternResponse
            {
                Success = false,
                Error = ex.Message
            };
        }
    }
}
