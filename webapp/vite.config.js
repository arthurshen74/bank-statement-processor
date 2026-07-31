import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    outDir: path.resolve(__dirname, '../backend/wwwroot'),
    emptyOutDir: true,
  },
  // No dev proxy: the API client builds absolute URLs from public/config.json
  // (see src/api/client.js), and page images are served from GridFS through the
  // authenticated C# API rather than from the Python service's /static route.
});
