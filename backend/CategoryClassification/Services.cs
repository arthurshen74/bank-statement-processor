using System.Text.RegularExpressions;
using MongoDB.Bson;

namespace Backend.CategoryClassification;

public interface ICategoryRuleService
{
    Task<List<CategoryRuleDto>> GetAllRulesAsync();
    Task<CategoryRuleDto?> GetRuleByIdAsync(string id);
    Task<CategoryRuleDto> CreateRuleAsync(CreateCategoryRuleRequest request);
    Task<CategoryRuleDto?> UpdateRuleAsync(string id, UpdateCategoryRuleRequest request);
    Task<bool> DeleteRuleAsync(string id);
    Task<TestTransactionResponse> TestTransactionAsync(string buchungstext);
    Task<TestTransactionResponse> TestTransactionWithSelectedRulesAsync(string buchungstext, List<string> ruleIds);
    Task<CoverageStatistics> GetCoverageStatisticsAsync();
    Task<bool> ReorderRulesAsync(List<RulePriorityUpdate> updates);
    Task<bool> ToggleRuleAsync(string id, bool enabled);
    Task<ExportRulesResponse> ExportRulesAsync();
    Task<ImportRulesResponse> ImportRulesAsync(ImportRulesRequest request);
}

public class CategoryRuleService : ICategoryRuleService
{
    private readonly ICategoryRuleRepository _ruleRepository;

    public CategoryRuleService(ICategoryRuleRepository ruleRepository)
    {
        _ruleRepository = ruleRepository;
    }

    public async Task<List<CategoryRuleDto>> GetAllRulesAsync()
    {
        var rules = await _ruleRepository.GetAllRulesAsync();
        return rules.ToDto();
    }

    public async Task<CategoryRuleDto?> GetRuleByIdAsync(string id)
    {
        var rule = await _ruleRepository.GetRuleByIdAsync(id);
        return rule?.ToDto();
    }

    public async Task<CategoryRuleDto> CreateRuleAsync(CreateCategoryRuleRequest request)
    {
        if (await _ruleRepository.RuleIdExistsAsync(request.RuleId))
        {
            throw new InvalidOperationException($"Rule with ID '{request.RuleId}' already exists");
        }

        var rule = new CategoryRule
        {
            Id = ObjectId.GenerateNewId().ToString(),
            RuleId = request.RuleId,
            Name = request.Name,
            Category = request.Category,
            Patterns = request.Patterns,
            Priority = request.Priority,
            Enabled = request.Enabled,
            CreatedDate = DateTime.UtcNow,
            MatchCount = 0
        };

        var created = await _ruleRepository.CreateRuleAsync(rule);
        return created.ToDto();
    }

