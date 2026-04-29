import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

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
      "@": path.resolve(__dirname),
      "@contracts": path.resolve(__dirname, "contracts"),
      "@db": path.resolve(__dirname, "db"),
      "db": path.resolve(__dirname, "db"),
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
