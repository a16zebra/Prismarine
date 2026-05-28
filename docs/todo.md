# Prismarine — Build TODO

Companion to `prompt_plan.md`. Tick boxes as you complete them. Every milestone (M*) ends in a
launchable, tested, committable state. Do milestones in order.

Legend: `[ ]` todo · `[~]` in progress · `[x]` done

---

## Phase 0 — Foundations

### M0 — Project scaffold
- [ ] electron-vite project created (main / preload / renderer / shared)
- [ ] React 18 + TypeScript (strict) in renderer
- [ ] Tailwind CSS configured
- [ ] Window opens showing "Prismarine" on `npm run dev`
- [ ] `npm run build` succeeds (packaged build)
- [ ] Vitest set up + 1 passing unit test
- [ ] Playwright set up + smoke test (launch, assert title)
- [ ] ESLint + Prettier + strict tsconfig
- [ ] README (run/build/test) + .gitignore
- [ ] **Commit:** scaffold

### M1 — Secure IPC bridge
- [ ] contextIsolation on, nodeIntegration off
- [ ] Typed IPC contract in `src/shared/` (channel names + req/res types)
- [ ] preload `window.prismarine.ping()`
- [ ] main handles ping -> "pong" + version
- [ ] Dev-only debug panel calls ping, shows result
- [ ] Unit: contract types/unique channels · Playwright: ping round trip
- [ ] **Commit:** ipc bridge

### M2 — State + Buffer/Pane model
- [ ] Types: BufferType, EditingState, MajorMode, Buffer, Pane, Layout (binary split tree)
- [ ] zustand store: buffers, layout, focusedPaneId, minibuffer fields
- [ ] Actions: create/close buffer, setFocusedPane, setEditingState, switchBufferInPane
- [ ] Selectors: focusedPane, focusedBuffer, openBuffers
- [ ] Dev JSON state inspector
- [ ] Unit: store actions + selectors
- [ ] **Commit:** state/model

---

## Phase 1 — Panes & input

### M3 — Pane render / split / resize / focus (mouse)
- [ ] Recursive render of layout tree (nested flex)
- [ ] Placeholder content per BufferType
- [ ] Split focused pane H/V (temp buttons)
- [ ] Drag dividers to resize (persist size)
- [ ] Click to focus + focus highlight
- [ ] Close pane collapses tree correctly
- [ ] Chrome shell: mode/status bar + clock + minibuffer row
- [ ] Unit: tree mutations valid · Playwright: split/resize/focus/close
- [ ] **Commit:** panes (mouse)

### M4 — Editing states + major modes
- [ ] Single global keydown handler routes to focused buffer's mode
- [ ] Normal/Insert/Visual state machine; Esc -> Normal
- [ ] Editor buffers enter Insert/Visual; non-editor buffers ignore them
- [ ] Major-mode registry (mode -> keymap); explorer-mode + browser-mode placeholders
- [ ] Mode bar shows live editing state + major mode
- [ ] terminal-mode passthrough flag; craft-mode placeholder
- [ ] Unit: per-type transitions · Playwright: mode bar updates + Esc
- [ ] **Commit:** modes

### M5 — Leader / keybindings / minibuffer / commands
- [ ] Built-in command registry (register/run/description)
- [ ] Keybinding registry as prefix trie
- [ ] Space starts leader sequence in Normal
- [ ] Which-key minibuffer hints + timeout + Esc/Ctrl+g cancel
- [ ] Functional minibuffer (sequences, messages, prompts)
- [ ] `SPC SPC` command palette (substring ok for now)
- [ ] Pane commands bound: SPC w / - w d m, SPC b n p d
- [ ] Configurable leader key setting
- [ ] Unit: trie resolution + cancel · Playwright: SPC w / split + palette run
- [ ] **Commit:** keys/palette

---

## Phase 2 — Filesystem & first buffers

### M6 — PrismarineFS
- [ ] Implement interface in main over node fs: exists/get/list/readFile/writeFile/move/rename/delete
- [ ] watch via chokidar -> FSEvent push to renderer
- [ ] Expose all methods over typed IPC contract
- [ ] Renderer typed FS client
- [ ] Path normalization + traversal guard + typed errors
- [ ] Unit (temp dir): CRUD/move/rename/list + watch fires
- [ ] **Commit:** fs

