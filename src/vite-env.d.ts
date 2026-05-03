/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL for the Express backend API and LLM streaming. Defaults to http://localhost:3001 */
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
