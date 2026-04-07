import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import os from 'os';
import crypto from 'crypto';
import { spawn } from 'child_process';
import { createCommunityStore } from './communityStore.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const runtimeRoot = process.env.VHOOK_RUNTIME_ROOT
  ? path.resolve(process.env.VHOOK_RUNTIME_ROOT)
  : projectRoot;
const seedStorageRoot = path.join(projectRoot, 'storage');
const seedDataRoot = path.join(projectRoot, 'data');
const storageRoot = path.join(runtimeRoot, 'storage');
const dataRoot = path.join(runtimeRoot, 'data');
const docsRoot = path.join(dataRoot, 'docs');
const communityDataPath = path.join(dataRoot, 'community-items.json');
const docsMarkdownPath = path.join(docsRoot, 'v-hook.md');
const distRoot = path.join(projectRoot, 'dist');
const distIndexPath = path.join(distRoot, 'index.html');
const uploadedCommunityImagesRoot = path.join(storageRoot, 'images', 'uploaded', 'community');
const communityDownloadsRoot = path.join(storageRoot, 'downloads', 'community');
const recordingsRoot = path.join(storageRoot, 'recordings');
const ffmpegCandidates = [
  process.env.FFMPEG_PATH,
  path.join(
    os.homedir(),
    'AppData',
    'Local',
    'Microsoft',
    'WinGet',
    'Packages',
    'Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe',
    'ffmpeg-8.1-full_build',
    'bin',
    'ffmpeg.exe'
  ),
  path.join(
    os.homedir(),
    'AppData',
    'Local',
    'Microsoft',
    'WinGet',
    'Links',
    'ffmpeg.exe'
  ),
  'ffmpeg',
].filter(Boolean);

const app = express();
const port = Number(process.env.PORT || 3000);
const publicUploadsEnabled = process.env.VHOOK_ENABLE_PUBLIC_UPLOADS === 'true';
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseBucketName = process.env.SUPABASE_STORAGE_BUCKET || 'community-assets';

function ensureDirectory(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function readJsonFile(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function readTextFile(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function writeJsonFile(filePath, value) {
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2), 'utf8');
}

function ensureSeededDirectory(sourceDir, targetDir) {
  if (!fs.existsSync(sourceDir)) {
    return;
  }

  if (!fs.existsSync(targetDir)) {
    fs.cpSync(sourceDir, targetDir, { recursive: true });
  }
}

function ensureSeededFile(sourcePath, targetPath) {
  if (!fs.existsSync(sourcePath)) {
    return;
  }

  if (!fs.existsSync(targetPath)) {
    ensureDirectory(path.dirname(targetPath));
    fs.copyFileSync(sourcePath, targetPath);
  }
}

function resolveFfmpegPath() {
  const match = ffmpegCandidates.find((candidate) => {
    if (!candidate) return false;
    if (candidate === 'ffmpeg') return true;
    return fs.existsSync(candidate);
  });

  return match || 'ffmpeg';
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .trim();
}

function parseDataUrl(dataUrl) {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) {
    throw new Error('Invalid data URL');
  }

  return {
    mimeType: match[1],
    buffer: Buffer.from(match[2], 'base64'),
  };
}

function extensionFromMimeType(mimeType) {
  if (mimeType === 'image/png') return 'png';
  if (mimeType === 'image/jpeg') return 'jpg';
  if (mimeType === 'image/webp') return 'webp';
  if (mimeType === 'image/gif') return 'gif';
  return 'bin';
}

ensureDirectory(storageRoot);
ensureDirectory(dataRoot);
ensureDirectory(docsRoot);
ensureDirectory(uploadedCommunityImagesRoot);
ensureDirectory(communityDownloadsRoot);
ensureDirectory(recordingsRoot);
ensureSeededDirectory(seedStorageRoot, storageRoot);
ensureSeededDirectory(seedDataRoot, dataRoot);
ensureSeededFile(path.join(seedDataRoot, 'community-items.json'), communityDataPath);
ensureSeededFile(path.join(seedDataRoot, 'docs', 'v-hook.md'), docsMarkdownPath);

