# Running Sillyworld locally

## Prerequisites

- Node.js 18+
- npm

## Install dependencies

```bash
npm install
```

## Start development server

```bash
npm run dev
```

Vite will print a local URL (typically `http://localhost:5173`).

## Build for production

```bash
npm run build
```

Build output is generated in `dist/`.

## Preview production build

```bash
npm run preview
```

## Entry points

- App HTML shell: `index.html`
- App bootstrap: `src/standalone.js`
- App orchestration: `src/app.js`
