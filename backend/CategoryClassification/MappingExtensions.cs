namespace Backend.CategoryClassification;

public static class CategoryRuleMappingExtensions
{
    public static CategoryRuleDto ToDto(this CategoryRule rule)
    {
        return new CategoryRuleDto
        {
            Id = rule.Id,
            RuleId = rule.RuleId,
            Name = rule.Name,
            Category = rule.Category,
            Patterns = rule.Patterns,
            Priority = rule.Priority,
            Enabled = rule.Enabled,
            CreatedDate = rule.CreatedDate,
            LastModifiedDate = rule.LastModifiedDate,
            MatchCount = rule.MatchCount
        };
    }

    public static List<CategoryRuleDto> ToDto(this IEnumerable<CategoryRule> rules)
    {
        return rules.Select(ToDto).ToList();
    }
}
