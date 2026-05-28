/** Tiny unique-ID generator backed by crypto.randomUUID(). */
export function nanoid(): string {
  return crypto.randomUUID()
}
