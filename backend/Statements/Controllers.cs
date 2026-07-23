using Backend.Authorization;

namespace Backend.Statements;

public static class StatementEndpoints
{
    public static void MapStatementEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/statements")
            .WithTags("Statements")
            .RequireAuthorization(AuthorizationPolicies.AllRoles);

        // GET /api/statements - Get all statements
        group.MapGet("/", async (IStatementService service) =>
        {
            try
            {
                var statements = await service.GetAllStatementsAsync();
                return Results.Ok(statements);
            }
            catch (Exception ex)
            {
                return Results.Problem(
                    detail: ex.Message,
                    statusCode: 500,
                    title: "Failed to retrieve statements"
                );
            }
        });

        // GET /api/statements/{id} - Get statement by ID
        group.MapGet("/{id}", async (string id, IStatementService service) =>
        {
            try
            {
                var statement = await service.GetStatementByIdAsync(id);

                if (statement == null)
                {
                    return Results.NotFound(new { message = $"Statement with ID {id} not found" });
                }

                return Results.Ok(statement);
            }
            catch (Exception ex)
            {
                return Results.Problem(
                    detail: ex.Message,
                    statusCode: 500,
                    title: "Failed to retrieve statement"
                );
            }
        });

        // DELETE /api/statements/{id} - Delete statement
        group.MapDelete("/{id}", async (string id, IStatementService service) =>
        {
            try
            {
                var success = await service.DeleteStatementAsync(id);

                if (!success)
                {
                    return Results.NotFound(new { message = $"Statement with ID {id} not found" });
                }

                return Results.Ok(new { message = "Statement deleted successfully" });
            }
            catch (Exception ex)
            {
                return Results.Problem(
                    detail: ex.Message,
                    statusCode: 500,
                    title: "Failed to delete statement"
                );
            }
        })
        .RequireAuthorization(AuthorizationPolicies.AllRoles);

        // GET /api/statements/images/{fileId} - Get image from GridFS
        group.MapGet("/images/{fileId}", async (string fileId, IStatementService service) =>
        {
            try
            {
                var (imageData, contentType) = await service.GetImageAsync(fileId);

                if (imageData == null)
                {
                    return Results.NotFound(new { message = $"Image with ID {fileId} not found" });
                }

                return Results.File(imageData, contentType ?? "image/png");
            }
            catch (Exception ex)
            {
                return Results.Problem(
                    detail: ex.Message,
                    statusCode: 500,
                    title: "Failed to retrieve image"
                );
            }
        });
    }
}
