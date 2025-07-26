import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { visualizer } from 'rollup-plugin-visualizer'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // Bundle analyzer - generates stats.html in dist folder
    process.env.ANALYZE && visualizer({
      filename: 'dist/stats.html',
      open: true,
      gzipSize: true,
      brotliSize: true,
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@components': resolve(__dirname, './src/components'),
      '@services': resolve(__dirname, './src/services'),
      '@types': resolve(__dirname, './src/types'),
      '@utils': resolve(__dirname, './src/utils'),
      '@hooks': resolve(__dirname, './src/hooks'),
      '@stores': resolve(__dirname, './src/stores'),
      '@pages': resolve(__dirname, './src/pages')
    }
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
    outDir: 'dist',
    sourcemap: true,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: process.env.NODE_ENV === 'production',
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info'],
      },
      mangle: {
        safari10: true,
      },
    },
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React ecosystem
          'react-core': ['react', 'react-dom'],
          'react-router': ['react-router-dom'],
          
          // UI Library - split by usage patterns
          'mui-core': [
            '@mui/material/styles',
            '@mui/material/CssBaseline',
            '@mui/material/ThemeProvider',
            '@emotion/react',
            '@emotion/styled'
          ],
          'mui-components': [
            '@mui/material/Button',
            '@mui/material/Card',
            '@mui/material/CardContent',
            '@mui/material/Typography',
            '@mui/material/Box',
            '@mui/material/Container',
            '@mui/material/Paper',
            '@mui/material/TextField',
            '@mui/material/Alert',
            '@mui/material/Skeleton'
          ],
          'mui-icons': ['@mui/icons-material'],
          'mui-data': ['@mui/x-data-grid'],
          
          // Data & State Management
          'data-layer': ['@tanstack/react-query', 'zustand'],
          'http-client': ['axios'],
          
          // Visualization (for lazy-loaded charts)
          'charts': ['recharts'],
          
          // Utility libraries
          'utilities': ['react-dropzone'],
          
          // Development tools (dev-only)
          'dev-tools': ['@tanstack/react-query-devtools'],
        },
        // Optimized chunk naming for better caching
        chunkFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId
            ? chunkInfo.facadeModuleId.split('/').pop()?.replace('.tsx', '').replace('.ts', '')
            : 'chunk';
          return `assets/${facadeModuleId}-[hash].js`;
        },
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
    // Performance budgets and warnings
    chunkSizeWarningLimit: 500,
    assetsInlineLimit: 4096, // Inline assets smaller than 4KB
  },
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
  // Optimized dependency pre-bundling
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@mui/material',
      '@mui/icons-material',
      '@tanstack/react-query',
      'zustand',
      'axios'
    ],
    exclude: [
      // Exclude dev-only dependencies
      '@tanstack/react-query-devtools'
    ]
  },
  // Performance optimizations
  esbuild: {
    // Remove console.log in production
    drop: process.env.NODE_ENV === 'production' ? ['console', 'debugger'] : [],
  }
})