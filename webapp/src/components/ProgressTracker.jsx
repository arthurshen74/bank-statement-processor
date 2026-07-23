import React, { useEffect, useRef, useState } from 'react';
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline';

const ProgressTracker = ({ progress, loading }) => {
  const scrollRef = useRef(null);
  const [expanded, setExpanded] = useState(false);

  const getIcon = (type) => {
    switch (type) {
      case 'success':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'warning':
        return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />;
      default:
        return <InformationCircleIcon className="h-5 w-5 text-blue-500" />;
    }
  };

  const getTextColor = (type) => {
    switch (type) {
      case 'success':
        return 'text-green-700';
      case 'warning':
        return 'text-yellow-700';
      default:
        return 'text-gray-700';
    }
  };

  // get the last progress item that has a type of 'progress'
  const lastProgress = [...progress]
    .reverse()
    .find((item) => item.type === 'progress');

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [progress]);

  return (
    <div
      className={`space-y-2 bg-white rounded-lg shadow-sm border border-gray-200 p-4 relative ${
        loading ? 'pt-6' : ''
      }`}
    >
      <div className="w-full flex justify-between">
        <div className="flex justify-start items-center gap-2">
          {!loading && (
            <span className="text-sm font-semibold text-gray-900">
              Processing Logs
            </span>
          )}
          {loading && (
            <div className="flex items-center space-x-3 py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
              <span className="text-sm text-gray-600">
                {lastProgress
                  ? `Processing ${lastProgress.current} of ${
                      lastProgress.total
                    }...(${Math.round(
                      (lastProgress.current / lastProgress.total) * 100
                    )}%)`
                  : 'Processing...'}
              </span>
            </div>
          )}
        </div>
        <button
          onClick={() => setExpanded((prev) => !prev)}
          className="cursor-pointer flex items-center space-x-1 text-gray-500 hover:text-gray-700 focus:outline-none"
        >
          <ChevronDownIcon
            className={`size-6 stroke-2 transform transition-transform duration-300 ${
              expanded ? '' : 'rotate-90'
            }`}
          />
        </button>
      </div>

      {loading && lastProgress && (
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{
              width: `${(lastProgress.current / lastProgress.total) * 100}%`,
            }}
          />
        </div>
      )}

      <div
        className={`space-y-2 overflow-y-auto ${
          loading ? 'max-h-[75vh]' : expanded ? 'max-h-[50vh]' : 'max-h-0'
        }`}
      >
        {progress.map((item, index) => (
          <div key={index} className="flex items-start space-x-2">
            {getIcon(item.type)}
            <div className="flex-1">
              <p className={`text-sm ${getTextColor(item.type)}`}>
                {item.message}
              </p>
            </div>
            <span className="text-xs text-gray-400">
              {new Date(item.timestamp).toLocaleTimeString()}
            </span>
          </div>
        ))}
        <div ref={scrollRef} className="h-0.5"></div>
      </div>
    </div>
  );
};

export default ProgressTracker;
