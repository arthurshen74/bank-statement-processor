namespace Backend.ReceiptManagement;

public static class ReceiptEndpoints
{
    public static void MapReceiptEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/transactions")
            .WithTags("Receipts")
            .DisableAntiforgery(); // Required for file uploads

        // POST /api/transactions/{transactionId}/receipt - Upload receipt
        group.MapPost("/{transactionId}/receipt", async (
            string transactionId,
            IFormFile file,
            ReceiptService service) =>
        {
            if (file == null)
            {
                return Results.BadRequest(new { error = "No file provided" });
            }

            var result = await service.UploadReceiptAsync(transactionId, file);

            if (!result.Success)
            {
                return Results.BadRequest(new { error = result.Error });
            }

            return Results.Ok(result);
        });

        // GET /api/transactions/{transactionId}/receipt - Download receipt
        group.MapGet("/{transactionId}/receipt", async (
            string transactionId,
            ReceiptService service) =>
        {
            var result = await service.DownloadReceiptAsync(transactionId);

            if (result == null)
            {
                return Results.NotFound(new { error = "Receipt not found" });
            }

            return Results.File(result.FileData, result.ContentType, result.FileName);
        });

        // DELETE /api/transactions/{transactionId}/receipt - Delete receipt
        group.MapDelete("/{transactionId}/receipt", async (
            string transactionId,
            ReceiptService service) =>
        {
            var success = await service.DeleteReceiptAsync(transactionId);

            if (!success)
            {
                return Results.NotFound(new { error = "Receipt not found or could not be deleted" });
            }

            return Results.NoContent();
        });

        // GET /api/transactions/{transactionId}/receipt/metadata - Get receipt metadata
        group.MapGet("/{transactionId}/receipt/metadata", async (
            string transactionId,
            ReceiptService service) =>
        {
            var result = await service.GetReceiptMetadataAsync(transactionId);
            return Results.Ok(result);
        });
    }
}
