@echo off
setlocal
cd /d "%~dp0"
title Little Lingua - Vietnamese Voice Setup

echo ============================================================
echo   LITTLE LINGUA - VIETNAMESE VOICE SETUP
echo ============================================================
echo.
echo The first run needs an internet connection. It will install
 echo the local Piper speech engine and download the Vietnamese voice
 echo model (about 63 MB). Later runs reuse the downloaded files.
echo.

where py >nul 2>nul
if errorlevel 1 goto no_python

if not exist ".venv\Scripts\python.exe" (
  echo Creating a private Python environment...
  py -3 -m venv .venv
  if errorlevel 1 goto setup_failed
)

set "PYTHON=%~dp0.venv\Scripts\python.exe"

echo.
echo Installing or updating the local speech engine...
"%PYTHON%" -m pip install --disable-pip-version-check "piper-tts==1.8.0"
if errorlevel 1 goto setup_failed

if not exist "voice\vi_VN-vais1000-medium.onnx" (
  echo.
  echo Downloading the Vietnamese voice model. Please keep this window open...
  if not exist "voice" mkdir "voice"
  "%PYTHON%" -m piper.download_voices vi_VN-vais1000-medium --data-dir "%~dp0voice"
  if errorlevel 1 goto voice_failed
)

if not exist "voice\vi_VN-vais1000-medium.onnx.json" (
  echo The model configuration file is missing. Re-run this setup with a working internet connection.
  pause
  exit /b 1
)

echo.
echo Setup complete. Starting Little Lingua...
echo.
"%PYTHON%" piper_server.py
pause
exit /b 0

:no_python
echo Python 3 is required for the local voice engine.
echo Install Python 3.10 or newer from https://www.python.org/downloads/windows/
echo During installation, enable the option to add Python to PATH.
start "" "https://www.python.org/downloads/windows/"
pause
exit /b 1

:voice_failed
echo.
echo Voice download failed. Check your internet connection or VPN, then run start_app.bat again.
pause
exit /b 1

:setup_failed
echo.
echo Setup failed. Check your internet connection and confirm Python 3 is installed.
pause
exit /b 1
