import { useState, useEffect, useCallback } from 'react';
import { Document, Page } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import {
  Dialog,
  DialogActions,
  DialogBody,
  DialogDescription,
  DialogTitle,
} from '../../ui/dialog';
import { Button } from '../../ui/button';
import { receiptsApi } from '../../api/receipts';
import {
  ArrowUpTrayIcon,
  MagnifyingGlassPlusIcon,
  MagnifyingGlassMinusIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';

export default function ReceiptUploadModal({
  isOpen,
  onClose,
  transaction,
  onComplete,
}) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [existingReceipt, setExistingReceipt] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  // PDF viewer state
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.0);

  useEffect(() => {
    if (isOpen && transaction) {
      loadExistingReceipt();
      resetState();
    }
  }, [isOpen, transaction]);

  const resetState = () => {
    setFile(null);
    setPreview(null);
    setError(null);
    setPageNumber(1);
    setScale(1.0);
    setNumPages(null);
  };

  const loadExistingReceipt = async () => {
    try {
      const metadata = await receiptsApi.getReceiptMetadata(transaction.id);
      setExistingReceipt(metadata.hasReceipt ? metadata.receipt : null);
    } catch (err) {
      console.error('Failed to load receipt metadata:', err);
    }
  };

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  }, []);

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
      setError(
        'Invalid file type. Please upload PDF, PNG, or JPEG files only.'
      );
      return;
    }

    if (selectedFile.size > 10 * 1024 * 1024) {
      setError('File size exceeds 10 MB limit.');
      return;
    }

    setFile(selectedFile);
    setError(null);

    // Create preview URL
    const url = URL.createObjectURL(selectedFile);
    setPreview(url);
  };

  const handleUpload = async () => {
    if (!file) return;

    try {
      setUploading(true);
      setError(null);
      await receiptsApi.uploadReceipt(transaction.id, file);
      onComplete();
    } catch (err) {
      setError(`Failed to upload receipt: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    try {
      setDeleting(true);
      setError(null);
      await receiptsApi.deleteReceipt(transaction.id);
      setExistingReceipt(null);
      onComplete();
    } catch (err) {
      setError(`Failed to delete receipt: ${err.message}`);
    } finally {
      setDeleting(false);
    }
  };

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
  };

  const isPDF = file?.type === 'application/pdf';
  const isImage = file?.type.startsWith('image/');

  const formatAmount = (amount) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const formatDate = (date) => {
    if (date instanceof Date) {
      return date.toLocaleDateString('de-DE');
    }
    return new Date(date).toLocaleDateString('de-DE');
  };

  if (!transaction) return null;

  return (
    <Dialog open={isOpen} onClose={onClose} size="7xl">
      <DialogTitle>Upload Receipt</DialogTitle>
      <DialogDescription>
        Upload a receipt (PDF, PNG, or JPEG) for this transaction.
      </DialogDescription>
      <DialogBody>
        <div className="space-y-6">
          {/* Transaction Details */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <h4 className="text-sm font-semibold text-gray-900 mb-3">
              Transaction Details
            </h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Date</p>
                <p className="font-medium text-gray-900">
                  {formatDate(transaction.date)}
                </p>
              </div>
              <div>
                <p className="text-gray-600">Amount</p>
                <p
                  className={`font-medium ${
                    transaction.amount < 0 ? 'text-red-600' : 'text-green-600'
                  }`}
                >
                  {formatAmount(transaction.amount)}
                </p>
              </div>
              <div className="col-span-2">
                <p className="text-gray-600">Description</p>
                <p className="font-medium text-gray-900 whitespace-pre-wrap">
                  {transaction.description}
                </p>
              </div>
            </div>
          </div>

          {/* Existing Receipt Info */}
          {existingReceipt && !file && (
            <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-yellow-900">
                    Existing Receipt
                  </p>
                  <p className="text-sm text-yellow-700">
                    {existingReceipt.fileName} (
                    {(existingReceipt.contentLength / 1024).toFixed(2)} KB)
                  </p>
                </div>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="cursor-pointer inline-flex items-center px-3 py-1.5 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 disabled:opacity-50"
                >
                  <TrashIcon className="h-4 w-4 mr-1" />
                  {deleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* File Upload Zone */}
          {!file && (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                isDragging
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 bg-gray-50 hover:border-gray-400'
              }`}
            >
              <ArrowUpTrayIcon className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-2 text-sm text-gray-600">
                Drag and drop a file here, or click to select
              </p>
              <p className="mt-1 text-xs text-gray-500">
                PDF, PNG, or JPEG (max 10 MB)
              </p>
              <input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={handleFileInputChange}
                className="hidden"
                id="receipt-file-input"
              />
              <label
                htmlFor="receipt-file-input"
                className="mt-4 inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 cursor-pointer"
              >
                Select File
              </label>
            </div>
          )}

          {/* File Preview */}
          {file && preview && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-900">
                  Selected: {file.name} ({(file.size / 1024).toFixed(2)} KB)
                </p>
                <button
                  onClick={resetState}
                  className="text-sm text-blue-600 hover:text-blue-800 cursor-pointer"
                >
                  Change file
                </button>
              </div>

              {/* PDF Preview */}
              {isPDF && (
                <div className="border border-gray-300 rounded-lg overflow-hidden">
                  <div className="bg-gray-100 p-3 flex items-center justify-between border-b border-gray-300">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() =>
                          setPageNumber((prev) => Math.max(1, prev - 1))
                        }
                        disabled={pageNumber <= 1}
                        className="p-1 rounded hover:bg-gray-200 disabled:opacity-50 cursor-pointer"
                      >
                        <ChevronLeftIcon className="h-5 w-5" />
                      </button>
                      <span className="text-sm text-gray-700">
                        Page {pageNumber} of {numPages || '?'}
                      </span>
                      <button
                        onClick={() =>
                          setPageNumber((prev) =>
                            Math.min(numPages || prev, prev + 1)
                          )
                        }
                        disabled={pageNumber >= (numPages || 1)}
                        className="p-1 rounded hover:bg-gray-200 disabled:opacity-50 cursor-pointer"
                      >
                        <ChevronRightIcon className="h-5 w-5" />
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() =>
                          setScale((prev) => Math.max(0.5, prev - 0.1))
                        }
                        className="p-1 rounded hover:bg-gray-200 cursor-pointer"
                        title="Zoom out"
                      >
                        <MagnifyingGlassMinusIcon className="h-5 w-5" />
                      </button>
                      <span className="text-sm text-gray-700">
                        {Math.round(scale * 100)}%
                      </span>
                      <button
                        onClick={() =>
                          setScale((prev) => Math.min(2.0, prev + 0.1))
                        }
                        className="p-1 rounded hover:bg-gray-200 cursor-pointer"
                        title="Zoom in"
                      >
                        <MagnifyingGlassPlusIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                  <div className="overflow-auto max-h-96 bg-gray-200 flex justify-center">
                    <Document
                      file={preview}
                      onLoadSuccess={onDocumentLoadSuccess}
                      loading={
                        <div className="flex items-center justify-center p-8">
                          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent"></div>
                        </div>
                      }
                      error={
                        <div className="p-8 text-red-600">
                          Failed to load PDF. Please try a different file.
                        </div>
                      }
                    >
                      <Page
                        pageNumber={pageNumber}
                        scale={scale}
                        renderTextLayer={true}
                        renderAnnotationLayer={true}
                      />
                    </Document>
                  </div>
                </div>
              )}

              {/* Image Preview */}
              {isImage && (
                <div className="border border-gray-300 rounded-lg overflow-hidden bg-gray-100 flex justify-center p-4">
                  <img
                    src={preview}
                    alt="Receipt preview"
                    className="max-w-full max-h-96 object-contain"
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </DialogBody>
      <DialogActions>
        <div className="flex items-center gap-2 w-full justify-between">
          <div>
            {existingReceipt && !file && (
              <Button
                onClick={handleDelete}
                disabled={deleting}
                color="red"
                outline
              >
                <TrashIcon className="h-4 w-4 mr-2" />
                {deleting ? 'Deleting...' : 'Delete Existing'}
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button plain onClick={onClose} disabled={uploading || deleting}>
              Cancel
            </Button>
            {file && (
              <Button onClick={handleUpload} disabled={uploading} color="blue">
                {uploading ? 'Uploading...' : 'Upload & Save'}
              </Button>
            )}
          </div>
        </div>
      </DialogActions>
    </Dialog>
  );
}