    public async Task<CategoryRuleDto?> UpdateRuleAsync(string id, UpdateCategoryRuleRequest request)
    {
        var existing = await _ruleRepository.GetRuleByIdAsync(id);
        if (existing == null) return null;

        existing.Name = request.Name;
        existing.Category = request.Category;
        existing.Patterns = request.Patterns;
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

    public async Task<TestTransactionResponse> TestTransactionAsync(string buchungstext)
    {
        var rules = await _ruleRepository.GetEnabledRulesOrderedByPriorityAsync();

        foreach (var rule in rules)
        {
            foreach (var pattern in rule.Patterns)
            {
                try
                {
                    var regex = new Regex(pattern, RegexOptions.IgnoreCase);
                    var match = regex.Match(buchungstext);

                    if (match.Success)
                    {
                        var highlights = new List<HighlightSpan>
                        {
                            new HighlightSpan
                            {
                                Start = match.Index,
                                Length = match.Length,
                                Text = match.Value
                            }
                        };

                        return new TestTransactionResponse
                        {
                            Matched = true,
                            Category = rule.Category,
                            RuleId = rule.RuleId,
                            RuleName = rule.Name,
                            MatchedPattern = pattern,
                            RulePriority = rule.Priority,
                            Highlights = highlights
                        };
                    }
                }
                catch (Exception)
                {
                    // Invalid regex, skip this pattern
                    continue;
                }
            }
        }

        return new TestTransactionResponse { Matched = false };
    }

    public async Task<TestTransactionResponse> TestTransactionWithSelectedRulesAsync(string buchungstext, List<string> ruleIds)
    {

        // Get all enabled rules ordered by priority
        var allRules = await _ruleRepository.GetEnabledRulesOrderedByPriorityAsync();

        // Filter to only the selected rule IDs
        var selectedRules = allRules.Where(r => ruleIds.Contains(r.Id)).ToList();

        foreach (var rule in selectedRules)
        {
            foreach (var pattern in rule.Patterns)
            {
                try
                {
                    var regex = new Regex(pattern, RegexOptions.IgnoreCase);
                    var match = regex.Match(buchungstext);

                    if (match.Success)
                    {
                        Console.WriteLine($"Transaction '{buchungstext}' matched with rule {rule.Id}");
                        var highlights = new List<HighlightSpan>
                        {
                            new HighlightSpan
                            {
                                Start = match.Index,
                                Length = match.Length,
                                Text = match.Value
                            }
                        };

                        return new TestTransactionResponse
                        {
                            Matched = true,
                            Category = rule.Category,
                            RuleId = rule.RuleId,
                            RuleName = rule.Name,
                            MatchedPattern = pattern,
                            RulePriority = rule.Priority,
                            Highlights = highlights
                        };
                    }
                }
                catch (Exception)
                {
                    // Invalid regex, skip this pattern
                    continue;
                }
            }
        }

        return new TestTransactionResponse { Matched = false };
    }

    public async Task<CoverageStatistics> GetCoverageStatisticsAsync()
    {
        var allRules = await _ruleRepository.GetAllRulesAsync();

        var stats = new CoverageStatistics
        {
            TotalRules = allRules.Count,
            EnabledRules = allRules.Count(r => r.Enabled),
            DisabledRules = allRules.Count(r => !r.Enabled),
            CategoriesUsage = allRules
                .GroupBy(r => r.Category)
                .Select(g => new CategoryCoverage
                {
                    CategoryName = g.Key,
                    RuleCount = g.Count(),
                    TotalMatches = g.Sum(r => r.MatchCount)
                })
                .OrderByDescending(c => c.TotalMatches)
                .ToList(),
            TopMatchingRules = allRules
                .OrderByDescending(r => r.MatchCount)
                .Take(10)
                .Select(r => new RuleUsage
                {
                    RuleId = r.RuleId,
                    RuleName = r.Name,
                    Category = r.Category,
                    MatchCount = r.MatchCount
                })
                .ToList()
        };

        return stats;
    }

    public async Task<bool> ReorderRulesAsync(List<RulePriorityUpdate> updates)
    {
        foreach (var update in updates)
        {
            await _ruleRepository.UpdateRulePriorityAsync(update.RuleId, update.Priority);
        }
        return true;
    }

    public async Task<bool> ToggleRuleAsync(string id, bool enabled)
    {
        var rule = await _ruleRepository.GetRuleByIdAsync(id);
        if (rule == null) return false;

        rule.Enabled = enabled;
        rule.LastModifiedDate = DateTime.UtcNow;
        return await _ruleRepository.UpdateRuleAsync(id, rule);
    }

    public async Task<ExportRulesResponse> ExportRulesAsync()
    {
        var rules = await _ruleRepository.GetAllRulesAsync();

        return new ExportRulesResponse
        {
            ExportDate = DateTime.UtcNow,
            TotalRules = rules.Count,
            Rules = rules.ToDto()
        };
    }

    public async Task<ImportRulesResponse> ImportRulesAsync(ImportRulesRequest request)
    {
        var response = new ImportRulesResponse
        {
            Success = true,
            Errors = new List<string>()
        };

        if (request.ReplaceExisting)
        {
            await _ruleRepository.DeleteAllRulesAsync();
        }

        foreach (var ruleDto in request.Rules)
        {
            try
            {
                var exists = await _ruleRepository.RuleIdExistsAsync(ruleDto.RuleId);

                if (exists && !request.ReplaceExisting)
                {
                    response.SkippedCount++;
                    continue;
                }

                var rule = new CategoryRule
                {
                    Id = ObjectId.GenerateNewId().ToString(),
                    RuleId = ruleDto.RuleId,
                    Name = ruleDto.Name,
                    Category = ruleDto.Category,
                    Patterns = ruleDto.Patterns,
                    Priority = ruleDto.Priority,
                    Enabled = ruleDto.Enabled,
                    CreatedDate = DateTime.UtcNow,
                    MatchCount = 0
                };

                await _ruleRepository.CreateRuleAsync(rule);
                response.ImportedCount++;
            }
            catch (Exception ex)
            {
                response.ErrorCount++;
                response.Errors.Add($"Rule '{ruleDto.RuleId}': {ex.Message}");
            }
        }

        if (response.ErrorCount > 0)
        {
            response.Success = false;
        }

        return response;
    }
}
