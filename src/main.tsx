import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { registrarAtualizacaoAutomatica } from "./pwa-update";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);

registrarAtualizacaoAutomatica();
