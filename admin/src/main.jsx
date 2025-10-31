/*
  Admin entrypoint
  - Loads vendor styles and mounts the admin React app with AuthProvider
*/
import { createRoot } from "react-dom/client";
import "react-quill/dist/quill.snow.css";
import "jsvectormap/dist/css/jsvectormap.css";
import "react-toastify/dist/ReactToastify.css";
import "react-modal-video/css/modal-video.min.css";
// Bootstrap JS is imported on-demand from ESM inside components (e.g., Tooltip)
import "lightgallery/css/lightgallery.css";
import "lightgallery/css/lg-zoom.css";
import "lightgallery/css/lg-thumbnail.css";
// Moved global CSS from index.html into module imports so Vite can process them
import App from "./App.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";

createRoot(document.getElementById("root")).render(
  <AuthProvider>
    <App />
  </AuthProvider>
);
