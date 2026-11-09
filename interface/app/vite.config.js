import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// En desarrollo el navegador habla con /graphql del mismo origen y Vite lo reenvía al gateway.
export default defineConfig({
  plugins: [react()],
  build: { chunkSizeWarningLimit: 1500 },
  server: {
    port: 3000,
    proxy: { '/graphql': process.env.GATEWAY_URL || 'http://localhost:5000' },
  },
});