### M7 — File explorer + explorer-mode
- [ ] Real directory listing from PrismarineFS
- [ ] j/k select, Enter open (dir navigate / file -> editor buffer)
- [ ] d delete (confirm), r rename (input)
- [ ] Mouse: single-click select, double-click open
- [ ] ".." entry + live watch updates
- [ ] SPC f e opens explorer for current dir
- [ ] Startup: explorer at home/start dir
- [ ] Unit: explorer reducer · Playwright: navigate/rename/delete
- [ ] **Commit:** explorer

### M8 — Editor buffer (CodeMirror) + EditorBackend
- [ ] EditorBackend interface (open/getContent/setContent/save/focus/onDirtyChange/dispose)
- [ ] CodeMirrorBackend (CM6 + @codemirror/vim, highlighting, line numbers)
- [ ] Opening a file creates file-editor buffer via backend
- [ ] SPC f s saves via PrismarineFS; dirty indicator in mode bar
- [ ] scratch buffer uses same backend, no path
- [ ] Unit: EditorBackend contract · Playwright: open/edit/save/reopen
- [ ] **Commit:** editor (CM)

---

## Phase 3 — Navigation polish

### M9 — Fuzzy palette / files / buffers
- [ ] fuzzysort (or equiv) integrated
- [ ] Palette uses fuzzy scoring + highlight
- [ ] SPC f f fuzzy file finder (ignore node_modules/.git)
- [ ] SPC f r recent files (persisted MRU)
- [ ] SPC b b fuzzy open-buffer switcher
- [ ] SPC f y copy file path
- [ ] Shared fuzzy-list UI component
- [ ] Unit: scoring + MRU · Playwright: SPC f f / SPC b b
- [ ] **Commit:** fuzzy nav

---

## Phase 4 — Terminal

### M10 — Terminal (xterm.js + node-pty)
- [ ] main: node-pty per terminal buffer; stream I/O over IPC; resize; kill on close
- [ ] renderer: xterm.js in terminal pane; terminal-mode passthrough + escape keybind
- [ ] SPC o t opens terminal buffer
- [ ] Unit: pty lifecycle (mock) · Playwright: echo output + close kills
- [ ] **Commit:** terminal

---

## Phase 5 — Python sidecar

### M11 — Sidecar + JSON-RPC
- [ ] main spawns CPython subprocess (configurable interpreter)
- [ ] JSON-RPC 2.0 both ways over stdio (requests + notifications); documented framing
- [ ] Lifecycle: start, health ping, crash restart w/ backoff, clean shutdown; status in status bar
- [ ] Minimal Python sidecar script speaking the protocol
- [ ] `prismarine` python package skeleton (keys/commands/browser/hooks/prisms/secrets/ui/editor/plugins)
- [ ] Unit: rpc encode/decode/correlation · Integration: real ping + restart
- [ ] **Commit:** sidecar

### M12 — init.py loader + py keys/commands
- [ ] Load ~/.config/prismarine/init.py; write commented default if absent
- [ ] commands.register / keys.bind (name or lambda, mode=) / keys.set_leader / ui.notify / ui.set_status
- [ ] Registration protocol: python registry -> main -> renderer registries
- [ ] UI invocation routes to sidecar and returns result/notify
- [ ] SPC a reserved as Python automation prefix
- [ ] Integration: init.py binds SPC a t -> notify · Unit: registration serialization
- [ ] **Commit:** init.py keys/cmds

### M13 — Hook system
- [ ] Event taxonomy + typed payloads (app:startup/quit, buffer:open/close/save)
- [ ] Emit events from renderer/main -> sidecar notifications
- [ ] hooks.on(event)(handler); sync inline, async scheduled
- [ ] app:startup fires after init.py load
- [ ] Integration: startup + buffer:open hooks observable
- [ ] **Commit:** hooks

---

## Phase 6 — Browser

### M14 — Browser buffer (WebContentsView)
- [ ] WebContentsView manager in main (1 view per tab)
- [ ] Geometry-sync: renderer reports pane pixel rect on every resize; main repositions
- [ ] SPC o b new tab; browser-mode: H/L, r, gt/gT, /, g o
- [ ] Per-pane history wired to H/L
- [ ] Real Chromium (cookies/session persist); DevTools command
- [ ] Playwright: navigate/history/tabs + view stays aligned on resize
- [ ] **Commit:** browser

