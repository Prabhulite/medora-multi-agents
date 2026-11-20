import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig(({ mode }) => ({
  root: path.resolve(__dirname, mode === 'doctor' ? '../doctor-frontend' : '../admin-frontend'),
  publicDir: path.resolve(__dirname, 'public'),
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      react: path.resolve(__dirname, 'node_modules/react'),
      'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
      'react-router-dom': path.resolve(__dirname, 'node_modules/react-router-dom'),
      axios: path.resolve(__dirname, 'node_modules/axios'),
      antd: path.resolve(__dirname, 'node_modules/antd'),
    },
    dedupe: ['react', 'react-dom'],
  },
  server: {
    host: mode === 'doctor' ? '127.0.0.1' : 'localhost',
    port: mode === 'doctor' ? 5165 : 5164,
    strictPort: true,
    fs: { allow: [path.resolve(__dirname, '..')] },
    proxy: { '/api': { target: 'http://localhost:5163', changeOrigin: true } },
  },
}));
