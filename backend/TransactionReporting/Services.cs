using MongoDB.Bson;

namespace Backend.TransactionReporting;

public interface ITransactionReportService
{
    Task<List<TransactionReportDto>> GetAllReportsAsync();
    Task<TransactionReportDto?> GetReportByIdAsync(string id);
    Task<TransactionReportDto> CreateReportAsync(CreateReportRequest request);
    Task<bool> DeleteReportAsync(string id);
    Task<bool> UpdateReportAsync(string reportId, UpdateReportRequest request);
    Task<LinkTransactionsResponse> LinkTransactionsAsync(LinkTransactionsRequest request);
    Task<ReportSummary> GetReportSummaryAsync(string reportId);
    Task<bool> UpdateTransactionCategoryAsync(string transactionId, string category);
    Task<bool> UpdateTransactionNameAsync(string transactionId, string name);
    Task<bool> BulkUpdateNamesAsync(List<string> transactionIds, string name);
    Task<bool> DeleteTransactionAsync(string transactionId);
    Task<LinkedTransactionDto> CreateManualTransactionAsync(CreateManualTransactionRequest request);
    Task<bool> UpdateTransactionAsync(string transactionId, UpdateTransactionRequest request);
}

public class TransactionReportService : ITransactionReportService
{
    private readonly ITransactionReportRepository _reportRepository;
    private readonly ILinkedTransactionRepository _transactionRepository;

    public TransactionReportService(
        ITransactionReportRepository reportRepository,
        ILinkedTransactionRepository transactionRepository)
    {
        _reportRepository = reportRepository;
        _transactionRepository = transactionRepository;
    }

    public async Task<List<TransactionReportDto>> GetAllReportsAsync()
    {
        var reports = await _reportRepository.GetAllReportsAsync();
        return reports.Select(MapReportToDto).ToList();
    }

    public async Task<TransactionReportDto?> GetReportByIdAsync(string id)
    {
        var report = await _reportRepository.GetReportByIdAsync(id);
        return report != null ? MapReportToDto(report) : null;
    }

    public async Task<TransactionReportDto> CreateReportAsync(CreateReportRequest request)
    {
        if (await _reportRepository.ReportNameExistsAsync(request.Name))
        {
            throw new InvalidOperationException($"Report with name '{request.Name}' already exists");
        }

        var report = new TransactionReport
        {
            Id = ObjectId.GenerateNewId().ToString(),
            Name = request.Name,
            Description = request.Description,
            CreatedDate = DateTime.UtcNow,
            TransactionCount = 0
        };

        var created = await _reportRepository.CreateReportAsync(report);
        return MapReportToDto(created);
    }

    public async Task<bool> DeleteReportAsync(string id)
    {
        // Delete all linked transactions first
        await _transactionRepository.DeleteTransactionsByReportIdAsync(id);

        // Then delete the report
        return await _reportRepository.DeleteReportAsync(id);
    }

    public async Task<bool> UpdateReportAsync(string reportId, UpdateReportRequest request)
    {
        var existingReport = await _reportRepository.GetReportByIdAsync(reportId);
        if (existingReport == null)
        {
            return false;
        }

        // If name is being updated, check for uniqueness
        if (!string.IsNullOrEmpty(request.Name) && request.Name != existingReport.Name)
        {
            if (await _reportRepository.ReportNameExistsAsync(request.Name))
            {
                throw new InvalidOperationException($"Report with name '{request.Name}' already exists");
            }
            existingReport.Name = request.Name;
        }

        if (request.Description != null)
        {
            existingReport.Description = request.Description;
        }

        return await _reportRepository.UpdateReportAsync(reportId, existingReport);
    }

    public async Task<LinkTransactionsResponse> LinkTransactionsAsync(LinkTransactionsRequest request)
    {
        var response = new LinkTransactionsResponse
        {
            Success = true,
            Errors = new List<string>()
        };

        // Verify report exists
        var report = await _reportRepository.GetReportByIdAsync(request.ReportId);
        if (report == null)
        {
            throw new InvalidOperationException($"Report with ID '{request.ReportId}' not found");
        }

        var transactionsToCreate = new List<LinkedTransaction>();

        foreach (var txn in request.Transactions)
        {
            try
            {
                // Validate and convert statementType
                StatementType statementType;
                try
                {
                    statementType = StatementTypeHelper.FromString(txn.StatementType);
                }
                catch (ArgumentException ex)
                {
                    response.ErrorCount++;
                    response.Errors.Add($"Transaction '{txn.Description}': {ex.Message}");
                    continue;
                }

                var linkedTransaction = new LinkedTransaction
                {
                    Id = ObjectId.GenerateNewId().ToString(),
                    ReportId = request.ReportId,
                    Date = txn.Date,
                    Description = txn.Description,
                    Amount = txn.Amount,
                    Category = null,
                    CreatedDate = DateTime.UtcNow,
                    StatementType = statementType,
                    StatementDate = txn.StatementDate,
                    PageNumber = txn.PageNumber
                };

                transactionsToCreate.Add(linkedTransaction);
                response.LinkedCount++;
            }
            catch (Exception ex)
            {
                response.ErrorCount++;
                response.Errors.Add($"Transaction '{txn.Description}': {ex.Message}");
            }
        }

        // Bulk insert
        if (transactionsToCreate.Count > 0)
        {
            await _transactionRepository.CreateTransactionsAsync(transactionsToCreate);

            // Update report transaction count
            await _reportRepository.IncrementTransactionCountAsync(request.ReportId, transactionsToCreate.Count);
        }

        if (response.ErrorCount > 0)
        {
            response.Success = false;
        }

        return response;
    }

