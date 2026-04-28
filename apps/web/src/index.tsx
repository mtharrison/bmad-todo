import { render } from "solid-js/web";
import { App } from "./components/App";
import "./styles/tailwind.css";
import { hydrateFromCache } from "./store/task-store";
import { setSyncObserver } from "./sync/outbox";
import { setSyncState } from "./store/annunciator-store";
import { registerSw } from "./sync/sw-bridge";

const root = document.getElementById("root");
if (!root) throw new Error("Root element #root not found in document");

setSyncObserver((state) => setSyncState(state));

await hydrateFromCache();

render(() => <App />, root);

void registerSw();
