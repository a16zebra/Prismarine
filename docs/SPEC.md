# Prismarine — Unified Specification V2.0

> Merges: Instructions V1 (PDF) + Spec V1.1 (TSX handoff) + V2 Design Session
> Status: **FINAL — V2.0**. Supersedes all prior specs.
> Last updated: 2026-05-27

---

## 0. One-Line Description

Prismarine is a keyboard-driven, local-first desktop workspace: file explorer, text editor, full browser, and
custom UI builder — unified under a single pane system, scriptable in Python, configurable to any depth.

---

## 1. Philosophy

> *You own your tools. You compose your workflows. You grow your digital garden.*

Prismarine inherits Prismarine V1's belief that software should fit the user, not the reverse. V2 extends
this into the keyboard-first world. The core tenets:

- **Local-first.** All data lives on your filesystem in human-readable formats. No cloud lock-in.
- **Keyboard-first, mouse-friendly.** Keyboard is the power path. Mouse always works. Neither is punished.
- **Python as the extension language.** If you can write a Python script, you can extend anything.
- **Transparent.** All configuration is plaintext. Everything is Git-trackable.
- **Composable.** Every workspace is built from Prisms. Every behaviour is a command.
- **Intimate.** A workspace should feel personal. Directories are not just folders; they are spaces.

Prismarine is not an IDE. It is not a browser. It is not a file manager.
It is the space where those tools stop being separate things.

---

## 2. Design Goals

| Goal | Description |
|---|---|
| Keyboard-driven | Space-leader navigation model; every action reachable without a mouse |
| Mouse-compatible | Full mouse support; no functionality hidden behind keyboard-only paths |
| Mode-based | Emacs/Doom-inspired mode system; friendly defaults, deep customisability |
| Python-scriptable | `init.py` configures keybindings, Prisms, commands, hooks, browser automation |
| Browser integration | Full Chromium embed; tabs live inside Prismarine; automatable via Python |
| Custom UI per directory | `.index.p8e` files define a Prism layout; editable in code or graphical Craft Editor |
| Local-first | All config and data stored in plaintext on disk |
| Fast | Sub-100ms buffer switches; lazy-loading for heavy buffers (browser, large files) |
| Versionable | All config and workspace definitions are plaintext; fully Git-trackable |
| Extensible | Python plugins can register new Prism types, commands, hooks, and keybindings |

---

## 3. Tech Stack

| Layer | Technology | Rationale |
|---|---|---|
| Desktop shell | **Electron** | Ships Chromium; enables real browser tab embedding; cross-platform |
| Main process | **Node.js** (Electron) | File system, window management, IPC bridge to Python and Neovim |
| Renderer | **React 18 + TypeScript** | Component model maps cleanly to Prism architecture |
| Styling | **Tailwind CSS** | Utility-first; theming via `.theme.p8e` CSS variable overrides |
| Browser pane | **Electron `WebContentsView`** | Embeds real Chromium tabs inside the app window |
| Text editor | **Neovim** (`--embed` headless) | Full Neovim via msgpack-RPC; user's plugins and config work natively |
| Neovim IPC | **`neovim` npm package** | msgpack-RPC client; drives Neovim grid events from Node.js |
| Neovim renderer | **DOM grid renderer** (V1) → **Canvas** (V2) | Draws Neovim's character grid into the pane |
| Editor fallback | **CodeMirror 6 + `@codemirror/vim`** | Used when Neovim is not installed; one-time notice shown |
| Python runtime | **CPython sidecar** (subprocess) | Config, scripting, browser automation, plugin logic |
| Python IPC | **JSON-RPC over stdio** | Python ↔ Electron main process; bidirectional, async |
| UI editor | **Custom Craft Editor** (React) | Visual drag-and-drop Prism layout builder |
| Build | **Vite + electron-vite** | Fast dev loop; handles renderer + main + preload |
| Testing | **Vitest + Playwright** | Unit, integration, end-to-end |
| Config format | **YAML** (`.index.p8e`) + **Python** (`init.py`) + **Lua** (`nvim/init.lua`) | Human-readable, versionable |

---

## 4. Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        Electron App                          │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │               Renderer Process (React/TS)             │   │
│  │                                                        │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────────────┐   │   │
│  │  │  Pane 1  │  │  Pane 2  │  │     Pane N ...    │   │   │
│  │  │ (editor) │  │(explorer)│  │    (browser)      │   │   │
│  │  └──────────┘  └──────────┘  └──────────────────┘   │   │
│  │                                                        │   │
│  │  ┌──────────────────────────────────────────────┐    │   │
│  │  │  Mode Bar  │  Buffer Name  │  Status  │ Clock │    │   │
│  │  └──────────────────────────────────────────────┘    │   │
│  │  ┌──────────────────────────────────────────────┐    │   │
│  │  │                  Minibuffer                   │    │   │
│  │  └──────────────────────────────────────────────┘    │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌──────────────────────────┐   ┌────────────────────────┐  │
│  │    Electron Main (Node)   │   │   BrowserView Manager  │  │
│  │  - FS access              │   │  (Chromium tabs)       │  │
│  │  - IPC bridge             │   └────────────────────────┘  │
│  │  - Window management      │                               │
│  └──────────┬───────────────┘                               │
│             │ JSON-RPC / stdio                               │
│  ┌──────────▼───────────────────────────────────────────┐   │
│  │                  Python Sidecar                        │   │
│  │  - init.py loader         - Command registry          │   │
│  │  - Keybinding registry    - Browser automation API    │   │
│  │  - Plugin loader          - Password manager bridge   │   │
│  │  - Prism type registry    - Hook system               │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### 4.1 IPC Flow

