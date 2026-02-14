# OpenClaw Voice

Browser-based voice interface for OpenClaw gateways. Pure static SPA — no backend needed.

## Quick Start

```bash
npm install
npm run dev
```

Open http://localhost:5173, enter your gateway WebSocket URL and auth token, and start talking.

## Build

```bash
npm run build
```

Output in `dist/` — deploy anywhere as static files.

## Features

- Push-to-talk voice interface with animated orb
- Speech-to-text via Web Speech API
- Text-to-speech via SpeechSynthesis API
- Real-time streaming responses from OpenClaw gateway
- Settings panel for voice selection, auto-listen, session key
- Dark minimal UI

## Browser Support

Chrome/Edge recommended (best Web Speech API support).
