using MongoDB.Driver;
using MongoDB.Bson;
using Backend.CategoryManagement;

namespace Backend.CategoryClassification;

public interface ICategoryRuleRepository
{
    Task<List<CategoryRule>> GetAllRulesAsync();
    Task<CategoryRule?> GetRuleByIdAsync(string id);
    Task<CategoryRule?> GetRuleByRuleIdAsync(string ruleId);
    Task<CategoryRule> CreateRuleAsync(CategoryRule rule);
    Task<bool> UpdateRuleAsync(string id, CategoryRule rule);
    Task<bool> DeleteRuleAsync(string id);
    Task<bool> RuleIdExistsAsync(string ruleId);
    Task<List<CategoryRule>> GetEnabledRulesOrderedByPriorityAsync();
    Task<bool> IncrementMatchCountAsync(string ruleId);
    Task<bool> UpdateRulePriorityAsync(string ruleId, int priority);
    Task<List<CategoryRule>> GetRulesByCategoryAsync(string category);
    Task<bool> DeleteAllRulesAsync();
}

public class CategoryRuleRepository : ICategoryRuleRepository
{
    private readonly IMongoCollection<CategoryRule> _rules;
    private readonly ICategoryRepository _categoryRepository;

    public CategoryRuleRepository(IMongoDatabase database, ICategoryRepository categoryRepository)
    {
        _rules = database.GetCollection<CategoryRule>("categoryRules");
        _categoryRepository = categoryRepository;
    }

    public async Task<List<CategoryRule>> GetAllRulesAsync()
    {
        return await _rules.Find(_ => true)
            .SortByDescending(r => r.Priority)
            .ThenBy(r => r.Name)
            .ToListAsync();
    }

    public async Task<CategoryRule?> GetRuleByIdAsync(string id)
    {
        return await _rules.Find(r => r.Id == id).FirstOrDefaultAsync();
    }

    public async Task<CategoryRule?> GetRuleByRuleIdAsync(string ruleId)
    {
        return await _rules.Find(r => r.RuleId == ruleId).FirstOrDefaultAsync();
    }

    public async Task<CategoryRule> CreateRuleAsync(CategoryRule rule)
    {
        await _rules.InsertOneAsync(rule);
        _ = await _categoryRepository.UpdateUsageCountAsync(rule.Category, 1);
        return rule;
    }

    public async Task<bool> UpdateRuleAsync(string id, CategoryRule rule)
    {
        var existingRule = await GetRuleByIdAsync(id);
        if (existingRule == null) return false;
        var existingCategoryName = existingRule.Category;
        var newCategoryName = rule.Category;
        var result = await _rules.ReplaceOneAsync(r => r.Id == id, rule);
        if (existingCategoryName != newCategoryName)
        {
            _ = await _categoryRepository.UpdateUsageCountAsync(existingCategoryName, -1);
            _ = await _categoryRepository.UpdateUsageCountAsync(newCategoryName, 1);
        }
        return result.ModifiedCount > 0;
    }

    public async Task<bool> DeleteRuleAsync(string id)
    {
        var rule = await GetRuleByIdAsync(id);
        if (rule == null) return false;

        var categoryName = rule.Category;
        var result = await _rules.DeleteOneAsync(r => r.Id == id);
        _ = await _categoryRepository.UpdateUsageCountAsync(categoryName, -1);
        return result.DeletedCount > 0;
    }

    public async Task<bool> RuleIdExistsAsync(string ruleId)
    {
        var count = await _rules.CountDocumentsAsync(r => r.RuleId == ruleId);
        return count > 0;
    }

    public async Task<List<CategoryRule>> GetEnabledRulesOrderedByPriorityAsync()
    {
        return await _rules.Find(r => r.Enabled)
            .SortByDescending(r => r.Priority)
            .ToListAsync();
    }

    public async Task<bool> IncrementMatchCountAsync(string ruleId)
    {
        var update = Builders<CategoryRule>.Update.Inc(r => r.MatchCount, 1);
        var result = await _rules.UpdateOneAsync(r => r.RuleId == ruleId, update);
        return result.ModifiedCount > 0;
    }

    public async Task<bool> UpdateRulePriorityAsync(string ruleId, int priority)
    {
        var update = Builders<CategoryRule>.Update.Set(r => r.Priority, priority);
        var result = await _rules.UpdateOneAsync(r => r.RuleId == ruleId, update);
        return result.ModifiedCount > 0;
    }

    public async Task<List<CategoryRule>> GetRulesByCategoryAsync(string category)
    {
        return await _rules.Find(r => r.Category == category).ToListAsync();
    }

    public async Task<bool> DeleteAllRulesAsync()
    {
        var result = await _rules.DeleteManyAsync(_ => true);
        return result.DeletedCount > 0;
    }
}
