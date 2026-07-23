using MongoDB.Driver;

namespace Backend.NamingRules;

public interface INamingRuleRepository
{
    Task<List<NamingRule>> GetAllRulesAsync();
    Task<NamingRule?> GetRuleByIdAsync(string id);
    Task<NamingRule> CreateRuleAsync(NamingRule rule);
    Task<bool> UpdateRuleAsync(string id, NamingRule rule);
    Task<bool> DeleteRuleAsync(string id);
    Task<List<NamingRule>> GetEnabledRulesOrderedByPriorityAsync();
    Task<bool> IncrementMatchCountAsync(string id);
}

public class NamingRuleRepository : INamingRuleRepository
{
    private readonly IMongoCollection<NamingRule> _rules;

    public NamingRuleRepository(IMongoDatabase database)
    {
        _rules = database.GetCollection<NamingRule>("namingRules");
    }

    public async Task<List<NamingRule>> GetAllRulesAsync()
    {
        return await _rules.Find(_ => true)
            .SortByDescending(r => r.Priority)
            .ThenByDescending(r => r.CreatedDate)
            .ToListAsync();
    }

    public async Task<NamingRule?> GetRuleByIdAsync(string id)
    {
        return await _rules.Find(r => r.Id == id).FirstOrDefaultAsync();
    }

    public async Task<NamingRule> CreateRuleAsync(NamingRule rule)
    {
        await _rules.InsertOneAsync(rule);
        return rule;
    }

    public async Task<bool> UpdateRuleAsync(string id, NamingRule rule)
    {
        var result = await _rules.ReplaceOneAsync(r => r.Id == id, rule);
        return result.ModifiedCount > 0;
    }

    public async Task<bool> DeleteRuleAsync(string id)
    {
        var result = await _rules.DeleteOneAsync(r => r.Id == id);
        return result.DeletedCount > 0;
    }

    public async Task<List<NamingRule>> GetEnabledRulesOrderedByPriorityAsync()
    {
        return await _rules.Find(r => r.Enabled)
            .SortByDescending(r => r.Priority)
            .ToListAsync();
    }

    public async Task<bool> IncrementMatchCountAsync(string id)
    {
        var update = Builders<NamingRule>.Update
            .Inc(r => r.MatchCount, 1)
            .Set(r => r.LastModifiedDate, DateTime.UtcNow);

        var result = await _rules.UpdateOneAsync(r => r.Id == id, update);
        return result.ModifiedCount > 0;
    }
}
