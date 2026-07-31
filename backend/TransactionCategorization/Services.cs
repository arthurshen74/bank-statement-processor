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

/// <summary>
/// Generates a regex pattern from a sample Buchungstext by calling a server that
/// speaks the OpenAI Responses API. Configured entirely through the "Llm" section,
/// so it works against api.openai.com or a local runner such as LM Studio.
/// </summary>
public class PatternGeneratorService : IPatternGeneratorService
{
    private const string DefaultBaseUrl = "https://api.openai.com/v1";
    private const double DefaultTemperature = 0.0;
    private const int DefaultMaxOutputTokens = 1000;
    private const int DefaultTimeoutSeconds = 120;

    private readonly HttpClient _httpClient;
    private readonly ILogger<PatternGeneratorService> _logger;
    private readonly string _promptTemplate;

    private readonly string _baseUrl;
    private readonly string? _model;
    private readonly string? _apiKey;
    private readonly double _temperature;
    private readonly int _maxOutputTokens;

    public PatternGeneratorService(
        IConfiguration configuration,
        HttpClient httpClient,
        ILogger<PatternGeneratorService> logger,
        IWebHostEnvironment env)
    {
        _httpClient = httpClient;
        _logger = logger;

        _baseUrl = (configuration["Llm:BaseUrl"] ?? DefaultBaseUrl).TrimEnd('/');
        _model = configuration["Llm:Model"];
        _apiKey = configuration["Llm:ApiKey"];
        _temperature = ReadDouble(configuration, "Llm:Temperature", DefaultTemperature);
        _maxOutputTokens = ReadInt(configuration, "Llm:MaxOutputTokens", DefaultMaxOutputTokens);

        // A local 35B model on consumer hardware routinely exceeds HttpClient's
        // 100s default on a cold load, which surfaces as an opaque cancellation.
        _httpClient.Timeout = TimeSpan.FromSeconds(
            ReadInt(configuration, "Llm:TimeoutSeconds", DefaultTimeoutSeconds));

        // Load prompt template on startup
        var promptPath = Path.Combine(env.ContentRootPath, "derivePatternPrompt.md");
        _promptTemplate = File.ReadAllText(promptPath);
        _logger.LogInformation(
            "Pattern generator using model {Model} at {BaseUrl}; prompt template from {PromptPath}",
            _model, _baseUrl, promptPath);
    }

    private static double ReadDouble(IConfiguration configuration, string key, double fallback) =>
        double.TryParse(configuration[key], System.Globalization.NumberStyles.Float,
            System.Globalization.CultureInfo.InvariantCulture, out var value) ? value : fallback;

    private static int ReadInt(IConfiguration configuration, string key, int fallback) =>
        int.TryParse(configuration[key], out var value) ? value : fallback;

