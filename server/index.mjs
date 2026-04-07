import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import os from 'os';
import crypto from 'crypto';
import { spawn } from 'child_process';

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

function saveDataUrlFile(targetDir, preferredBaseName, dataUrl, fallbackExtension) {
  ensureDirectory(targetDir);
  const { mimeType, buffer } = parseDataUrl(dataUrl);
  const extension = fallbackExtension || extensionFromMimeType(mimeType);
  const filename = `${preferredBaseName}.${extension}`;
  const filePath = path.join(targetDir, filename);
  fs.writeFileSync(filePath, buffer);
  return { filename, filePath };
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

app.use(express.json({ limit: '100mb' }));
app.use('/media', express.static(storageRoot));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.get('/api/config', (_req, res) => {
  res.json({
    publicUploadsEnabled,
  });
});

app.get('/api/community', (_req, res) => {
  const items = readJsonFile(communityDataPath);
  res.json({ items });
});

app.post('/api/community', (req, res) => {
  try {
    if (!publicUploadsEnabled) {
      res.status(403).json({ error: 'Public uploads are disabled on this deployment' });
      return;
    }

    const payload = req.body;
    const title = (payload.title || '').trim() || 'New V-Hook Creation';
    const author = (payload.author || '').trim() || 'You';
    const description = (payload.description || '').trim();
    const slug = slugify(title) || `community-${Date.now()}`;
    const id = Date.now();
    const items = readJsonFile(communityDataPath);

    let imageUrl = '/media/images/uploaded/home/cover.png';
    if (payload.coverImageDataUrl) {
      const coverFile = saveDataUrlFile(uploadedCommunityImagesRoot, slug, payload.coverImageDataUrl);
      imageUrl = `/media/images/uploaded/community/${coverFile.filename}`;
    }

    let gcodeFileName;
    let gcodeUrl;
    let tdmFileName;
    let tdmUrl;

    const itemDownloadDir = path.join(communityDownloadsRoot, slug);
    ensureDirectory(itemDownloadDir);

    if (payload.gcodeDataUrl && payload.gcodeFileName) {
      const gcodeBuffer = parseDataUrl(payload.gcodeDataUrl).buffer;
      gcodeFileName = payload.gcodeFileName;
      fs.writeFileSync(path.join(itemDownloadDir, gcodeFileName), gcodeBuffer);
      gcodeUrl = `/media/downloads/community/${slug}/${encodeURIComponent(gcodeFileName)}`;
    }

    if (payload.tdmDataUrl && payload.tdmFileName) {
      const tdmBuffer = parseDataUrl(payload.tdmDataUrl).buffer;
      tdmFileName = payload.tdmFileName;
      fs.writeFileSync(path.join(itemDownloadDir, tdmFileName), tdmBuffer);
      tdmUrl = `/media/downloads/community/${slug}/${encodeURIComponent(tdmFileName)}`;
    }

    const item = {
      id,
      title,
      author,
      image: imageUrl,
      views: '0',
      downloads: '0',
      description,
      gcodeFileName,
      gcodeUrl,
      tdmFileName,
      tdmUrl,
      isUserCreated: true,
      storageKey: slug,
    };

    writeJsonFile(communityDataPath, [item, ...items]);
    res.status(201).json({ item });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to create community item' });
  }
});

app.delete('/api/community/:id', (req, res) => {
  try {
    if (!publicUploadsEnabled) {
      res.status(403).json({ error: 'Public deletion is disabled on this deployment' });
      return;
    }

    const id = Number(req.params.id);
    const items = readJsonFile(communityDataPath);
    const item = items.find((entry) => entry.id === id);

    if (!item) {
      res.status(404).json({ error: 'Community item not found' });
      return;
    }

    const isDeletable = item.isUserCreated || item.author === 'You';
    if (!isDeletable) {
      res.status(403).json({ error: 'Only your uploaded items can be deleted' });
      return;
    }

    writeJsonFile(
      communityDataPath,
      items.filter((entry) => entry.id !== id)
    );

    const storageKey = item.storageKey || slugify(item.title) || `${item.id}`;
    const imageFileName = item.image.startsWith('/media/images/uploaded/community/')
      ? decodeURIComponent(item.image.replace('/media/images/uploaded/community/', ''))
      : null;

    if (imageFileName) {
      const imagePath = path.join(uploadedCommunityImagesRoot, imageFileName);
      if (fs.existsSync(imagePath)) {
        fs.rmSync(imagePath, { force: true });
      }
    }

    const downloadDir = path.join(communityDownloadsRoot, storageKey);
    if (fs.existsSync(downloadDir)) {
      fs.rmSync(downloadDir, { recursive: true, force: true });
    }

    res.json({ ok: true, deletedId: id });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to delete community item' });
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
