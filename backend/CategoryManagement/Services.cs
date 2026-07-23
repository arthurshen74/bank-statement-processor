using MongoDB.Bson;

namespace Backend.CategoryManagement;

public interface ICategoryService
{
    Task<List<CategoryDto>> GetAllCategoriesAsync();
    Task<CategoryDto?> GetCategoryByIdAsync(string id);
    Task<CategoryDto> CreateCategoryAsync(CreateCategoryRequest request);
    Task<CategoryDto?> UpdateCategoryAsync(string id, UpdateCategoryRequest request);
    Task<bool> DeleteCategoryAsync(string id);
}

public class CategoryService : ICategoryService
{
    private readonly ICategoryRepository _categoryRepository;

    public CategoryService(ICategoryRepository categoryRepository)
    {
        _categoryRepository = categoryRepository;
    }

    public async Task<List<CategoryDto>> GetAllCategoriesAsync()
    {
        var categories = await _categoryRepository.GetAllCategoriesAsync();
        return categories.ToDto();
    }

    public async Task<CategoryDto?> GetCategoryByIdAsync(string id)
    {
        var category = await _categoryRepository.GetCategoryByIdAsync(id);
        return category?.ToDto();
    }

    public async Task<CategoryDto> CreateCategoryAsync(CreateCategoryRequest request)
    {
        if (await _categoryRepository.CategoryNameExistsAsync(request.Name))
        {
            throw new InvalidOperationException($"Category '{request.Name}' already exists");
        }

        var category = new Category
        {
            Id = ObjectId.GenerateNewId().ToString(),
            Name = request.Name,
            Description = request.Description,
            Color = request.Color,
            IconName = request.IconName,
            CategoryType = request.CategoryType,
            IsSystem = false,
            CreatedDate = DateTime.UtcNow,
            UsageCount = 0
        };

        var created = await _categoryRepository.CreateCategoryAsync(category);
        return created.ToDto();
    }

    public async Task<CategoryDto?> UpdateCategoryAsync(string id, UpdateCategoryRequest request)
    {
        var existing = await _categoryRepository.GetCategoryByIdAsync(id);
        if (existing == null) return null;

        if (existing.IsSystem)
        {
            throw new InvalidOperationException("Cannot modify system categories");
        }

        // Check if new name conflicts with another category
        if (existing.Name != request.Name &&
            await _categoryRepository.CategoryNameExistsAsync(request.Name))
        {
            throw new InvalidOperationException($"Category '{request.Name}' already exists");
        }

        existing.Name = request.Name;
        existing.Description = request.Description;
        existing.Color = request.Color;
        existing.IconName = request.IconName;
        existing.CategoryType = request.CategoryType;

        var success = await _categoryRepository.UpdateCategoryAsync(id, existing);
        return success ? existing.ToDto() : null;
    }

    public async Task<bool> DeleteCategoryAsync(string id)
    {
        var category = await _categoryRepository.GetCategoryByIdAsync(id);
        if (category == null) return false;

        if (category.IsSystem)
        {
            throw new InvalidOperationException("Cannot delete system categories");
        }

        if (category.UsageCount > 0)
        {
            throw new InvalidOperationException(
                $"Cannot delete category '{category.Name}' because it is used by {category.UsageCount} rule(s)");
        }

        return await _categoryRepository.DeleteCategoryAsync(id);
    }
}
