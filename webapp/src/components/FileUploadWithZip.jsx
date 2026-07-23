import { useState, useCallback } from 'react';
import { Heading } from '../ui/heading';

const FileUploadWithZip = ({ onFileUpload, loading, zipPatternHelpText }) => {
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const validateFile = (file) => {
    const validTypes = [
      'application/pdf',
      'application/zip',
      'application/x-zip-compressed',
    ];
    const fileName = file.name.toLowerCase();

    if (
      validTypes.includes(file.type) ||
      fileName.endsWith('.pdf') ||
      fileName.endsWith('.zip')
    ) {
      return true;
    }
    return false;
  };

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        const file = e.dataTransfer.files[0];
        if (validateFile(file)) {
          onFileUpload(file);
        } else {
          alert('Please upload a PDF or ZIP file');
        }
      }
    },
    [onFileUpload]
  );

  const handleChange = useCallback(
    (e) => {
      e.preventDefault();
      if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0];
        if (validateFile(file)) {
          onFileUpload(file);
        } else {
          alert('Please upload a PDF or ZIP file');
        }
      }
    },
    [onFileUpload]
  );

  return (
    <div className="rounded-lg shadow-sm border border-gray-200 p-6">
      <Heading className="mb-4">Upload File</Heading>

      <div
        className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          dragActive
            ? 'border-blue-400 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
        } ${loading ? 'opacity-50 pointer-events-none' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          type="file"
          accept=".pdf,.zip"
          onChange={handleChange}
          disabled={loading}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />

        <div className="space-y-2">
          <svg
            className="mx-auto h-12 w-12 text-gray-600 stroke-gray-600 dark:stroke-gray-500"
            fill="none"
            viewBox="0 0 48 48"
          >
            <path
              d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>

          <div className="text-sm text-gray-600 dark:text-gray-400">
            <span className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 cursor-pointer">
              Click to upload
            </span>{' '}
            or drag and drop
          </div>

          <p className="text-xs text-gray-500 dark:text-gray-400">
            Single PDF or ZIP file containing multiple PDFs
          </p>
          {zipPatternHelpText && (
            <p className="text-xs text-gray-400 dark:text-gray-500">
              {zipPatternHelpText}
            </p>
          )}
        </div>
      </div>

      {loading && (
        <div className="mt-4 text-sm text-gray-600 text-center dark:text-gray-400">
          Processing your file(s)...
        </div>
      )}
    </div>
  );
};

export default FileUploadWithZip;
