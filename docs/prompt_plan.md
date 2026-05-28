# Prismarine — Build Prompt Plan

> A milestone-by-milestone blueprint for building Prismarine (Unified Spec V2.0).
> Each milestone is a self-contained, copy-pasteable prompt for a code-generation
> assistant. Milestones are ordered so every step builds on the last and leaves the
> app **launchable, testable, and committable**. No milestone introduces more than
> one architectural decision.

---

## How to use this document

1. Build in order. Do not skip ahead — later milestones assume earlier ones exist and are wired in.
2. Each milestone block below is a prompt. Feed it to your coding assistant verbatim.
3. After each milestone: run the app, run the tests, then commit with the suggested message.
4. The matching `todo.md` tracks granular checkboxes. Tick them as you go.

### Standing rules (apply to every prompt)

These are appended implicitly to every milestone prompt. State them once to your assistant and re-state if it drifts:

- **No orphaned code.** Everything you build must be wired into the running app by the end of the milestone. No dead modules, no "you can hook this up later."
- **Working state every time.** `npm run dev` must launch. `npm test` must pass. If a feature is partial, stub it behind a clear interface — but the stub must be reachable and not crash.
- **Respect the spec.** Section references (e.g. §5.1) point at `SPEC.md`. When the spec and your instinct disagree, follow the spec or ask.
- **Small surface area.** Touch only what the milestone requires. Resist refactoring earlier milestones unless the milestone says to.
- **Tests are part of done.** Each milestone names what to test. Write those tests in the same milestone.
- **TypeScript strict mode on.** No `any` unless genuinely unavoidable and commented.

### A note on build order vs. ship priority

The spec names **Neovim** as the primary editor and **CodeMirror** as the fallback (§3, §8.6).
This plan builds **CodeMirror first** (M8) and **Neovim later** (M23), behind a shared editor
interface. Rationale: the fallback is the simpler artifact and gives a working editor ~15
milestones sooner. Shipping priority is unchanged — Neovim is still the default once M23 lands.

---

## Phase 0 — Foundations (the empty shell)

### M0 — Project scaffold

**Architectural decision:** monorepo layout (`main` / `preload` / `renderer` + a shared types package).

```text
Scaffold a new Electron desktop application named "Prismarine" using electron-vite.

Stack (from SPEC.md §3):
- Electron + Node.js (main process)
- React 18 + TypeScript (renderer), strict mode
- Tailwind CSS (renderer styling)
- Vite + electron-vite for build/dev
- Vitest for unit tests, Playwright for e2e (configure both, even if only smoke tests exist now)

Set up the canonical electron-vite three-part structure:
  src/main/      — Electron main process entry
  src/preload/   — preload script (empty contextBridge surface for now)
  src/renderer/  — React app
  src/shared/    — shared TypeScript types/constants imported by both main and renderer

Deliverables:
- A window that opens on `npm run dev` showing a centered "Prismarine" title styled with Tailwind.
- `npm run build` produces a packaged build without errors.
- `npm test` runs Vitest with one trivial passing unit test.
- A Playwright config + one smoke test that launches the app and asserts the window title.
- ESLint + Prettier + tsconfig with strict mode. A README with run/build/test commands.
- .gitignore for node_modules, dist, out.

Done when: the window opens, both test runners pass, and the build succeeds.
```

**Commit:** `chore: scaffold electron-vite + react + tailwind + test harness`

---

### M1 — Secure IPC bridge

**Architectural decision:** the IPC contract & typing convention (channel naming + shared request/response types).

```text
Establish a typed, secure IPC bridge between the renderer and main process.

Requirements:
- contextIsolation ON, nodeIntegration OFF, sandbox as appropriate. The renderer must NOT touch
  Node directly — everything crosses through the preload contextBridge.
- In src/shared/, define a typed IPC contract: an enum/const of channel names and TS interfaces
  for each request and response payload. Both main and renderer import from here. (This is the
  pattern every future feature will follow, so make it clean.)
- preload exposes `window.prismarine` with a single method for now: `ping(): Promise<string>`.
- main handles the ping channel and returns "pong" plus the app version.
- renderer: a small debug panel (toggleable, dev-only) that calls ping and shows the result.

Tests:
- Unit test the shared contract types compile and the channel names are unique.
- Playwright: click the debug ping button, assert "pong" appears.

Done when: a renderer→main→renderer round trip works through the typed bridge.
```

**Commit:** `feat(ipc): typed contextBridge ipc contract with ping round-trip`

---

### M2 — App state + Buffer/Pane model

**Architectural decision:** renderer state management library (use **zustand**) and the core data model.

```text
Define Prismarine's core data model and a single renderer-side state store. No new UI behavior
yet — this milestone is the data spine that everything else mutates.

Model (from SPEC.md §5, §6, §18). In src/shared/ define types:
- BufferType: 'file-editor' | 'file-explorer' | 'prism-view' | 'browser' | 'terminal' |
  'craft-editor' | 'scratch'
- EditingState: 'normal' | 'insert' | 'visual'
- MajorMode: derived per buffer type (editor-mode, explorer-mode, prism-mode, browser-mode,
  terminal-mode, craft-mode)
- Buffer: { id, type, path?|url?, title, majorMode, editingState, history: {back, forward} }
- Pane: { id, bufferId, ... }
- Layout: a binary split tree of panes (leaf = pane, node = {direction:'h'|'v', size, a, b}) +
  focusedPaneId

Store (zustand, in src/renderer/state/):
- buffers map, layout tree, focusedPaneId, minibuffer text/state (placeholder fields)
- Pure actions: createBuffer, closeBuffer, setFocusedPane, setEditingState, switchBufferInPane
- Selectors: focusedPane, focusedBuffer, openBuffers
- DO NOT render panes yet. Add a temporary dev JSON inspector that dumps store state so the model
  is observable.

Tests (Vitest):
- createBuffer / closeBuffer / setEditingState behave correctly.
- focus selectors return the right buffer.

Done when: the store + types exist, the dev inspector shows live state, tests pass. App still launches.
```

