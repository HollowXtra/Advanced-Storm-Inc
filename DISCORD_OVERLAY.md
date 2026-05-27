# Discord Game Overlay

The Windows build runs STORM_INC as a hardware-accelerated Electron app using Chromium WebGL through Direct3D 11. That gives Discord a normal app window and GPU render surface to detect.

Discord still controls whether the overlay is injected. After building or installing:

1. Launch `STORM_INC.exe`.
2. Open Discord.
3. Go to `User Settings > Registered Games`.
4. If STORM_INC is not listed, choose `Add it!` and pick `STORM_INC`.
5. Turn on the overlay toggle for STORM_INC.
6. Use Discord's overlay hotkey while the STORM_INC window is focused.

If the overlay does not appear, run Discord and STORM_INC at the same privilege level. The app is configured as `asInvoker`, so it should not need administrator mode.
