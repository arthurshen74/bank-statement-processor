namespace Backend.Statements;

public interface IStatementService
{
    Task<List<StatementListDto>> GetAllStatementsAsync();
    Task<StatementDetailDto?> GetStatementByIdAsync(string id);
    Task<bool> DeleteStatementAsync(string id);
    Task<(byte[]? ImageData, string? ContentType)> GetImageAsync(string fileId);
}

public class StatementService : IStatementService
{
    private readonly IStatementRepository _repository;

    public StatementService(IStatementRepository repository)
    {
        _repository = repository;
    }

    public async Task<List<StatementListDto>> GetAllStatementsAsync()
    {
        var statements = await _repository.GetAllStatementsAsync();
        return statements.Select(s => s.ToListDto()).ToList();
    }

    public async Task<StatementDetailDto?> GetStatementByIdAsync(string id)
    {
        var statement = await _repository.GetStatementByIdAsync(id);
        return statement?.ToDetailDto();
    }

    public async Task<bool> DeleteStatementAsync(string id)
    {
        return await _repository.DeleteStatementAsync(id);
    }

    public async Task<(byte[]? ImageData, string? ContentType)> GetImageAsync(string fileId)
    {
        var imageData = await _repository.GetImageFromGridFSAsync(fileId);
        var contentType = await _repository.GetImageContentTypeAsync(fileId);

        return (imageData, contentType);
    }
}
