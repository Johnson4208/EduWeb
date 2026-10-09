@echo off
setlocal EnableExtensions
pushd "%~dp0"
title Little Lingua - Google Cloud TTS Deployment

echo ============================================================
echo   LITTLE LINGUA - GOOGLE CLOUD VIETNAMESE VOICE
echo ============================================================
echo.
echo This deploys a small Google Cloud Run speech backend in Tokyo.
echo You need a Google Cloud project with billing enabled and gcloud CLI installed.
echo Your Google credentials will stay in Google Cloud; this script does not
 echo put secrets or API keys into the public website.
echo.

where gcloud >nul 2>nul
if errorlevel 1 goto no_gcloud

set "ACTIVE_ACCOUNT="
for /f "delims=" %%A in ('gcloud auth list --filter^=status:ACTIVE --format^="value(account)" 2^>nul') do set "ACTIVE_ACCOUNT=%%A"
if not defined ACTIVE_ACCOUNT (
  echo No active gcloud account was found.
  echo Run: gcloud auth login
  pause
  exit /b 1
)

echo Signed in as: %ACTIVE_ACCOUNT%
echo.
set /p "PROJECT_ID=Enter your Google Cloud project ID: "
if not defined PROJECT_ID goto missing_project
set /p "PAGES_ORIGIN=Enter your GitHub Pages origin (e.g. https://YOURNAME.github.io): "
if not defined PAGES_ORIGIN goto missing_origin

if /i not "%PAGES_ORIGIN:~0,8%"=="https://" (
  echo The website origin must start with https://
  pause
  exit /b 1
)
set "ORIGIN_REST=%PAGES_ORIGIN:~8%"
if not "%ORIGIN_REST:/=%"=="%ORIGIN_REST%" (
  echo Enter only the origin, without a repository path or trailing slash.
  echo Example: https://YOURNAME.github.io
  pause
  exit /b 1
)

set "REGION=asia-northeast1"
set "SERVICE=little-lingua-tts"
set "SA_NAME=little-lingua-tts"
set "SA_EMAIL=%SA_NAME%@%PROJECT_ID%.iam.gserviceaccount.com"

echo.
echo Selecting project and enabling APIs...
gcloud config set project "%PROJECT_ID%" --quiet
if errorlevel 1 goto deploy_failed
gcloud services enable texttospeech.googleapis.com run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com --project "%PROJECT_ID%" --quiet
if errorlevel 1 goto deploy_failed

echo.
echo Ensuring a dedicated service account exists...
gcloud iam service-accounts describe "%SA_EMAIL%" --project "%PROJECT_ID%" >nul 2>nul
if errorlevel 1 (
  gcloud iam service-accounts create "%SA_NAME%" --project "%PROJECT_ID%" --display-name "Little Lingua Text-to-Speech"
  if errorlevel 1 goto deploy_failed
)

echo.
echo Granting least-privilege Text-to-Speech access...
gcloud projects add-iam-policy-binding "%PROJECT_ID%" --member="serviceAccount:%SA_EMAIL%" --role="roles/cloudtts.client" --quiet
if errorlevel 1 goto deploy_failed

echo.
echo Deploying the Google Cloud TTS backend to Cloud Run...
gcloud run deploy "%SERVICE%" --source . --region "%REGION%" --project "%PROJECT_ID%" --allow-unauthenticated --service-account "%SA_EMAIL%" --set-env-vars "ALLOWED_ORIGINS=%PAGES_ORIGIN%,TTS_VOICE_NAME=vi-VN-Neural2-A,MAX_REQUESTS_PER_MINUTE=30,MAX_TEXT_LENGTH=350" --max 2 --min 0 --memory 512Mi --cpu 1 --concurrency 8 --timeout 30 --quiet
if errorlevel 1 goto deploy_failed

set "TTS_URL="
for /f "delims=" %%U in ('gcloud run services describe "%SERVICE%" --region "%REGION%" --project "%PROJECT_ID%" --format^="value(status.url)"') do set "TTS_URL=%%U"
if not defined TTS_URL goto deploy_failed

(
  echo // Public Cloud Run URL only. Never put a Google API key or credentials here.
  echo window.LITTLE_LINGUA_SPEECH_API = "%TTS_URL%";
) > "..\speech-config.js"

 echo.
echo ============================================================
echo   GOOGLE CLOUD TTS DEPLOYED
echo ============================================================
echo Backend URL: %TTS_URL%
echo Updated frontend config: ..\speech-config.js
echo.
echo NEXT STEPS:
echo 1. Open the backend health URL once: %TTS_URL%/api/health
echo 2. Commit and push the changed speech-config.js to your GitHub Pages repository.
echo 3. Wait for GitHub Pages to finish deploying, then test a speaker button.
echo 4. Set a Google Cloud budget alert before sharing the site widely.
echo.
echo Note: the endpoint is public for browser access. Origin checks, request limits,
echo short text limits, and a two-instance cap are included, but they do not replace
 echo ongoing monitoring or stronger anti-abuse controls for a commercial launch.
pause
popd
exit /b 0

:no_gcloud
echo Google Cloud CLI (gcloud) was not found.
echo Install it from https://cloud.google.com/sdk/docs/install and run gcloud auth login.
pause
popd
exit /b 1

:missing_project
echo You must enter a Google Cloud project ID.
pause
popd
exit /b 1

:missing_origin
echo You must enter the GitHub Pages website origin.
pause
popd
exit /b 1

:deploy_failed
echo.
echo Deployment failed. Review the gcloud error above. Check project permissions,
echo billing, API enablement, and Cloud Build permissions, then run this script again.
pause
popd
exit /b 1
