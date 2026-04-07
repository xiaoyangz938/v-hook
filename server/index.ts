import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

type CommunityItem = {
  id: number;
  title: string;
  author: string;
  image: string;
  views: string;
  downloads: string;
  description?: string;
  gcodeFileName?: string;
  gcodeUrl?: string;
  tdmFileName?: string;
  tdmUrl?: string;
  isUserCreated?: boolean;
  storageKey?: string;
};

type CommunityCreatePayload = {
  title?: string;
  author?: string;
  description?: string;
  coverImageDataUrl?: string;
  coverImageFileName?: string;
  gcodeDataUrl?: string;
  gcodeFileName?: string;
  tdmDataUrl?: string;
  tdmFileName?: string;
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const storageRoot = path.join(projectRoot, 'storage');
const dataRoot = path.join(projectRoot, 'data');
const docsRoot = path.join(dataRoot, 'docs');
const communityDataPath = path.join(dataRoot, 'community-items.json');
const docsMarkdownPath = path.join(docsRoot, 'v-hook.md');
const distRoot = path.join(projectRoot, 'dist');
const distIndexPath = path.join(distRoot, 'index.html');
const uploadedCommunityImagesRoot = path.join(storageRoot, 'images', 'uploaded', 'community');
const communityDownloadsRoot = path.join(storageRoot, 'downloads', 'community');

const app = express();
const port = Number(process.env.PORT || 3000);

function ensureDirectory(dirPath: string) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function readJsonFile<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function readTextFile(filePath: string) {
  return fs.readFileSync(filePath, 'utf8');
}

function writeJsonFile(filePath: string, value: unknown) {
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2), 'utf8');
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .trim();
}

function parseDataUrl(dataUrl: string) {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) {
    throw new Error('Invalid data URL');
  }

  return {
    mimeType: match[1],
    buffer: Buffer.from(match[2], 'base64'),
  };
}

function extensionFromMimeType(mimeType: string) {
  if (mimeType === 'image/png') return 'png';
  if (mimeType === 'image/jpeg') return 'jpg';
  if (mimeType === 'image/webp') return 'webp';
  if (mimeType === 'image/gif') return 'gif';
  return 'bin';
}

function saveDataUrlFile(targetDir: string, preferredBaseName: string, dataUrl: string, fallbackExtension?: string) {
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

app.use(express.json({ limit: '100mb' }));
app.use('/media', express.static(storageRoot));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.get('/api/community', (_req, res) => {
  const items = readJsonFile<CommunityItem[]>(communityDataPath);
  res.json({ items });
});

app.post('/api/community', (req, res) => {
  try {
    const payload = req.body as CommunityCreatePayload;
    const title = (payload.title || '').trim() || 'New V-Hook Creation';
    const author = (payload.author || '').trim() || 'You';
    const description = (payload.description || '').trim();
    const slugBase = slugify(title) || `community-${Date.now()}`;
    const slug = slugBase;
    const id = Date.now();
    const items = readJsonFile<CommunityItem[]>(communityDataPath);

    let imageUrl = '/media/images/uploaded/home/cover.png';
    if (payload.coverImageDataUrl) {
      const coverFile = saveDataUrlFile(uploadedCommunityImagesRoot, slug, payload.coverImageDataUrl);
      imageUrl = `/media/images/uploaded/community/${coverFile.filename}`;
    }

    let gcodeFileName: string | undefined;
    let gcodeUrl: string | undefined;
    let tdmFileName: string | undefined;
    let tdmUrl: string | undefined;

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

    const item: CommunityItem = {
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
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to create community item',
    });
  }
});

app.delete('/api/community/:id', (req, res) => {
  try {
    const id = Number(req.params.id);
    const items = readJsonFile<CommunityItem[]>(communityDataPath);
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

    const nextItems = items.filter((entry) => entry.id !== id);
    writeJsonFile(communityDataPath, nextItems);

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
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to delete community item',
    });
  }
});

app.get('/api/docs/v-hook', (_req, res) => {
  const markdown = readTextFile(docsMarkdownPath);
  res.json({ markdown });
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
