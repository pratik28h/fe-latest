import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
// Import React Grid Layout Styles
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

createRoot(document.getElementById("root")!).render(<App />);
