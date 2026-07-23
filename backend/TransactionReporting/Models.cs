namespace Backend.TransactionReporting;

// Statement Type Enum
public enum StatementType
{
    Girokonto,
    Kreditkarte,
    Manual
}

// Helper class for enum conversion
public static class StatementTypeHelper
{
    public static StatementType FromString(string value)
    {
        return value?.ToLower() switch
        {
            "girokonto" => StatementType.Girokonto,
            "kreditkarte" => StatementType.Kreditkarte,
            "manual" => StatementType.Manual,
            _ => throw new ArgumentException($"Invalid statement type: {value}")
        };
    }

    public static string ToString(StatementType type)
    {
        return type switch
        {
            StatementType.Girokonto => "girokonto",
            StatementType.Kreditkarte => "kreditkarte",
            StatementType.Manual => "manual",
            _ => throw new ArgumentException($"Invalid statement type: {type}")
        };
    }
}

public class TransactionReport
{
    public required string Id { get; set; }  // MongoDB ObjectId
    public required string Name { get; set; }
    public string? Description { get; set; }
    public DateTime CreatedDate { get; set; }
    public int TransactionCount { get; set; }
}

public class LinkedReceipt
{
    public required string FileId { get; set; }      // GridFS ObjectId
    public required string FileName { get; set; }    // Original filename
    public required string ContentType { get; set; } // MIME type
    public required ulong ContentLength { get; set; } // File size in bytes
}

public class LinkedTransaction
{
    public required string Id { get; set; }  // MongoDB ObjectId
    public required string ReportId { get; set; }  // Foreign key
    public required string Date { get; set; }  // YYYY-MM-DD format
    public string Name { get; set; } = "";  // Transaction name
    public required string Description { get; set; }
    public required decimal Amount { get; set; }
    public string? Category { get; set; }
    public DateTime CreatedDate { get; set; }
    public StatementType StatementType { get; set; }  // Enum
    public string? StatementDate { get; set; }
    public int? PageNumber { get; set; }
    public LinkedReceipt? Receipt { get; set; }  // Nullable receipt
}

// DTOs for API
public class TransactionReportDto
{
    public required string Id { get; set; }
    public required string Name { get; set; }
    public string? Description { get; set; }
    public DateTime CreatedDate { get; set; }
    public int TransactionCount { get; set; }
}

public class LinkedTransactionDto
{
    public required string Id { get; set; }
    public required string ReportId { get; set; }
    public required string Date { get; set; }
    public string Name { get; set; } = "";  // Transaction name
    public required string Description { get; set; }
    public required decimal Amount { get; set; }
    public string? Category { get; set; }
    public DateTime CreatedDate { get; set; }
    public required string StatementType { get; set; }  // String for API (girokonto/kreditkarte/manual)
    public string? StatementDate { get; set; }
    public int? PageNumber { get; set; }
    public LinkedReceipt? Receipt { get; set; }  // Nullable receipt
}

public class CreateReportRequest
{
    public required string Name { get; set; }
    public string? Description { get; set; }
}

public class UpdateReportRequest
{
    public string? Name { get; set; }
    public string? Description { get; set; }
}

public class LinkTransactionsRequest
{
    public required string ReportId { get; set; }
    public required List<TransactionToLink> Transactions { get; set; }
}

public class TransactionToLink
{
    public required string Date { get; set; }  // YYYY-MM-DD
    public required string Description { get; set; }
    public required decimal Amount { get; set; }
    public required string StatementType { get; set; }  // "girokonto" or "kreditkarte" or "manual"
    public string? StatementDate { get; set; }
    public int? PageNumber { get; set; }
}

public class LinkTransactionsResponse
{
    public bool Success { get; set; }
    public int LinkedCount { get; set; }
    public int SkippedCount { get; set; }
    public int ErrorCount { get; set; }
    public List<string>? Errors { get; set; }
}

public class ReportSummary
{
    public required TransactionReportDto Report { get; set; }
    public int TotalTransactions { get; set; }
    public decimal TotalIncome { get; set; }  // Sum of positive amounts
    public decimal TotalExpenses { get; set; }  // Sum of negative amounts
    public decimal NetTotal { get; set; }
    public required List<LinkedTransactionDto> Transactions { get; set; }
    public required StatementTypeSummary GirokontoSummary { get; set; }  // Breakdown by type
    public required StatementTypeSummary KreditkarteSummary { get; set; }  // Breakdown by type
}

// Summary by statement type
public class StatementTypeSummary
{
    public int TransactionCount { get; set; }
    public decimal TotalIncome { get; set; }
    public decimal TotalExpenses { get; set; }
    public decimal NetTotal { get; set; }
}

public class UpdateTransactionCategoryRequest
{
    public required string Category { get; set; }
}

public class UpdateTransactionNameRequest
{
    public required string Name { get; set; }
}

public class BulkUpdateNamesRequest
{
    public required List<string> TransactionIds { get; set; }
    public required string Name { get; set; }
}

public class CreateManualTransactionRequest
{
    public required string ReportId { get; set; }
    public required string Date { get; set; }  // YYYY-MM-DD format
    public required string Name { get; set; }
    public required string Description { get; set; }
    public required decimal Amount { get; set; }
    public string? Category { get; set; }
}

public class UpdateTransactionRequest
{
    public decimal? Amount { get; set; }
    public string? Description { get; set; }
}