    public async Task<ReportSummary> GetReportSummaryAsync(string reportId)
    {
        var report = await _reportRepository.GetReportByIdAsync(reportId);
        if (report == null)
        {
            throw new InvalidOperationException($"Report with ID '{reportId}' not found");
        }

        var transactions = await _transactionRepository.GetTransactionsByReportIdAsync(reportId);

        // Calculate overall totals
        var totalIncome = transactions.Where(t => t.Amount > 0).Sum(t => t.Amount);
        var totalExpenses = transactions.Where(t => t.Amount < 0).Sum(t => t.Amount);
        var netTotal = transactions.Sum(t => t.Amount);

        // Calculate breakdowns by statement type
        var girokontoTransactions = transactions.Where(t => t.StatementType == StatementType.Girokonto).ToList();
        var kreditkarteTransactions = transactions.Where(t => t.StatementType == StatementType.Kreditkarte).ToList();

        var summary = new ReportSummary
        {
            Report = MapReportToDto(report),
            TotalTransactions = transactions.Count,
            TotalIncome = totalIncome,
            TotalExpenses = totalExpenses,
            NetTotal = netTotal,
            Transactions = transactions.Select(MapTransactionToDto).ToList(),
            GirokontoSummary = new StatementTypeSummary
            {
                TransactionCount = girokontoTransactions.Count,
                TotalIncome = girokontoTransactions.Where(t => t.Amount > 0).Sum(t => t.Amount),
                TotalExpenses = girokontoTransactions.Where(t => t.Amount < 0).Sum(t => t.Amount),
                NetTotal = girokontoTransactions.Sum(t => t.Amount)
            },
            KreditkarteSummary = new StatementTypeSummary
            {
                TransactionCount = kreditkarteTransactions.Count,
                TotalIncome = kreditkarteTransactions.Where(t => t.Amount > 0).Sum(t => t.Amount),
                TotalExpenses = kreditkarteTransactions.Where(t => t.Amount < 0).Sum(t => t.Amount),
                NetTotal = kreditkarteTransactions.Sum(t => t.Amount)
            }
        };

        return summary;
    }

    public async Task<bool> UpdateTransactionCategoryAsync(string transactionId, string category)
    {
        return await _transactionRepository.UpdateTransactionCategoryAsync(transactionId, category);
    }

    public async Task<bool> UpdateTransactionNameAsync(string transactionId, string name)
    {
        return await _transactionRepository.UpdateTransactionNameAsync(transactionId, name);
    }

    public async Task<bool> BulkUpdateNamesAsync(List<string> transactionIds, string name)
    {
        return await _transactionRepository.BulkUpdateNamesAsync(transactionIds, name);
    }

    public async Task<bool> DeleteTransactionAsync(string transactionId)
    {
        // Get the transaction first to find its reportId
        var transaction = await _transactionRepository.GetTransactionByIdAsync(transactionId);
        if (transaction == null)
        {
            return false;
        }

        // Delete the transaction
        var deleted = await _transactionRepository.DeleteTransactionAsync(transactionId);

        if (deleted)
        {
            // Decrement the report's transaction count
            await _reportRepository.IncrementTransactionCountAsync(transaction.ReportId, -1);
        }

        return deleted;
    }

    public async Task<LinkedTransactionDto> CreateManualTransactionAsync(CreateManualTransactionRequest request)
    {
        // Verify report exists
        var report = await _reportRepository.GetReportByIdAsync(request.ReportId);
        if (report == null)
        {
            throw new InvalidOperationException($"Report with ID '{request.ReportId}' not found");
        }

        // Validate amount
        if (request.Amount == 0)
        {
            throw new InvalidOperationException("Amount cannot be zero");
        }

        // Create the manual transaction
        var transaction = new LinkedTransaction
        {
            Id = ObjectId.GenerateNewId().ToString(),
            ReportId = request.ReportId,
            Date = request.Date,
            Name = request.Name,
            Description = request.Description,
            Amount = request.Amount,
            Category = request.Category,
            CreatedDate = DateTime.UtcNow,
            StatementType = StatementType.Manual,
            StatementDate = null,
            PageNumber = null
        };

        var created = await _transactionRepository.CreateTransactionAsync(transaction);

        // Increment report transaction count
        await _reportRepository.IncrementTransactionCountAsync(request.ReportId, 1);

        return MapTransactionToDto(created);
    }

    public async Task<bool> UpdateTransactionAsync(string transactionId, UpdateTransactionRequest request)
    {
        // Get the transaction to verify it exists
        var transaction = await _transactionRepository.GetTransactionByIdAsync(transactionId);
        if (transaction == null)
        {
            return false;
        }

        // Validate amount if provided
        if (request.Amount.HasValue && request.Amount.Value == 0)
        {
            throw new InvalidOperationException("Amount cannot be zero");
        }

        // Update the transaction fields
        return await _transactionRepository.UpdateTransactionFieldsAsync(
            transactionId,
            request.Amount,
            request.Description
        );
    }

    private TransactionReportDto MapReportToDto(TransactionReport report)
    {
        return new TransactionReportDto
        {
            Id = report.Id,
            Name = report.Name,
            Description = report.Description,
            CreatedDate = report.CreatedDate,
            TransactionCount = report.TransactionCount
        };
    }

    private LinkedTransactionDto MapTransactionToDto(LinkedTransaction transaction)
    {
        return new LinkedTransactionDto
        {
            Id = transaction.Id,
            ReportId = transaction.ReportId,
            Date = transaction.Date,
            Name = transaction.Name,
            Description = transaction.Description,
            Amount = transaction.Amount,
            Category = transaction.Category,
            CreatedDate = transaction.CreatedDate,
            StatementType = StatementTypeHelper.ToString(transaction.StatementType),
            StatementDate = transaction.StatementDate,
            PageNumber = transaction.PageNumber,
            Receipt = transaction.Receipt
        };
    }
}
