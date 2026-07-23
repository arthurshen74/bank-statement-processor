using Backend.Authorization;

namespace Backend.TransactionCategorization;

public static class TransactionCategorizationEndpoints
{
    public static void MapTransactionCategorizationEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api")
            .WithTags("Transaction Categorization")
            .RequireAuthorization(AuthorizationPolicies.AllRoles);

        // PUT /api/transactions/{id}/category - Categorize single transaction
        group.MapPut("/transactions/{id}/category", async (
            string id,
            CategorizeTransactionRequest request,
            ITransactionCategorizationService service) =>
        {
            if (string.IsNullOrWhiteSpace(request.Category))
            {
                return Results.BadRequest(new { error = "Category is required" });
            }

            var success = await service.CategorizeTransactionAsync(id, request.Category);
            return success ? Results.NoContent() : Results.NotFound();
        });

        // POST /api/transactions/categorize-bulk - Bulk categorize transactions
        group.MapPost("/transactions/categorize-bulk", async (
            BulkCategorizeRequest request,
            ITransactionCategorizationService service) =>
        {
            if (string.IsNullOrWhiteSpace(request.Category))
            {
                return Results.BadRequest(new { error = "Category is required" });
            }

            if (request.TransactionIds == null || request.TransactionIds.Count == 0)
            {
                return Results.BadRequest(new { error = "At least one transaction ID is required" });
            }

            var result = await service.CategorizeMultipleTransactionsAsync(
                request.TransactionIds,
                request.Category);

            return Results.Ok(result);
        });

        // POST /api/transactions/search-similar - Search similar transactions by pattern
        group.MapPost("/transactions/search-similar", async (
            SearchSimilarTransactionsRequest request,
            ITransactionCategorizationService service) =>
        {
            if (string.IsNullOrWhiteSpace(request.ReportId))
            {
                return Results.BadRequest(new { error = "ReportId is required" });
            }

            if (string.IsNullOrWhiteSpace(request.Pattern))
            {
                return Results.BadRequest(new { error = "Pattern is required" });
            }

            var result = await service.SearchSimilarTransactionsAsync(
                request.ReportId,
                request.Pattern);

            return Results.Ok(result);
        });

        // POST /api/pattern-generator - Generate regex pattern via ChatGPT
        group.MapPost("/pattern-generator", async (
            GeneratePatternRequest request,
            IPatternGeneratorService service) =>
        {
            if (string.IsNullOrWhiteSpace(request.Buchungstext))
            {
                return Results.BadRequest(new { error = "Buchungstext is required" });
            }

            var result = await service.GeneratePatternAsync(request.Buchungstext);

            if (!result.Success)
            {
                return Results.BadRequest(new { error = result.Error });
            }

            return Results.Ok(result);
        });

        // GET /api/transaction-reports/{reportId}/categorization-stats - Get categorization statistics
        group.MapGet("/transaction-reports/{reportId}/categorization-stats", async (
            string reportId,
            ITransactionCategorizationService service) =>
        {
            var stats = await service.GetCategorizationStatisticsAsync(reportId);
            return Results.Ok(stats);
        });
    }
}