**Commit:** `feat(state): zustand store + buffer/pane/layout data model`

---

## Phase 1 — Pane system & keyboard input

### M3 — Pane rendering, splitting, focus (mouse path first)

**Architectural decision:** how the binary split tree maps to DOM layout (nested flex containers + resizable dividers).

```text
Render the layout tree as real panes and make splitting/resizing/focus work via MOUSE.
(Keyboard comes next milestone — mouse first per SPEC.md §1 "mouse always works".)

Requirements (SPEC.md §5.2):
- Recursively render the layout tree into nested flex containers.
- Each leaf pane renders its buffer's placeholder content keyed by BufferType (just a labeled box
  for now, e.g. "[browser pane]"). A scratch buffer is the default startup buffer.
- Split a focused pane horizontally or vertically via on-pane buttons (temporary UI).
- Drag the divider between panes to resize (mouse). Persist size in the layout node.
- Click a pane to focus it; focused pane has a visible border/highlight.
- Close a pane via a temporary button; the tree collapses correctly (sibling takes the space).
- Add the chrome shell from SPEC.md §4: a top status/mode bar (mode | buffer name | status | clock)
  and an empty minibuffer row at the bottom. Wire the clock; leave others as live store reads.

Tests:
- Unit: split/close mutations keep the tree valid; resize updates sizes.
- Playwright: split a pane, resize via drag, focus switches on click, close collapses.

Done when: you can build an arbitrary pane layout with the mouse and focus follows clicks.
```

**Commit:** `feat(panes): render/split/resize/focus pane tree (mouse)`

---

### M4 — Editing states + major-mode system