const communityStore = createCommunityStore({
  communityDataPath,
  uploadedCommunityImagesRoot,
  communityDownloadsRoot,
  supabaseUrl,
  supabaseServiceRoleKey,
  supabaseBucketName,
});

app.use(express.json({ limit: '100mb' }));
app.use('/media', express.static(storageRoot));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.get('/api/config', (_req, res) => {
  res.json({
    publicUploadsEnabled,
    storageMode: communityStore.mode,
  });
});

app.get('/api/community', async (_req, res) => {
  try {
    const items = await communityStore.listCommunityItems();
    res.json({ items });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to load community items' });
  }
});

app.post('/api/community', async (req, res) => {
  try {
    if (!publicUploadsEnabled) {
      res.status(403).json({ error: 'Public uploads are disabled on this deployment' });
      return;
    }

    const item = await communityStore.createCommunityItem(req.body);
    res.status(201).json({ item });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to create community item' });
  }
});

app.delete('/api/community/:id', async (req, res) => {
  try {
    if (!publicUploadsEnabled) {
      res.status(403).json({ error: 'Public deletion is disabled on this deployment' });
      return;
    }

    const id = Number(req.params.id);
    await communityStore.deleteCommunityItem(id);
    res.json({ ok: true, deletedId: id });
  } catch (error) {
    const statusCode = typeof error === 'object' && error && 'statusCode' in error ? error.statusCode : 400;
    res.status(statusCode).json({ error: error instanceof Error ? error.message : 'Failed to delete community item' });
  }
});

app.get('/api/docs/v-hook', (_req, res) => {
  const markdown = readTextFile(docsMarkdownPath);
  res.json({ markdown });
});

app.post('/api/recordings/transcode', express.raw({ type: 'video/webm', limit: '250mb' }), async (req, res) => {
  const inputPath = path.join(recordingsRoot, `${crypto.randomUUID()}.webm`);
  const outputBaseName = `v-hook-recording-${new Date().toISOString().replace(/[:.]/g, '-')}`;
  const outputPath = path.join(recordingsRoot, `${outputBaseName}.mp4`);
  const ffmpegPath = resolveFfmpegPath();

  try {
    if (!req.body || !Buffer.isBuffer(req.body) || req.body.length === 0) {
      res.status(400).json({ error: 'Recording payload is empty' });
      return;
    }

    fs.writeFileSync(inputPath, req.body);

    await new Promise((resolve, reject) => {
      const ffmpeg = spawn(ffmpegPath, [
        '-y',
        '-i',
        inputPath,
        '-movflags',
        '+faststart',
        '-pix_fmt',
        'yuv420p',
        '-c:v',
        'libx264',
        '-preset',
        'veryfast',
        outputPath,
      ]);

      let stderr = '';
      ffmpeg.stderr.on('data', (chunk) => {
        stderr += chunk.toString();
      });

      ffmpeg.on('error', (error) => {
        reject(error);
      });

      ffmpeg.on('close', (code) => {
        if (code === 0) {
          resolve();
          return;
        }

        reject(new Error(stderr || `ffmpeg exited with code ${code}`));
      });
    });

    res.download(outputPath, `${outputBaseName}.mp4`, (error) => {
      fs.rmSync(inputPath, { force: true });
      fs.rmSync(outputPath, { force: true });

      if (error && !res.headersSent) {
        res.status(500).json({ error: 'Failed to send converted recording' });
      }
    });
  } catch (error) {
    fs.rmSync(inputPath, { force: true });
    fs.rmSync(outputPath, { force: true });
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to transcode recording',
    });
  }
});

if (fs.existsSync(distRoot) && fs.existsSync(distIndexPath)) {
  app.use(express.static(distRoot));

  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/media')) {
      next();
      return;
    }

    res.sendFile(distIndexPath);
  });
}

app.listen(port, () => {
  console.log(`V-Hook backend listening on http://localhost:${port}`);
});
