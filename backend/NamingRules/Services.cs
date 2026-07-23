using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;

namespace Backend.NamingRules;

public interface INamingRuleService
{
    Task<List<NamingRuleDto>> GetAllRulesAsync();
    Task<NamingRuleDto?> GetRuleByIdAsync(string id);
    Task<NamingRuleDto> CreateRuleAsync(CreateNamingRuleRequest request);
    Task<NamingRuleDto?> UpdateRuleAsync(string id, UpdateNamingRuleRequest request);
    Task<bool> DeleteRuleAsync(string id);
    Task<TestNamingResponse> TestNamingAsync(string description);
    Task<TestNamingResponse> TestNamingWithSelectedRulesAsync(string description, List<string> ruleIds);
}

public class NamingRuleService : INamingRuleService
{
    private readonly INamingRuleRepository _ruleRepository;

    public NamingRuleService(INamingRuleRepository ruleRepository)
    {
        _ruleRepository = ruleRepository;
    }

    public async Task<List<NamingRuleDto>> GetAllRulesAsync()
    {
        var rules = await _ruleRepository.GetAllRulesAsync();
        return rules.ToDto();
    }

    public async Task<NamingRuleDto?> GetRuleByIdAsync(string id)
    {
        var rule = await _ruleRepository.GetRuleByIdAsync(id);
        return rule?.ToDto();
    }

    public async Task<NamingRuleDto> CreateRuleAsync(CreateNamingRuleRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.TransactionName))
        {
            throw new InvalidOperationException("TransactionName is required");
        }

        var id = Sha256Hex(request.TransactionName.Trim());

        // If rule exists, surface a useful error
        var existing = await _ruleRepository.GetRuleByIdAsync(id);
        if (existing != null)
        {
            throw new InvalidOperationException($"Naming rule for '{request.TransactionName}' already exists");
        }

        var cleanedPatterns = CleanPatterns(request.Patterns);

        var rule = new NamingRule
        {
            Id = id,
            RuleName = string.IsNullOrWhiteSpace(request.RuleName) ? request.TransactionName.Trim() : request.RuleName.Trim(),
            TransactionName = request.TransactionName.Trim(),
            Patterns = cleanedPatterns,
            Priority = request.Priority,
            Enabled = request.Enabled,
            CreatedDate = DateTime.UtcNow,
            MatchCount = 0
        };

        var created = await _ruleRepository.CreateRuleAsync(rule);
        return created.ToDto();
    }

    public async Task<NamingRuleDto?> UpdateRuleAsync(string id, UpdateNamingRuleRequest request)
    {
        var existing = await _ruleRepository.GetRuleByIdAsync(id);
        if (existing == null) return null;

        // TransactionName is immutable (Id derives from it)
        existing.RuleName = string.IsNullOrWhiteSpace(request.RuleName) ? existing.TransactionName : request.RuleName.Trim();
        existing.Patterns = CleanPatterns(request.Patterns);
        existing.Priority = request.Priority;
        existing.Enabled = request.Enabled;
        existing.LastModifiedDate = DateTime.UtcNow;

        var success = await _ruleRepository.UpdateRuleAsync(id, existing);
        return success ? existing.ToDto() : null;
    }

    public async Task<bool> DeleteRuleAsync(string id)
    {
        return await _ruleRepository.DeleteRuleAsync(id);
    }

    public async Task<TestNamingResponse> TestNamingAsync(string description)
    {
        var rules = await _ruleRepository.GetEnabledRulesOrderedByPriorityAsync();
        return await TestAgainstRulesAsync(description, rules);
    }

    public async Task<TestNamingResponse> TestNamingWithSelectedRulesAsync(string description, List<string> ruleIds)
    {
        var allEnabled = await _ruleRepository.GetEnabledRulesOrderedByPriorityAsync();
        var selected = allEnabled.Where(r => ruleIds.Contains(r.Id)).ToList();
        return await TestAgainstRulesAsync(description, selected);
    }

    private async Task<TestNamingResponse> TestAgainstRulesAsync(string description, List<NamingRule> rules)
    {
        foreach (var rule in rules)
        {
            foreach (var pattern in rule.Patterns)
            {
                try
                {
                    var regex = new Regex(pattern, RegexOptions.IgnoreCase);
                    var match = regex.Match(description);

                    if (match.Success)
                    {
                        // Best-effort increment (ignore outcome)
                        _ = await _ruleRepository.IncrementMatchCountAsync(rule.Id);

                        var highlights = new List<HighlightSpan>
                        {
                            new HighlightSpan
                            {
                                Start = match.Index,
                                Length = match.Length,
                                Text = match.Value
                            }
                        };

                        return new TestNamingResponse
                        {
                            Matched = true,
                            TransactionName = rule.TransactionName,
                            RuleId = rule.Id,
                            RuleName = rule.RuleName,
                            MatchedPattern = pattern,
                            RulePriority = rule.Priority,
                            Highlights = highlights
                        };
                    }
                }
                catch
                {
                    // Invalid regex; skip
                    continue;
                }
            }
        }

        return new TestNamingResponse { Matched = false };
    }

    private static List<string> CleanPatterns(IEnumerable<string> patterns)
    {
        return patterns
            .Where(p => !string.IsNullOrWhiteSpace(p))
            .Select(p => p.Trim())
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();
    }

    private static string Sha256Hex(string input)
    {
        using var sha = SHA256.Create();
        var bytes = sha.ComputeHash(Encoding.UTF8.GetBytes(input));
        var sb = new StringBuilder(bytes.Length * 2);
        foreach (var b in bytes) sb.AppendFormat("{0:x2}", b);
        return sb.ToString();
    }
}
