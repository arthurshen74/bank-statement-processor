import React from 'react';

const LoadingSpinner = ({ size = 'md', fullScreen = false }) => {
  const sizes = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  };

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-gray-100 bg-opacity-75 flex justify-center items-center z-50">
        <div className="flex flex-col items-center">
          <div
            className={`animate-spin rounded-full border-t-2 border-blue-500 ${sizes[size]}`}
          ></div>
          <p className="mt-2 text-gray-700">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-center items-center p-4">
      <div
        className={`animate-spin rounded-full border-t-2 border-blue-500 ${sizes[size]}`}
      ></div>
    </div>
  );
};

export default LoadingSpinner;
