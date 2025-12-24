/*
  Frontend entrypoint (public site)
  - Loads global styles/vendor CSS and mounts the React app
  - Wraps <App/> with AuthProvider for authenticated user state
*/
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import "bootstrap/dist/js/bootstrap.bundle.min.js";
import "bootstrap/dist/css/bootstrap.min.css";
import "animate.css";
import "react-modal-video/css/modal-video.css";
import "lightgallery/css/lightgallery.css";
import "lightgallery/css/lg-zoom.css";
import "lightgallery/css/lg-thumbnail.css";


// Fonts
import "@fontsource/plus-jakarta-sans";
import "@fontsource/plus-jakarta-sans/500.css";
import "@fontsource/plus-jakarta-sans/600.css";
import "@fontsource/plus-jakarta-sans/700.css";
import "@fontsource/plus-jakarta-sans/800.css";
import "@fontsource/inter";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";

import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import "animate.css/animate.css";
import "swiper/css";
import "swiper/css";
import "swiper/css/navigation";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import "./globals.css";
import "./styles/events-card.css";

// Local Assets (Bundled)
import "./assets/css/phosphor-icons-regular.css";
import "./assets/css/phosphor-icons-thin.css";
import "./assets/css/phosphor-icons-light.css";
import "./assets/css/phosphor-icons-bold.css";
import "./assets/css/phosphor-icons-fill.css";
import "./assets/css/remixicon.css";
import "./assets/css/select2.min.css";
import "./assets/css/jquery-ui.css";
import "./assets/css/plyr.css";
import "./assets/css/main.css";
import "./assets/css/slick-fix.css";

createRoot(document.getElementById("root")).render(
  <AuthProvider>
    <App />
    <ToastContainer />
  </AuthProvider>
);
