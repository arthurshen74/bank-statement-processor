import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { router } from './routes';
import './index.css';
import { pdfjs } from 'react-pdf';
import { loadConfig } from './config';
import { AuthProvider } from './contexts/AuthContext';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

// Load runtime configuration before rendering the app
loadConfig().then(() => {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </React.StrictMode>
  );
}).catch((error) => {
  console.error('Failed to load application configuration:', error);
  // Show error message to user
  document.getElementById('root').innerHTML = `
    <div style="display: flex; align-items: center; justify-content: center; height: 100vh; font-family: system-ui;">
      <div style="text-align: center; max-width: 500px; padding: 2rem;">
        <h1 style="color: #dc2626; margin-bottom: 1rem;">Configuration Error</h1>
        <p style="color: #6b7280;">Failed to load application configuration. Please check that config.json is accessible.</p>
        <p style="color: #9ca3af; font-size: 0.875rem; margin-top: 1rem;">${error.message}</p>
      </div>
    </div>
  `;
});
