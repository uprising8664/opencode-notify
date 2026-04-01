# Runtime Fixes for OpenCode Notify Plugin

## Problem

After porting rich notification content from `oh-my-openagent` into `opencode-notify`, three runtime errors occurred:

1. **`TypeError: undefined is not an object (evaluating 'messages.length')`** — `client.session.messages()` can return `undefined` for `.data` at runtime despite TypeScript types suggesting otherwise.
2. **`TypeError: text.split is not a function`** — SDK message objects don't always match the assumed `SessionMessage` interface — `parts` can be non-array, text fields can be non-strings.
3. **`TypeError: undefined is not an object (evaluating 'hook.config')`** — `notification-content.ts` was a top-level `.ts` file in `~/.config/opencode/plugins/`. OpenCode auto-discovers top-level `.ts` files and tries to load each as a plugin. Since `notification-content.ts` has no default export, the loader crashed.

## Fixes Applied

### `src/notification-content.ts` — Defensive runtime guards

- **`findLastMessage`**: Accept `undefined` messages array, early return if empty/missing.
- **`extractMessageText`**: Validate `message.parts` exists and is an array before iterating.
- **`collapseWhitespace`**: Accept `unknown` type, validate it's a string before calling `.split()`.
- **`getLastNonEmptyLine`**: Same treatment as `collapseWhitespace`.

### `~/.config/opencode/plugins/` — File structure fix

- Moved `notification-content.ts` from `plugins/` → `plugins/notify/` to prevent OpenCode from auto-discovering it as a standalone plugin.
- Updated the import in `plugins/notify.ts` line 33: `"./notification-content"` → `"./notify/notification-content"`.

## Key Lesson

OpenCode auto-discovers **only top-level `.ts` files** in `~/.config/opencode/plugins/` and calls their default export. Helper modules without a default export must live in subdirectories to avoid being loaded as plugins.
