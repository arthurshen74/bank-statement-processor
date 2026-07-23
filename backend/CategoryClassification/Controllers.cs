using Backend.Authorization;

namespace Backend.CategoryClassification;

public static class CategoryRuleEndpoints
{
    public static void MapCategoryRuleEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/category-rules")
            .WithTags("Category Rules")
            .RequireAuthorization(AuthorizationPolicies.AllRoles);

        group.MapGet("/", async (ICategoryRuleService service) =>
        {
            var rules = await service.GetAllRulesAsync();
            return Results.Ok(rules);
        });

        group.MapGet("/{id}", async (string id, ICategoryRuleService service) =>
        {
            var rule = await service.GetRuleByIdAsync(id);
            return rule is not null ? Results.Ok(rule) : Results.NotFound();
        });

        group.MapPost("/", async (CreateCategoryRuleRequest request, ICategoryRuleService service) =>
        {
            try
            {
                var rule = await service.CreateRuleAsync(request);
                return Results.Created($"/api/category-rules/{rule.Id}", rule);
            }
            catch (InvalidOperationException ex)
            {
                return Results.BadRequest(new { error = ex.Message });
            }
        });

        group.MapPut("/{id}", async (string id, UpdateCategoryRuleRequest request, ICategoryRuleService service) =>
        {
            var rule = await service.UpdateRuleAsync(id, request);
            return rule is not null ? Results.Ok(rule) : Results.NotFound();
        });

        group.MapDelete("/{id}", async (string id, ICategoryRuleService service) =>
        {
            var success = await service.DeleteRuleAsync(id);
            return success ? Results.NoContent() : Results.NotFound();
        });

        group.MapPost("/test", async (TestTransactionRequest request, ICategoryRuleService service) =>
        {
            var result = await service.TestTransactionAsync(request.Buchungstext);
            return Results.Ok(result);
        });

        group.MapPost("/test-with-rules", async (TestTransactionWithRulesRequest request, ICategoryRuleService service) =>
        {
            var result = await service.TestTransactionWithSelectedRulesAsync(request.Buchungstext, request.RuleIds);
            return Results.Ok(result);
        });

        group.MapGet("/statistics/coverage", async (ICategoryRuleService service) =>
        {
            var stats = await service.GetCoverageStatisticsAsync();
            return Results.Ok(stats);
        });

        group.MapPatch("/{id}/toggle", async (string id, bool enabled, ICategoryRuleService service) =>
        {
            var success = await service.ToggleRuleAsync(id, enabled);
            return success ? Results.NoContent() : Results.NotFound();
        });

        group.MapPost("/reorder", async (ReorderRulesRequest request, ICategoryRuleService service) =>
        {
            var success = await service.ReorderRulesAsync(request.Rules);
            return success ? Results.NoContent() : Results.BadRequest();
        });

        group.MapGet("/export", async (ICategoryRuleService service) =>
        {
            var result = await service.ExportRulesAsync();
            return Results.Ok(result);
        });

        group.MapPost("/import", async (ImportRulesRequest request, ICategoryRuleService service) =>
        {
            var result = await service.ImportRulesAsync(request);
            return Results.Ok(result);
        });
    }
}
