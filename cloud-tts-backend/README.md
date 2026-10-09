# Google Cloud Text-to-Speech backend for Little Lingua

This small Flask API lets the static GitHub Pages frontend request Vietnamese audio without exposing Google credentials in client-side JavaScript. It uses the `vi-VN-Neural2-A` voice by default and returns MP3 audio.

## Prerequisites

- A Google Cloud project with billing enabled.
- Google Cloud CLI (`gcloud`) installed and authenticated with `gcloud auth login`.
- A GitHub Pages site already published or a known site origin, such as `https://YOURNAME.github.io`.

Cloud Text-to-Speech needs billing enabled, even if your usage remains inside the applicable free monthly quota. Review current pricing and create a budget alert before public launch:

- Get started: https://cloud.google.com/text-to-speech/docs/get-started
- Voices: https://cloud.google.com/text-to-speech/docs/list-voices-and-types
- Pricing: https://cloud.google.com/text-to-speech/pricing

## Windows quick deployment

1. Open `deploy_google_tts.bat` by double-clicking it.
2. Enter your Google Cloud **project ID** (not the display name).
3. Enter only your GitHub Pages origin, e.g. `https://YOURNAME.github.io`. Do not include `/repository-name` or a trailing slash. For a custom domain, enter that `https://` origin instead.
4. The script enables the APIs, creates a dedicated service account, grants the Text-to-Speech client role, and deploys this directory to Cloud Run in Tokyo (`asia-northeast1`).
5. When deployment succeeds, it writes the public Cloud Run URL into the sibling `../speech-config.js` file.
6. Commit and push `speech-config.js` to the repository used by GitHub Pages. The website will then use Google Cloud TTS for speaker buttons. If the repo isn't already a local checkout, copy the generated config line into that checkout.
7. Open the printed `/api/health` URL and make sure it reports `ready: true`, then test the website.

If API enablement/building fails, use the project shown in the error and check that the active Google account has permissions to enable APIs, create/assign a service identity, build source, and deploy Cloud Run. Cloud Build may need its documented builder permissions depending on your project setup.

## Manual deployment

Run these commands from this directory after setting the values for your project and site origin:

```powershell
$PROJECT_ID = "your-google-cloud-project-id"
$PAGES_ORIGIN = "https://YOURNAME.github.io"
$REGION = "asia-northeast1"
$SA = "little-lingua-tts@$PROJECT_ID.iam.gserviceaccount.com"

gcloud config set project $PROJECT_ID
gcloud services enable texttospeech.googleapis.com run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com
gcloud iam service-accounts create little-lingua-tts --display-name="Little Lingua Text-to-Speech"
gcloud projects add-iam-policy-binding $PROJECT_ID --member="serviceAccount:$SA" --role="roles/cloudtts.client"
gcloud run deploy little-lingua-tts --source . --region $REGION --allow-unauthenticated --service-account $SA --set-env-vars "ALLOWED_ORIGINS=$PAGES_ORIGIN,TTS_VOICE_NAME=vi-VN-Neural2-A,MAX_REQUESTS_PER_MINUTE=30,MAX_TEXT_LENGTH=350" --max 2 --min 0 --memory 512Mi --cpu 1 --concurrency 8 --timeout 30
```

If the service account already exists, skip its `create` command. Get the deployed URL with:

```powershell
gcloud run services describe little-lingua-tts --region asia-northeast1 --format="value(status.url)"
```

Paste that URL (not the `/api/speak` path) into `speech-config.js`:

```js
window.LITTLE_LINGUA_SPEECH_API = "https://YOUR-CLOUD-RUN-URL";
```

Then commit and push the frontend config to GitHub Pages.

## Controls and limits

- Google credentials are provided to the backend by the Cloud Run service identity (Application Default Credentials); never use a service-account JSON key or Google API secret in `speech-config.js`.
- Browser origins must be listed in `ALLOWED_ORIGINS`.
- Input is limited to 350 characters by default.
- Requests are rate-limited in memory to 30 per client IP per minute per instance.
- Generated audio is cached in each live instance; the frontend also caches recently used audio for the current browser session.
- Deployment caps Cloud Run at two instances by default, but the service endpoint is public to allow browser access. CORS and in-memory IP limits are useful guardrails, **not complete abuse protection**. Before broadly publishing a paid service, add stronger abuse controls, monitor API usage, create budget alerts, and consider an application/session-level rate limit.

The backend does not store a transcript database. Text sent to the endpoint is submitted to Google Cloud Text-to-Speech for synthesis.

## Pre-generate static recordings for GitHub Pages

After deployment, from the project root run `pip install requests` and then `python scripts/generate-vietnamese-audio.py https://YOUR-CLOUD-RUN-URL`. The default batch is limited to 80 words. Use `--all` only after reviewing expected character usage and billing. Commit the resulting `assets/audio/vi/*.mp3` files to the static site. The frontend plays available recordings first and uses Google TTS for missing entries.
