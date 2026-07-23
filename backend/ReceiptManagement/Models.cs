namespace Backend.ReceiptManagement;

using Backend.TransactionReporting;

public class UploadReceiptResponse
{
    public bool Success { get; set; }
    public required LinkedReceipt Receipt { get; set; }
    public string? Error { get; set; }
}

public class ReceiptDownloadResponse
{
    public required byte[] FileData { get; set; }
    public required string ContentType { get; set; }
    public required string FileName { get; set; }
}

public class ReceiptMetadataResponse
{
    public bool HasReceipt { get; set; }
    public LinkedReceipt? Receipt { get; set; }
}