```
User keystroke
  → Renderer captures event
  → Mode system resolves to a Command name
  → If command is Python-registered:
      Renderer → IPC → Electron Main → JSON-RPC → Python Sidecar
      Python executes → returns result → IPC → Renderer updates
  → If command is built-in:
      Renderer handles directly
```

All IPC messages are async. The Python sidecar sends events back to the renderer at any time
(e.g., browser automation progress, file watcher events).

---

## 5. Buffer & Pane Model

Everything in Prismarine is a **buffer**. A buffer has a type, a path (or URL), and a major mode.

### 5.1 Buffer Types

| Buffer Type | Major Mode | Description |
|---|---|---|
| `file-editor` | `editor-mode` | Text/code file rendered via Neovim embed (or CodeMirror fallback) |
| `file-explorer` | `explorer-mode` | Directory listing |
| `prism-view` | `prism-mode` | Renders a directory's `.index.p8e` interface |
| `browser` | `browser-mode` | Full Chromium tab via WebContentsView |
| `terminal` | `terminal-mode` | Embedded terminal (xterm.js) |
| `craft-editor` | `craft-mode` | Visual Prism layout editor |
| `scratch` | `editor-mode` | Unsaved scratch buffer (Neovim unnamed buffer) |

### 5.2 Pane System

The window is divided into **panes**. Each pane holds one buffer.

- Panes can be split horizontally or vertically
- Panes can be resized by dragging dividers (mouse) or keyboard commands
- A pane can be focused; the focused pane receives keyboard input
- Each pane maintains its own buffer history (back/forward)
- WebContentsView panes (browser) and Neovim grid panes are positioned by the main process;
  both receive pixel coordinate updates from the renderer on every resize event

### 5.3 Buffer Navigation

```
SPC b b   → switch buffer (fuzzy search across open buffers)
SPC b n   → next buffer in pane
SPC b p   → previous buffer in pane  
SPC b d   → close buffer
SPC w /   → split pane vertically
SPC w -   → split pane horizontally
SPC w w   → cycle focus to next pane
SPC w d   → close pane
```

---

## 6. Mode System

Prismarine uses a **layered mode system** inspired by Doom Emacs. There are two orthogonal axes:

### 6.1 Editing States (vim-inspired, per buffer)

| State | Description | Entry | Exit |
|---|---|---|---|
| **Normal** | Navigation, commands | Default on buffer open; `Esc` | `i`, `a`, `o`, etc. |
| **Insert** | Text input | `i` in editor buffers | `Esc` |
| **Visual** | Selection | `v` (char), `V` (line) | `Esc` |

> **Default behaviour:** Prismarine opens in Normal state. This is less aggressive than Vim — most
> non-editor buffers (explorer, browser, prism-view) simply ignore Insert/Visual entirely. The user
> does not need to think about states until they open a text file.

### 6.2 Major Modes (per buffer type)

Each buffer type has a **major mode** that defines which keybindings are active.
Major modes are registered from Python or built-in TypeScript.

```
explorer-mode   → j/k to navigate, Enter to open, d to delete, r to rename ...
editor-mode     → all keys owned by Neovim; Prismarine only intercepts pane-level commands
browser-mode    → H/L for history, gt/gT for tabs, / for find-in-page ...
prism-mode      → read-only navigation of Prism elements
craft-mode      → mouse-driven Prism editor with keyboard shortcuts
terminal-mode   → passthrough (all keys go to terminal)
```

### 6.3 Leader Key & Keybinding Hierarchy

The **Space bar** is the leader key in Normal state. Keybindings follow a prefix namespace:

> ⚠️ **SPC conflict in `editor-mode`:** Neovim's `init.lua` sets `vim.g.mapleader = " "` —
> Space is also Neovim's leader inside editor buffers. The rule is simple:
>
> - `editor-mode` buffer focused, Neovim in Normal state → **Space goes to Neovim**
> - Any other buffer type focused → **Space goes to Prismarine**
>
> This is a clean boundary. The user never has to think about it — they are either
> in their editor (Neovim owns everything) or they are in the workspace (Prismarine owns everything).
> Pane-level commands (`SPC w`, `SPC b`) that need to work from inside Neovim
> are exposed as Neovim commands via the msgpack-RPC API and mapped in `nvim/init.lua`.

