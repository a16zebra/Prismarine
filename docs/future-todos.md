# Future Todos

Ideas and improvements that aren't part of the current milestone plan but should be addressed eventually.
Ordered roughly by priority / natural implementation order.

---

## UX

### Doom-style token fuzzy search in command palette
**Context:** M5 added `commandRegistry.search()` which uses substring matching.
**Desired behaviour:** treat the query as a space-delimited list of tokens, each of which must match
somewhere in the command name or description — like Doom Emacs / Telescope.
Example: `"buf kil"` should surface `buffer.kill` (and `buffer.killBuffer` once that exists) ahead of
commands that only contain one of the two tokens.

**Implementation sketch:**
- Replace the substring filter in `CommandRegistry.search()` with a token scorer.
- Split query on whitespace → tokens.
- For each command, compute a score: sum of (token matched in name ? 2 : 0) + (token matched in description ? 1 : 0).
- Filter to score > 0, then sort descending by score; stable-sort preserves registration order for ties.
- Update `commandRegistry.test.ts` with token-query cases.
