import React from 'react';
import { Heading } from '../ui/heading';

const PdfLibToleranceControls = ({ tolerances, onChange, disabled }) => {
  return (
    <div className="rounded-lg shadow-sm border border-gray-400 dark:border-gray-200 p-6">
      <Heading>Table Extraction Settings</Heading>
      <p className="text-sm text-gray-600 mb-4 dark:text-gray-300">
        Configure extraction parameters for native PDF processing using
        pdfplumber. Values are in points (PDF coordinate system).
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        <div>
          <label
            htmlFor="line-tolerance"
            className="block text-sm font-medium text-gray-700 mb-2 dark:text-gray-300"
          >
            Line Tolerance
          </label>
          <div className="flex items-center space-x-2">
            <input
              id="line-tolerance"
              type="range"
              min="0.5"
              max="5.0"
              step="0.1"
              value={tolerances.lineTolerance}
              onChange={(e) =>
                onChange('lineTolerance', parseFloat(e.target.value))
              }
              disabled={disabled}
              className="flex-1"
            />
            <span className="w-12 text-sm font-medium text-gray-900 dark:text-gray-300">
              {tolerances.lineTolerance}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1 dark:text-gray-400">
            Controls row grouping and table line snapping tolerance
          </p>
        </div>

        <div>
          <label
            htmlFor="table-padding"
            className="block text-sm font-medium text-gray-700 mb-2 dark:text-gray-300"
          >
            Table Padding
          </label>
          <div className="flex items-center space-x-2">
            <input
              id="table-padding"
              type="range"
              min="0.5"
              max="10.0"
              step="0.5"
              value={tolerances.tablePadding}
              onChange={(e) =>
                onChange('tablePadding', parseFloat(e.target.value))
              }
              disabled={disabled}
              className="flex-1"
            />
            <span className="w-12 text-sm font-medium text-gray-900 dark:text-gray-300">
              {tolerances.tablePadding}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1 dark:text-gray-400">
            Padding applied to all sides of the detected table boundary
          </p>
        </div>

        <div>
          <label
            htmlFor="intersection-tolerance"
            className="block text-sm font-medium text-gray-700 mb-2 dark:text-gray-300"
          >
            Intersection Tolerance
          </label>
          <div className="flex items-center space-x-2">
            <input
              id="intersection-tolerance"
              type="range"
              min="1.0"
              max="10.0"
              step="0.5"
              value={tolerances.intersectionTolerance}
              onChange={(e) =>
                onChange('intersectionTolerance', parseFloat(e.target.value))
              }
              disabled={disabled}
              className="flex-1"
            />
            <span className="w-12 text-sm font-medium text-gray-900 dark:text-gray-300">
              {tolerances.intersectionTolerance}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1 dark:text-gray-400">
            Controls detection of intersecting lines in table structure
          </p>
        </div>

        <div>
          <label
            htmlFor="text-x-tolerance"
            className="block text-sm font-medium text-gray-700 mb-2 dark:text-gray-300"
          >
            Text X Tolerance
          </label>
          <div className="flex items-center space-x-2">
            <input
              id="text-x-tolerance"
              type="range"
              min="1.0"
              max="10.0"
              step="0.5"
              value={tolerances.textXTolerance}
              onChange={(e) =>
                onChange('textXTolerance', parseFloat(e.target.value))
              }
              disabled={disabled}
              className="flex-1"
            />
            <span className="w-12 text-sm font-medium text-gray-900 dark:text-gray-300">
              {tolerances.textXTolerance}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1 dark:text-gray-400">
            Controls horizontal text grouping in table extraction
          </p>
        </div>

        <div>
          <label
            htmlFor="text-y-tolerance"
            className="block text-sm font-medium text-gray-700 mb-2 dark:text-gray-300"
          >
            Text Y Tolerance
          </label>
          <div className="flex items-center space-x-2">
            <input
              id="text-y-tolerance"
              type="range"
              min="1.0"
              max="10.0"
              step="0.5"
              value={tolerances.textYTolerance}
              onChange={(e) =>
                onChange('textYTolerance', parseFloat(e.target.value))
              }
              disabled={disabled}
              className="flex-1"
            />
            <span className="w-12 text-sm font-medium text-gray-900 dark:text-gray-300">
              {tolerances.textYTolerance}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1 dark:text-gray-400">
            Controls vertical text grouping in table extraction
          </p>
        </div>
      </div>
    </div>
  );
};

export default PdfLibToleranceControls;
