/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_TARUVI_BASE_URL: string
  readonly VITE_TARUVI_API_KEY: string
  readonly VITE_TARUVI_APP_SLUG: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
