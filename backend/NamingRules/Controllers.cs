using Backend.Authorization;

namespace Backend.NamingRules;

public static class NamingRuleEndpoints
{
    public static void MapNamingRuleEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/naming-rules")
            .WithTags("Naming Rules")
            .RequireAuthorization(AuthorizationPolicies.AllRoles);

        group.MapGet("/", async (INamingRuleService service) =>
        {
            var rules = await service.GetAllRulesAsync();
            return Results.Ok(rules);
        });

        group.MapGet("/{id}", async (string id, INamingRuleService service) =>
        {
            var rule = await service.GetRuleByIdAsync(id);
            return rule is not null ? Results.Ok(rule) : Results.NotFound();
        });

        group.MapPost("/", async (CreateNamingRuleRequest request, INamingRuleService service) =>
        {
            try
            {
                var rule = await service.CreateRuleAsync(request);
                return Results.Created($"/api/naming-rules/{rule.Id}", rule);
            }
            catch (InvalidOperationException ex)
            {
                return Results.BadRequest(new { error = ex.Message });
            }
        });

        group.MapPut("/{id}", async (string id, UpdateNamingRuleRequest request, INamingRuleService service) =>
        {
            try
            {
                var rule = await service.UpdateRuleAsync(id, request);
                return rule is not null ? Results.Ok(rule) : Results.NotFound();
            }
            catch (InvalidOperationException ex)
            {
                return Results.BadRequest(new { error = ex.Message });
            }
        });

        group.MapDelete("/{id}", async (string id, INamingRuleService service) =>
        {
            try
            {
                var success = await service.DeleteRuleAsync(id);
                return success ? Results.NoContent() : Results.NotFound();
            }
            catch (InvalidOperationException ex)
            {
                return Results.BadRequest(new { error = ex.Message });
            }
        });

        // Test endpoint: if RuleIds provided, only evaluate those rules
        group.MapPost("/test", async (TestNamingRequest request, INamingRuleService service) =>
        {
            if (request.RuleIds != null && request.RuleIds.Count > 0)
            {
                var result = await service.TestNamingWithSelectedRulesAsync(request.Description, request.RuleIds);
                return Results.Ok(result);
            }
            else
            {
                var result = await service.TestNamingAsync(request.Description);
                return Results.Ok(result);
            }
        });
    }
}