| Prefix | Namespace |
|---|---|
| `SPC SPC` | Command palette (fuzzy search all commands) |
| `SPC f` | File commands (find, save, rename, ...) |
| `SPC b` | Buffer commands (switch, close, ...) |
| `SPC w` | Window/pane commands |
| `SPC p` | Prism commands (open craft editor, toggle view, ...) |
| `SPC g` | Git commands |
| `SPC s` | Search commands |
| `SPC t` | Toggle commands (theme, sidebar, ...) |
| `SPC o` | Open commands (browser tab, terminal, ...) |
| `SPC a` | User-defined automation commands (Python) |
| `SPC x` | Execute / run commands |

Users extend or override any prefix in `init.py`. The leader key itself is configurable.

### 6.4 Default Keybinding Table (partial)

| Binding | Action |
|---|---|
| `SPC SPC` | Command palette |
| `SPC f f` | Find/open file (fuzzy) |
| `SPC f s` | Save current file |
| `SPC f r` | Recent files |
| `SPC f e` | Open file explorer for current directory |
| `SPC b b` | Switch buffer |
| `SPC b d` | Kill buffer |
| `SPC w /` | Split pane right |
| `SPC w -` | Split pane below |
| `SPC w d` | Close pane |
| `SPC o b` | Open new browser tab |
| `SPC o t` | Open terminal |
| `SPC p c` | Open Craft Editor for current directory |
| `SPC p v` | Toggle Files / Interface view |
| `SPC a` | User automation prefix (defined in `init.py`) |
| `g o` | Open URL under cursor in browser pane |
| `Ctrl+d` | Scroll down half-page |
| `Ctrl+u` | Scroll up half-page |
| `Esc` | Return to Normal state; close minibuffer |

All bindings are configurable. None are hardcoded beyond the IPC layer.

---

## 7. Python Configuration & Scripting API

### 7.1 Config File Location

```
~/.config/prismarine/init.py        ← main config (always loaded)
~/.config/prismarine/plugins/       ← plugin directory
~/.config/prismarine/themes/        ← theme overrides
```

On first launch, Prismarine writes a default `init.py` to this location.

### 7.2 init.py API Overview

```python
from prismarine import keys, commands, browser, hooks, prisms, secrets, ui

# ── Keybindings ─────────────────────────────────────────────────────────────

# Bind a named command to a key sequence
keys.bind("SPC a b", "open-checking-balance")
keys.bind("SPC a g", "open-gmail")

# Bind a lambda directly (for simple actions)
keys.bind("SPC a n", lambda: browser.new_tab("https://notion.so"))

# Bind within a specific major mode only
keys.bind("SPC a x", "my-command", mode="browser-mode")

# Change the leader key
keys.set_leader("<Space>")

# ── Commands ─────────────────────────────────────────────────────────────────

@commands.register("open-checking-balance", description="Navigate to checking account")
async def open_checking_balance():
    tab = await browser.new_tab("https://mybank.com")
    await tab.wait_for_url("**/login**")
    creds = await secrets.get("mybank.com")           # Bitwarden / system keychain
    await tab.fill("#username", creds.username)
    await tab.fill("#password", creds.password)
    await tab.click('[type="submit"]')
    await tab.wait_for_navigation()
    ui.notify("Logged in to checking account")

# ── Hooks ────────────────────────────────────────────────────────────────────

@hooks.on("buffer:open")
def on_buffer_open(event):
    if event.buffer_type == "file-editor" and event.path.endswith(".py"):
        ui.set_status("Python file opened")

@hooks.on("app:startup")
def on_startup():
    commands.run("open-checking-balance")   # auto-open on launch if desired

# ── Custom Prisms ─────────────────────────────────────────────────────────────

@prisms.register("bank-balance")
class BankBalancePrism:
    """Displays a live-fetched balance inside a .index.p8e layout."""
    schema = {
        "account": str,          # e.g. "checking"
        "label": str,
    }

    async def render(self, props) -> dict:
        # Returns a React-renderable JSON tree
        balance = await fetch_balance(props["account"])
        return {
            "type": "text",
            "content": f"{props['label']}: ${balance:,.2f}"
        }
```

### 7.3 `browser` API

The browser API wraps Electron's `webContents` and exposes it to Python via IPC.

```python
# Tab management
tab = await browser.new_tab(url)
tab = await browser.active_tab()
tabs = browser.list_tabs()
await browser.close_tab(tab)
await browser.focus_tab(tab)

# Navigation
await tab.navigate(url)
await tab.back()
await tab.forward()
await tab.reload()
await tab.wait_for_url(pattern)         # glob pattern
await tab.wait_for_navigation()

# DOM interaction (Playwright-style)
await tab.fill(selector, value)
await tab.click(selector)
await tab.press(selector, key)
text = await tab.inner_text(selector)
value = await tab.eval("document.title")

# Screenshots
img = await tab.screenshot()            # returns bytes

# Cookie / session
await tab.set_cookie(name, value, domain)
cookies = await tab.get_cookies()
```

