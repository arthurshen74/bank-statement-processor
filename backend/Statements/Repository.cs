using MongoDB.Driver;
using MongoDB.Driver.GridFS;
using MongoDB.Bson;

namespace Backend.Statements;

public interface IStatementRepository
{
    Task<List<Statement>> GetAllStatementsAsync();
    Task<Statement?> GetStatementByIdAsync(string id);
    Task<bool> DeleteStatementAsync(string id);
    Task<byte[]?> GetImageFromGridFSAsync(string fileId);
    Task<string?> GetImageContentTypeAsync(string fileId);
}

public class StatementRepository : IStatementRepository
{
    private readonly IMongoCollection<Statement> _statements;
    private readonly GridFSBucket _gridFSBucket;

    public StatementRepository(IMongoDatabase database)
    {
        _statements = database.GetCollection<Statement>("transactionStatements");
        _gridFSBucket = new GridFSBucket(database);
    }

    public async Task<List<Statement>> GetAllStatementsAsync()
    {
        return await _statements
            .Find(_ => true)
            .SortByDescending(s => s.IngestDate)
            .ToListAsync();
    }

    public async Task<Statement?> GetStatementByIdAsync(string id)
    {
        if (!ObjectId.TryParse(id, out var objectId))
        {
            return null;
        }

        return await _statements
            .Find(s => s.Id == id)
            .FirstOrDefaultAsync();
    }

    public async Task<bool> DeleteStatementAsync(string id)
    {
        if (!ObjectId.TryParse(id, out var objectId))
        {
            return false;
        }

        // Get statement to find associated images
        var statement = await GetStatementByIdAsync(id);
        if (statement == null)
        {
            return false;
        }

        // Delete all associated GridFS images
        foreach (var page in statement.Pages)
        {
            try
            {
                if (ObjectId.TryParse(page.PageImage, out var pageImageId))
                {
                    await _gridFSBucket.DeleteAsync(pageImageId);
                }

                if (!string.IsNullOrEmpty(page.PageImageCropped) &&
                    ObjectId.TryParse(page.PageImageCropped, out var croppedImageId))
                {
                    await _gridFSBucket.DeleteAsync(croppedImageId);
                }
            }
            catch (GridFSFileNotFoundException)
            {
                // Image already deleted or doesn't exist, continue
            }
        }

        // Delete the statement document
        var result = await _statements.DeleteOneAsync(s => s.Id == id);
        return result.DeletedCount > 0;
    }

    public async Task<byte[]?> GetImageFromGridFSAsync(string fileId)
    {
        if (!ObjectId.TryParse(fileId, out var objectId))
        {
            return null;
        }

        try
        {
            var bytes = await _gridFSBucket.DownloadAsBytesAsync(objectId);
            return bytes;
        }
        catch (GridFSFileNotFoundException)
        {
            return null;
        }
    }

    public async Task<string?> GetImageContentTypeAsync(string fileId)
    {
        if (!ObjectId.TryParse(fileId, out var objectId))
        {
            return null;
        }

        try
        {
            var fileInfo = await _gridFSBucket.FindAsync(
                Builders<GridFSFileInfo>.Filter.Eq(f => f.Id, objectId)
            );
            var file = await fileInfo.FirstOrDefaultAsync();

            if (file?.Metadata != null && file.Metadata.Contains("contentType"))
            {
                return file.Metadata["contentType"].AsString;
            }

            // Default to PNG if no content type found
            return "image/png";
        }
        catch (GridFSFileNotFoundException)
        {
            return null;
        }
    }
}
