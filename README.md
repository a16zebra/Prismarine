<div align="center">

```
██████╗ ██████╗ ██╗███████╗███╗   ███╗ █████╗ ██████╗ ██╗███╗   ██╗███████╗
██╔══██╗██╔══██╗██║██╔════╝████╗ ████║██╔══██╗██╔══██╗██║████╗  ██║██╔════╝
██████╔╝██████╔╝██║███████╗██╔████╔██║███████║██████╔╝██║██╔██╗ ██║█████╗  
██╔═══╝ ██╔══██╗██║╚════██║██║╚██╔╝██║██╔══██║██╔══██╗██║██║╚██╗██║██╔══╝  
██║     ██║  ██║██║███████║██║ ╚═╝ ██║██║  ██║██║  ██║██║██║ ╚████║███████╗
╚═╝     ╚═╝  ╚═╝╚═╝╚══════╝╚═╝     ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝╚═╝╚═╝  ╚═══╝╚══════╝
```

**your workspace. your rules. your garden. 🌿**

*(˘_˘)　 　　　　　　　　　　　　　　　　　　 (¬_¬)*

[![License: MIT](https://img.shields.io/badge/License-MIT-violet.svg)](LICENSE)
[![Built with Electron](https://img.shields.io/badge/Built%20with-Electron-47848F?logo=electron)](https://electronjs.org)
[![Python](https://img.shields.io/badge/Scriptable%20in-Python-3776AB?logo=python&logoColor=white)](https://python.org)
[![Built with Claude](https://img.shields.io/badge/Built%20with-Claude%20AI-D97757?logo=anthropic&logoColor=white)](https://anthropic.com)
[![Status: Spec Complete](https://img.shields.io/badge/Status-Spec%20Complete-8B5CF6)](docs/SPEC.md)

</div>

---

## what is this? ✨

Prismarine is a **keyboard-driven desktop workspace** that combines:

- 📁 a **file explorer** — your filesystem, your way
- 📝 a **text & code editor** — CodeMirror 6, fast and language-aware  
- 🌐 a **real browser** — full Chromium embed, tabs and all
- 🎨 a **custom UI builder** — turn any folder into a living dashboard

...all unified under a single pane system, scriptable in Python, and configurable to any depth.

> *You own your tools. You compose your workflows. You grow your digital garden.*

---

## the big idea 💡

Most tools make you fit them. Prismarine fits you.

Every directory can have a `.index.p8e` file — a YAML layout of **Prisms** (UI building blocks) that transforms that folder into a bespoke interactive interface. A project folder becomes a dashboard. A notes folder becomes a reading room. A finance folder becomes a live balance viewer that logs into your bank automatically. ✦

And if you can write Python, you can script *anything* — keybindings, browser automation, OTP fetching, Bitwarden integration, hooks on file open, commands bound to a single keypress. The whole system is your config file. (˘_˘) ♡

---

## features (¬_¬) ✦

### 🗂 file explorer
- Navigate your real OS filesystem
- Keyboard-driven (`j`/`k` to move, `Enter` to open, `d` to delete, `r` to rename)
- Pin frequently visited directories to the sidebar
- Hidden `.p8e` sidecar files stay out of the way

### 📝 editor (neovim ✦)
- **Real Neovim** running in `--embed` headless mode — not an emulation
- Your existing `init.lua`, plugins, LSP, Treesitter — all work natively
- Ships with a **minimal bundled config** (`~/.config/prismarine/nvim/`) — fast, clean, no plugin sprawl
- One line to switch to your system config: `editor.set_nvim_config("~/.config/nvim")`
- `Space` leader in Neovim and Prismarine coexist cleanly — editor buffer focused → Neovim owns `SPC`; everything else → Prismarine owns it
- Graceful fallback to CodeMirror 6 + vim mode if Neovim is not installed

### 🌐 browser (real chromium ✦)
- Full `WebContentsView` embed — not an iframe, not a webview, actual Chromium
- Tabs live inside the app alongside your files
- Keyboard navigation (`H`/`L` for history, `gt`/`gT` for tabs, `g o` to open URL under cursor)
- **Automatable via Python** — navigate, fill forms, click buttons, screenshot
- **Action recorder** → records your clicks and exports them as a Python script
- **OTP autofill** → watches your inbox via IMAP IDLE, suggests the code when it arrives (ﾉ◕ヮ◕)ﾉ*:･ﾟ✧

### 🎨 prism interfaces
- Drop a `.index.p8e` in any folder to give it a custom UI
- **Built-in Prisms**: text, markdown, checklist, image, stopwatch, tabs, data table, form, embed, file viewer, shortcut, vertical/horizontal stack...
- **Python Prisms**: fetch data, transform it, render it — no React knowledge needed
- **React plugin Prisms**: full power escape hatch for advanced interactive components
- Edit visually in the **Craft Editor** (drag-and-drop, no code) or directly in YAML

### ⌨️ keyboard system (doom emacs vibes)
- `Space` is the leader key
- `SPC SPC` → command palette (fuzzy search everything)
- Friendly defaults — no need to memorize chords to open a file
- Modal states (Normal / Insert / Visual) per buffer, but they stay out of your way until you want them
- Every binding is configurable in Python

### 🐍 python scripting
- `~/.config/prismarine/init.py` — your entire config lives here
- Register commands, keybindings, hooks, custom Prisms, browser automations
- Full `browser` API: navigate, fill, click, wait, screenshot, eval JS
- `secrets` API: Bitwarden, system keychain, App Passwords — never hardcode credentials
- Plugin system: `pip install prismarine-*` packages

---

## quick look 👀

### a simple `.index.p8e`

```yaml
# ~/projects/my-app/.index.p8e

prisms:
  - type: text
    props:
      content: "# my-app dashboard"
      fontSize: 22
      fontWeight: bold

  - type: tabs
    props:
      tabs:
        - name: 📋 Tasks
          children:
            - type: checklist
              props:
                items:
                  - text: "write tests"
                    checked: false
                  - text: "deploy to staging"
                    checked: true

        - name: 📄 Readme
          children:
            - type: file
              props:
                filepath: ./README.md

  - type: stopwatch
    props:
      label: "focus timer"
      showMs: false
```

### python automation in `init.py`

```python
from prismarine import browser, secrets, commands, keys

@commands.register("open-github-inbox")
async def open_github_inbox():
    tab = await browser.new_tab("https://github.com/notifications")
    await tab.wait_for_selector(".notifications-list")

keys.bind("SPC a g", "open-github-inbox")


# bank login — password never touches the script ✦
@commands.register("open-checking")
async def open_checking():
    tab = await browser.new_tab("https://mybank.com/login")
    await tab.wait_for_selector("#username")
    creds = await secrets.get("mybank.com")        # → Bitwarden
    await tab.fill("#username", creds.username)
    await tab.fill("#password", creds.password)    # literal never written
    await tab.click("button[type='submit']")
    await tab.wait_for_navigation()

keys.bind("SPC a b", "open-checking")
```

---

## what people automate 🤖

The Python `browser` + `secrets` stack is a general-purpose automation layer.
A few things it's good at — each bound to a single keypress:

---

**☀️ morning routine** — one key opens everything you check at the start of the day

```python
@commands.register("morning")
async def morning():
    await browser.new_tab("https://mail.google.com")
    await browser.new_tab("https://calendar.google.com")
    await browser.new_tab("https://github.com/notifications")

keys.bind("SPC a m", "morning")
```

---

**🏦 bank balance in a Prism** — logs in, scrapes the number, surfaces it in your finance folder's dashboard

```python
@commands.register("fetch-balance")
async def fetch_balance():
    tab = await browser.new_tab("https://mybank.com/login")
    creds = await secrets.get("mybank.com")
    await tab.fill("#username", creds.username)
    await tab.fill("#password", creds.password)
    await tab.click("button[type='submit']")
    await tab.wait_for_selector(".account-balance")
    balance = await tab.inner_text(".account-balance")
    ui.notify(f"Checking: {balance}")

keys.bind("SPC a b", "fetch-balance")
```

---

**📋 form filler** — any repetitive web form you fill more than once a week is a candidate

```python
@commands.register("submit-timesheet")
async def submit_timesheet():
    tab = await browser.active_tab()
    await tab.fill("#hours-mon", "8")
    await tab.fill("#hours-tue", "8")
    # ... etc
    await tab.click("#submit-timesheet")
    ui.notify("Timesheet submitted. (˘_˘)")

keys.bind("SPC a t", "submit-timesheet")
```

---

**🔐 OTP autofill** — watches your inbox via IMAP IDLE, extracts the code the moment it lands

```
GitHub asks for an OTP.
Prismarine: "OTP from github.com: 483921 — fill it?  [Enter] yes  [Esc] no"
```

One keypress. Done. See [`plugins/otp_watcher.py`](plugins/otp_watcher.py) for the full implementation.

---

> 💡 **the recorder makes this even easier** — hit `SPC o r`, click through the site once,
> and Prismarine exports your actions as a Python script. edit it, name it, bind it. ✦

---

## keyboard reference ⌨️

| key | action |
|---|---|
| `SPC SPC` | command palette |
| `SPC f f` | find / open file |
| `SPC f s` | save file |
| `SPC b b` | switch buffer |
| `SPC w /` | split pane right |
| `SPC w -` | split pane below |
| `SPC w w` | cycle pane focus |
| `SPC o b` | open browser tab |
| `SPC o t` | open terminal |
| `SPC o r` | start / stop browser recording |
| `SPC p c` | open Craft Editor (visual UI builder) |
| `SPC p v` | toggle Files ↔ Interface view |
| `SPC a` | your automation commands (Python-defined) |
| `g o` | open URL under cursor in browser |
| `H` / `L` | back / forward (browser pane) |
| `Esc` | back to Normal state |

> all bindings configurable. none hardcoded.

---

## architecture (˘_˘)

```
Electron App
├── Renderer (React + TypeScript)
│   ├── Pane system (splits, focus, history)
│   ├── Buffer types (editor, explorer, browser, prism-view, terminal)
│   ├── Mode system (Normal / Insert / Visual × major modes)
│   ├── Prism renderer (hydrates .index.p8e → React components)
│   └── Craft Editor (visual + YAML dual-mode)
│
├── Main process (Node.js)
│   ├── Real OS filesystem
│   ├── WebContentsView manager (Chromium browser tabs)
│   ├── IPC bridge → Python sidecar (JSON-RPC over stdio)
│   └── Window management
│
└── Python sidecar (CPython subprocess)
    ├── init.py loader
    ├── Command + keybinding registry
    ├── browser API (wraps webContents via IPC)
    ├── secrets API (Bitwarden, keychain)
    ├── Hook system (buffer:open, browser:page_loaded, ...)
    └── Plugin loader
```

---

## tech stack 🛠

| layer | tech |
|---|---|
| desktop shell | Electron |
| renderer | React 18 + TypeScript |
| styling | Tailwind CSS |
| browser pane | Electron `WebContentsView` |
| text editor | **Neovim** (`--embed` + msgpack-RPC) |
| editor fallback | CodeMirror 6 + `@codemirror/vim` |
| neovim ipc | `neovim` npm (msgpack-RPC) |
| drag-and-drop | `@dnd-kit/core` |
| python runtime | CPython sidecar (subprocess) |
| ipc | JSON-RPC 2.0 over stdio |
| build | Vite + electron-vite |
| testing | Vitest + Playwright |
| ui config format | YAML (`.index.p8e`) + Lua (`nvim/init.lua`) |
| scripting | Python (`init.py`) |

---

## file types ✦

| file | purpose |
|---|---|
| `.index.p8e` | Prism UI layout for a directory |
| `.theme.p8e` | Visual theme overrides (CSS variables) |
| `.list.md.p8e` | Persisted checklist state |
| `.stopwatch.p8e` | Persisted stopwatch state |
| `*.p8e` sidecar | Structured behaviour linked to a parent file |

---

## philosophy 🌿

Prismarine is a bet that **the desktop can be a canvas** again.

Not a locked-down app store. Not a SaaS dashboard with your data on someone else's server.
Your filesystem. Your config. Your tools — shaped exactly the way you think.

We took the local-first spirit of the original Prismarine concept and combined it with the keyboard-driven, endlessly-configurable philosophy of Emacs. Then we asked: what if that workspace also had a real browser inside it, and a Python script could drive the whole thing?

This is the answer. (˘_˘) ♡

---

## roadmap 🗺

- [x] Unified specification V2.0 ✦
- [ ] Electron scaffold + pane system
- [ ] Python sidecar IPC handshake
- [ ] File explorer (real OS fs)
- [ ] CodeMirror 6 editor buffer
- [ ] WebContentsView browser tabs
- [ ] Prism renderer (built-in Prism set)
- [ ] `.index.p8e` YAML parser (`js-yaml`)
- [ ] Craft Editor (visual + YAML dual mode)
- [ ] Python `browser` API
- [ ] `secrets` API (Bitwarden + keychain)
- [ ] Action recorder → Python export
- [ ] OTP autofill plugin
- [ ] Git integration (`SPC g` prefix)
- [ ] Inline AI agent Prism
- [ ] Extension marketplace (`pip install prismarine-*`)

---

## built with AI 🤖 ✦

Prismarine is being designed and built in active collaboration with **Claude** (Anthropic).

That means:

- 📐 the **full specification** (architecture, IPC contracts, Python API surface, Prism system, keyboard model) was designed in conversation with Claude and lives in [`SPEC.md`](docs/SPEC.md)
- 🐍 the **Python plugin examples** — including the browser automation layer and OTP watcher — were written with Claude
- 🧱 **implementation** is being built iteratively, with Claude writing, reviewing, and debugging code alongside the human author
- 📝 this **README** was written with Claude (ﾉ◕ヮ◕)ﾉ*:･ﾟ✧

This is not "AI generated and abandoned." It is a genuine human–AI collaboration — the vision, taste, and direction are human; the execution speed and technical depth are amplified by AI. We think that's worth being open about.

> *If you're curious how a project like this gets built with AI, the commit history will show you. (˘_˘)*

---

## contributing 🤝

The spec lives in [`SPEC.md`](docs/SPEC.md). Read it first.

The cleanest first contribution is picking one item from the roadmap above and building it to spec.
Open an issue before starting anything large — architecture decisions are still being finalised. (._.)

---

<div align="center">

*built with quiet determination, an unreasonable love of keyboards, and a little help from Claude ✦*

*(˘_˘)　♡　(¬_¬)*

</div>
