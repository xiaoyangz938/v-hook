# V-Hook

V-Hook is a React + Express website with:
- a homepage
- a documentation page
- a community page with upload and delete support
- backend file storage for images and downloadable assets

## Local Run

Prerequisite: Node.js 20+

1. Install dependencies:
   `npm install`
2. Build the site:
   `npm run build`
3. Start the server:
   `npm start`
4. Open:
   `http://127.0.0.1:3000`

## Stable Local Start On Windows

If you want the local server to auto-restart after crashes:

- Start: [start-vhook-stable.bat](D:\Augusta\Desktop\hook\v-hook-website (1)\start-vhook-stable.bat)
- Stop: [stop-vhook-stable.bat](D:\Augusta\Desktop\hook\v-hook-website (1)\stop-vhook-stable.bat)

Logs are written to:
- [server.log](D:\Augusta\Desktop\hook\v-hook-website (1)\server.log)
- [server.err](D:\Augusta\Desktop\hook\v-hook-website (1)\server.err)

## Deploy For Sharing

GitHub is the right place to host the code, but not the running website by itself. Because V-Hook has a Node backend and community uploads, it should be deployed to a platform such as Render or Railway.

### Recommended Setup

1. Create a GitHub repository
2. Push this project to GitHub
3. Connect the repo to Render
4. Deploy using the included [render.yaml](D:\Augusta\Desktop\hook\v-hook-website (1)\render.yaml)

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/xiaoyangz938/v-hook)

### Why This Setup Works

- `npm start` runs the Express server from [server/index.mjs](D:\Augusta\Desktop\hook\v-hook-website (1)\server\index.mjs)
- the frontend is served from the built `dist` folder
- `VHOOK_RUNTIME_ROOT=/var/data/v-hook` moves writable data outside the code directory
- uploaded files and JSON data can survive restarts when Render attaches the persistent disk

### Important Note

If you deploy to a platform without persistent storage, community uploads and edited data may disappear after a restart or redeploy.
