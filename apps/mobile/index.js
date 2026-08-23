import { registerRootComponent } from "expo";
import App from "./App";

// Bypasses expo/AppEntry.js's generic "../../App" relative import, which
// assumes node_modules lives inside this package — in this npm-workspaces
// monorepo, "expo" is hoisted to the repo root, so that relative path
// resolved to the wrong App.tsx entirely. See metro.config.js for the
// matching monorepo-aware resolver config.
registerRootComponent(App);
