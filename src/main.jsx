import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

const demoBadge=document.createElement('div'); demoBadge.className='demo-web-badge'; demoBadge.textContent='DEMO MODE • Sample Data'; document.body.appendChild(demoBadge);
