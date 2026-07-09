# Tic Tac Toe

A React + Vite Tic Tac Toe game with arcade-style UI, theme switching, and sound effects.

## Features

- Playable Tic Tac Toe game with win/draw detection
- Dark and light theme support
- Sound effects and background music powered by Tone.js
- Built using React and Vite for fast local development

## Getting Started

Install dependencies:

```bash
npm install
```

Run the app locally:

```bash
npm run dev
```

Open the browser at:

```text
http://127.0.0.1:5175/
```

## Project Structure

- `src/App.jsx` — main app and game logic
- `src/main.jsx` — React entry point
- `index.html` — Vite HTML entry file

## Dependencies

- `react`
- `react-dom`
- `tone`
- `vite`
- `@vitejs/plugin-react`

## Build

```bash
npm run build
```

## Notes

This project uses `Tone.js` for audio, so make sure dependencies are installed before running the app.

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
