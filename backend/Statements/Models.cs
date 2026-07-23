using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace Backend.Statements;

public class Statement
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public required string Id { get; set; }

    [BsonElement("statementType")]
    public required string StatementType { get; set; }  // "girokonto" or "kreditkarte"

    [BsonElement("statementProvider")]
    public required string StatementProvider { get; set; }  // e.g., "targobank"

    [BsonElement("fileName")]
    public required string FileName { get; set; }

    [BsonElement("statementDate")]
    public required string StatementDate { get; set; }  // ISO date string (YYYY-MM-DD)

    [BsonElement("statementYear")]
    public int StatementYear { get; set; }

    [BsonElement("numberOfTransactions")]
    public int NumberOfTransactions { get; set; }

    [BsonElement("ingestDate")]
    public required string IngestDate { get; set; }  // ISO datetime string

    [BsonElement("pages")]
    public List<StatementPage> Pages { get; set; } = new();
}

public class StatementPage
{
    [BsonElement("pageNumber")]
    public int PageNumber { get; set; }

    [BsonElement("pageImage")]
    [BsonRepresentation(BsonType.ObjectId)]
    public required string PageImage { get; set; }  // GridFS ObjectId

    [BsonElement("pageImageCropped")]
    [BsonRepresentation(BsonType.ObjectId)]
    public string? PageImageCropped { get; set; }  // GridFS ObjectId (null for credit cards)

    [BsonElement("numberOfTransactions")]
    public int NumberOfTransactions { get; set; }

    [BsonElement("transactions")]
    public List<StatementTransaction> Transactions { get; set; } = new();
}

public class StatementTransaction
{
    [BsonElement("bookingDate")]
    public required string BookingDate { get; set; }  // ISO date string (YYYY-MM-DD)

    [BsonElement("bookingText")]
    public required string BookingText { get; set; }

    [BsonElement("amount")]
    public double Amount { get; set; }
}

// DTOs for API responses
public class StatementListDto
{
    public required string Id { get; set; }
    public required string StatementType { get; set; }
    public required string StatementProvider { get; set; }
    public required string FileName { get; set; }
    public required string StatementDate { get; set; }
    public int StatementYear { get; set; }
    public int NumberOfTransactions { get; set; }
    public required string IngestDate { get; set; }
    public int PageCount { get; set; }
}

public class StatementDetailDto
{
    public required string Id { get; set; }
    public required string StatementType { get; set; }
    public required string StatementProvider { get; set; }
    public required string FileName { get; set; }
    public required string StatementDate { get; set; }
    public int StatementYear { get; set; }
    public int NumberOfTransactions { get; set; }
    public required string IngestDate { get; set; }
    public List<StatementPageDto> Pages { get; set; } = new();
}

public class StatementPageDto
{
    public int PageNumber { get; set; }
    public required string PageImage { get; set; }  // ObjectId as string
    public string? PageImageCropped { get; set; }  // ObjectId as string
    public int NumberOfTransactions { get; set; }
    public List<StatementTransactionDto> Transactions { get; set; } = new();
}

public class StatementTransactionDto
{
    public required string BookingDate { get; set; }
    public required string BookingText { get; set; }
    public double Amount { get; set; }
}
