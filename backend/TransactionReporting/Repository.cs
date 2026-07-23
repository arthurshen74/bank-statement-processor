using MongoDB.Driver;
using MongoDB.Driver.GridFS;
using MongoDB.Bson;

namespace Backend.TransactionReporting;

public interface ITransactionReportRepository
{
    Task<List<TransactionReport>> GetAllReportsAsync();
    Task<TransactionReport?> GetReportByIdAsync(string id);
    Task<TransactionReport?> GetReportByNameAsync(string name);
    Task<TransactionReport> CreateReportAsync(TransactionReport report);
    Task<bool> UpdateReportAsync(string id, TransactionReport report);
    Task<bool> DeleteReportAsync(string id);
    Task<bool> ReportNameExistsAsync(string name);
    Task<bool> IncrementTransactionCountAsync(string reportId, int delta);
}

public class TransactionReportRepository : ITransactionReportRepository
{
    private readonly IMongoCollection<TransactionReport> _reports;

    public TransactionReportRepository(IMongoDatabase database)
    {
        _reports = database.GetCollection<TransactionReport>("transactionReports");
    }

    public async Task<List<TransactionReport>> GetAllReportsAsync()
    {
        return await _reports.Find(_ => true)
            .SortByDescending(r => r.CreatedDate)
            .ToListAsync();
    }

    public async Task<TransactionReport?> GetReportByIdAsync(string id)
    {
        return await _reports.Find(r => r.Id == id).FirstOrDefaultAsync();
    }

    public async Task<TransactionReport?> GetReportByNameAsync(string name)
    {
        return await _reports.Find(r => r.Name == name).FirstOrDefaultAsync();
    }

    public async Task<TransactionReport> CreateReportAsync(TransactionReport report)
    {
        await _reports.InsertOneAsync(report);
        return report;
    }

    public async Task<bool> UpdateReportAsync(string id, TransactionReport report)
    {
        var update = Builders<TransactionReport>.Update
            .Set(r => r.Name, report.Name)
            .Set(r => r.Description, report.Description);
        var result = await _reports.UpdateOneAsync(r => r.Id == id, update);
        return result.ModifiedCount > 0;
    }

    public async Task<bool> DeleteReportAsync(string id)
    {
        var result = await _reports.DeleteOneAsync(r => r.Id == id);
        return result.DeletedCount > 0;
    }

    public async Task<bool> ReportNameExistsAsync(string name)
    {
        var count = await _reports.CountDocumentsAsync(r => r.Name == name);
        return count > 0;
    }

    public async Task<bool> IncrementTransactionCountAsync(string reportId, int delta)
    {
        var update = Builders<TransactionReport>.Update.Inc(r => r.TransactionCount, delta);
        var result = await _reports.UpdateOneAsync(r => r.Id == reportId, update);
        return result.ModifiedCount > 0;
    }
}

public interface ILinkedTransactionRepository
{
    Task<List<LinkedTransaction>> GetTransactionsByReportIdAsync(string reportId);
    Task<List<LinkedTransaction>> GetTransactionsByReportIdAndTypeAsync(string reportId, StatementType statementType);
    Task<LinkedTransaction?> GetTransactionByIdAsync(string id);
    Task<LinkedTransaction> CreateTransactionAsync(LinkedTransaction transaction);
    Task<List<LinkedTransaction>> CreateTransactionsAsync(List<LinkedTransaction> transactions);
    Task<bool> UpdateTransactionAsync(string id, LinkedTransaction transaction);
    Task<bool> UpdateTransactionCategoryAsync(string id, string category);
    Task<bool> UpdateTransactionNameAsync(string id, string name);
    Task<bool> BulkUpdateNamesAsync(List<string> transactionIds, string name);
    Task<bool> UpdateTransactionFieldsAsync(string id, decimal? amount, string? description);
    Task<bool> DeleteTransactionAsync(string id);
    Task<bool> DeleteTransactionsByReportIdAsync(string reportId);
    Task<int> GetTransactionCountByReportIdAsync(string reportId);
    Task<int> GetTransactionCountByReportIdAndTypeAsync(string reportId, StatementType statementType);
}

public class LinkedTransactionRepository : ILinkedTransactionRepository
{
    private readonly IMongoCollection<LinkedTransaction> _transactions;
    private readonly IGridFSBucket _gridFSBucket;

    public LinkedTransactionRepository(IMongoDatabase database)
    {
        _transactions = database.GetCollection<LinkedTransaction>("linkedTransactions");
        _gridFSBucket = new GridFSBucket(database, new GridFSBucketOptions
        {
            BucketName = "receipts"
        });
    }

    public async Task<List<LinkedTransaction>> GetTransactionsByReportIdAsync(string reportId)
    {
        return await _transactions.Find(t => t.ReportId == reportId)
            .SortBy(t => t.Date)
            .ToListAsync();
    }

