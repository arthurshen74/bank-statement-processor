using Backend.Authorization;

namespace Backend.CategoryManagement;

public static class CategoryEndpoints
{
    public static void MapCategoryEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/categories")
            .WithTags("Categories")
            .RequireAuthorization(AuthorizationPolicies.AllRoles);

        group.MapGet("/", async (ICategoryService service) =>
        {
            var categories = await service.GetAllCategoriesAsync();
            return Results.Ok(categories);
        });

        group.MapGet("/{id}", async (string id, ICategoryService service) =>
        {
            var category = await service.GetCategoryByIdAsync(id);
            return category is not null ? Results.Ok(category) : Results.NotFound();
        });

        group.MapPost("/", async (CreateCategoryRequest request, ICategoryService service) =>
        {
            try
            {
                var category = await service.CreateCategoryAsync(request);
                return Results.Created($"/api/categories/{category.Id}", category);
            }
            catch (InvalidOperationException ex)
            {
                return Results.BadRequest(new { error = ex.Message });
            }
        });

        group.MapPut("/{id}", async (string id, UpdateCategoryRequest request, ICategoryService service) =>
        {
            try
            {
                var category = await service.UpdateCategoryAsync(id, request);
                return category is not null ? Results.Ok(category) : Results.NotFound();
            }
            catch (InvalidOperationException ex)
            {
                return Results.BadRequest(new { error = ex.Message });
            }
        });

        group.MapDelete("/{id}", async (string id, ICategoryService service) =>
        {
            try
            {
                var success = await service.DeleteCategoryAsync(id);
                return success ? Results.NoContent() : Results.NotFound();
            }
            catch (InvalidOperationException ex)
            {
                return Results.BadRequest(new { error = ex.Message });
            }
        });
    }
}
