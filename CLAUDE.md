# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build workflow

Read `docs/prompt_plan.md` before doing any implementation work. It contains the standing rules that apply to every milestone (no orphaned code, working state every time, strict TypeScript, tests are part of done). Build milestones in order — each one depends on the last.

## Current state

**M0 complete** (committed to `dev`). The scaffold is live and all checks pass:

```
npm run dev        # Electron window opens, Vite dev server on :5173
npm test           # Vitest unit tests (2 passing)
npm run test:e2e   # electron-vite build + Playwright smoke test (1 passing)
```

**Next milestone: M1** — Typed, secure IPC bridge (`contextBridge` ping round-trip). Read the M1 block in `docs/prompt_plan.md` before starting.

## Commands

```
npm run dev                              # launch app (hot reload)
npm run build                            # production build → out/
npm test                                 # unit tests (vitest)
npm run test:e2e                         # build + e2e smoke tests (playwright)
npx vitest run src/path/to/file.test.ts  # single test file
npx playwright test --grep "test name"  # single e2e test
npm run lint                             # eslint
npm run format                           # prettier
```

## Source layout

```
src/
  main/         — Electron main process (Node.js)
  preload/      — contextBridge surface (empty for now; extended each milestone)
  renderer/     — React 18 app
    index.html
    src/
      App.tsx
      main.tsx
      assets/main.css   — Tailwind entry (@tailwind base/components/utilities)
      env.d.ts
  shared/       — types and constants imported by both main and renderer
    index.ts            — APP_NAME, APP_VERSION
    __tests__/
e2e/            — Playwright tests (run against built output in out/)
```

Key config files: `electron.vite.config.ts`, `tsconfig.node.json` (main+preload), `tsconfig.web.json` (renderer), `vitest.config.mts`.

## Architecture Overview

Prismarine is a keyboard-driven desktop workspace built on Electron with three runtime processes:

**Electron Main (Node.js)**
- `PrismarineFS`: real OS filesystem operations (no virtual FS)
- `WebContentsView` manager: lifecycle for browser panes (real Chromium, not iframe)
- IPC bridge to the Python sidecar over JSON-RPC 2.0 via stdio
- Neovim process manager (`--embed` headless, IPC via `neovim` npm package / msgpack-RPC)

**Renderer (React 18 + TypeScript, strict mode)**
- Pane system: binary split tree; each leaf is a `Buffer` instance
- Buffer types: `editor` (Neovim or CodeMirror fallback), `explorer`, `browser`, `prism-view`, `terminal`, `craft-editor`
- Mode system: Normal / Insert / Visual × major mode (Explorer, Editor, Browser, etc.)
- Prism renderer: reads `.index.p8e` YAML files and hydrates them into React component trees
- Craft Editor: dual-mode (visual drag-and-drop via `@dnd-kit/core` + raw YAML) UI builder for `.p8e` files

**Python Sidecar (CPython subprocess)**
- Loads `~/.config/prismarine/init.py` for user config
- Owns the command registry and keybinding registry
- Exposes browser, secrets, and hook APIs back to the renderer via JSON-RPC
- Plugin loader

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Desktop shell | Electron |
| Renderer | React 18 + TypeScript (strict) |
| Styling | Tailwind CSS |
| Browser pane | Electron `WebContentsView` |
| Text editor | Neovim `--embed` (fallback: CodeMirror 6 + `@codemirror/vim`) |
| Neovim IPC | `neovim` npm package (msgpack-RPC) |
| Neovim renderer | Canvas grid renderer (DOM fallback) |
| Python runtime | CPython subprocess |
| Python IPC | JSON-RPC 2.0 over stdio |
| Build | Vite + electron-vite |
| Testing | Vitest (unit) + Playwright (e2e) |
| Terminal | xterm.js + node-pty |
| Drag-and-drop | @dnd-kit/core |
| YAML parsing | js-yaml |

## Special File Formats

- `.index.p8e` — Prism UI layout for a directory (YAML); defines what the `prism-view` buffer renders
- `.theme.p8e` — visual theme overrides (YAML → CSS variables)
- `*.p8e` sidecar — structured behavior linked to a parent file (e.g., `.list.md.p8e` for checklist state)
- `~/.config/prismarine/init.py` — user Python config (commands, keybindings, hooks)
- `~/.config/prismarine/nvim/` — bundled Neovim config (Lua)

## IPC Contracts

The renderer never calls Python directly; all Python calls go through the main process IPC bridge. The Neovim msgpack-RPC channel is separate from the Python JSON-RPC channel. These contracts are fully specified in `docs/SPEC.md §6`.
