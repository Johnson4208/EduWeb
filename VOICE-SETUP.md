# Vietnamese voice setup for Little Lingua

Little Lingua now includes a local speech-engine launcher. This avoids depending on a Vietnamese voice being installed in Chrome or Windows.

## Windows setup

1. Install Python 3.10 or newer from https://www.python.org/downloads/windows/ if it is not already installed. During installation, enable **Add Python to PATH**.
2. Double-click `start_app.bat`. On the first run, it installs Piper TTS into a private `.venv` folder and downloads `vi_VN-vais1000-medium` into `voice/`. The model download is about 63 MB, in addition to the Python package dependencies. An internet connection is required for this one-time setup.
3. When the browser opens at `http://127.0.0.1:8765/`, use the speaker buttons in Learn Vietnamese, Play & Practice, and the story pages. Keep the black console window open while using the app.
4. On later runs, double-click `start_app.bat` again. The package and voice model are reused unless you delete `.venv/` or `voice/`.

## Privacy and licensing

Speech is generated locally on your computer after setup; words you click are sent only to the local server on `127.0.0.1`. The setup downloads the Piper speech-engine Python package from PyPI and the Vietnamese voice model from the public Piper voice collection. The voice model is listed under the MIT license in the voice collection; the current Piper engine is distributed under GPL-3.0. Review the upstream terms before redistributing the modified app commercially.

- Piper engine: https://github.com/OHF-Voice/piper1-gpl
- Vietnamese model: https://huggingface.co/rhasspy/piper-voices/tree/main/vi/vi_VN/vais1000/medium
- Python for Windows: https://www.python.org/downloads/windows/

## Troubleshooting

- **Python not found:** install Python and enable `Add Python to PATH`, then reopen the terminal or restart Windows.
- **Voice download failed:** check internet access, then run `start_app.bat` again.
- **Browser says the local engine is not responding:** keep the console window open and make sure the app was opened by the batch file.
- **Port 8765 is already used:** close another Little Lingua instance before starting it again.
