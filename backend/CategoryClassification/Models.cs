using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace Backend.CategoryClassification;

public class CategoryRule
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = string.Empty;

    public string RuleId { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public List<string> Patterns { get; set; } = new();
    public int Priority { get; set; }
    public bool Enabled { get; set; }
    public DateTime CreatedDate { get; set; }
    public DateTime? LastModifiedDate { get; set; }
    public int MatchCount { get; set; }
}

public class CategoryRuleDto
{
    public string Id { get; set; } = string.Empty;
    public string RuleId { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public List<string> Patterns { get; set; } = new();
    public int Priority { get; set; }
    public bool Enabled { get; set; }
    public DateTime CreatedDate { get; set; }
    public DateTime? LastModifiedDate { get; set; }
    public int MatchCount { get; set; }
}

public class CreateCategoryRuleRequest
{
    public string RuleId { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public List<string> Patterns { get; set; } = new();
    public int Priority { get; set; } = 100;
    public bool Enabled { get; set; } = true;
}

public class UpdateCategoryRuleRequest
{
    public string Name { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public List<string> Patterns { get; set; } = new();
    public int Priority { get; set; }
    public bool Enabled { get; set; }
}

public class TestTransactionRequest
{
    public string Buchungstext { get; set; } = string.Empty;
}

public class TestTransactionWithRulesRequest
{
    public string Buchungstext { get; set; } = string.Empty;
    public List<string> RuleIds { get; set; } = new();
}

public class TestTransactionResponse
{
    public bool Matched { get; set; }
    public string? Category { get; set; }
    public string? RuleId { get; set; }
    public string? RuleName { get; set; }
    public string? MatchedPattern { get; set; }
    public int? RulePriority { get; set; }
    public List<HighlightSpan>? Highlights { get; set; }
}

public class HighlightSpan
{
    public int Start { get; set; }
    public int Length { get; set; }
    public string Text { get; set; } = string.Empty;
}

public class CoverageStatistics
{
    public int TotalRules { get; set; }
    public int EnabledRules { get; set; }
    public int DisabledRules { get; set; }
    public List<CategoryCoverage> CategoriesUsage { get; set; } = new();
    public List<RuleUsage> TopMatchingRules { get; set; } = new();
}

public class CategoryCoverage
{
    public string CategoryName { get; set; } = string.Empty;
    public int RuleCount { get; set; }
    public int TotalMatches { get; set; }
}

public class RuleUsage
{
    public string RuleId { get; set; } = string.Empty;
    public string RuleName { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public int MatchCount { get; set; }
}

public class ReorderRulesRequest
{
    public List<RulePriorityUpdate> Rules { get; set; } = new();
}

public class RulePriorityUpdate
{
    public string RuleId { get; set; } = string.Empty;
    public int Priority { get; set; }
}

public class ExportRulesResponse
{
    public DateTime ExportDate { get; set; }
    public int TotalRules { get; set; }
    public List<CategoryRuleDto> Rules { get; set; } = new();
}

public class ImportRulesRequest
{
    public List<CategoryRuleDto> Rules { get; set; } = new();
    public bool ReplaceExisting { get; set; } = false;
}

public class ImportRulesResponse
{
    public bool Success { get; set; }
    public int ImportedCount { get; set; }
    public int SkippedCount { get; set; }
    public int ErrorCount { get; set; }
    public List<string> Errors { get; set; } = new();
}
