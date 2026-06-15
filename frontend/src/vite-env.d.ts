/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly BACK_ON?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
