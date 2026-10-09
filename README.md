# Little Lingua — Vietnamese learning platform for children

A responsive, playful Vietnamese-learning app built with HTML, CSS, and JavaScript. It supports Google Cloud Text-to-Speech for a published GitHub Pages site, plus an optional local Piper voice engine for offline-friendly Windows use.

## Run it locally

- For local Vietnamese pronunciation on Windows, install Python 3.10 or newer and double-click `start_app.bat`. The first run installs Piper TTS into `.venv/` and downloads the Vietnamese model into `voice/`; keep the console window open while using the app.
- For Google Cloud Vietnamese pronunciation on GitHub Pages, deploy `cloud-tts-backend/` to Cloud Run with `cloud-tts-backend/deploy_google_tts.bat`. This requires your own Google Cloud project and billing setup. The script writes the public Cloud Run URL to `speech-config.js`; commit and push that file to your Pages repository.
- If the page is hosted online but the Cloud Run URL is not configured, the app displays a setup message rather than silently switching to another language.

## Included

- A vocabulary library of **1,023 Vietnamese entries across 29 topics**, including greetings, numbers, family, body, animals, fruit, vegetables, food, colors, clothes, school, home, actions, adjectives, feelings, time, weather, nature, places, transport, jobs, toys, sports, health, questions, shopping, technology, music, kitchen items, and everyday objects.
- Vietnamese spelling with tone marks, English glosses, topic labels, and child-friendly emoji cues.
- Searchable dictionary with accent-insensitive matching, topic filtering, a learned-only view, and paged results.
- Vietnamese pronunciation uses Google Cloud Text-to-Speech (`vi-VN-Neural2-A`) when `speech-config.js` points to the deployed Cloud Run backend; the backend supports slower speech, per-instance audio caching, an origin allow-list, request-length limits, and basic rate limiting. Local Windows mode still supports Piper via `start_app.bat`.
- A child-led word-scramble game: kids choose a Vietnamese word or phrase from searchable vocabulary before the app shuffles its letters, then tap the letters into place. Correct solves earn stars and update local progress.
- Grown-up settings for learner nickname and daily goal. These settings are a prototype, not a parental lock.
- Responsive layouts for desktop, tablet, and mobile.

## Google Cloud TTS and hosting

GitHub Pages serves only static files. The included `cloud-tts-backend/` directory provides the secure Cloud Run endpoint needed for Google Cloud TTS. Use the deployment instructions there, set a budget alert, and commit the generated public backend URL in `speech-config.js`. Do not put an API key or service-account JSON in the frontend. Cloud Text-to-Speech requires billing to be enabled; check current prices and free quotas in the official Google Cloud pricing page before publishing.

## Content and pronunciation notes

The English meanings are short learning glosses rather than complete dictionary definitions; some Vietnamese words vary by region and context. For teaching materials or commercial launch, have the vocabulary, regional usage, stories, and pronunciation reviewed by qualified Vietnamese-language educators. Browser text-to-speech is not a substitute for reviewed native-speaker audio recordings.

## Before production use

This is a front-end prototype. It has no account system, server database, synced profiles, parental consent workflow, or production-grade child-safety controls. Progress is stored in local storage on the current browser/device. It does not intentionally collect or transmit learner data. Follow applicable child privacy laws and obtain expert review before publishing for children.

## Hybrid Vietnamese audio (GitHub Pages)

The speaker flow now checks for a bundled recording first at `assets/audio/vi/<word-id>.mp3`. If the recording is missing, it requests Google Cloud TTS from the configured secure backend. Repeated generated phrases are cached in memory during the session.

To pre-generate a starter library after deploying the Cloud Run backend:

```bash
pip install requests
python scripts/generate-vietnamese-audio.py https://YOUR-CLOUD-RUN-URL
```

By default this creates recordings for the first 80 vocabulary entries. Use `--all` to generate all parsed vocabulary rows, or `--limit 200` for a larger batch. The generator waits 2.2 seconds between requests to stay below the backend's 30-requests-per-minute limit; generating all 1,023 entries may take about 38 minutes. Keep the terminal open until it prints the final summary. Review pronunciation quality and the voice model's current license before publishing generated recordings. Commit the resulting MP3 files to your GitHub Pages repository. Generated MP3s are static assets and do not call Google TTS when played.

Google Cloud TTS requests can incur charges outside the current free allowance. Generating the entire vocabulary library can consume significant characters; begin with a small batch and monitor billing.
