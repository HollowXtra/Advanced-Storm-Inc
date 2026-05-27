## This is a dumpster, including a Tropical Cyclone Simulator, an AI-IR Tropical Cyclone Intensity Identifier, and a wind grabber.
A vibe project using frontier LLMs, NOT CAREFULLY REVIEWED, so there might be unexpected bugs.
## Guide
Go to **https://enceladuscat.github.io** to run the html.
The file 'model.onnx' is the AI-IR Tropical Cyclone Intensity Identifier model.

## Desktop and mobile
Run `npm install`, then `npm start` for desktop development.

- Windows: `npm run build:win` creates the installer and portable executable in `dist/`.
- macOS: `npm run build:mac` creates DMG/ZIP builds. Build on macOS when you need signing or notarization.
- Linux: `npm run build:linux` creates AppImage/DEB builds.
- All desktop targets: `npm run build:desktop`.

Phones, iOS, tablets, macOS, and Linux can also use the hosted web app as a PWA. On iPhone/iPad, open the site in Safari and use Share > Add to Home Screen. The simulator automatically uses lighter pressure, wind, steering, and label rendering on small or touch devices.

For Discord overlay setup, see `DISCORD_OVERLAY.md`.

## Credits
Fictionia map credit: diamondlife.

## Note
The music files are composed/remixed by me & shaped with AI. It's okay to use them freely, but the author shall not be held liable for any issues arising from the use of those music.
