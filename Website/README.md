# NurdleDNA 3D Competition Website

White-theme 3D competition website and live digital-twin simulation for the NurdleDNA industrial environmental firewall.

## Run

Double-click:

```text
launch-demo.cmd
```

This opens the main white-theme 3D website directly, so the browser will not show `ERR_CONNECTION_REFUSED`.

If you specifically want the localhost server version, run from PowerShell:

```powershell
node server.js
```

Then open:

```text
http://127.0.0.1:4173/
```

Keep the PowerShell window open while presenting the localhost version. If that window is closed, the browser will show `ERR_CONNECTION_REFUSED` because the local server has stopped.

## No-Server Fallback

If localhost is blocked or the server cannot stay running, open the main website directly in the browser:

```text
index.html
```

This version embeds the STL model as local JavaScript data and uses browser-script Three.js files, so it does not need `127.0.0.1:4173`.

The original guided incident dashboard is still available at:

```text
digital-twin.html
```

The demo uses local Three.js vendor files and the copied STL model at `assets/models/nurdle-dna-device.stl`, so it does not need internet access once the files are in this workspace.

## Presentation Flow

1. Industrial area setup
2. Normal operation
3. Industrial spill event
4. Automatic emergency response
5. Evidence and accountability

Use the scene buttons, play/pause, reset, speed control, and mouse orbit to guide judges through the story.