### 7.4 `secrets` API (Password Manager)

```python
from prismarine import secrets

# Bitwarden (requires Bitwarden CLI installed and unlocked)
creds = await secrets.get("mybank.com")
# → { username, password, totp, notes, ... }

# Fallback: system keychain (macOS Keychain, Windows Credential Manager, etc.)
creds = await secrets.get("mybank.com", provider="keychain")

# Store a secret
await secrets.set("mybank.com", username="user@email.com", password="...")
```

Supported providers: `bitwarden`, `keychain` (system), `keepass` (planned), `1password` (planned).

### 7.5 IPC Bridge Contract

Python communicates with Electron via **JSON-RPC 2.0 over stdin/stdout**.

```json
// Python → Electron (request)
{ "jsonrpc": "2.0", "id": 1, "method": "browser.new_tab", "params": { "url": "https://..." } }

// Electron → Python (response)
{ "jsonrpc": "2.0", "id": 1, "result": { "tab_id": "abc123" } }

// Electron → Python (event, no id)
{ "jsonrpc": "2.0", "method": "event", "params": { "name": "buffer:open", "data": { ... } } }
```

---

## 8. Neovim Integration

### 8.1 Architecture

Neovim runs as a headless subprocess in `--embed` mode. Electron's main process spawns it,
communicates via **msgpack-RPC** using the `neovim` npm package, and forwards UI grid events
to the renderer for drawing.

```
Neovim process
  nvim --embed -u ~/.config/prismarine/nvim/init.lua
       │
       │ msgpack-RPC over stdio
       │
Electron Main
  neovim npm client
  - attach to UI ("ext_linegrid", "ext_multigrid")
  - send nvim_open_file, nvim_input, resize events
  - receive grid_line, hl_attr_define, flush, cursor_goto events
       │
       │ Electron IPC (contextBridge)
       │
Renderer (React)
  Neovim grid component
  - DOM grid renderer (V1)     → one <span> per cell, updated on flush
  - Canvas renderer (V2)       → full canvas repaint, better performance
  - handles font metrics, wide chars, ligatures
```

Each open `file-editor` pane has its own Neovim window within **one shared Neovim instance**.
Files are opened as Neovim buffers (`nvim_open_file`). Splits inside Neovim are
*not* used — Prismarine's pane system handles all splitting. Neovim's viewport is
resized to match the pane's pixel dimensions on every layout change.

### 8.2 Bundled Config

Prismarine ships a minimal, curated Neovim config at:

```
~/.config/prismarine/nvim/
├── init.lua               ← entry point; well-commented; safe to edit
└── lua/
    └── prismarine/
        ├── options.lua    ← sensible defaults (relative numbers, etc.)
        ├── keymaps.lua    ← Prismarine-aware leader mappings
        └── theme.lua      ← highlight group sync with Prismarine theme
```

**What the bundled config includes:**

- Sensible editor defaults (relative line numbers, `expandtab`, `undofile`, clipboard=unnamed)
- `Space` as `mapleader`
- `SPC w` / `SPC b` commands that call back into Prismarine via a thin RPC bridge
  (so pane splitting and buffer switching work from inside Neovim without leaving the editor)
- Highlight group sync — Prismarine's active `.theme.p8e` sets Neovim background and accent colours
- `lazy.nvim` as plugin manager (present but no plugins loaded by default)

**What the bundled config deliberately omits:**

- No LSP — too many system dependencies; user opts in
- No Telescope / fzf — Prismarine's command palette handles fuzzy finding at the workspace level
- No statusline plugins — Prismarine renders its own status bar outside the Neovim grid
- No auto-pairs, no snippets — user territory

The bundled config is a clean foundation, not an opinionated distribution.

### 8.3 Config Path

**Default:** `~/.config/prismarine/nvim/init.lua`

**Override in `init.py`:**

```python
from prismarine import editor

# Use system Neovim config (full power, all plugins)
editor.set_nvim_config("~/.config/nvim")

# Use a project-specific config
editor.set_nvim_config("~/work/.nvim")

# Absolute path
editor.set_nvim_config("/etc/prismarine/shared-nvim")
```

**Override via environment variable** (useful for CI or shared installs):

```bash
PRISMARINE_NVIM_CONFIG=~/.config/nvim prismarine
```

Priority: env var > `init.py` > default bundled config.

### 8.4 Neovim ↔ Prismarine RPC Bridge

A small Lua module (injected at startup) lets Neovim call back into Prismarine:

```lua
-- available in any nvim/init.lua or plugin
local p = require("prismarine")

-- open a new Prismarine pane (not a Neovim split)
p.split_right()
p.split_below()

-- switch to a different buffer type
p.open_explorer()
p.open_browser("https://docs.neovim.io")

-- run a Prismarine command by name
p.command("fetch-otp-github")
```

