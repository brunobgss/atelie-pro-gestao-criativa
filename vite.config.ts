import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { apiPlugin } from "./vite-plugin-api.js";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false, // Desabilitar overlay de erros para melhor UX
    },
  },
  plugins: [react(), apiPlugin()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Otimizações de build
    target: "esnext",
    minify: "esbuild",
    sourcemap: true, // Habilitar sourcemaps para melhor debugging no Sentry
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom"],
          ui: ["@radix-ui/react-dialog", "@radix-ui/react-dropdown-menu"],
        },
      },
    },
  },
  optimizeDeps: {
    // Pré-carregar dependências importantes
    include: ["react", "react-dom", "react-router-dom"],
  },
}));
