export interface CommandEntry {
  name: string
  fn: () => void
  description: string
}

export class CommandRegistry {
  private commands = new Map<string, CommandEntry>()

  register(name: string, fn: () => void, opts: { description: string }): void {
    this.commands.set(name, { name, fn, description: opts.description })
  }

  run(name: string): boolean {
    const entry = this.commands.get(name)
    if (!entry) {
      console.warn(`[commands] unknown command: ${name}`)
      return false
    }
    entry.fn()
    return true
  }

  list(): CommandEntry[] {
    return Array.from(this.commands.values())
  }

  search(query: string): CommandEntry[] {
    const all = this.list()
    if (!query) return all
    const lower = query.toLowerCase()
    return all.filter(
      (c) => c.name.toLowerCase().includes(lower) || c.description.toLowerCase().includes(lower),
    )
  }

  has(name: string): boolean {
    return this.commands.has(name)
  }
}

export const commandRegistry = new CommandRegistry()
