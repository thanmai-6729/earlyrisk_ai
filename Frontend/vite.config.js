import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Fallback to index.html for SPA routing
    historyApiFallback: true,
  },
  // Ensure proper SPA routing in preview mode
  preview: {
    port: 5173,
  },
  build: {
    // Generate proper chunk names
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          supabase: ['@supabase/supabase-js'],
          charts: ['chart.js'],
        },
      },
    },
  },
});
