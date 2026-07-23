using MongoDB.Driver;
using MongoDB.Bson;
using Backend.TransactionReporting;
using System.Text.RegularExpressions;

namespace Backend.TransactionCategorization;

public interface ITransactionCategorizationRepository
{
    Task<bool> UpdateTransactionCategoryAsync(string id, string category);
    Task<BulkCategorizeResponse> UpdateMultipleTransactionCategoriesAsync(List<string> transactionIds, string category);
    Task<List<LinkedTransaction>> SearchTransactionsByPatternAsync(string reportId, string pattern);
    Task<CategorizationStatistics> GetCategorizationStatisticsAsync(string reportId);
}

public class TransactionCategorizationRepository : ITransactionCategorizationRepository
{
    private readonly IMongoCollection<LinkedTransaction> _transactions;

    public TransactionCategorizationRepository(IMongoDatabase database)
    {
        _transactions = database.GetCollection<LinkedTransaction>("linkedTransactions");
    }

    public async Task<bool> UpdateTransactionCategoryAsync(string id, string category)
    {
        var update = Builders<LinkedTransaction>.Update.Set(t => t.Category, category);
        var result = await _transactions.UpdateOneAsync(t => t.Id == id, update);

        return result.MatchedCount > 0;
    }

    public async Task<BulkCategorizeResponse> UpdateMultipleTransactionCategoriesAsync(
        List<string> transactionIds,
        string category)
    {
        var response = new BulkCategorizeResponse
        {
            Success = true,
            Errors = new List<string>()
        };

        foreach (var id in transactionIds)
        {
            try
            {
                var update = Builders<LinkedTransaction>.Update.Set(t => t.Category, category);
                var result = await _transactions.UpdateOneAsync(t => t.Id == id, update);

                if (result.ModifiedCount > 0)
                {
                    response.UpdatedCount++;
                }
                else
                {
                    response.FailedCount++;
                    response.Errors.Add($"Transaction {id} not found or not updated");
                }
            }
            catch (Exception ex)
            {
                response.FailedCount++;
                response.Errors.Add($"Transaction {id}: {ex.Message}");
            }
        }

        if (response.FailedCount > 0)
        {
            response.Success = false;
        }

        return response;
    }

    public async Task<List<LinkedTransaction>> SearchTransactionsByPatternAsync(string reportId, string pattern)
    {
        // Get all transactions for the report
        var allTransactions = await _transactions
            .Find(t => t.ReportId == reportId)
            .ToListAsync();

        // Filter by regex pattern
        var matchingTransactions = new List<LinkedTransaction>();

        try
        {
            var regex = new Regex(pattern, RegexOptions.IgnoreCase);

            foreach (var transaction in allTransactions)
            {
                if (regex.IsMatch(transaction.Description))
                {
                    matchingTransactions.Add(transaction);
                }
            }
        }
        catch (Exception)
        {
            // Invalid regex pattern, return empty list
            return new List<LinkedTransaction>();
        }

        return matchingTransactions;
    }

    public async Task<CategorizationStatistics> GetCategorizationStatisticsAsync(string reportId)
    {
        var allTransactions = await _transactions
            .Find(t => t.ReportId == reportId)
            .ToListAsync();

        var totalTransactions = allTransactions.Count;
        var categorizedTransactions = allTransactions.Count(t => !string.IsNullOrEmpty(t.Category));
        var uncategorizedTransactions = totalTransactions - categorizedTransactions;

        var categorizationPercentage = totalTransactions > 0
            ? (double)categorizedTransactions / totalTransactions * 100
            : 0;

        var categoryBreakdown = allTransactions
            .Where(t => !string.IsNullOrEmpty(t.Category))
            .GroupBy(t => t.Category)
            .Select(g => new CategoryBreakdown
            {
                CategoryName = g.Key!,
                TransactionCount = g.Count(),
                TotalAmount = g.Sum(t => t.Amount)
            })
            .OrderByDescending(cb => cb.TransactionCount)
            .ToList();

        return new CategorizationStatistics
        {
            TotalTransactions = totalTransactions,
            CategorizedTransactions = categorizedTransactions,
            UncategorizedTransactions = uncategorizedTransactions,
            CategorizationPercentage = Math.Round(categorizationPercentage, 2),
            CategoryBreakdown = categoryBreakdown
        };
    }
}
