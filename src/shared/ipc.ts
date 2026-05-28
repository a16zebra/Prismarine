// Typed IPC contract — imported by main, preload, and renderer.
// Every channel must live here; no magic strings elsewhere.

export const IpcChannel = {
  PING: 'prismarine:ping',
} as const

export type IpcChannelName = (typeof IpcChannel)[keyof typeof IpcChannel]

// ping: renderer → main
// request: (no payload)
// response: string — "pong <version>"
export type PingResponse = string
