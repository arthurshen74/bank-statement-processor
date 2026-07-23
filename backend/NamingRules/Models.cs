using MongoDB.Bson.Serialization.Attributes;

namespace Backend.NamingRules;

public class NamingRule
{
    // Use a string _id (SHA-256 hex of TransactionName)
    [BsonId]
    public string Id { get; set; } = string.Empty;

    public string RuleName { get; set; } = string.Empty;
    public string TransactionName { get; set; } = string.Empty;
    public List<string> Patterns { get; set; } = new();
    public int Priority { get; set; }
    public bool Enabled { get; set; }

    // Metadata
    public DateTime CreatedDate { get; set; }
    public DateTime? LastModifiedDate { get; set; }
    public int MatchCount { get; set; }
}

public class NamingRuleDto
{
    public string Id { get; set; } = string.Empty;
    public string RuleName { get; set; } = string.Empty;
    public string TransactionName { get; set; } = string.Empty;
    public List<string> Patterns { get; set; } = new();
    public int Priority { get; set; }
    public bool Enabled { get; set; }
    public DateTime CreatedDate { get; set; }
    public DateTime? LastModifiedDate { get; set; }
    public int MatchCount { get; set; }
}

public class CreateNamingRuleRequest
{
    public string RuleName { get; set; } = string.Empty;
    public string TransactionName { get; set; } = string.Empty;
    public List<string> Patterns { get; set; } = new();
    public int Priority { get; set; } = 100;
    public bool Enabled { get; set; } = true;
}

public class UpdateNamingRuleRequest
{
    // TransactionName is immutable (Id derives from it)
    public string RuleName { get; set; } = string.Empty;
    public List<string> Patterns { get; set; } = new();
    public int Priority { get; set; }
    public bool Enabled { get; set; }
}

public class TestNamingRequest
{
    public string Description { get; set; } = string.Empty;
    // Optional: if provided, only these rule ids will be evaluated (ids are the Mongo _id for NamingRule)
    public List<string> RuleIds { get; set; } = new();
}

public class TestNamingResponse
{
    public bool Matched { get; set; }
    public string? TransactionName { get; set; }
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
