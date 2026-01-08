import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  
  // SPA fallback — все пути ведут на index.html
  appType: 'spa',
  
  // Оптимизация сборки
  build: {
    // Минимальный целевой браузер
    target: 'es2020',
    
    // Размер предупреждения для chunk'ов
    chunkSizeWarningLimit: 500,
    
    // Отключаем source maps в production
    sourcemap: false,
    
    // Минификация
    minify: 'esbuild',
    
    // CSS code splitting
    cssCodeSplit: true,
    
    // Rollup options
    rollupOptions: {
      output: {
        // Разделение на чанки по вендорам
        manualChunks: {
          // React core
          'react-vendor': ['react', 'react-dom'],
          // Иконки отдельно (они могут быть большими)
          'icons': ['lucide-react'],
        },
        // Именование файлов для лучшего кэширования
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name || '';
          if (/\.css$/.test(info)) {
            return 'assets/css/[name]-[hash][extname]';
          }
          if (/\.(png|jpe?g|gif|svg|webp|ico)$/.test(info)) {
            return 'assets/images/[name]-[hash][extname]';
          }
          if (/\.(woff2?|eot|ttf|otf)$/.test(info)) {
            return 'assets/fonts/[name]-[hash][extname]';
          }
          return 'assets/[name]-[hash][extname]';
        },
      },
    },
  },
  
  // Оптимизация dev server
  server: {
    // Быстрый HMR
    hmr: {
      overlay: true,
    },
  },
  
  // Оптимизация зависимостей
  optimizeDeps: {
    include: ['react', 'react-dom', 'lucide-react'],
  },
  
  // Определение переменных
  define: {
    // Убираем dev warnings в production
    __DEV__: JSON.stringify(process.env.NODE_ENV !== 'production'),
  },
});
