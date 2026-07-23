namespace Backend.Statements;

public static class MappingExtensions
{
    public static StatementListDto ToListDto(this Statement statement)
    {
        return new StatementListDto
        {
            Id = statement.Id,
            StatementType = statement.StatementType,
            StatementProvider = statement.StatementProvider,
            FileName = statement.FileName,
            StatementDate = statement.StatementDate,
            StatementYear = statement.StatementYear,
            NumberOfTransactions = statement.NumberOfTransactions,
            IngestDate = statement.IngestDate,
            PageCount = statement.Pages.Count
        };
    }

    public static StatementDetailDto ToDetailDto(this Statement statement)
    {
        return new StatementDetailDto
        {
            Id = statement.Id,
            StatementType = statement.StatementType,
            StatementProvider = statement.StatementProvider,
            FileName = statement.FileName,
            StatementDate = statement.StatementDate,
            StatementYear = statement.StatementYear,
            NumberOfTransactions = statement.NumberOfTransactions,
            IngestDate = statement.IngestDate,
            Pages = statement.Pages.Select(p => p.ToDto()).ToList()
        };
    }

    public static StatementPageDto ToDto(this StatementPage page)
    {
        return new StatementPageDto
        {
            PageNumber = page.PageNumber,
            PageImage = page.PageImage,
            PageImageCropped = page.PageImageCropped,
            NumberOfTransactions = page.NumberOfTransactions,
            Transactions = page.Transactions.Select(t => t.ToDto()).ToList()
        };
    }

    public static StatementTransactionDto ToDto(this StatementTransaction transaction)
    {
        return new StatementTransactionDto
        {
            BookingDate = transaction.BookingDate,
            BookingText = transaction.BookingText,
            Amount = transaction.Amount
        };
    }
}
