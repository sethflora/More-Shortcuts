# More Shortcuts

A Chrome extension that replaces the limited "Most Visited" tiles on the New Tab page with a fully customizable toolbar dropdown — unlimited slots, folders, drag-and-drop organization, and 8 built-in themes.

### Why

Chrome's built-in New Tab shortcuts cap out at a handful of tiles with no way to organize them. This rebuilds that concept as an on-demand popup with no artificial limit, folders for grouping, and a theming system — built entirely in vanilla JS/CSS/HTML with no build step or frameworks.

## Features

- **Unlimited shortcuts** — add as many slots as needed; no fixed cap.
- **Folders** — drag one shortcut onto another to group them; rename, delete, and move shortcuts in or out.
- **Drag-and-drop everywhere** — reorder tiles, merge into folders, merge folders together.
- **8 built-in themes** — Dark, Light, Midnight, Ocean, Sunset, Forest, Grape, Sepia — all CSS custom properties, switchable from a palette icon and persisted across sessions.
- **Add from the current tab** — one click grabs the active tab's URL and title.
- **Live favicons** — pulled via Chrome's internal favicon API with a letter-avatar fallback.
- **Zero dependencies** — no npm, no bundler, no frameworks.

## Tech

- Manifest V3 (Chrome Extensions)
- `chrome.storage.local` for persistence
- `chrome.tabs` and the internal `_favicon` API
- CSS custom properties + `color-mix()` for runtime theming

## Install (development)

1. Clone this repo.
2. Go to `chrome://extensions`, enable Developer mode.
3. Click "Load unpacked" and select the project folder.

## License

MIT
