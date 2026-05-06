import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles.css";

document.documentElement.style.setProperty(
  "--meadow-table-image",
  `url("${import.meta.env.BASE_URL}assets/ui/toon-meadow-table.png")`
);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
