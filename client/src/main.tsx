import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { djangoQueryClient } from "@/lib/djangoClient";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={djangoQueryClient}>
    <App />
  </QueryClientProvider>
);
