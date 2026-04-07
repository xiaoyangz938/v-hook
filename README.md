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
- community data can run in two modes:
  - local file mode for local development
  - Supabase mode for free cloud persistence

### Free Deployment With Supabase

For a free public deployment, use:

- Render free web service
- Supabase free database and storage bucket

The server will automatically switch to Supabase when these environment variables are set:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_STORAGE_BUCKET`

Create the `community_items` table with:

- [supabase/schema.sql](D:\Augusta\Desktop\hook\v-hook-website (1)\supabase\schema.sql)

Then create a public Storage bucket, usually named `community-assets`.

#### Supabase Setup Steps

1. Create a new Supabase project
2. Open `SQL Editor`
3. Run [supabase/schema.sql](D:\Augusta\Desktop\hook\v-hook-website (1)\supabase\schema.sql)
4. Open `Storage`
5. Create a bucket named `community-assets`
6. Mark the bucket as `Public`
7. In `Project Settings -> API`, copy:
   - `Project URL`
   - `service_role` key
8. In Render, add:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `SUPABASE_STORAGE_BUCKET=community-assets`

Once those values are present, V-Hook switches from local file mode to Supabase mode automatically.

### Public Site Safety

The public site keeps uploads disabled by default through:

- `VHOOK_ENABLE_PUBLIC_UPLOADS=false`

That keeps the open-source site publicly viewable while preventing strangers from changing community data until you intentionally turn uploads on later.

If you want uploads and deletions to be visible only to you as the administrator:

- set `VHOOK_ENABLE_PUBLIC_UPLOADS=true`
- set `VHOOK_ADMIN_PASSWORD` to a private password

On the public site, visitors will still only be able to browse. Only someone who knows the admin password will see working upload and delete actions after logging in.
