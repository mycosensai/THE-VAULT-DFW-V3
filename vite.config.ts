import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8788',
        changeOrigin: true,
      }
    }
  },
  resolve: {
    alias: {
      "@": new URL("./src", import.meta.url).pathname,
      "@contracts": new URL("./contracts", import.meta.url).pathname,
      "@db": new URL("./db", import.meta.url).pathname,
      "db": new URL("./db", import.meta.url).pathname,
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom"],
          router: ["react-router"],
          trpc: ["@trpc/client", "@trpc/react-query"],
        },
      },
    },
  },
})
