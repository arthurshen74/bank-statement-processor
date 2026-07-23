using Backend.Authorization;

namespace Backend.TransactionReporting;

public static class TransactionReportEndpoints
{
    public static void MapTransactionReportEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/transaction-reports")
            .WithTags("Transaction Reports")
            .RequireAuthorization(AuthorizationPolicies.AllRoles);

        // GET /api/transaction-reports - Get all reports
        group.MapGet("/", async (ITransactionReportService service) =>
        {
            var reports = await service.GetAllReportsAsync();
            return Results.Ok(reports);
        });

        // GET /api/transaction-reports/{id} - Get single report
        group.MapGet("/{id}", async (string id, ITransactionReportService service) =>
        {
            var report = await service.GetReportByIdAsync(id);
            return report is not null ? Results.Ok(report) : Results.NotFound();
        });

        // PATCH /api/transaction-reports/{id} - Update report
        group.MapPatch("/{id}", async (string id, UpdateReportRequest request, ITransactionReportService service) =>
        {
            try
            {
                var success = await service.UpdateReportAsync(id, request);
                return success ? Results.NoContent() : Results.NotFound();
            }
            catch (InvalidOperationException ex)
            {
                return Results.BadRequest(new { error = ex.Message });
            }
        });

        // POST /api/transaction-reports - Create report
        group.MapPost("/", async (CreateReportRequest request, ITransactionReportService service) =>
        {
            try
            {
                var report = await service.CreateReportAsync(request);
                return Results.Created($"/api/transaction-reports/{report.Id}", report);
            }
            catch (InvalidOperationException ex)
            {
                return Results.BadRequest(new { error = ex.Message });
            }
        });

        // DELETE /api/transaction-reports/{id} - Delete report
        group.MapDelete("/{id}", async (string id, ITransactionReportService service) =>
        {
            var success = await service.DeleteReportAsync(id);
            return success ? Results.NoContent() : Results.NotFound();
        });

        // POST /api/transaction-reports/link - Link transactions to report
        group.MapPost("/link", async (LinkTransactionsRequest request, ITransactionReportService service) =>
        {
            try
            {
                var result = await service.LinkTransactionsAsync(request);
                return Results.Ok(result);
            }
            catch (InvalidOperationException ex)
            {
                return Results.BadRequest(new { error = ex.Message });
            }
        });

        // GET /api/transaction-reports/{id}/summary - Get report with transactions
        group.MapGet("/{id}/summary", async (string id, ITransactionReportService service) =>
        {
            try
            {
                var summary = await service.GetReportSummaryAsync(id);
                return Results.Ok(summary);
            }
            catch (InvalidOperationException ex)
            {
                return Results.NotFound(new { error = ex.Message });
            }
        });

        // PATCH /api/transaction-reports/transactions/{id}/category - Update transaction category
        group.MapPatch("/transactions/{id}/category", async (
            string id,
            UpdateTransactionCategoryRequest request,
            ITransactionReportService service) =>
        {
            var success = await service.UpdateTransactionCategoryAsync(id, request.Category);
            return success ? Results.NoContent() : Results.NotFound();
        });

        // PATCH /api/transaction-reports/transactions/{id}/name - Update transaction name
        group.MapPatch("/transactions/{id}/name", async (
            string id,
            UpdateTransactionNameRequest request,
            ITransactionReportService service) =>
        {
            var success = await service.UpdateTransactionNameAsync(id, request.Name);
            return success ? Results.NoContent() : Results.NotFound();
        });

        // POST /api/transaction-reports/transactions/name-bulk - Update multiple transaction names
        group.MapPost("/transactions/name-bulk", async (
            BulkUpdateNamesRequest request,
            ITransactionReportService service) =>
        {
            var success = await service.BulkUpdateNamesAsync(request.TransactionIds, request.Name);
            return success ? Results.NoContent() : Results.NotFound();
        });

        // DELETE /api/transaction-reports/transactions/{id} - Delete a single transaction
        group.MapDelete("/transactions/{id}", async (string id, ITransactionReportService service) =>
        {
            var success = await service.DeleteTransactionAsync(id);
            return success ? Results.NoContent() : Results.NotFound();
        });

        // POST /api/transaction-reports/transactions/manual - Create manual transaction
        group.MapPost("/transactions/manual", async (
            CreateManualTransactionRequest request,
            ITransactionReportService service) =>
        {
            try
            {
                var transaction = await service.CreateManualTransactionAsync(request);
                return Results.Created($"/api/transaction-reports/transactions/{transaction.Id}", transaction);
            }
            catch (InvalidOperationException ex)
            {
                return Results.BadRequest(new { error = ex.Message });
            }
        });

        // PATCH /api/transaction-reports/transactions/{id} - Update transaction amount/description
        group.MapPatch("/transactions/{id}", async (
            string id,
            UpdateTransactionRequest request,
            ITransactionReportService service) =>
        {
            try
            {
                var success = await service.UpdateTransactionAsync(id, request);
                return success ? Results.NoContent() : Results.NotFound();
            }
            catch (InvalidOperationException ex)
            {
                return Results.BadRequest(new { error = ex.Message });
            }
        });
    }
}
