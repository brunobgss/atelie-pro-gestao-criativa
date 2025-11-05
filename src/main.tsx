import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Sistema de rastreamento de erros é inicializado automaticamente
// Veja: src/utils/errorTracking.ts

createRoot(document.getElementById("root")!).render(<App />);
