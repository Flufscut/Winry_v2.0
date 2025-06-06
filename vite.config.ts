import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

export default defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // REF: Vendor chunk optimization - separate large libraries
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom')) {
              return 'vendor';
            }
            if (id.includes('@tanstack/react-query')) {
              return 'query';
            }
            if (id.includes('@radix-ui')) {
              return 'ui';
            }
            if (id.includes('framer-motion')) {
              return 'motion';
            }
            if (id.includes('lucide-react')) {
              return 'icons';
            }
            if (id.includes('recharts')) {
              return 'charts';
            }
            // REF: Group other vendor dependencies
            return 'vendor-misc';
          }
          
          // REF: Split heavy components into separate chunks
          if (id.includes('analytics-dashboard') || id.includes('enhanced-loading')) {
            return 'analytics';
          }
          if (id.includes('prospect-') || id.includes('csv-upload')) {
            return 'prospects';
          }
          if (id.includes('settings-menu') || id.includes('reply-io-settings') || id.includes('ClientManagement')) {
            return 'settings';
          }
        }
      }
    },
    chunkSizeWarningLimit: 1000,
    // REF: Enable source maps for better debugging but minimize size impact
    sourcemap: false,
    // REF: Optimize CSS code splitting
    cssCodeSplit: true,
    // REF: Enable minification for production
    minify: 'esbuild',
    target: 'esnext'
  },
  // REF: Optimize dependency pre-bundling
  optimizeDeps: {
    include: [
      'react',
      'react-dom', 
      '@tanstack/react-query',
      'lucide-react',
      'framer-motion',
      'lodash',
      'lodash/get',
      'recharts'
    ],
    exclude: [
      // REF: Exclude large optional dependencies that can be lazy loaded
      '@radix-ui/react-navigation-menu'
    ]
  }
});