    public async Task<List<LinkedTransaction>> GetTransactionsByReportIdAndTypeAsync(
        string reportId,
        StatementType statementType)
    {
        return await _transactions.Find(t => t.ReportId == reportId && t.StatementType == statementType)
            .SortBy(t => t.Date)
            .ToListAsync();
    }

    public async Task<LinkedTransaction?> GetTransactionByIdAsync(string id)
    {
        return await _transactions.Find(t => t.Id == id).FirstOrDefaultAsync();
    }

    public async Task<LinkedTransaction> CreateTransactionAsync(LinkedTransaction transaction)
    {
        await _transactions.InsertOneAsync(transaction);
        return transaction;
    }

    public async Task<List<LinkedTransaction>> CreateTransactionsAsync(List<LinkedTransaction> transactions)
    {
        if (transactions.Count > 0)
        {
            await _transactions.InsertManyAsync(transactions);
        }
        return transactions;
    }

    public async Task<bool> UpdateTransactionAsync(string id, LinkedTransaction transaction)
    {
        var update = Builders<LinkedTransaction>.Update
            .Set(t => t.ReportId, transaction.ReportId)
            .Set(t => t.Date, transaction.Date)
            .Set(t => t.Description, transaction.Description)
            .Set(t => t.Amount, transaction.Amount)
            .Set(t => t.Category, transaction.Category);
        var result = await _transactions.UpdateOneAsync(t => t.Id == id, update);
        return result.ModifiedCount > 0;
    }

    public async Task<bool> UpdateTransactionCategoryAsync(string id, string category)
    {
        var update = Builders<LinkedTransaction>.Update.Set(t => t.Category, category);
        var result = await _transactions.UpdateOneAsync(t => t.Id == id, update);
        return result.ModifiedCount > 0;
    }

    public async Task<bool> UpdateTransactionNameAsync(string id, string name)
    {
        var update = Builders<LinkedTransaction>.Update.Set(t => t.Name, name);
        var result = await _transactions.UpdateOneAsync(t => t.Id == id, update);
        return result.ModifiedCount > 0;
    }

    public async Task<bool> BulkUpdateNamesAsync(List<string> transactionIds, string name)
    {
        var filter = Builders<LinkedTransaction>.Filter.In(t => t.Id, transactionIds);
        var update = Builders<LinkedTransaction>.Update.Set(t => t.Name, name);
        var result = await _transactions.UpdateManyAsync(filter, update);
        return result.ModifiedCount > 0;
    }

    public async Task<bool> UpdateTransactionFieldsAsync(string id, decimal? amount, string? description)
    {
        var filter = Builders<LinkedTransaction>.Filter.Eq(t => t.Id, id);
        var updateBuilder = Builders<LinkedTransaction>.Update;
        var updates = new List<UpdateDefinition<LinkedTransaction>>();

        if (amount.HasValue)
        {
            updates.Add(updateBuilder.Set(t => t.Amount, amount.Value));
        }

        if (description != null)
        {
            updates.Add(updateBuilder.Set(t => t.Description, description));
        }

        if (updates.Count == 0)
        {
            return false;
        }

        var combinedUpdate = updateBuilder.Combine(updates);
        var result = await _transactions.UpdateOneAsync(filter, combinedUpdate);
        return result.ModifiedCount > 0;
    }

    public async Task<bool> DeleteTransactionAsync(string id)
    {
        var transaction = await _transactions.Find(t => t.Id == id).FirstOrDefaultAsync();
        if (transaction == null)
        {
            return false;
        }
        var receiptId = transaction.Receipt?.FileId;
        if (receiptId != null)
        {
            await _gridFSBucket.DeleteAsync(ObjectId.Parse(receiptId));
        }
        var result = await _transactions.DeleteOneAsync(t => t.Id == id);
        return result.DeletedCount > 0;
    }

    public async Task<bool> DeleteTransactionsByReportIdAsync(string reportId)
    {
        var fileIds = await _transactions.Find(t => t.ReportId == reportId && t.Receipt != null)
            .Project(t => t.Receipt!.FileId)
            .ToListAsync();
        foreach (var fileId in fileIds)
        {
            await _gridFSBucket.DeleteAsync(ObjectId.Parse(fileId));
        }
        var result = await _transactions.DeleteManyAsync(t => t.ReportId == reportId);
        return result.DeletedCount > 0;
    }

    public async Task<int> GetTransactionCountByReportIdAsync(string reportId)
    {
        var count = await _transactions.CountDocumentsAsync(t => t.ReportId == reportId);
        return (int)count;
    }

    public async Task<int> GetTransactionCountByReportIdAndTypeAsync(
        string reportId,
        StatementType statementType)
    {
        var count = await _transactions.CountDocumentsAsync(
            t => t.ReportId == reportId && t.StatementType == statementType);
        return (int)count;
    }
}