This means Neovim power users can map these to their own `SPC w` bindings inside `init.lua`
and never have to think about the Prismarine/Neovim boundary. Everything feels like one system.

### 8.5 Grid Renderer

The renderer receives Neovim UI events and draws them into the pane.

**V1 — DOM renderer (ships first):**

```
grid_line event → update cell state array → React re-render
                  one <span> per cell with inline style (fg, bg, bold, italic)
flush event     → commit the frame
```

Acceptable for most use. Can stutter on large files or fast cursor movement.

**V2 — Canvas renderer (planned):**

```
grid_line event → write to offscreen buffer
flush event     → requestAnimationFrame → canvas.drawImage from offscreen buffer
```

Matches Neovide-class performance. Enables sub-pixel font rendering and smooth cursor animation.

Font metrics (cell width × height) are calculated once on load from a hidden measurement canvas,
then passed to Neovim as the grid cell size via `nvim_ui_attach`.

### 8.6 Graceful Degradation

If `nvim` is not found on `$PATH` at startup:

1. Prismarine shows a **one-time dismissible notice**:
   > *Neovim not found. Using built-in editor. [Install Neovim] [Dismiss]*
2. All `file-editor` buffers fall back to **CodeMirror 6 + `@codemirror/vim`**
3. All other Prismarine features (browser, Prisms, Python scripting) work normally
4. Once Neovim is installed and Prismarine restarted, it switches automatically

The fallback is intentionally limited — it signals "install Neovim" rather than trying to
replicate the full experience. No config migration or feature parity is guaranteed.

---

## 9. File System Model

### 14.1 Real OS Filesystem

