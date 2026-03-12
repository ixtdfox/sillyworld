# Running SillyRPG in standalone mode

This project can now run as a regular web application without SillyTavern.

## Prerequisites

- Node.js 18+
- npm

## Install dependencies

```bash
npm install
```

## Start local development server

```bash
npm run dev
```

Vite will print a local URL (typically `http://localhost:5173`) where the standalone app is mounted.

## Build for production

```bash
npm run build
```

This outputs production files in `dist/`.

## Preview production build

```bash
npm run preview
```

## Notes

- Standalone entrypoint: `src/standalone.js`
- Standalone HTML shell: `index.html`
- Existing SillyTavern extension entrypoint (`index.js`) is still present and unchanged for legacy integration.
