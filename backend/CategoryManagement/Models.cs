using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using System.Runtime.Serialization;
using System.Text.Json.Serialization;

namespace Backend.CategoryManagement;

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum CategoryType
{
    [EnumMember(Value = "ausgabe")]
    Ausgabe,

    [EnumMember(Value = "einnahme")]
    Einnahme
}

public class Category
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Color { get; set; } = string.Empty;
    public string? IconName { get; set; }
    public CategoryType CategoryType { get; set; } = CategoryType.Ausgabe;
    public bool IsSystem { get; set; }
    public DateTime CreatedDate { get; set; }
    public int UsageCount { get; set; }
}

public class CategoryDto
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Color { get; set; } = string.Empty;
    public string? IconName { get; set; }
    public CategoryType CategoryType { get; set; }
    public bool IsSystem { get; set; }
    public DateTime CreatedDate { get; set; }
    public int UsageCount { get; set; }
}

public class CreateCategoryRequest
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Color { get; set; } = "#4F46E5";
    public string? IconName { get; set; }
    public CategoryType CategoryType { get; set; } = CategoryType.Ausgabe;
}

public class UpdateCategoryRequest
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Color { get; set; } = string.Empty;
    public string? IconName { get; set; }
    public CategoryType CategoryType { get; set; }
}