Unlike V1's `InMemoryFS`, V2 maps directly to the OS filesystem via Node.js `fs` APIs
(exposed to the renderer via Electron's `contextBridge`).

The `InMemoryFS` class from V1 becomes an interface contract:

```typescript
interface PrismarineFS {
  exists(path: string): Promise<boolean>
  get(path: string): Promise<FSNode>
  list(dirPath: string): Promise<string[]>
  writeFile(path: string, content: string): Promise<void>
  move(src: string, dest: string): Promise<void>
  rename(oldPath: string, newName: string): Promise<void>
  delete(path: string): Promise<void>
  watch(path: string, callback: (event: FSEvent) => void): Unsubscribe
}
```

### 14.2 Special Files

| Filename | Purpose |
|---|---|
| `.index.p8e` | Prism UI definition for this directory (YAML) |
| `.theme.p8e` | Visual theme overrides for this directory and descendants (YAML) |
| `.list.md.p8e` | Persisted checklist state (markdown format) |
| `.stopwatch.p8e` | Persisted stopwatch state |
| `*`.p8e` sidecar files | Structured content/behaviour linked to a parent file |

### 14.3 Directory Structure Conventions

```
~/.config/prismarine/
├── init.py              ← main Python config
├── plugins/             ← Python plugins
│   └── my_plugin.py
└── themes/              ← theme files

<any project directory>/
├── .index.p8e             ← custom Prism UI for this folder
├── .theme.p8e             ← visual overrides (optional)
└── ... normal files ...
```

---

## 10. Prism System

### 14.1 What Is a Prism?

A Prism is a UI building block. A directory's `.index.p8e` file defines an ordered list of Prisms
that render when the directory is viewed in Interface mode.

Prisms follow a **three-tier model** based on complexity and authoring skill required:

| Tier | Defined In | When to Use |
|---|---|---|
| **1 — Built-in** | React/TypeScript (ships with Prismarine) | Core UI blocks; full power, first-class performance |
| **2 — Data-display** | Python `init.py` or plugin | Fetch/transform data, render via declarative JSON tree; stateless or near-stateless |
| **3 — Advanced interactive** | React component plugin (`.p8e` package) | Full React hooks, state, animations; the escape hatch for power users |

Python Prisms (Tier 2) cover the 80% case and require no knowledge of React. They return
a JSON render tree that Prismarine's renderer hydrates into built-in Prism components.
Because they go through a serialisation boundary, they **cannot carry React state or lifecycle
hooks**. If a Prism needs those, it belongs in Tier 3 — a compiled React component distributed
as a plugin package, analogous to a VS Code extension.

### 14.2 Built-in Prisms (V2)

| Prism | Description |
|---|---|
| `text` | Static or dynamic text with font controls |
| `markdown` | Renders Markdown (CommonMark) |
| `checklist` | Interactive checklist with persistent state |
| `image` | Displays local or remote images |
| `file` | Embeds another file, auto-detected type |
| `shortcut` | Navigates to another directory |
| `stopwatch` | Functional stopwatch with persistent state |
| `vstack` | Vertical container for child Prisms |
| `hstack` | Horizontal container for child Prisms |
| `tabs` | Tabbed container |
| `form` | Gathers user input; `onSubmit` triggers a Python command |
| `dive` | Embeds another directory's `.index.p8e` inline |
| `embed` | Renders an iframe, image, or local HTML file |
| `data` | Parses and displays `.csv` or `.json` files as a table |
| `script` | Runs a Python command and renders its output |
| `browser-preview` | Embeds a live BrowserView at a given URL |

### 14.3 Python-Registered Prisms

```python
@prisms.register("my-widget")
class MyWidgetPrism:
    schema = { "label": str, "count": int }

    async def render(self, props) -> dict:
        # Returns a JSON-serialisable render tree
        # Prismarine renderer hydrates this into React components
        return {
            "type": "vstack",
            "children": [
                { "type": "text", "content": props["label"] },
                { "type": "text", "content": str(props["count"]) }
            ]
        }
```

Usage in `.index.p8e`:
```yaml
prisms:
  - type: my-widget
    props:
      label: "Items processed"
      count: 42
```

### 14.4 `.index.p8e` YAML Format

```yaml
prisms:
  - type: text
    props:
      content: "# My Project Dashboard"
      fontSize: 24
      fontWeight: bold

  - type: tabs
    props:
      tabs:
        - name: Tasks
          children:
            - type: checklist
              props:
                items:
                  - text: "Write spec"
                    checked: true
                  - text: "Build prototype"
                    checked: false
        - name: Notes
          children:
            - type: file
              props:
                filepath: ./notes.md

  - type: hstack
    props:
      gap: 24
      children:
        - type: stopwatch
          props:
            label: "Focus timer"
        - type: bank-balance          # Python-registered custom Prism
          props:
            account: checking
            label: "Checking"
```

### 14.5 YAML Parser

V2 ships a **real YAML parser** (`js-yaml`) replacing V1's custom parser. The custom parser is
retained only as a fallback for edge cases. All serialisation uses `js-yaml` with a safe schema.

---

## 11. Craft Editor (Visual & Code)

The Craft Editor allows building `.index.p8e` layouts without touching YAML.

### 14.1 Entry Points

- `SPC p c` → open Craft Editor for the current directory
- Right-click directory → "Edit Interface"
- Toolbar "Craft UX" button (mouse-accessible)

### 14.2 Dual-Mode Editor

The Craft Editor has two modes, switchable via a tab at the top:

| Mode | Description |
|---|---|
| **Visual** | Drag-and-drop canvas + component toolbox + property panel (V1 behaviour, improved) |
| **Code** | CodeMirror YAML editor with live preview, schema validation, and autocomplete |

Both modes stay in sync. Switching from Visual → Code serialises. Switching Code → Visual parses.
Validation errors in Code mode are shown inline; switching to Visual is blocked until errors are resolved.

### 14.3 Visual Mode Layout

```
┌──────────────────────────────────────────────────────────────┐
│  Visual │ Code                              [Save]  [Close]   │
├──────────┬───────────────────────────────┬────────────────────┤
│ Toolbox  │         Canvas                │  Properties        │
│          │  ┌──────────────────────┐     │                    │
│ Basic    │  │  Text: "# Dashboard" │     │  [selected prism   │
│  Text    │  ├──────────────────────┤     │   property fields] │
│  Markdown│  │  Checklist           │     │                    │
│  ...     │  │  ☑ Task one          │     │                    │
│          │  │  ☐ Task two          │     │                    │
│ Structure│  └──────────────────────┘     │                    │
│  [tree]  │                               │                    │
└──────────┴───────────────────────────────┴────────────────────┘
```

### 14.4 Fixes from V1

The following V1 bugs are resolved in V2:

- **vstack/hstack duplicate branch bug** — removed; container Prisms render correctly
- **ShortcutPrism stub** — calls real `navigate()` instead of `alert()`
- **Drag-and-drop** — fully implemented with `@dnd-kit/core`
- **executeFile stub** — replaced with real buffer-open command

---

## 12. Browser Integration

### 14.1 BrowserView Architecture

Browser tabs use Electron's `BrowserView` API. Each tab is a separate `BrowserView` instance
attached to the main `BrowserWindow`, positioned and resized by the main process to fill the
active pane when `browser-mode` is active.

This gives true Chromium rendering — not a sandboxed iframe — including cookies, sessions,
extensions (future), and DevTools.

### 14.2 Browser Automation via Python

See §7.3 for the full `browser` API. The automation model is:

1. User triggers a command (keybinding or command palette)
2. Renderer sends command name to main process via IPC
3. Main process routes to Python sidecar via JSON-RPC
4. Python executes `browser.*` calls via IPC back to main process
5. Main process calls `webContents` methods directly
6. Results propagate back to Python

This is equivalent to Playwright's architecture, but the "browser" is the user's own Prismarine
session, with their real login sessions. No CDP tunnelling needed — Electron owns the webContents.

### 14.3 Security Model

- Python scripts run as a subprocess with the same OS permissions as the user
- `secrets.get()` calls never log credentials; they are transmitted via IPC with no disk writes
- Browser automation is opt-in; nothing runs without a user-triggered command or explicit `init.py` hook
- A future sandboxed mode will restrict Python plugins to declared permission scopes

### 14.4 Browser Action Recorder

Prismarine includes a first-class action recorder that watches user interactions in a BrowserView
and exports them as a runnable Python script using the Prismarine `browser` API and CSS selectors.

#### Activation

```
SPC o r          → start recording (active BrowserView)
SPC o r          → stop recording  (toggle)
Toolbar button   → record / stop (mouse-accessible)
```

A recording indicator (red dot + "REC") appears in the pane status bar while active.

#### How It Works

1. On start, a lightweight recorder script is injected into `webContents` via
   `executeJavaScript`. It listens for `click`, `input`, `change`, and `navigation` events.
2. For each event it captures:
   - Action type (`click`, `fill`, `navigate`, `wait_for_selector`, ...)
   - **CSS selector** of the target element (computed via a selector-generation algorithm
     that prefers `id`, then `data-testid`, then class chains, then structural nth-child)
   - Value (for `fill` / `change` events)
   - Current URL (for navigation events)
3. A live preview pane shows the growing Python script in real time alongside the browser.
4. On stop, the user is prompted to name the script and optionally bind it to a key.

#### Password Safety

When the recorder detects a `fill` on a field with `type="password"` or `autocomplete="current-password"`:
- The literal value is **never written** to the script
- It is replaced with `await secrets.get("<domain>").password` automatically
- A TOTP field (`autocomplete="one-time-code"`) is replaced with `await secrets.get("<domain>").totp`

#### Exported Script Example

```python
# recorded: open_checking_balance
# recorded-on: 2026-05-27
# source-url: https://mybank.com

from prismarine import browser, secrets, commands

@commands.register("open-checking-balance")
async def run():
    tab = await browser.new_tab("https://mybank.com/login")
    await tab.wait_for_selector("#username")

    creds = await secrets.get("mybank.com")
    await tab.fill("#username", creds.username)
    await tab.fill("#password", creds.password)       # ← never the literal value
    await tab.click("button[type='submit']")
    await tab.wait_for_navigation()
    await tab.wait_for_selector(".account-summary")
```

#### Selector Strategy

CSS selectors are used throughout because they are readable, refineable in browser DevTools,
and stable enough for personal automation scripts (where the user controls which sites they automate).

Selector priority (most to least preferred):
1. `#id` — if unique on the page
2. `[data-testid="..."]` — explicit test hooks
3. `[name="..."]` — form fields
4. `.class-chain` — if class is semantically meaningful (not generated)
5. `tag:nth-child(n)` — structural fallback

The recorder generates the least-specific selector that uniquely identifies the element.
After recording, the user can edit any selector directly in the exported script.

#### Post-Recording Workflow

```
Stop recording
  → Prismarine shows: "Name this command:"  [open-checking-balance___]
  → "Bind to a key? (SPC a ...):"           [SPC a b___]
  → Script saved to ~/.config/prismarine/recorded/open_checking_balance.py
  → Binding added to init.py automatically
  → Command available immediately, no restart needed
```

---

## 13. Theming

### 14.1 `.theme.p8e` Files

A `.theme.p8e` file in any directory applies CSS variable overrides to that directory's Prism interface
and all subdirectory interfaces (unless overridden deeper).

```yaml
# .theme.p8e
variables:
  --background: "#1a1a2e"
  --foreground: "#e0e0e0"
  --accent: "#7c3aed"
  --font-size-base: "15px"
  --font-family: "JetBrains Mono, monospace"

prism-overrides:
  text:
    color: "#c4b5fd"
  checklist:
    checked-color: "#7c3aed"
```

### 14.2 Global Theme

The global theme is set in `init.py`:

```python
from prismarine import ui

ui.set_theme("dark")                          # built-in: dark, light, gruvbox, catppuccin
ui.load_theme("~/.config/prismarine/my.theme.p8e")   # custom
```

---

## 14. Plugin System

### 14.1 Installing a Plugin

```python
# init.py
from prismarine import plugins

plugins.load("~/.config/prismarine/plugins/my_plugin.py")
plugins.load("prismarine-plugin-github")        # installed via pip
```

### 14.2 Plugin Structure

```python
# my_plugin.py
from prismarine import prisms, commands, keys, hooks

PLUGIN_NAME = "my-plugin"
PLUGIN_VERSION = "1.0.0"

def setup(config: dict):
    """Called once on load with plugin config from init.py."""
    
    @prisms.register("my-widget")
    class MyWidget:
        ...

    @commands.register("my-command")
    async def my_command():
        ...

    keys.bind("SPC a m", "my-command")
```

---

## 15. Keyboard Shortcut Reference (Default)

### Global (all modes)

| Key | Action |
|---|---|
| `SPC SPC` | Command palette |
| `Esc` | Normal state; close minibuffer |
| `Ctrl+g` | Cancel current operation |

### File Operations

| Key | Action |
|---|---|
| `SPC f f` | Find file (fuzzy) |
| `SPC f s` | Save file |
| `SPC f S` | Save all |
| `SPC f r` | Recent files |
| `SPC f e` | File explorer (current dir) |
| `SPC f d` | Delete file |
| `SPC f R` | Rename file |
| `SPC f y` | Copy file path to clipboard |

### Buffers & Panes

| Key | Action |
|---|---|
| `SPC b b` | Switch buffer |
| `SPC b d` | Kill buffer |
| `SPC b n` / `SPC b p` | Next / previous buffer |
| `SPC w /` | Split pane right |
| `SPC w -` | Split pane below |
| `SPC w w` | Cycle pane focus |
| `SPC w d` | Close pane |
| `SPC w m` | Maximise pane |

### Prism / Interface

| Key | Action |
|---|---|
| `SPC p c` | Open Craft Editor |
| `SPC p v` | Toggle Files / Interface view |
| `SPC p r` | Reload `.index.p8e` |

### Browser

| Key | Action |
|---|---|
| `SPC o b` | Open browser tab |
| `SPC o r` | Start / stop browser action recording |
| `g o` | Open URL under cursor |
| `H` / `L` | Back / Forward (browser-mode) |
| `gt` / `gT` | Next / previous tab |
| `r` | Reload page |
| `/` | Find in page |

### Automation

| Key | Action |
|---|---|
| `SPC a` | User automation prefix (Python-defined) |
| `SPC x x` | Run current file (Python/shell) |

---

## 16. Known Issues Carried Forward from V1

These are resolved in V2:

| Issue | Resolution |
|---|---|
| vstack/hstack render bug | Fixed (§11.4) |
| ShortcutPrism alert() stub | Real navigate() call |
| executeFile alert() stub | Real buffer-open command |
| Drag-and-drop unimplemented | `@dnd-kit/core` |
| Custom YAML parser fragility | Replaced with `js-yaml` |
| No undo/redo in Craft Editor | Implemented with `useReducer` history stack |
| CodeMirror vim emulation (~80% fidelity) | Replaced with real Neovim embed |

---

## 17. Open Questions / Future Extensions

| Topic | Status |
|---|---|
| Git integration | Planned; `SPC g` prefix |
| Mobile / touch layout | Out of scope for V2 |
| Inline AI agent Prisms | Planned; Python-registered, calls Anthropic API |
| Extension marketplace | Planned; pip-installable `prismarine-*` packages |
| Multi-window support | Planned (Electron multi-window is straightforward) |
| Sandboxed Python plugin permissions | Planned for V2.1 |
| 1Password / KeePass secret providers | Planned |
| `<webview>` vs `BrowserView` vs `WebContentsView` | Electron is soft-deprecating `BrowserView` in favour of `WebContentsView` (Electron 28+). **Use `WebContentsView` for new development.** API is nearly identical; geometry constraint remains: pane layout must report pixel coordinates to the main process on every resize event. |
| Sync (optional, user-controlled) | Out of scope; use Git |
| Neovim canvas renderer | Planned for V2; DOM renderer ships in V1 |
| Neovim LSP in bundled config | Opt-in only; user adds to bundled config or switches to system config |
| Ligature rendering in grid | Non-trivial; deferred to canvas renderer milestone |
| Single Neovim instance vs per-pane | V1 ships single shared instance; per-pane isolation evaluated in V2 |

---

## 18. Glossary

| Term | Definition |
|---|---|
| **Buffer** | An open file, directory, browser tab, or other workspace unit |
| **Pane** | A visual region of the window that displays one buffer |
| **Major mode** | The set of keybindings and behaviours active for a buffer type |
| **Normal state** | Keyboard navigation state (Space leader active) |
| **Insert state** | Text input state (keys go to editor) |
| **Prism** | A UI building block used to compose directory interfaces |
| **`.index.p8e`** | YAML file defining the Prism layout for a directory |
| **Craft Editor** | Visual (or code) editor for `.index.p8e` files |
| **Minibuffer** | Bottom-of-screen input area for commands, search, and messages |
| **Leader key** | Space bar; opens the command namespace in Normal state |
| **Sidecar** | A `.p8e` file paired with a content file (e.g., `.notes.txt.p8e`) |
| **Python sidecar** | The CPython subprocess that runs `init.py` and plugins |
| **Neovim embed** | Neovim running in `--embed` headless mode, driven via msgpack-RPC |
| **Bundled nvim config** | The minimal Neovim config shipped with Prismarine at `~/.config/prismarine/nvim/` |
| **Grid renderer** | The React component that draws Neovim's character grid into a pane |
