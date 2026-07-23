namespace Backend.NamingRules;

public static class NamingRuleMappingExtensions
{
    public static NamingRuleDto ToDto(this NamingRule rule)
    {
        return new NamingRuleDto
        {
            Id = rule.Id,
            RuleName = rule.RuleName,
            TransactionName = rule.TransactionName,
            Patterns = rule.Patterns,
            Priority = rule.Priority,
            Enabled = rule.Enabled,
            CreatedDate = rule.CreatedDate,
            LastModifiedDate = rule.LastModifiedDate,
            MatchCount = rule.MatchCount
        };
    }

    public static List<NamingRuleDto> ToDto(this IEnumerable<NamingRule> rules)
    {
        return rules.Select(ToDto).ToList();
    }
}
