using MongoDB.Driver;

namespace Backend.CategoryManagement;

public interface ICategoryRepository
{
    Task<List<Category>> GetAllCategoriesAsync();
    Task<Category?> GetCategoryByIdAsync(string id);
    Task<Category?> GetCategoryByNameAsync(string name);
    Task<Category> CreateCategoryAsync(Category category);
    Task<bool> UpdateCategoryAsync(string id, Category category);
    Task<bool> DeleteCategoryAsync(string id);
    Task<bool> CategoryNameExistsAsync(string name);
    Task<bool> UpdateUsageCountAsync(string name, int delta);
}

public class CategoryRepository : ICategoryRepository
{
    private readonly IMongoCollection<Category> _categories;

    public CategoryRepository(IMongoDatabase database)
    {
        _categories = database.GetCollection<Category>("categories");
    }

    public async Task<List<Category>> GetAllCategoriesAsync()
    {
        return await _categories.Find(_ => true)
            .SortBy(c => c.Name)
            .ToListAsync();
    }

    public async Task<Category?> GetCategoryByIdAsync(string id)
    {
        return await _categories.Find(c => c.Id == id).FirstOrDefaultAsync();
    }

    public async Task<Category?> GetCategoryByNameAsync(string name)
    {
        return await _categories.Find(c => c.Name == name).FirstOrDefaultAsync();
    }

    public async Task<Category> CreateCategoryAsync(Category category)
    {
        await _categories.InsertOneAsync(category);
        return category;
    }

    public async Task<bool> UpdateCategoryAsync(string id, Category category)
    {
        var result = await _categories.ReplaceOneAsync(c => c.Id == id, category);
        return result.ModifiedCount > 0;
    }

    public async Task<bool> DeleteCategoryAsync(string id)
    {
        var result = await _categories.DeleteOneAsync(c => c.Id == id);
        return result.DeletedCount > 0;
    }

    public async Task<bool> CategoryNameExistsAsync(string name)
    {
        var count = await _categories.CountDocumentsAsync(c => c.Name == name);
        return count > 0;
    }

    public async Task<bool> UpdateUsageCountAsync(string name, int delta)
    {
        var update = Builders<Category>.Update.Inc(c => c.UsageCount, delta);
        var result = await _categories.UpdateOneAsync(c => c.Name == name, update);
        return result.ModifiedCount > 0;
    }
}
