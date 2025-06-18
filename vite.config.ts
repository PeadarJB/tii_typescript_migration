import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';
import { visualizer } from 'rollup-plugin-visualizer';
import type { UserConfig, PluginOption } from 'vite';

// https://vitejs.dev/config/
export default defineConfig(({ mode }): UserConfig => {
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    plugins: [
      react({
        // Babel plugins for development
        babel: {
          plugins: [
            // Add any babel plugins here if needed
          ],
        },
      }),
      tsconfigPaths(),
      visualizer({
        filename: './dist/stats.html',
        open: false,
        gzipSize: true,
        brotliSize: true,
      }) as PluginOption,
    ],
    
    base: './',
    
    server: {
      port: 3000,
      open: true,
      cors: true,
      // Proxy configuration if needed for API calls
      proxy: {
        // Example: '/api': 'http://localhost:8080'
      },
    },
    
    preview: {
      port: 4173,
      open: true,
    },
    
    build: {
      target: 'es2020',
      outDir: 'dist',
      assetsDir: 'assets',
      sourcemap: mode === 'development',
      minify: mode === 'production' ? 'esbuild' : false,
      reportCompressedSize: true,
      chunkSizeWarningLimit: 1000,
      
      rollupOptions: {
        output: {
          // Manual chunk splitting for better caching
          manualChunks: {
            // React ecosystem
            'react-vendor': ['react', 'react-dom', 'react-error-boundary'],
            
            // Ant Design
            'antd-vendor': ['antd', '@ant-design/icons', '@ant-design/pro-components'],
            
            // ArcGIS - This is a large library, consider dynamic imports
            'arcgis-vendor': ['@arcgis/core'],
            
            // Charting and visualization
            'chart-vendor': ['chart.js'],
            
            // PDF generation
            'pdf-vendor': ['jspdf', 'html2canvas'],
            
            // Utilities
            'utils-vendor': ['lodash-es', 'date-fns', 'classnames', 'dompurify'],
          },
          
          // Asset file naming
          assetFileNames: (assetInfo) => {
            const info = assetInfo.name?.split('.');
            const ext = info?.[info.length - 1];
            
            if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext ?? '')) {
              return `assets/images/[name]-[hash][extname]`;
            }
            
            if (/woff2?|ttf|otf|eot/i.test(ext ?? '')) {
              return `assets/fonts/[name]-[hash][extname]`;
            }
            
            return `assets/[name]-[hash][extname]`;
          },
          
          chunkFileNames: 'assets/js/[name]-[hash].js',
          entryFileNames: 'assets/js/[name]-[hash].js',
        },
      },
    },
    
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'antd',
        '@ant-design/icons',
        'lodash-es',
        'chart.js',
      ],
      exclude: [
        '@arcgis/core', // ArcGIS has issues with pre-bundling
      ],
    },
    
    resolve: {
      alias: {
        // Path aliases are handled by vite-tsconfig-paths plugin
        // But we can add additional ones here if needed
      },
    },
    
    define: {
      // Define global constants
      __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
      __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
      __DEV__: mode === 'development',
    },
    
    esbuild: {
      // ESBuild options for faster builds
      logOverride: { 'this-is-undefined-in-esm': 'silent' },
      tsconfigRaw: {
        compilerOptions: {
          // Preserve JSX for React 17+
          jsx: 'react-jsx',
        },
      },
    },
    
    css: {
      preprocessorOptions: {
        less: {
          javascriptEnabled: true,
          // Add any Less variables or modifyVars here
          modifyVars: {
            '@primary-color': '#003d82',
          },
        },
      },
      modules: {
        localsConvention: 'camelCase',
      },
    },
  };
});