    public async Task<GeneratePatternResponse> GeneratePatternAsync(string buchungstext)
    {
        if (string.IsNullOrWhiteSpace(_model))
        {
            _logger.LogError("LLM model not configured (Llm:Model)");
            return new GeneratePatternResponse
            {
                Success = false,
                Error = "Pattern generation is not configured: no LLM model set"
            };
        }

        // OpenAI requires a key; a self-hosted runner may not. Only insist on one
        // when we are actually talking to OpenAI.
        if (string.IsNullOrWhiteSpace(_apiKey) && _baseUrl.Contains("api.openai.com", StringComparison.OrdinalIgnoreCase))
        {
            _logger.LogError("LLM API key not configured (Llm:ApiKey)");
            return new GeneratePatternResponse
            {
                Success = false,
                Error = "Pattern generation is not configured: no API key set"
            };
        }

        try
        {
            var prompt = _promptTemplate.Replace("{buchungstext}", buchungstext);

            var requestBody = new
            {
                model = _model,
                input = prompt,
                temperature = _temperature,
                max_output_tokens = _maxOutputTokens,
                stream = false
            };

            var endpoint = $"{_baseUrl}/responses";
            using var request = new HttpRequestMessage(HttpMethod.Post, endpoint)
            {
                Content = new StringContent(
                    JsonSerializer.Serialize(requestBody), Encoding.UTF8, "application/json")
            };

            // Set per-request rather than on DefaultRequestHeaders: the typed
            // HttpClient is shared, so mutating its default headers races.
            if (!string.IsNullOrWhiteSpace(_apiKey))
            {
                request.Headers.TryAddWithoutValidation("Authorization", $"Bearer {_apiKey}");
            }

            var response = await _httpClient.SendAsync(request);

            if (!response.IsSuccessStatusCode)
            {
                var errorContent = await response.Content.ReadAsStringAsync();
                _logger.LogError("LLM API error from {Endpoint}: {StatusCode} - {Error}",
                    endpoint, response.StatusCode, errorContent);
                return new GeneratePatternResponse
                {
                    Success = false,
                    Error = $"LLM API error: {response.StatusCode}"
                };
            }

            var responseContent = await response.Content.ReadAsStringAsync();
            var responseJson = JsonSerializer.Deserialize<JsonElement>(responseContent);

            var rawText = ExtractOutputText(responseJson);
            if (rawText is null)
            {
                _logger.LogError("Could not find output text in LLM response: {Response}", responseContent);
                return new GeneratePatternResponse
                {
                    Success = false,
                    Error = "LLM response contained no usable output"
                };
            }

            var pattern = CleanPattern(rawText);
            if (string.IsNullOrWhiteSpace(pattern))
            {
                _logger.LogError("LLM returned an empty pattern. Raw output: {Raw}", rawText);
                return new GeneratePatternResponse
                {
                    Success = false,
                    Error = "LLM returned an empty pattern"
                };
            }

            _logger.LogInformation("Generated pattern for buchungstext: {Pattern}", pattern);

            return new GeneratePatternResponse
            {
                Success = true,
                Pattern = pattern
            };
        }
        catch (TaskCanceledException ex)
        {
            _logger.LogError(ex, "LLM request timed out after {Timeout}s", _httpClient.Timeout.TotalSeconds);
            return new GeneratePatternResponse
            {
                Success = false,
                Error = $"LLM request timed out after {_httpClient.Timeout.TotalSeconds:0}s"
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating pattern");
            return new GeneratePatternResponse
            {
                Success = false,
                Error = ex.Message
            };
        }
    }

    /// <summary>
    /// Pull the assistant text out of a Responses API payload.
    ///
    /// "output" is an array of typed items, and for a reasoning model the
    /// reasoning item comes first — so indexing output[0] blindly finds an item
    /// with no content[].text. Locate the message item by type instead, and only
    /// fall back to positional access for servers that omit the type fields.
    /// </summary>
    private static string? ExtractOutputText(JsonElement responseJson)
    {
        if (!responseJson.TryGetProperty("output", out var output) ||
            output.ValueKind != JsonValueKind.Array)
        {
            return null;
        }

        // Preferred: the item explicitly typed as a message.
        foreach (var item in output.EnumerateArray())
        {
            if (!item.TryGetProperty("type", out var itemType) ||
                itemType.GetString() != "message")
            {
                continue;
            }

            var text = ExtractTextFromContent(item, requireOutputTextType: true)
                    ?? ExtractTextFromContent(item, requireOutputTextType: false);
            if (text is not null)
            {
                return text;
            }
        }

        // Fallback: first item exposing any content[].text at all.
        foreach (var item in output.EnumerateArray())
        {
            var text = ExtractTextFromContent(item, requireOutputTextType: false);
            if (text is not null)
            {
                return text;
            }
        }

        return null;
    }

    private static string? ExtractTextFromContent(JsonElement item, bool requireOutputTextType)
    {
        if (!item.TryGetProperty("content", out var content) ||
            content.ValueKind != JsonValueKind.Array)
        {
            return null;
        }

        foreach (var part in content.EnumerateArray())
        {
            if (requireOutputTextType &&
                (!part.TryGetProperty("type", out var partType) ||
                 partType.GetString() != "output_text"))
            {
                continue;
            }

            if (part.TryGetProperty("text", out var text) &&
                text.ValueKind == JsonValueKind.String)
            {
                var value = text.GetString();
                if (!string.IsNullOrWhiteSpace(value))
                {
                    return value;
                }
            }
        }

        return null;
    }

    /// <summary>
    /// Strip the wrappers a model puts around a regex: reasoning blocks, code
    /// fences, then the /.../ delimiters the prompt's own example uses.
    /// </summary>
    private static string CleanPattern(string raw)
    {
        // Thinking models can emit reasoning inline in the output text.
        var pattern = System.Text.RegularExpressions.Regex.Replace(
            raw, @"<think>.*?</think>", string.Empty,
            System.Text.RegularExpressions.RegexOptions.Singleline |
            System.Text.RegularExpressions.RegexOptions.IgnoreCase).Trim();

        // ```regex ... ``` or plain ``` ... ```
        var fenced = System.Text.RegularExpressions.Regex.Match(
            pattern, @"^```[a-zA-Z]*\s*\n?(.*?)\n?```$",
            System.Text.RegularExpressions.RegexOptions.Singleline);
        if (fenced.Success)
        {
            pattern = fenced.Groups[1].Value.Trim();
        }

        // Remove leading/trailing slashes if present (common in regex notation)
        if (pattern.Length > 1 && pattern.StartsWith("/") && pattern.EndsWith("/"))
        {
            pattern = pattern.Substring(1, pattern.Length - 2);
        }

        return pattern.Trim();
    }
}
