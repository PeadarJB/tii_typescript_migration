/**
 * Global type declarations to augment the default Vite client environment.
 * This file is for extending Vite's types with project-specific
 * environment variables.
 */

/// <reference types="vite/client" />

// --- Environment Variables ---
// This augments the ImportMetaEnv interface from Vite.
// We only need to declare variables that are specific to your application.
interface ImportMetaEnv {
  readonly VITE_APP_TITLE: string;
  readonly VITE_ARCGIS_API_KEY?: string;
  readonly VITE_WEB_MAP_ID?: string;
  readonly VITE_PORTAL_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}