### M15 — Python browser automation
- [ ] Tabs: new_tab/active_tab/list_tabs/close_tab/focus_tab
- [ ] Nav: navigate/back/forward/reload/wait_for_url/wait_for_navigation
- [ ] DOM: fill/click/press/inner_text/eval/wait_for_selector (executeJavaScript helpers, no CDP)
- [ ] screenshot + set_cookie/get_cookies
- [ ] Automation opt-in only (command/hook)
- [ ] Integration: fill+click+wait+read on local page
- [ ] **Commit:** automation

---

## Phase 7 — Prisms

### M16 — yaml + .index.p8e + structural prisms
- [ ] js-yaml safe schema; parse .index.p8e -> typed tree (fallback parser stubbed/unused)
- [ ] Prism registry (type -> component + prop schema) + render-tree shape
- [ ] prism-view buffer + prism-mode (read-only nav)
- [ ] Built-ins: text, markdown, vstack, hstack, image, file
- [ ] SPC p v toggle Files/Interface; SPC p r reload
- [ ] Unit: parse/hydrate + **vstack/hstack no duplicate-branch bug** · Playwright: render + toggle
- [ ] **Commit:** prisms

### M17 — Interactive + persistent prisms
- [ ] checklist -> .list.md.p8e persistence
- [ ] stopwatch -> .stopwatch.p8e persistence
- [ ] Generic debounced sidecar-state helper (reused)
- [ ] shortcut (**real navigate, not alert**), tabs, embed, dive, data (csv/json table)
- [ ] Unit: state round-trips + shortcut nav · Playwright: persistence across reload
- [ ] **Commit:** interactive prisms

### M18 — Python prisms (Tier 2) + dynamic
- [ ] prisms.register class w/ schema + async render(props)->dict
- [ ] Renderer hydrates JSON tree; enforce stateless boundary (documented)
- [ ] script prism (run command, show output)
- [ ] form prism (onSubmit -> python command)
- [ ] browser-preview prism (WebContentsView in a prism)
- [ ] .index.p8e references python prism types by name
- [ ] Integration: python prism renders + form calls python
- [ ] **Commit:** python prisms

---

## Phase 8 — Craft Editor

### M19 — Craft code mode
- [ ] craft-editor buffer + craft-mode
- [ ] Entry: SPC p c, right-click "Edit Interface", toolbar "Craft UX" button
- [ ] CodeMirror YAML editor + live debounced preview
- [ ] Schema validation against registry (inline errors) + type/prop autocomplete
- [ ] Save writes .index.p8e
- [ ] Unit: validator · Playwright: edit/preview/error/save
- [ ] **Commit:** craft code

### M20 — Craft visual mode + dnd + undo/redo
- [ ] Layout: Toolbox | Canvas | Properties + structure tree
- [ ] Drag-drop via @dnd-kit/core; select -> edit props
- [ ] Single in-memory model; Visual<->Code projections; switch blocked on Code errors
- [ ] Undo/redo via useReducer history stack
- [ ] Tabs Visual|Code + Save/Close
- [ ] Unit: history + model/yaml round trip · Playwright: drag/edit/undo/redo/sync/save
- [ ] **Commit:** craft visual

---

## Phase 9 — Secrets & Recorder

### M21 — secrets API
- [ ] SecretsProvider interface; bitwarden (CLI) + keychain (system) impls
- [ ] secrets.get(domain, provider=) / secrets.set(...)
- [ ] **Never log, never write to disk**; logger guard/lint
- [ ] keepass/1password scaffolded as planned (interface only)
- [ ] Unit: provider selection + no-log assertion · Integration (guarded): keychain
- [ ] **Commit:** secrets

### M22 — Browser action recorder
- [ ] SPC o r toggle; REC indicator; toolbar record/stop
- [ ] Inject recorder; capture click/input/change/navigation
- [ ] Selector gen: #id > [data-testid] > [name] > class-chain > nth-child (least-specific unique)
- [ ] Live preview of growing Python script
- [ ] Password safety: password/current-password -> secrets.get().password; one-time-code -> .totp
- [ ] On stop: name + bind (SPC a ...), save to recorded/, append to init.py, immediate availability
- [ ] Unit: selector priority + password redaction · Integration: record login -> safe replayable script
- [ ] **Commit:** recorder

