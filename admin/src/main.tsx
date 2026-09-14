import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Toaster } from "sonner";
import "./index.css";
import "swiper/swiper-bundle.css";
import "flatpickr/dist/flatpickr.css";
import App from "./App.tsx";
import { AppWrapper } from "./components/common/PageMeta.tsx";
import { ErrorBoundary } from "./components/common/ErrorBoundary.tsx";
import { ThemeProvider } from "./context/ThemeContext.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <ThemeProvider>
        <AppWrapper>
          <Toaster richColors position="top-right" />
          <App />
        </AppWrapper>
      </ThemeProvider>
    </ErrorBoundary>
  </StrictMode>,
);