**Architectural decision:** where keyboard events are captured and dispatched (single renderer-level handler that routes to the focused pane's major mode).

```text
Add the vim-inspired editing-state machine and per-buffer major modes (SPEC.md §6.1, §6.2).

Requirements:
- A single global keydown handler in the renderer. It looks up the focused buffer, its major mode,
  and current editing state, then dispatches.
- Editing states: Normal (default), Insert, Visual. Esc -> Normal. In editor-type buffers, i/a/o
  enter Insert; v/V enter Visual. Non-editor buffers (explorer/browser/prism) IGNORE Insert/Visual
  entirely (SPEC.md §6.1 note) — they stay effectively Normal.
- Major mode is a registry: a map from MajorMode -> a keymap object (key -> command-name). For now
  populate explorer-mode and browser-mode with placeholder commands that just log/notify.
- The mode bar (M3) now shows live editing state + major mode of the focused buffer.
- terminal-mode = passthrough flag (no interception). craft-mode placeholder.

Tests:
- Unit: state transitions per buffer type (editor enters Insert; explorer does not).
- Playwright: focus a pane, press keys, assert mode bar updates and Esc returns to Normal.

Done when: editing state is correct per buffer type and keys route to the right major mode.
```

**Commit:** `feat(modes): editing-state machine + major-mode keymap registry`

---

### M5 — Leader key, keybinding registry, minibuffer, command registry

**Architectural decision:** the keymap sequence-resolution model (a prefix trie with which-key timeout).

```text
Implement the Space-leader command system and the built-in command registry (SPEC.md §6.3, §6.4, §15).

Requirements:
- A built-in command registry (TypeScript): register(name, fn, {description}). run(name).
- A keybinding registry backed by a prefix trie. Bind sequences like "SPC w /" -> command name.
  In Normal state, Space starts a leader sequence (in non-editor buffers; editor-mode Space handling
  is deferred to M23 — for now editor buffers also use Prismarine Space since Neovim isn't here yet).
- Which-key behavior: after Space, the minibuffer shows the pending sequence and available next keys.
  A configurable timeout or Esc cancels. Ctrl+g cancels (SPEC.md §15).
- The minibuffer (M3 row) becomes functional: shows pending sequences, messages, and input prompts.
- `SPC SPC` opens a basic command palette: a minibuffer-driven list of all registered commands,
  arrow/Enter to run (fuzzy search added in M9 — substring match is fine for now).
- Wire real built-in commands for pane ops so they're reachable by keyboard:
  SPC w / (split right), SPC w - (split below), SPC w w (cycle focus), SPC w d (close pane),
  SPC w m (maximise pane), SPC b n / SPC b p (next/prev buffer), SPC b d (kill buffer).
- The leader key must be configurable via a single setting (used later by init.py).

Tests:
- Unit: trie resolves multi-key sequences; timeout/cancel logic; command run dispatch.
- Playwright: SPC w / splits via keyboard; SPC SPC opens the palette and runs a command.

Done when: the whole pane system is drivable from the keyboard via Space-leader sequences.
```

**Commit:** `feat(keys): leader-key trie, command registry, minibuffer, command palette`

---

## Phase 2 — Filesystem & first real buffers

### M6 — PrismarineFS layer

**Architectural decision:** filesystem access path (Node `fs` in main, exposed over IPC; file watching via **chokidar**).

```text
Implement the real-filesystem layer (SPEC.md §9 / "14.1"). Replace any placeholder data with
actual OS filesystem access.

Requirements:
- In src/main/, implement the PrismarineFS interface over Node fs/promises:
  exists, get (FSNode: name, path, isDir, size, mtime), list, readFile, writeFile, move,
  rename, delete, watch (use chokidar; emit FSEvent: created/changed/deleted/renamed).
- Expose every method over the typed IPC contract (extend M1's contract). watch streams events
  back to the renderer (main -> renderer push channel).
- In src/renderer/, a thin typed FS client mirroring the interface, calling through window.prismarine.
- Guardrails: normalize/validate paths in main; reject path traversal outside an allowed root if
  one is configured. Surface errors as typed results, not thrown strings.

Tests:
- Unit (main, against a temp dir): CRUD + move/rename + list; watch fires on change.
- Playwright optional here; covered when explorer lands.

Done when: the renderer can list/read/write/delete real files through the IPC FS client, and a
watcher pushes change events. App still launches.
```

**Commit:** `feat(fs): PrismarineFS over node fs with chokidar watch via ipc`

---

### M7 — File-explorer buffer + explorer-mode

**Architectural decision:** none significant — wiring. (If one is needed: how "open" decides buffer type by path.)

```text
Build the file-explorer buffer and flesh out explorer-mode (SPEC.md §5.1, §6.2).

Requirements:
- Replace the file-explorer placeholder with a real directory listing driven by PrismarineFS.
- explorer-mode keybindings (SPEC.md §6.2): j/k move selection, Enter open (dir -> navigate into;
  file -> create a file-editor buffer in this pane, placeholder content until M8), d delete (with
  minibuffer confirm), r rename (minibuffer input). Also support mouse: single-click select,
  double-click open.
- Show parent ".." entry; reflect live FS watch events (a created/deleted file updates the list).
- SPC f e opens a file explorer for the current directory (SPEC.md §15).
- Startup: open an explorer buffer rooted at the user's home (or a configurable start dir).

Tests:
- Unit: explorer reducer (selection, navigation).
- Playwright (temp dir): navigate, open dir, rename a file, delete with confirm; list updates.

Done when: you can browse the real filesystem entirely by keyboard and mouse, and FS mutations work.
```

**Commit:** `feat(explorer): file-explorer buffer + explorer-mode keybindings`

---

### M8 — File-editor buffer (CodeMirror) behind an editor interface

**Architectural decision:** the **EditorBackend interface** (so Neovim can replace CodeMirror later without touching callers).

```text
Add a working text/code editor. Define a backend interface now so Neovim can slot in at M23.

Requirements (SPEC.md §3 fallback, §5.1):
- Define an EditorBackend interface in src/renderer/: open(path), getContent(), setContent(),
  save(), focus(), onDirtyChange(), dispose(). The file-editor buffer talks ONLY to this interface.
- Implement a CodeMirrorBackend using CodeMirror 6 + @codemirror/vim. Syntax highlighting by
  extension, line numbers, vim keymap inside the editor.
- Opening a file (from explorer Enter or commands) creates a file-editor buffer backed by CodeMirror.
- SPC f s saves the current file via PrismarineFS (SPEC.md §15). Dirty indicator in the mode bar.
- scratch buffer type uses the same backend with no path.
- Editor buffers currently keep using CodeMirror's own vim for editing keys; pane-level SPC commands
  still work when not in editor insert (the clean Neovim Space boundary is deferred to M23).

Tests:
- Unit: EditorBackend contract (open/edit/dirty/save) against CodeMirrorBackend.
- Playwright: open a file, type, SPC f s saves, reopen shows saved content.

Done when: you can open, edit, and save real files with vim keybindings, all via the EditorBackend.
```

**Commit:** `feat(editor): codemirror editor backend behind EditorBackend interface`

---

## Phase 3 — Navigation polish

### M9 — Command palette, fuzzy file finder, buffer switcher

**Architectural decision:** fuzzy matching library (use **fuzzysort** or equivalent) used everywhere.

```text
Upgrade navigation to fuzzy everywhere (SPEC.md §6.4, §15).

Requirements:
- Replace substring matching in the command palette (M5) with fuzzy scoring + highlighting.
- SPC f f — fuzzy file finder: recursively index files under the current root (respect ignores like
  node_modules/.git), pick to open in a file-editor buffer.
- SPC f r — recent files: maintain an MRU list (persist to a small state file under config dir).
- SPC b b — buffer switcher: fuzzy across OPEN buffers (SPEC.md §5.3).
- SPC f y — copy current file path to clipboard.
- Shared fuzzy-list UI component reused by palette / files / buffers for consistency.

Tests:
- Unit: fuzzy scoring/highlighting; MRU update/eviction.
- Playwright: SPC f f opens a file; SPC b b switches buffers.

Done when: command palette, file finder, recent files, and buffer switch all use one fuzzy UI.
```

**Commit:** `feat(nav): fuzzy command palette, file finder, recent files, buffer switch`

---

## Phase 4 — Embedded terminal (first main-backed content pane)

### M10 — Terminal buffer (xterm.js + node-pty)

**Architectural decision:** PTY transport (spawn `node-pty` in main, stream over IPC to xterm.js).

```text
Add the embedded terminal buffer (SPEC.md §5.1, §15 SPC o t). This is the first pane whose content
is backed by a main-process subprocess — establish the pattern cleanly; the browser pane will echo it.

Requirements:
- main: spawn a shell via node-pty per terminal buffer. Stream pty output to renderer and renderer
  keystrokes to pty over IPC. Handle resize (cols/rows) on pane resize. Kill pty on buffer close.
- renderer: render an xterm.js instance in the terminal pane. terminal-mode is passthrough — all keys
  go to the terminal (SPEC.md §6.2). Provide an explicit escape (e.g. Ctrl+g or a keybind) to return
  focus to Prismarine command handling.
- SPC o t opens a new terminal buffer in the focused pane.

Tests:
- Unit: pty lifecycle (spawn/resize/kill) with a fake/mock pty.
- Playwright: open terminal, run `echo hi`, assert output; close kills the process.

Done when: a real shell runs inside a pane, resizes with the pane, and cleans up on close.
```

**Commit:** `feat(terminal): xterm.js + node-pty terminal buffer`

---

## Phase 5 — Python sidecar

### M11 — Python sidecar process + JSON-RPC over stdio

**Architectural decision:** JSON-RPC 2.0 framing/transport over the sidecar's stdio (SPEC.md §7.5).

```text
Stand up the CPython sidecar and the bidirectional JSON-RPC channel (SPEC.md §4.1, §7.5).

Requirements:
- main: spawn a CPython subprocess (configurable interpreter path; sane default). Implement
  JSON-RPC 2.0 over stdin/stdout in BOTH directions:
  - requests with id + result/error responses
  - notifications (no id) for events (e.g. "event" method)
- Define message framing (newline-delimited JSON or Content-Length headers — pick one, document it).
- Lifecycle: start on app launch, health-check ping ("rpc.ping" -> "pong"), restart on crash with
  backoff, clean shutdown on quit. Surface sidecar status in the status bar.
- Ship a minimal Python entry script (the sidecar) that speaks this protocol and answers rpc.ping.
- Add a Python package skeleton `prismarine` (the module init.py will import from, SPEC.md §7.2) with
  empty submodules: keys, commands, browser, hooks, prisms, secrets, ui, editor, plugins.

Tests:
- Unit (main): JSON-RPC encode/decode, request/response correlation, notification handling.
- Integration: spawn the real sidecar, send rpc.ping, get pong; kill and assert restart.

Done when: Electron and Python exchange JSON-RPC both ways, with crash recovery and a status readout.
```

**Commit:** `feat(python): cpython sidecar + json-rpc 2.0 over stdio with lifecycle`

---

### M12 — init.py loader + Python keybindings & commands

**Architectural decision:** the registration protocol (how Python-registered commands/keys sync into the renderer registries).

```text
Load the user's init.py and let Python register commands and keybindings that work in the UI
(SPEC.md §7.1, §7.2).

Requirements:
- On startup, the sidecar imports ~/.config/prismarine/init.py. If absent, WRITE a default init.py
  first (commented, mirroring SPEC.md §7.2 examples).
- Implement the Python-side decorators/functions against the sidecar:
  - commands.register(name, description=...) — registers an (async) python command
  - keys.bind(seq, command_or_lambda, mode=None) — supports a command name OR a lambda
  - keys.set_leader(...) — changes the leader (feeds M5's configurable leader)
  - ui.notify(msg) / ui.set_status(msg)
- Registration protocol: when init.py runs, the sidecar reports its registered commands and bindings
  to main via JSON-RPC; main forwards into the renderer's command + keybinding registries. Invoking
  a Python command from the UI routes renderer -> main -> sidecar -> executes -> result/notify back.
- ui.notify / set_status render in the minibuffer / status bar.
- SPC a is reserved as the user automation prefix (SPEC.md §6.3, §15) — bindings under it come from
  Python.

Tests:
- Integration: a test init.py registers a command bound to SPC a t that calls ui.notify; pressing
  the key shows the notification.
- Unit: registration-protocol serialization (python registry -> renderer registry).

Done when: a user can define commands and keybindings in init.py and trigger them from the keyboard.
```

**Commit:** `feat(python): init.py loader, python command/keybinding registration`

---

### M13 — Hook system

**Architectural decision:** the event taxonomy + delivery model (named events, fire-and-forget notifications to Python).

```text
Add the hook/event system so Python can react to app lifecycle and buffer events (SPEC.md §7.2 hooks).

Requirements:
- Define the event taxonomy in src/shared/: at minimum app:startup, app:quit, buffer:open,
  buffer:close, buffer:save, with typed payloads (e.g. buffer:open carries buffer_type, path).
- Emit these events from the renderer/main at the right moments; forward to the sidecar as JSON-RPC
  notifications.
- Python side: hooks.on(event_name)(handler). The sidecar dispatches incoming events to registered
  handlers. Sync handlers run inline; async handlers are scheduled.
- app:startup fires after init.py has loaded so a startup hook can call commands.run(...).

Tests:
- Integration: a test init.py registers buffer:open and app:startup hooks; opening a .py file and
  launching the app both trigger observable ui.set_status calls.

Done when: Python hooks fire on real app/buffer events with correct payloads.
```

**Commit:** `feat(python): hook system with typed event taxonomy`

---

## Phase 6 — Browser

### M14 — Browser buffer via WebContentsView

**Architectural decision:** use **WebContentsView** (not deprecated BrowserView, per SPEC.md §17) + the geometry-sync protocol (renderer reports pixel rects to main on every resize).

```text
Add the browser buffer using Electron WebContentsView (SPEC.md §12.1, §17 deprecation note, §6.2).

Requirements:
- main: a WebContentsView manager. Each browser tab = one WebContentsView attached to the main window.
  The view is shown/positioned/sized to exactly cover the active browser pane and hidden otherwise.
- Geometry-sync protocol: the renderer reports the browser pane's pixel rect to main on EVERY layout
  change/resize (SPEC.md §5.2, §17). Main repositions the view accordingly. Get this right — it is the
  recurring constraint for native views.
- SPC o b opens a new browser tab/buffer. browser-mode keys (SPEC.md §6.2, §15): H/L back/forward,
  r reload, gt/gT next/prev tab, / find-in-page. g o opens URL under cursor (from a text buffer).
- Per-pane buffer history (back/forward) integrates with H/L.
- Real Chromium: cookies/sessions persist; DevTools available via a command.

Tests:
- Playwright: open a browser tab to a local test page, navigate, H/L history, gt/gT tabs; resizing
  the pane keeps the view aligned (assert via bounds/screenshot).

Done when: real Chromium tabs live inside panes, track pane geometry, and are keyboard-drivable.
```

**Commit:** `feat(browser): WebContentsView browser buffer + geometry sync + browser-mode`

---

### M15 — Python browser automation API

**Architectural decision:** how DOM actions execute — `webContents.executeJavaScript` + injected helpers (no CDP tunnelling, per SPEC.md §12.2).

```text
Expose the Playwright-style browser automation API to Python (SPEC.md §7.3, §12.2).

Requirements:
- Implement the `browser` Python API over JSON-RPC -> main -> webContents:
  Tabs: new_tab(url), active_tab(), list_tabs(), close_tab(t), focus_tab(t)
  Nav: tab.navigate(url), back(), forward(), reload(), wait_for_url(glob), wait_for_navigation()
  DOM: tab.fill(sel, val), click(sel), press(sel, key), inner_text(sel), eval(js),
       wait_for_selector(sel)
  Misc: tab.screenshot() -> bytes; set_cookie/get_cookies
- DOM interactions run via webContents.executeJavaScript with a small injected helper library
  (querySelector + dispatch events). NO CDP tunnel (SPEC.md §12.2). wait_* implement polling/await
  against page state.
- Routing: python browser.* call -> JSON-RPC -> main calls the WebContentsView's webContents -> result
  back to python.
- Security (SPEC.md §12.3): automation is opt-in via user-triggered command or init.py hook only.

Tests:
- Integration: a python command opens a local test page, fills a field, clicks submit,
  wait_for_selector confirms the result; eval returns document.title.

Done when: a Python command can drive a real browser tab end-to-end (fill/click/wait/read).
```

**Commit:** `feat(browser): python automation api over webContents (no CDP)`

---

## Phase 7 — Prism system

### M16 — js-yaml + .index.p8e parsing + prism-view + structural Prisms

**Architectural decision:** the Prism render-tree schema + Prism registry.

```text
Introduce the Prism system: parse .index.p8e and render basic built-in Prisms (SPEC.md §10, §10.4, §10.5).

Requirements:
- Add js-yaml (SPEC.md §10.5) with a safe schema. Parse a directory's .index.p8e into a typed
  Prism tree. (Keep a tiny fallback parser path stubbed but unused, per spec.)
- Define the Prism registry: type name -> React component + a props schema. Define the render-tree
  shape (type + props + optional children) used by both .index.p8e and (later) Python prisms.
- prism-view buffer + prism-mode (read-only navigation, SPEC.md §6.2): renders the parsed Prism tree.
- Implement built-in structural/static Prisms first (SPEC.md §10.2): text, markdown (CommonMark),
  vstack, hstack, image, file (embed file by detected type).
- SPC p v toggles a directory between Files view (explorer) and Interface view (prism-view)
  (SPEC.md §15). SPC p r reloads .index.p8e.

Tests:
- Unit: yaml parse -> typed tree; registry hydration; vstack/hstack render children correctly
  (explicitly guard against the V1 duplicate-branch bug, SPEC.md §11.4/§16).
- Playwright: a folder with an .index.p8e renders text + markdown + nested stacks; SPC p v toggles.

Done when: a directory with .index.p8e renders a real Prism interface from YAML.
```

**Commit:** `feat(prism): js-yaml .index.p8e parsing + prism-view + structural prisms`

---

### M17 — Interactive & persistent Prisms

**Architectural decision:** the Prism state-persistence model (`.p8e` sidecar state files).

```text
Add stateful interactive Prisms and their on-disk persistence (SPEC.md §10.2, §9 special files).

Requirements:
- checklist Prism: toggle items; persist to .list.md.p8e (markdown format, SPEC.md §9).
- stopwatch Prism: start/stop/reset; persist to .stopwatch.p8e.
- Persistence model: a generic helper that reads/writes a Prism's sidecar state file via PrismarineFS,
  debounced, with safe defaults when absent. Reuse it for both Prisms.
- Additional built-ins from SPEC.md §10.2: shortcut (calls REAL navigate(), not alert — fixes V1 stub
  §11.4/§16), tabs (tabbed container), embed (iframe/image/local html), dive (inline another
  directory's .index.p8e), data (render .csv/.json as a table).

Tests:
- Unit: checklist/stopwatch state read/write round-trips; shortcut triggers navigation.
- Playwright: check a box, reload, state persists; stopwatch persists; shortcut navigates.

Done when: interactive Prisms work and survive reload via .p8e state files.
```

**Commit:** `feat(prism): checklist, stopwatch, shortcut, tabs, embed, dive, data + persistence`

---

### M18 — Python-registered Prisms (Tier 2) + dynamic Prisms

**Architectural decision:** the serialization-boundary contract for Python Prisms (JSON render tree in, hydrated React out — no React state across the boundary, SPEC.md §10.1).

```text
Let Python register Prisms that fetch/transform data and return a JSON render tree (SPEC.md §10.1,
§10.3, §7.2).

Requirements:
- prisms.register(name) decorator on the Python side: a class with a `schema` and an async
  `render(props) -> dict` returning a JSON-serializable render tree (SPEC.md §10.3 example).
- The renderer hydrates that JSON tree into built-in Prism components (reuse the M16 render-tree
  shape). Enforce the contract from SPEC.md §10.1: Python Prisms are stateless across the boundary —
  no React hooks/lifecycle. Document this limit in the default init.py.
- Built-in Prisms that depend on Python (SPEC.md §10.2):
  - script: runs a Python command and renders its output
  - form: gathers input; onSubmit triggers a Python command (SPEC.md §10.2)
  - browser-preview: embeds a live WebContentsView at a URL inside a Prism (reuse M14 manager)
- .index.p8e can reference Python-registered prism types by name with props (SPEC.md §10.3 usage).

Tests:
- Integration: a registered python prism renders a computed value into a prism-view; a form submit
  invokes a python command; script prism shows command output.

Done when: a directory interface can mix built-in and Python-defined Prisms, including a form that
calls back into Python.
```

**Commit:** `feat(prism): python-registered tier-2 prisms + script/form/browser-preview`

---

## Phase 8 — Craft Editor

### M19 — Craft Editor: Code mode

**Architectural decision:** schema validation approach (validate the Prism tree against the registry's prop schemas; surface inline errors).

```text
Build the Craft Editor's Code mode: a YAML editor for .index.p8e with validation + live preview
(SPEC.md §11.1, §11.2).

Requirements:
- craft-editor buffer + craft-mode. Entry points (SPEC.md §11.1): SPC p c, right-click directory
  -> "Edit Interface", and a toolbar "Craft UX" button (mouse-accessible).
- Code mode: a CodeMirror YAML editor of the directory's .index.p8e, side-by-side with a LIVE
  preview that re-renders the Prism tree as you type (debounced).
- Schema validation: validate the parsed tree against the Prism registry's prop schemas; show errors
  inline (line markers + message). Autocomplete prism type names and known props.
- Save writes .index.p8e via PrismarineFS.

Tests:
- Unit: validator catches unknown prism types and bad prop types.
- Playwright: open Craft Code mode, edit YAML, preview updates, an invalid edit shows an inline error,
  save persists.

Done when: you can author .index.p8e in a validated YAML editor with live preview.
```

**Commit:** `feat(craft): craft editor code mode with validation + live preview`

---

### M20 — Craft Editor: Visual mode + drag-and-drop + undo/redo

**Architectural decision:** visual↔code single-source-of-truth (both views project from one in-memory Prism model; Visual→Code serialises, Code→Visual parses, SPEC.md §11.2).

```text
Add the Craft Editor's Visual mode and keep it in sync with Code mode (SPEC.md §11.2, §11.3, §11.4).

Requirements:
- Visual mode layout (SPEC.md §11.3): Toolbox (left) | Canvas (center) | Properties (right), plus a
  structure tree. Drag Prisms from the toolbox onto the canvas using @dnd-kit/core (SPEC.md §11.4/§16).
  Select a Prism to edit its props in the Properties panel.
- Single source of truth: one in-memory Prism model. Visual and Code are two projections.
  Switching Visual->Code serialises; Code->Visual parses; switching to Visual is BLOCKED while Code
  has validation errors (SPEC.md §11.2).
- Undo/redo via a useReducer history stack (SPEC.md §16) — fixes the V1 "no undo/redo" issue.
- Tabs at top switch Visual | Code with [Save] [Close] (SPEC.md §11.3).

Tests:
- Unit: reducer history (undo/redo); model<->yaml round trip.
- Playwright: drag a Prism onto the canvas, edit a prop, undo/redo, switch to Code and back, save.

Done when: layouts can be built visually with drag-and-drop and undo/redo, fully synced with Code mode.
```

**Commit:** `feat(craft): visual mode with dnd-kit, properties panel, undo/redo, view sync`

---

## Phase 9 — Secrets & Action Recorder

### M21 — secrets API

**Architectural decision:** secrets provider abstraction (Bitwarden CLI + system keychain behind one interface).

```text
Implement the password-manager bridge (SPEC.md §7.4, §12.3).

Requirements:
- A SecretsProvider interface in the sidecar with two implementations:
  - bitwarden (via the Bitwarden CLI; requires it installed + unlocked)
  - keychain (system: macOS Keychain / Windows Credential Manager / libsecret)
- Python API: secrets.get(domain, provider=...) -> {username, password, totp, notes, ...};
  secrets.set(domain, username=..., password=...).
- Security (SPEC.md §7.4, §12.3): credentials are NEVER logged and NEVER written to disk by
  Prismarine; transmitted over IPC only, in memory. Add a guard/lint that fails if secret payloads
  hit any logger.
- Provider scaffolding for keepass / 1password marked "planned" (SPEC.md §7.4) — interface present,
  not implemented.

Tests:
- Unit: provider selection + interface; a fake provider returns creds; assert no logging of secret
  fields.
- Integration (optional, guarded): keychain round trip if available in CI.

Done when: a Python command can fetch credentials via secrets.get without ever logging or persisting
them.
```

**Commit:** `feat(secrets): bitwarden + keychain providers with no-log/no-disk guarantee`

---

### M22 — Browser action recorder

**Architectural decision:** the selector-generation strategy (id > data-testid > name > meaningful class chain > nth-child, SPEC.md §12.4).

```text
Build the first-class browser action recorder that exports runnable Python (SPEC.md §12.4).

Requirements:
- SPC o r toggles recording on the active browser pane; a red-dot "REC" indicator shows in the pane
  status bar; toolbar record/stop button for mouse (SPEC.md §12.4 activation).
- On start, inject a lightweight recorder into webContents via executeJavaScript. Capture click,
  input, change, navigation events. For each: action type, the target's CSS selector, value (for
  fill/change), and current URL (for navigation).
- Selector generation (SPEC.md §12.4 strategy): prefer #id (if unique) > [data-testid] > [name] >
  meaningful .class-chain > tag:nth-child. Emit the least-specific selector that is unique.
- Live preview pane shows the growing Python script in real time (uses the M15 `browser` API +
  CSS selectors).
- Password safety (SPEC.md §12.4): a fill on type="password" / autocomplete="current-password" is
  written as `await secrets.get("<domain>").password` — NEVER the literal value. autocomplete=
  "one-time-code" -> `.totp`.
- On stop: prompt "Name this command" and "Bind to a key? (SPC a ...)"; save to
  ~/.config/prismarine/recorded/<name>.py; append the binding to init.py automatically; command
  available immediately, no restart (SPEC.md §12.4 post-recording workflow).

Tests:
- Unit: selector generator priority + uniqueness; password redaction in the exporter.
- Integration/Playwright: record clicks + a password fill on a local test page; exported script
  contains secrets.get(...).password and no literal password; replaying the script reproduces the
  actions.

Done when: a user can record a login flow and get a safe, runnable, key-bound Python automation.
```

**Commit:** `feat(recorder): browser action recorder with selector gen + password-safe export`

---

## Phase 10 — Neovim

### M23 — Neovim embed + DOM grid renderer (with graceful degradation)

**Architectural decision:** the grid-event → render pipeline (DOM renderer first, behind the M8 EditorBackend).

```text
Replace CodeMirror as the default editor with an embedded Neovim, behind the existing EditorBackend
interface (SPEC.md §8.1, §8.5, §8.6, §3).

Requirements:
- main: spawn ONE shared headless Neovim: `nvim --embed`. Drive it with the `neovim` npm package over
  msgpack-RPC. Attach UI with ext_linegrid + ext_multigrid (SPEC.md §8.1). Each file-editor pane is a
  Neovim window inside the single instance; files open as buffers (nvim_open_file). Do NOT use Neovim
  splits — Prismarine panes own splitting (SPEC.md §8.1). Resize Neovim's viewport to pane pixel
  dimensions on every layout change.
- Implement a NeovimBackend that satisfies EditorBackend (M8). Make it the default; CodeMirror becomes
  the fallback.
- DOM grid renderer (SPEC.md §8.5 "V1"): consume grid_line, hl_attr_define, cursor_goto, flush.
  Render one <span> per cell with fg/bg/bold/italic; commit on flush. Compute font metrics once from a
  hidden measurement canvas and pass cell size via nvim_ui_attach (SPEC.md §8.5).
- Graceful degradation (SPEC.md §8.6): if `nvim` is not on $PATH, show a one-time dismissible notice
  ("Neovim not found. Using built-in editor. [Install Neovim] [Dismiss]"), fall back to CodeMirrorBackend,
  keep all other features working, and switch automatically once Neovim is present on restart.

Tests:
- Integration: with nvim present, open a file, type in insert mode, :w saves; grid reflects edits.
- Unit: backend selection (nvim present vs absent) chooses the right EditorBackend; notice shows once.

Done when: editing happens in real Neovim by default, rendered to a DOM grid, with a clean CodeMirror
fallback when nvim is missing.
```

**Commit:** `feat(neovim): embedded nvim with DOM grid renderer + codemirror fallback`

---

### M24 — Neovim ↔ Prismarine RPC bridge + bundled config + Space boundary

**Architectural decision:** the Space-leader boundary mechanism (editor-mode + Neovim Normal → Space goes to Neovim; everything else → Prismarine, SPEC.md §6.3).

```text
Make Neovim and Prismarine feel like one system: a callback bridge, a bundled config, and the clean
leader-key boundary (SPEC.md §6.3, §8.2, §8.3, §8.4).

Requirements:
- Inject a Lua module `prismarine` at startup exposing callbacks into Prismarine over RPC
  (SPEC.md §8.4): p.split_right(), p.split_below(), p.open_explorer(), p.open_browser(url),
  p.command(name).
- Ship the bundled config at ~/.config/prismarine/nvim/ (SPEC.md §8.2): init.lua + lua/prismarine/
  {options,keymaps,theme}.lua. Include: sensible defaults (relative numbers, expandtab, undofile,
  clipboard=unnamed), Space as mapleader, SPC w / SPC b mapped to the bridge callbacks, lazy.nvim
  present but no plugins, highlight-group sync hook. Deliberately OMIT LSP/Telescope/statusline/
  autopairs (SPEC.md §8.2).
- Config path resolution (SPEC.md §8.3): priority env var PRISMARINE_NVIM_CONFIG > editor.set_nvim_config()
  in init.py > bundled default.
- Space boundary (SPEC.md §6.3): when an editor-mode buffer is focused and Neovim is in Normal state,
  Space goes to NEOVIM; in any other buffer (or editor Insert), Space goes to Prismarine. Pane-level
  SPC w / SPC b work from inside Neovim via the bridge mappings.

Tests:
- Integration: from inside Neovim, the mapped SPC w / splits a Prismarine pane; p.open_browser opens a
  browser buffer; env-var config override is respected.
- Unit: leader routing decision table (buffer type × editing state × nvim state).

Done when: Neovim power users can split panes / open buffers from inside the editor, and the Space
boundary behaves exactly as specified.
```

**Commit:** `feat(neovim): lua rpc bridge, bundled config, space-leader boundary`

---

## Phase 11 — Theming, plugins, performance

### M25 — Theming

**Architectural decision:** theme cascade resolution (`.theme.p8e` applies to a directory + descendants unless overridden deeper; CSS variables; Neovim highlight sync).

```text
Implement theming for Prism interfaces and global UI (SPEC.md §13, §8.2 highlight sync).

Requirements:
- .theme.p8e (YAML, SPEC.md §13.1): `variables` (CSS custom properties) + `prism-overrides`
  (per-prism style overrides). A .theme.p8e applies to its directory's Prism interface and all
  descendant interfaces unless a deeper .theme.p8e overrides it — implement the cascade resolution.
- Global theme via init.py (SPEC.md §13.2): ui.set_theme("dark"|"light"|"gruvbox"|"catppuccin")
  with those four built-ins; ui.load_theme(path) for a custom .theme.p8e.
- Apply themes by setting CSS variables on the appropriate scope.
- Neovim highlight sync (SPEC.md §8.2): the active theme drives Neovim background + accent highlight
  groups via the bundled theme.lua hook.

Tests:
- Unit: cascade resolution (nested .theme.p8e override order); built-in theme variable maps.
- Playwright: a nested folder overrides parent theme variables; switching global theme updates the UI.

Done when: directory-scoped and global themes work, cascade correctly, and sync to Neovim.
```

**Commit:** `feat(theme): .theme.p8e cascade, global themes, neovim highlight sync`

---

### M26 — Plugin system (Python)

**Architectural decision:** plugin discovery/loading model (`plugins.load(path)` for files, `plugins.load("pip-name")` for installed packages; `setup(config)` entry point).

```text
Add the Python plugin system (SPEC.md §14).

Requirements:
- plugins.load(path_or_package) in init.py (SPEC.md §14.1): accept a filesystem path
  (~/.config/prismarine/plugins/my_plugin.py) OR an installed package name (prismarine-plugin-*).
- Plugin structure (SPEC.md §14.2): module exposes PLUGIN_NAME, PLUGIN_VERSION, and setup(config:dict)
  called once on load, inside which the plugin may register prisms/commands/keys/hooks using the same
  APIs as init.py.
- Pass per-plugin config from init.py through to setup(). Isolate plugin load failures (one bad plugin
  must not crash the sidecar; report the error to the UI).

Tests:
- Integration: load a test plugin from a path and from a fake installed package; it registers a prism
  + command + keybinding that work; a deliberately broken plugin reports an error without taking down
  the sidecar.

Done when: third-party Python plugins can extend Prisms, commands, keys, and hooks.
```

**Commit:** `feat(plugins): python plugin loader with isolated setup()`

---

### M27 — Tier-3 React component Prisms (the escape hatch)

**Architectural decision:** packaging/loading of compiled React Prism plugins (`.p8e` package format + dynamic module loading).

```text
Implement Tier-3 Prisms: full React components shipped as plugin packages (SPEC.md §10.1 Tier 3).

Requirements:
- Define the `.p8e` Prism package format: a compiled React component plus a manifest (prism type name,
  version, prop schema). Document the build/output expectations for plugin authors.
- Load these packages dynamically into the renderer and register them in the Prism registry so they
  can be used in .index.p8e exactly like built-ins, but WITH full React hooks/state/animations
  (the escape hatch beyond the Python serialization boundary, SPEC.md §10.1).
- Sandbox/error-boundary each Tier-3 Prism so a crashing component degrades gracefully (shows an error
  card, doesn't take down the prism-view).

Tests:
- Integration: load a sample Tier-3 Prism package that uses useState; it renders, holds state across
  interactions, and an intentionally throwing component shows the error boundary.

Done when: power users can ship stateful React Prisms as packages and use them in any directory.
```

**Commit:** `feat(prism): tier-3 react component prism packages with error boundaries`

---

### M28 — Canvas grid renderer (V2 performance)

**Architectural decision:** the canvas rendering pipeline (offscreen buffer + requestAnimationFrame repaint), swapped behind the grid-renderer interface.

```text
Add the high-performance Canvas grid renderer for Neovim, behind a GridRenderer interface
(SPEC.md §8.5 "V2", §3).

Requirements:
- Define a GridRenderer interface so DOM (M23) and Canvas implementations are interchangeable.
- Canvas renderer (SPEC.md §8.5): grid_line writes to an offscreen buffer; flush triggers a
  requestAnimationFrame canvas repaint (drawImage from the offscreen buffer). Target Neovide-class
  performance; support smooth cursor movement.
- Make Canvas the default grid renderer when available; allow falling back to DOM via a setting.
- (Ligature rendering remains deferred per SPEC.md §17 — do not block on it.)

Tests:
- Unit/perf: a scripted burst of grid_line events renders without dropped flushes (basic timing
  assertion); renderer swap (DOM<->Canvas) produces equivalent visible output.

Done when: Neovim renders to a Canvas with smooth performance, swappable with the DOM renderer.
```

**Commit:** `perf(neovim): canvas grid renderer behind GridRenderer interface`

---

## Beyond V2.0 — stretch / planned (SPEC.md §17)

These are explicitly "planned" in the spec, not core to V2.0. Each is still a self-contained,
working-state milestone if/when you pursue them. Listed in dependency-friendly order.

### S1 — Git integration (`SPC g`)
```text
Add a git command namespace (SPEC.md §6.3, §17). Status, stage, commit, diff, branch, log — surfaced
through the command palette and a status Prism. Use a git library or shell out via the terminal infra.
Leave each command behind SPC g bindings. Done when basic git ops work from inside Prismarine.
```

### S2 — Multi-window support
```text
Allow multiple Electron windows, each with its own layout but a shared sidecar/registry where sensible
(SPEC.md §17). Done when a second window opens and operates independently.
```

### S3 — Inline AI agent Prisms
```text
A Python-registered Prism that calls the Anthropic API (SPEC.md §17). Stream responses into a Prism;
keep the API key in the secrets layer. Done when an AI Prism answers a prompt inside a directory.
```

### S4 — Sandboxed Python plugin permissions (V2.1)
```text
Declared permission scopes for plugins (fs/browser/secrets/network), enforced at the sidecar boundary
(SPEC.md §12.3, §17). Done when a plugin without a scope is denied that capability.
```

### S5 — Extension marketplace + remaining secret providers
```text
pip-installable prismarine-* discovery/listing (SPEC.md §17) and keepass/1password providers behind
the M21 SecretsProvider interface (SPEC.md §7.4). Done when a marketplace package installs and a new
secrets provider returns creds.
```

---

## Milestone dependency map (quick reference)

```
M0 scaffold
└─ M1 ipc bridge
   └─ M2 state/model
      └─ M3 panes (mouse)
         └─ M4 modes
            └─ M5 leader/keys/palette
               ├─ M6 fs ── M7 explorer ── M8 editor(CM) ── M9 fuzzy nav
               │                                            └─ M10 terminal
               └─ M11 python sidecar
                  └─ M12 init.py keys/cmds
                     └─ M13 hooks
                        ├─ M14 browser ── M15 automation ── M22 recorder
                        │                                    (also needs M21)
                        ├─ M16 prisms ── M17 interactive ── M18 python prisms
                        │                                    └─ M19 craft code ── M20 craft visual
                        └─ M21 secrets
   M8 editor interface ──────────────────► M23 neovim ── M24 nvim bridge/config
                                                          M23 ──► M28 canvas renderer
   M16 prism registry ──────────────────► M27 tier-3 prisms
   M13 + theme ─────────────────────────► M25 theming
   M12 + M16 ───────────────────────────► M26 plugins
```
