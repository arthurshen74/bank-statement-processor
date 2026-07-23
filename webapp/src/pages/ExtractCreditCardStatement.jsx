import { useState, useCallback } from 'react';
import FileUploadWithZip from '../components/FileUploadWithZip';
import ProgressTracker from '../components/ProgressTracker';
import { Heading } from '../ui/heading';
import { getConfig } from '../config';
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';

function ExtractCreditCardStatement() {
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState([]);
  const [error, setError] = useState(null);

  const handleFileUpload = useCallback(async (file) => {
    setLoading(true);
    setError(null);
    setProgress([]);
    setResults(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const config = getConfig();
      const response = await fetch(
        `${config.pythonApiBaseUrl}/process-creditcard-pdftotext`,
        {
          method: 'POST',
          body: formData,
        }
      );

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));

              if (data.type === 'status' || data.type === 'progress') {
                setProgress((prev) => [
                  ...prev,
                  {
                    type: data.type,
                    message: data.message,
                    timestamp: new Date().toISOString(),
                    current: data.current,
                    total: data.total,
                  },
                ]);
              } else if (data.type === 'warning') {
                setProgress((prev) => [
                  ...prev,
                  {
                    type: 'warning',
                    message: data.message,
                    timestamp: new Date().toISOString(),
                  },
                ]);
              } else if (data.type === 'error') {
                setError(data.message);
                setLoading(false);
              } else if (data.type === 'complete') {
                setResults(data.results);
                setProgress((prev) => [
                  ...prev,
                  {
                    type: 'success',
                    message: data.message,
                    timestamp: new Date().toISOString(),
                  },
                ]);
                setLoading(false);
              }
            } catch (e) {
              console.error('Error parsing SSE data:', e);
            }
          }
        }
      }
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }, []);

  const resetPage = () => {
    setResults(null);
    setError(null);
    setProgress([]);
    setLoading(false);
  };

  return (
    <div className="p-2 max-w-7xl mx-auto space-y-6">
      <div className="mb-6">
        <div className="mb-2 w-full flex justify-between">
          <Heading>Extract Credit Card Statements</Heading>
          {results && (
            <button
              onClick={resetPage}
              className="cursor-pointer inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Reset
            </button>
          )}
        </div>
        <p className="text-gray-600 dark:text-gray-400">
          Upload single PDF or ZIP files containing multiple PDFs.
        </p>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800 font-medium dark:text-red-400">Error</p>
          <p className="text-red-600 text-sm mt-1 dark:text-red-500">{error}</p>
        </div>
      )}

      {!results && !loading && (
        <div className="space-y-6">
          <FileUploadWithZip
            onFileUpload={handleFileUpload}
            loading={loading}
            zipPatternHelpText='For ZIP files: Only PDFs matching "Ihre Kreditkartenabrechnung vom" pattern will be processed'
          />
        </div>
      )}

      {progress.length > 0 && (
        <ProgressTracker progress={progress} loading={loading} />
      )}

      {results && (
        <div className="mt-6 space-y-4">
          {results.success && results.savedStatements && results.savedStatements.length > 0 ? (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6">
              <div className="flex items-start">
                <CheckCircleIcon className="h-8 w-8 text-green-500 dark:text-green-400 mr-4 flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-green-900 dark:text-green-100 mb-2">
                    Successfully Processed {results.savedStatements.length} Statement{results.savedStatements.length > 1 ? 's' : ''}
                  </h3>
                  <div className="space-y-3 mt-4">
                    {results.savedStatements.map((statement, index) => (
                      <div
                        key={index}
                        className="bg-white dark:bg-gray-800 rounded-md p-4 border border-green-100 dark:border-green-900"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="font-medium text-gray-900 dark:text-gray-100">
                              {statement.filename}
                            </p>
                            <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-gray-600 dark:text-gray-400">
                              <div>
                                <span className="font-medium">Statement Date:</span>{' '}
                                {statement.statementDate || 'N/A'}
                              </div>
                              <div>
                                <span className="font-medium">Transactions:</span>{' '}
                                {statement.transactionCount || 0}
                              </div>
                              <div>
                                <span className="font-medium">Pages:</span>{' '}
                                {statement.pageCount || 0}
                              </div>
                              <div>
                                <span className="font-medium">Database ID:</span>{' '}
                                <code className="text-xs bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded">
                                  {statement.statementId || 'N/A'}
                                </code>
                              </div>
                            </div>
                          </div>
                          <div className="ml-4">
                            {statement.savedToDatabase ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                Saved
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                                Not Saved
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="mt-4 text-sm text-green-700 dark:text-green-300">
                    Your statements have been saved to the database. You can view and manage them in the Statements page.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
              <div className="flex items-start">
                <XCircleIcon className="h-8 w-8 text-red-500 dark:text-red-400 mr-4 flex-shrink-0" />
                <div>
                  <h3 className="text-lg font-semibold text-red-900 dark:text-red-100 mb-2">
                    Processing Failed
                  </h3>
                  <p className="text-sm text-red-700 dark:text-red-300">
                    No statements could be processed successfully. Please check the upload requirements and try again.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default ExtractCreditCardStatement;
