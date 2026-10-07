# Fluent — English learning

A small, responsive English-learning site for independent learners. It includes CEFR-inspired A1–B2 levels, a short placement check, practice activities across reading, writing, listening, and speaking, and browser-local progress.

## Run locally

Open `index.html` in a modern browser. No build step or account is required.

Microphone speech recognition depends on browser support and may require HTTPS or localhost. If unavailable, learners can type their response. Listening activities use the browser's English speech synthesis and show the script if audio is unavailable.

## Progress and privacy

Level choice, lesson completion, quiz results, and speaking transcripts are stored in this browser's `localStorage`. Recording audio is not stored.

## Files

- `index.html` — page structure
- `styles.css` — responsive layout and visual design
- `app.js` — lesson content and interactions