---

## Phase 10 — Neovim

### M23 — Neovim embed + DOM renderer + fallback
- [ ] main: one shared `nvim --embed` via `neovim` npm; ext_linegrid + ext_multigrid
- [ ] Each editor pane = nvim window; nvim_open_file; no nvim splits; viewport resized to pane px
- [ ] NeovimBackend implements EditorBackend; becomes default (CM = fallback)
- [ ] DOM grid renderer (grid_line/hl_attr/cursor_goto/flush -> spans, commit on flush)
- [ ] Font metrics from hidden canvas -> nvim_ui_attach cell size
- [ ] Graceful degradation: one-time notice, CM fallback if no nvim, auto-switch on restart
- [ ] Integration: edit+save in nvim · Unit: backend selection + notice once
- [ ] **Commit:** neovim DOM

### M24 — Neovim RPC bridge + bundled config + Space boundary
- [ ] Inject Lua `prismarine` module: split_right/split_below/open_explorer/open_browser/command
- [ ] Bundled config at ~/.config/prismarine/nvim/ (init.lua + options/keymaps/theme)
- [ ] Defaults: relative numbers, expandtab, undofile, clipboard=unnamed, Space mapleader
- [ ] SPC w / SPC b mapped to bridge; lazy.nvim present, no plugins; **omit** LSP/Telescope/statusline/autopairs
- [ ] Config path priority: env > init.py editor.set_nvim_config > bundled
- [ ] Space boundary: editor-mode + nvim Normal -> Neovim; else -> Prismarine
- [ ] Integration: SPC w / from nvim splits pane; open_browser works · Unit: leader routing table
- [ ] **Commit:** nvim bridge/config

---

## Phase 11 — Theming / plugins / perf

### M25 — Theming
- [ ] .theme.p8e: variables + prism-overrides; directory+descendant cascade w/ deeper override
- [ ] ui.set_theme(dark/light/gruvbox/catppuccin) + ui.load_theme(path)
- [ ] Apply via scoped CSS variables
- [ ] Neovim highlight sync via theme.lua hook
- [ ] Unit: cascade order + built-in maps · Playwright: nested override + global switch
- [ ] **Commit:** theming

### M26 — Python plugins
- [ ] plugins.load(path | pip package)
- [ ] PLUGIN_NAME/VERSION + setup(config) registering prisms/commands/keys/hooks
- [ ] Per-plugin config passthrough; isolated failures reported to UI
- [ ] Integration: load path + package plugin; broken plugin doesn't crash sidecar
- [ ] **Commit:** plugins

### M27 — Tier-3 React prisms
- [ ] `.p8e` package format (compiled React + manifest + prop schema)
- [ ] Dynamic load + registry registration; usable in .index.p8e like built-ins, full hooks/state
- [ ] Error boundary per Tier-3 prism
- [ ] Integration: stateful sample prism + crashing prism shows boundary
- [ ] **Commit:** tier-3 prisms

### M28 — Canvas grid renderer
- [ ] GridRenderer interface (DOM + Canvas interchangeable)
- [ ] Canvas: offscreen buffer + rAF repaint (drawImage); smooth cursor
- [ ] Canvas default when available; DOM fallback setting
- [ ] Unit/perf: burst without dropped flushes; DOM<->Canvas equivalent output
- [ ] **Commit:** canvas

---

## Beyond V2.0 (stretch / planned — SPEC.md §17)
- [ ] S1 — Git integration (SPC g)
- [ ] S2 — Multi-window support
- [ ] S3 — Inline AI agent Prisms (Anthropic API)
- [ ] S4 — Sandboxed Python plugin permissions (V2.1)
- [ ] S5 — Extension marketplace + keepass/1password providers

---

## Cross-cutting checks (re-verify after every milestone)
- [ ] `npm run dev` launches the app
- [ ] `npm test` (Vitest) passes
- [ ] Playwright e2e passes
- [ ] `npm run build` succeeds
- [ ] No orphaned/unwired code introduced
- [ ] Committed with the suggested message
