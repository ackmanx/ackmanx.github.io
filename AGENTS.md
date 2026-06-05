# AGENTS.md

Guidance for AI coding agents working in this repository.

---

## Project Overview

This is a personal GitHub Pages site at **https://ackmanx.github.io/**. It is a collection of self-contained utility mini-apps and personal tools with no shared framework, no build pipeline, and no package manager. Everything is plain HTML, CSS, and vanilla JavaScript.

---

## Deployment

- The `/docs` directory is the deployed web root. GitHub Pages serves it directly.
- Any push to the `main` branch automatically deploys within a couple of minutes.
- There is **no build step**. Editing a file in `/docs` is the same as deploying it.

---

## Repository Structure

```
/
├── AGENTS.md                        # This file
├── README.md                        # One-liner about the site
├── if-you-know-you-know.md          # Contains a sensitive credential — do not modify or expose
└── docs/                            # Web root (everything served from here)
    ├── index.html                   # Homepage — full-screen Signalis game image
    ├── signalis.jpg                 # Homepage background image
    ├── fake_security.css            # Styles for the fake security login page
    ├── fake_security.html           # Password entry page that writes to localStorage
    ├── .nojekyll                    # Tells GitHub Pages not to run Jekyll
    ├── dash/
    │   └── index.html               # Navigation dashboard — links to all apps
    ├── calendar/
    │   ├── index.html               # Full-featured personal calendar app
    │   └── favicon.png
    ├── count-to-me/
    │   └── index.html               # Counts aloud by 2s using the Web Speech API
    ├── diff/
    │   └── index.html               # Side-by-side text/file diff viewer
    ├── how-old-am-i/
    │   ├── index.html               # Age calculator UI
    │   ├── script.js                # App logic using Luxon for date math
    │   ├── people.js                # Personal data — family/friends birthdays
    │   └── style.css
    ├── json-key-sort/
    │   └── index.html               # Deep-sorts JS object keys alphabetically
    ├── mhunter/
    │   ├── index.html               # Static Spotify music index report (~9,700 lines)
    │   ├── artist_page/             # Per-artist detail pages
    │   └── assets/                  # Styles, icons, manifest
    ├── shrinking-notepad/
    │   └── index.html               # Notepad where text shrinks to fit; history in localStorage
    └── where-does-my-money-go/
        ├── index.html               # Budget/expense tracker
        └── favicon__replace-me-with-a-new-icon.png
```

---

## Tech Stack & Conventions

### No build system

There is no `npm`, `node_modules`, `package.json`, `webpack`, `vite`, or any other build tooling. Do not introduce any. All dependencies are loaded from CDNs inside the HTML files.

### CDN libraries in use

