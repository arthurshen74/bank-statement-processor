namespace Backend.CategoryManagement;

public static class CategoryMappingExtensions
{
    public static CategoryDto ToDto(this Category category)
    {
        return new CategoryDto
        {
            Id = category.Id,
            Name = category.Name,
            Description = category.Description,
            Color = category.Color,
            IconName = category.IconName,
            CategoryType = category.CategoryType,
            IsSystem = category.IsSystem,
            CreatedDate = category.CreatedDate,
            UsageCount = category.UsageCount
        };
    }

    public static List<CategoryDto> ToDto(this IEnumerable<Category> categories)
    {
        return categories.Select(ToDto).ToList();
    }
}
