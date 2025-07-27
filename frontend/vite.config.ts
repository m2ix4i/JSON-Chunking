/// <reference types="@testing-library/jest-dom" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// Bundle analyzer (only in analyze mode)
const bundleAnalyzer = () => {
  if (process.env.ANALYZE) {
    try {
      const { visualizer } = require('rollup-plugin-visualizer');
      return visualizer({
        filename: 'dist/bundle-analysis.html',
        open: true,
        gzipSize: true,
        brotliSize: true,
      });
    } catch (e) {
      console.warn('Bundle analyzer not available. Install with: npm install --save-dev rollup-plugin-visualizer');
      return null;
    }
  }
  return null;
};

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), bundleAnalyzer()].filter(Boolean),
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@components': resolve(__dirname, './src/components'),
      '@services': resolve(__dirname, './src/services'),
      '@types': resolve(__dirname, './src/types'),
      '@utils': resolve(__dirname, './src/utils'),
      '@hooks': resolve(__dirname, './src/hooks'),
      '@stores': resolve(__dirname, './src/stores'),
      '@pages': resolve(__dirname, './src/pages'),
      '@data': resolve(__dirname, './src/data')
    }
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8001',
        changeOrigin: true,
        secure: false
      },
      '/ws': {
        target: 'ws://localhost:8001',
        ws: true,
        changeOrigin: true
      }
    }
  },
  build: {
    target: 'esnext',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,      // Remove console.log in production
        drop_debugger: true,
      },
    },
    outDir: 'dist',
    sourcemap: true,
    chunkSizeWarningLimit: 500,
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React ecosystem
          'react-core': ['react', 'react-dom'],
          'react-router': ['react-router-dom'],
          
          // UI Library - split by usage patterns
          'mui-core': ['@mui/material/styles', '@mui/material/CssBaseline'],
          'mui-components': [
            '@mui/material/Button', 
            '@mui/material/Card', 
            '@mui/material/CardContent',
            '@mui/material/Typography',
            '@mui/material/Box',
            '@mui/material/Container',
            '@mui/material/Grid',
            '@mui/material/Paper',
            '@mui/material/Stack',
            '@mui/material/Divider'
          ],
          'mui-forms': [
            '@mui/material/TextField',
            '@mui/material/FormControl',
            '@mui/material/FormLabel',
            '@mui/material/FormHelperText',
            '@mui/material/Select',
            '@mui/material/MenuItem',
            '@mui/material/Checkbox',
            '@mui/material/Radio',
            '@mui/material/Switch'
          ],
          'mui-navigation': [
            '@mui/material/AppBar',
            '@mui/material/Toolbar',
            '@mui/material/Drawer',
            '@mui/material/List',
            '@mui/material/ListItem',
            '@mui/material/ListItemText',
            '@mui/material/ListItemIcon',
            '@mui/material/Breadcrumbs',
            '@mui/material/Tabs',
            '@mui/material/Tab'
          ],
          'mui-feedback': [
            '@mui/material/Alert',
            '@mui/material/Snackbar',
            '@mui/material/Dialog',
            '@mui/material/DialogTitle',
            '@mui/material/DialogContent',
            '@mui/material/DialogActions',
            '@mui/material/CircularProgress',
            '@mui/material/LinearProgress',
            '@mui/material/Skeleton'
          ],
          'mui-icons': ['@mui/icons-material'],
          
          // Data & State Management
          'data-layer': ['@tanstack/react-query', 'zustand'],
          'http-client': ['axios'],
          
          // Development tools (dev-only)
          'dev-tools': ['@tanstack/react-query-devtools']
        },
        // Dynamic chunk naming for better caching
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          const extType = assetInfo.name?.split('.').pop();
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(extType || '')) {
            return 'assets/images/[name]-[hash][extname]';
          }
          if (/css/i.test(extType || '')) {
            return 'assets/css/[name]-[hash][extname]';
          }
          return 'assets/[ext]/[name]-[hash][extname]';
        }
      }
    }
  },
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString())
  }
})