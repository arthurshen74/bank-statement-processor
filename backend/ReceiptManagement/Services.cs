namespace Backend.ReceiptManagement;

using Backend.TransactionReporting;

public class ReceiptService
{
    private readonly IReceiptRepository _repository;
    private readonly long _maxFileSizeBytes = 10 * 1024 * 1024; // 10 MB
    private readonly string[] _allowedContentTypes = { "application/pdf", "image/png", "image/jpeg", "image/jpg" };
    private readonly string[] _allowedExtensions = { ".pdf", ".png", ".jpg", ".jpeg" };

    public ReceiptService(IReceiptRepository repository)
    {
        _repository = repository;
    }

    public async Task<UploadReceiptResponse> UploadReceiptAsync(string transactionId, IFormFile file)
    {
        try
        {
            // Validate file
            var validationError = ValidateFile(file);
            if (validationError != null)
            {
                return new UploadReceiptResponse
                {
                    Success = false,
                    Receipt = new LinkedReceipt { FileId = "", FileName = "", ContentType = "", ContentLength = 0 },
                    Error = validationError
                };
            }

            // Upload file
            using var stream = file.OpenReadStream();
            var receipt = await _repository.UploadReceiptAsync(
                transactionId,
                stream,
                file.FileName,
                file.ContentType
            );

            return new UploadReceiptResponse
            {
                Success = true,
                Receipt = receipt,
                Error = null
            };
        }
        catch (KeyNotFoundException ex)
        {
            return new UploadReceiptResponse
            {
                Success = false,
                Receipt = new LinkedReceipt { FileId = "", FileName = "", ContentType = "", ContentLength = 0 },
                Error = ex.Message
            };
        }
        catch (Exception ex)
        {
            return new UploadReceiptResponse
            {
                Success = false,
                Receipt = new LinkedReceipt { FileId = "", FileName = "", ContentType = "", ContentLength = 0 },
                Error = $"Failed to upload receipt: {ex.Message}"
            };
        }
    }

    public async Task<ReceiptDownloadResponse?> DownloadReceiptAsync(string transactionId)
    {
        try
        {
            var (fileData, contentType, fileName) = await _repository.DownloadReceiptAsync(transactionId);
            return new ReceiptDownloadResponse
            {
                FileData = fileData,
                ContentType = contentType,
                FileName = fileName
            };
        }
        catch (KeyNotFoundException)
        {
            return null;
        }
    }

    public async Task<bool> DeleteReceiptAsync(string transactionId)
    {
        try
        {
            await _repository.DeleteReceiptAsync(transactionId);
            return true;
        }
        catch (Exception)
        {
            return false;
        }
    }

    public async Task<ReceiptMetadataResponse> GetReceiptMetadataAsync(string transactionId)
    {
        var receipt = await _repository.GetReceiptMetadataAsync(transactionId);
        return new ReceiptMetadataResponse
        {
            HasReceipt = receipt != null,
            Receipt = receipt
        };
    }

    private string? ValidateFile(IFormFile file)
    {
        if (file == null || file.Length == 0)
        {
            return "No file provided";
        }

        if (file.Length > _maxFileSizeBytes)
        {
            return $"File size exceeds maximum allowed size of {_maxFileSizeBytes / (1024 * 1024)} MB";
        }

        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (!_allowedExtensions.Contains(extension))
        {
            return $"File type not allowed. Allowed types: {string.Join(", ", _allowedExtensions)}";
        }

        if (!_allowedContentTypes.Contains(file.ContentType.ToLowerInvariant()))
        {
            return $"Content type not allowed. Allowed types: {string.Join(", ", _allowedContentTypes)}";
        }

        return null;
    }
}