| Library                                                 | Used in                                                                    |
| ------------------------------------------------------- | -------------------------------------------------------------------------- |
| [Tailwind CSS](https://cdn.tailwindcss.com)             | `calendar`, `json-key-sort`, `shrinking-notepad`, `where-does-my-money-go` |
| [Luxon](https://cdn.jsdelivr.net/npm/luxon@3.4.4/...)   | `how-old-am-i`                                                             |
| [Phosphor Icons](https://unpkg.com/@phosphor-icons/web) | `where-does-my-money-go`                                                   |
| Google Fonts                                            | `count-to-me`, `where-does-my-money-go`                                    |
| Cloudflare Web Analytics                                | `mhunter`, `fake_security`                                                 |

### CSS patterns

- Inline `<style>` blocks inside `<head>` are the norm for single-file apps.
- Dark mode is implemented two ways depending on the app:
  - CSS `@media (prefers-color-scheme: dark)` with CSS custom properties (e.g., `shrinking-notepad`)
  - Tailwind `dark:` classes with a `localStorage`-based `theme` toggle (e.g., `where-does-my-money-go`, `calendar`)
- CSS custom properties (`--var-name`) are used for theming in most apps.

### JavaScript patterns

- Vanilla JS only — no React, Vue, Svelte, etc.
- `how-old-am-i` is the only app that uses ES modules (`<script type="module">`).
- All other apps use inline `<script>` blocks without modules.
- `localStorage` is used for persistence in `shrinking-notepad`.
- Some apps (`calendar`) use a **dual-persistence** strategy: `localStorage` acts as a local cache/fallback, while the authoritative store is a remote MongoDB instance exposed via a Vercel API (`https://friends-of-mongo.vercel.app/calendar`). On load, the app reads localStorage first, then overwrites with the remote response if the fetch succeeds. On every save, it writes to both localStorage and the remote API.

---

## App-by-App Notes

### `dash` (Navigation Dashboard)

The central link list to all apps. **When adding a new app, add a link here.** Links use relative paths (`../app-name/index.html`). The page is intentionally minimal — dark background, large teal monospace font.

### `calendar`

The most complex app in the project. Features:

- Multiple named calendars (color-coded)
- Recurring events (daily, weekly, monthly, annually, bi-annually)
- Dual persistence: `localStorage` (key `calendarAppData`) for offline resilience, plus a remote MongoDB-backed Vercel API for cross-device sync

**API endpoints** (base: `https://friends-of-mongo.vercel.app`):

- `GET /calendar` — fetches the saved `appData` object; called on page load. If successful, remote data overwrites the localStorage copy.
- `POST /calendar` — saves the current `appData`; called on every mutation. Request body: `{ password, appData }` where `password` is read from `localStorage.getItem('super_secret')`.

**Password flow:** The credential is stored in `localStorage` under the key `super_secret`. `fake_security.html` is a one-time setup page that accepts the password from the user and writes it there, then redirects to `index.html`. The actual credential value lives in `if-you-know-you-know.md` — treat it as a secret and do not copy it into code.

### `how-old-am-i`

Personal family birthday tracker. `people.js` exports `peopleData` — an array of people with `name`, `birthday` (ISO 8601 string), and `group`. This file contains real personal data. Do not log, display, or expose its contents unnecessarily.

### `mhunter`

A static HTML report of a personal Spotify music collection. It is **auto-generated** — do not hand-edit the ~9,700-line `index.html` or the `artist_page/` files. Changes will be overwritten on the next report generation. If something needs fixing here, address the generator, not the output.

### `shrinking-notepad`

Uses a `ResizeObserver` + a hidden `<span>` measurement trick to dynamically shrink font size as text grows. Notes are stored in `localStorage` under the key `shrink_notes` (max 50 entries).

### `fake_security.html`

A deliberately minimal password entry form. It writes the entered value to `localStorage('super_secret')` and redirects to `index.html`. It is used as a one-time setup step for the calendar app's save feature — not a real security mechanism.

### `where-does-my-money-go`

The favicon file is named `favicon__replace-me-with-a-new-icon.png` — it's a placeholder. The `<body>` in `index.html` is empty; all rendering is done via JavaScript injected into the DOM.

---

## Adding a New App

1. Create a new subdirectory under `docs/`: `docs/my-new-app/`
2. Add at minimum an `index.html`.
3. Add a link to `docs/dash/index.html` following the existing pattern:
   ```
   <a href="../my-new-app/index.html">my new app</a>
   ```
4. Keep the app entirely self-contained. Do not create shared CSS or JS files that span multiple apps.
5. No build step needed — the file is live as soon as it's committed to `main`.

---

## Things to Avoid

- **Do not introduce a build system** (no npm, no bundlers, no transpilers).
- **Do not create shared cross-app dependencies.** Each app is intentionally isolated.
- **Do not edit `mhunter/index.html` or `mhunter/artist_page/` by hand** — those files are generated output.
- **Do not commit secrets.** The credential in `if-you-know-you-know.md` already exists in the repo; do not copy it into code or expose it in new places.
- **Do not modify `people.js` casually** — it contains real personal data.
- **Do not add a `package.json`** or any file that implies a Node.js project exists here.

## Code Style

- Honor prettier config
- Use whitespace to organize code with proper indentation and newlines
- Avoid single letter variable names, because they are ambiguous
