import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vite configuration for the React version of Expense Tracker.
// The app is a pure front-end SPA: one index.html, and every screen
// (login, signup, user dashboard, admin dashboard) is a React route.
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    open: false,
    // Allows the app to be opened through a hosted preview URL as well as
    // http://localhost:5173 in VS Code. Local development is unaffected.
    allowedHosts: true
  },
  build: {
    outDir: 'dist',
    sourcemap: false
  },
  test: {
    environment: 'jsdom',
    globals: false,
    include: ['test/**/*.test.{js,jsx}'],
    setupFiles: ['./test/setup.js']
  }
});
