/// <reference types="vite/client" />

interface Window {
  prismarine: {
    ping(): Promise<string>
  }
}
