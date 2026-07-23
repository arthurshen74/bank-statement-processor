import { useState } from 'react';
import { Document, Page } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import {
  MagnifyingGlassPlusIcon,
  MagnifyingGlassMinusIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';

/**
 * PDF viewer component with navigation and zoom controls
 * @param {string} fileUrl - URL or blob URL of the PDF file
 * @param {number} initialScale - Initial scale (default: 1.0)
 * @param {boolean} showControls - Show navigation and zoom controls (default: true)
 */
export default function PDFViewer({ fileUrl, initialScale = 1.0, showControls = true }) {
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(initialScale);

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
    setPageNumber(1);
  };

  const goToPreviousPage = () => {
    setPageNumber((prev) => Math.max(1, prev - 1));
  };

  const goToNextPage = () => {
    setPageNumber((prev) => Math.min(numPages || prev, prev + 1));
  };

  const zoomIn = () => {
    setScale((prev) => Math.min(2.0, prev + 0.1));
  };

  const zoomOut = () => {
    setScale((prev) => Math.max(0.5, prev - 0.1));
  };

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden">
      {/* Controls */}
      {showControls && (
        <div className="bg-gray-100 p-2 flex items-center justify-between">
          {/* Page Navigation */}
          <div className="flex items-center gap-2">
            <button
              onClick={goToPreviousPage}
              disabled={pageNumber <= 1}
              className="p-1 rounded hover:bg-gray-200 disabled:opacity-50 cursor-pointer"
              aria-label="Previous page"
            >
              <ChevronLeftIcon className="h-4 w-4" />
            </button>
            <span className="text-sm text-gray-700">
              Page {pageNumber} of {numPages || '?'}
            </span>
            <button
              onClick={goToNextPage}
              disabled={pageNumber >= (numPages || 1)}
              className="p-1 rounded hover:bg-gray-200 disabled:opacity-50 cursor-pointer"
              aria-label="Next page"
            >
              <ChevronRightIcon className="h-4 w-4" />
            </button>
          </div>

          {/* Zoom Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={zoomOut}
              className="p-1 rounded hover:bg-gray-200 cursor-pointer"
              aria-label="Zoom out"
            >
              <MagnifyingGlassMinusIcon className="h-4 w-4" />
            </button>
            <span className="text-sm text-gray-700">{Math.round(scale * 100)}%</span>
            <button
              onClick={zoomIn}
              className="p-1 rounded hover:bg-gray-200 cursor-pointer"
              aria-label="Zoom in"
            >
              <MagnifyingGlassPlusIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* PDF Display */}
      <div className={`overflow-auto bg-gray-200 flex justify-center ${showControls ? 'max-h-96' : 'max-h-64'}`}>
        <Document file={fileUrl} onLoadSuccess={onDocumentLoadSuccess}>
          <Page pageNumber={pageNumber} scale={scale} />
        </Document>
      </div>
    </div>
  );
}
