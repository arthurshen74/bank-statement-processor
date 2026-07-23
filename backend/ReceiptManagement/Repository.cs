namespace Backend.ReceiptManagement;

using MongoDB.Driver;
using MongoDB.Driver.GridFS;
using MongoDB.Bson;
using Backend.TransactionReporting;

public interface IReceiptRepository
{
    Task<LinkedReceipt> UploadReceiptAsync(string transactionId, Stream fileStream, string fileName, string contentType);
    Task<(byte[] FileData, string ContentType, string FileName)> DownloadReceiptAsync(string transactionId);
    Task DeleteReceiptAsync(string transactionId);
    Task<LinkedReceipt?> GetReceiptMetadataAsync(string transactionId);
}

public class ReceiptRepository : IReceiptRepository
{
    private readonly IMongoDatabase _database;
    private readonly IGridFSBucket _gridFSBucket;
    private readonly IMongoCollection<LinkedTransaction> _transactionsCollection;

    public ReceiptRepository(IMongoDatabase database)
    {
        _database = database;
        _gridFSBucket = new GridFSBucket(_database, new GridFSBucketOptions
        {
            BucketName = "receipts"
        });
        _transactionsCollection = _database.GetCollection<LinkedTransaction>("linkedTransactions");
    }

    public async Task<LinkedReceipt> UploadReceiptAsync(string transactionId, Stream fileStream, string fileName, string contentType)
    {
        // Check if transaction exists
        var transaction = await _transactionsCollection
            .Find(t => t.Id == transactionId)
            .FirstOrDefaultAsync();

        if (transaction == null)
        {
            throw new KeyNotFoundException($"Transaction with ID {transactionId} not found");
        }

        // Delete existing receipt if present
        if (transaction.Receipt != null)
        {
            await DeleteReceiptFileAsync(transaction.Receipt.FileId);
        }

        // Upload new file to GridFS
        var fileId = await _gridFSBucket.UploadFromStreamAsync(fileName, fileStream);
        var fileInfo = await _gridFSBucket.Find(Builders<GridFSFileInfo>.Filter.Eq(x => x.Id, fileId)).FirstOrDefaultAsync();

        var receipt = new LinkedReceipt
        {
            FileId = fileId.ToString(),
            FileName = fileName,
            ContentType = contentType,
            ContentLength = (ulong)fileInfo.Length
        };

        // Update transaction with receipt info
        var update = Builders<LinkedTransaction>.Update.Set(t => t.Receipt, receipt);
        await _transactionsCollection.UpdateOneAsync(t => t.Id == transactionId, update);

        return receipt;
    }

    public async Task<(byte[] FileData, string ContentType, string FileName)> DownloadReceiptAsync(string transactionId)
    {
        var transaction = await _transactionsCollection
            .Find(t => t.Id == transactionId)
            .FirstOrDefaultAsync();

        if (transaction == null || transaction.Receipt == null)
        {
            throw new KeyNotFoundException($"Receipt not found for transaction {transactionId}");
        }

        var fileId = ObjectId.Parse(transaction.Receipt.FileId);
        using var stream = new MemoryStream();
        await _gridFSBucket.DownloadToStreamAsync(fileId, stream);

        return (stream.ToArray(), transaction.Receipt.ContentType, transaction.Receipt.FileName);
    }

    public async Task DeleteReceiptAsync(string transactionId)
    {
        var transaction = await _transactionsCollection
            .Find(t => t.Id == transactionId)
            .FirstOrDefaultAsync();

        if (transaction == null)
        {
            throw new KeyNotFoundException($"Transaction with ID {transactionId} not found");
        }

        if (transaction.Receipt != null)
        {
            // Delete file from GridFS
            await DeleteReceiptFileAsync(transaction.Receipt.FileId);

            // Remove receipt from transaction
            var update = Builders<LinkedTransaction>.Update.Set(t => t.Receipt, null);
            await _transactionsCollection.UpdateOneAsync(t => t.Id == transactionId, update);
        }
    }

    public async Task<LinkedReceipt?> GetReceiptMetadataAsync(string transactionId)
    {
        var transaction = await _transactionsCollection
            .Find(t => t.Id == transactionId)
            .FirstOrDefaultAsync();

        return transaction?.Receipt;
    }

    private async Task DeleteReceiptFileAsync(string fileId)
    {
        try
        {
            var objectId = ObjectId.Parse(fileId);
            await _gridFSBucket.DeleteAsync(objectId);
        }
        catch (Exception)
        {
            // File might already be deleted, ignore error
        }
    }
}
