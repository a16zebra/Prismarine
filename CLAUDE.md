# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Status

This repository is **specification-complete but pre-implementation**. No source code exists yet. All implementation work must follow the detailed spec in `docs/SPEC.md` and the milestone build order in `docs/prompt_plan.md`. The granular checklist is in `docs/todo.md`.

Milestones in `docs/prompt_plan.md` are designed so each one leaves the app in a launchable, testable state. Always complete a milestone fully before moving to the next.

## Key Documents

- `docs/SPEC.md` — authoritative V2.0 specification (architecture, data models, IPC contracts, file formats)
- `docs/prompt_plan.md` — 28-milestone build blueprint (M0–M28), organized into 11 phases
- `docs/todo.md` — granular checklist for each milestone

## Planned Commands

These do not exist yet and will be set up in M0:

```
npm run dev       # launch Electron + Vite dev environment
npm run build     # package the Electron app
npm test          # Vitest unit tests + Playwright e2e
npx vitest run    # run a single test file: npx vitest run src/path/to/spec.ts
npx playwright test --grep "test name"  # run a single e2e test
```

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
