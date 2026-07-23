import { useState, useCallback, useEffect } from 'react';
import { ArrowUpTrayIcon } from '@heroicons/react/24/outline';
import PDFViewer from './PDFViewer';

/**
 * Receipt uploader component with drag-drop, file validation, and preview
 * @param {File|null} file - Currently selected file
 * @param {Function} onFileSelect - Callback when a file is selected
 * @param {Function} onFileRemove - Callback when file is removed
 * @param {Object|null} existingReceipt - Existing receipt metadata { fileName, contentType, contentLength }
 * @param {string|null} existingReceiptUrl - URL for existing receipt preview
 * @param {Function} onExistingReceiptDelete - Callback to delete existing receipt
 * @param {boolean} deleting - Whether deletion is in progress
 * @param {string} mode - 'add' or 'edit' mode
 * @param {string} inputId - Unique ID for file input
 */
export default function ReceiptUploader({
  file,
  onFileSelect,
  onFileRemove,
  existingReceipt = null,
  existingReceiptUrl = null,
  onExistingReceiptDelete = null,
  deleting = false,
  mode = 'add',
  inputId = 'receipt-file-input',
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [error, setError] = useState(null);

  // Create preview URL when file changes
  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else if (existingReceiptUrl) {
      setPreviewUrl(existingReceiptUrl);
    } else {
      setPreviewUrl(null);
    }
  }, [file, existingReceiptUrl]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  };

  const handleFileInputChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      handleFileSelect(selectedFile);
    }
  };

  const handleFileSelect = (selectedFile) => {
    const validTypes = [
      'application/pdf',
      'image/png',
      'image/jpeg',
      'image/jpg',
    ];

    if (!validTypes.includes(selectedFile.type)) {
      setError('Invalid file type. Please upload PDF, PNG, or JPEG files only.');
      return;
    }

    if (selectedFile.size > 10 * 1024 * 1024) {
      setError('File size exceeds 10 MB limit.');
      return;
    }

    setError(null);
    onFileSelect(selectedFile);
  };

  const handleRemove = () => {
    setError(null);
    if (mode === 'edit' && existingReceipt && onExistingReceiptDelete) {
      onExistingReceiptDelete();
    } else {
      onFileRemove();
    }
  };

  const isPDF = file?.type === 'application/pdf' || existingReceipt?.contentType === 'application/pdf';
  const isImage = file?.type.startsWith('image/') || existingReceipt?.contentType.startsWith('image/');

  // Show existing receipt in edit mode
  if (mode === 'edit' && existingReceipt && !file) {
    return (
      <div className="space-y-2">
        {error && (
          <div className="rounded-md bg-red-50 p-3">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}
        <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-md border border-yellow-200">
          <span className="text-sm text-yellow-900">
            {existingReceipt.fileName} ({(existingReceipt.contentLength / 1024).toFixed(2)} KB)
          </span>
          <button
            onClick={handleRemove}
            disabled={deleting}
            className="text-sm text-red-600 hover:text-red-800 font-medium cursor-pointer disabled:opacity-50"
          >
            {deleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
        {/* Preview */}
        {previewUrl && (
          <div>
            {isPDF && <PDFViewer fileUrl={previewUrl} initialScale={1.0} showControls={true} />}
            {isImage && (
              <div className="border border-gray-300 rounded-lg overflow-hidden bg-gray-100 flex justify-center p-4">
                <img
                  src={previewUrl}
                  alt="Receipt"
                  className="max-w-full max-h-96 object-contain"
                />
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // Show preview if file is selected
  if (file || previewUrl) {
    return (
      <div className="space-y-2">
        {error && (
          <div className="rounded-md bg-red-50 p-3">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-gray-900">
            {file?.name} ({(file?.size / 1024).toFixed(2)} KB)
          </p>
          <button
            onClick={handleRemove}
            className="text-sm text-red-600 hover:text-red-800 cursor-pointer"
          >
            Remove
          </button>
        </div>
        {/* Preview */}
        {isPDF && <PDFViewer fileUrl={previewUrl} initialScale={0.5} showControls={false} />}
        {isImage && (
          <div className="border border-gray-300 rounded-lg overflow-hidden bg-gray-100 flex justify-center p-4">
            <img
              src={previewUrl}
              alt="Receipt preview"
              className="max-w-full max-h-64 object-contain"
            />
          </div>
        )}
      </div>
    );
  }

  // Show upload zone
  return (
    <div>
      {error && (
        <div className="rounded-md bg-red-50 p-3 mb-2">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          isDragging
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 bg-gray-50 hover:border-gray-400'
        }`}
      >
        <ArrowUpTrayIcon className="mx-auto h-12 w-12 text-gray-400" />
        <p className="mt-2 text-sm text-gray-600">
          Drag and drop a file here, or click to select
        </p>
        <p className="mt-1 text-xs text-gray-500">PDF, PNG, or JPEG (max 10 MB)</p>
        <input
          type="file"
          accept=".pdf,.png,.jpg,.jpeg"
          onChange={handleFileInputChange}
          className="hidden"
          id={inputId}
        />
        <label
          htmlFor={inputId}
          className="mt-4 inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 cursor-pointer"
        >
          Select File
        </label>
      </div>
    </div>
  );
}
