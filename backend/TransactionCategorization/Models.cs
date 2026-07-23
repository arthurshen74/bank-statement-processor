using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace Backend.TransactionCategorization;

// Request to categorize a single transaction
public class CategorizeTransactionRequest
{
    public string Category { get; set; } = string.Empty;
}

// Request to categorize multiple transactions
public class BulkCategorizeRequest
{
    public List<string> TransactionIds { get; set; } = new();
    public string Category { get; set; } = string.Empty;
}

// Response for bulk categorization
public class BulkCategorizeResponse
{
    public bool Success { get; set; }
    public int UpdatedCount { get; set; }
    public int FailedCount { get; set; }
    public List<string> Errors { get; set; } = new();
}

// Request to search for similar transactions using regex
public class SearchSimilarTransactionsRequest
{
    public string ReportId { get; set; } = string.Empty;
    public string Pattern { get; set; } = string.Empty;
}

// Response with matching transactions
public class SearchSimilarTransactionsResponse
{
    public bool Success { get; set; }
    public int MatchCount { get; set; }
    public List<SimilarTransactionDto> Transactions { get; set; } = new();
    public string? Error { get; set; }
}

// Similar transaction DTO
public class SimilarTransactionDto
{
    public string Id { get; set; } = string.Empty;
    public string Date { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public string? Category { get; set; }
    public string StatementType { get; set; } = string.Empty;
    public bool IsMatch { get; set; }
}

// Request to generate regex pattern via ChatGPT
public class GeneratePatternRequest
{
    public string Buchungstext { get; set; } = string.Empty;
}

// Response with generated pattern
public class GeneratePatternResponse
{
    public bool Success { get; set; }
    public string Pattern { get; set; } = string.Empty;
    public string? Error { get; set; }
}

// Categorization statistics for a report
public class CategorizationStatistics
{
    public int TotalTransactions { get; set; }
    public int CategorizedTransactions { get; set; }
    public int UncategorizedTransactions { get; set; }
    public double CategorizationPercentage { get; set; }
    public List<CategoryBreakdown> CategoryBreakdown { get; set; } = new();
}

// Breakdown by category
public class CategoryBreakdown
{
    public string CategoryName { get; set; } = string.Empty;
    public int TransactionCount { get; set; }
    public decimal TotalAmount { get; set; }
}
