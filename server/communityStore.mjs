import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

function ensureDirectory(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function readJsonFile(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJsonFile(filePath, value) {
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2), 'utf8');
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

function normalizeUploadedFile(file, fallbackMimeType) {
  if (!file) {
    return null;
  }

  return {
    mimeType: file.mimetype || fallbackMimeType || 'application/octet-stream',
    buffer: file.buffer,
    originalName: file.originalname,
  };
}

function extensionFromMimeType(mimeType) {
  if (mimeType === 'image/png') return 'png';
  if (mimeType === 'image/jpeg') return 'jpg';
  if (mimeType === 'image/webp') return 'webp';
  if (mimeType === 'image/gif') return 'gif';
  if (mimeType === 'text/plain') return 'txt';
  return 'bin';
}

function createLocalCommunityStore(options) {
  const {
    communityDataPath,
    uploadedCommunityImagesRoot,
    communityDownloadsRoot,
  } = options;

  function saveBufferFile(targetDir, preferredBaseName, fileLike, fallbackExtension) {
    ensureDirectory(targetDir);
    const { mimeType, buffer, originalName } = fileLike;
    const extension = fallbackExtension || extensionFromMimeType(mimeType);
    const explicitFileName = originalName?.trim();
    const filename = explicitFileName || `${preferredBaseName}.${extension}`;
    const filePath = path.join(targetDir, filename);
    fs.writeFileSync(filePath, buffer);
    return { filename, filePath };
  }

  return {
    mode: 'local',
    async listCommunityItems() {
      return readJsonFile(communityDataPath);
    },
    async createCommunityItem(payload) {
      const title = (payload.title || '').trim() || 'New V-Hook Creation';
      const author = (payload.author || '').trim() || 'You';
      const description = (payload.description || '').trim();
      const slug = slugify(title) || `community-${Date.now()}`;
      const id = Date.now();
      const items = readJsonFile(communityDataPath);
      const coverImageFile = payload.coverImageFile
        || (payload.coverImageDataUrl
          ? { ...parseDataUrl(payload.coverImageDataUrl), originalName: payload.coverImageFileName }
          : null);
      const gcodeFile = payload.gcodeFile
        || (payload.gcodeDataUrl
          ? { ...parseDataUrl(payload.gcodeDataUrl), originalName: payload.gcodeFileName }
          : null);
      const tdmFile = payload.tdmFile
        || (payload.tdmDataUrl
          ? { ...parseDataUrl(payload.tdmDataUrl), originalName: payload.tdmFileName }
          : null);

      let imageUrl = '/media/images/uploaded/home/cover.png';
      if (coverImageFile) {
        const coverFile = saveBufferFile(uploadedCommunityImagesRoot, slug, coverImageFile);
        imageUrl = `/media/images/uploaded/community/${coverFile.filename}`;
      }

      let gcodeFileName;
      let gcodeUrl;
      let tdmFileName;
      let tdmUrl;

      const itemDownloadDir = path.join(communityDownloadsRoot, slug);
      ensureDirectory(itemDownloadDir);

      if (gcodeFile) {
        const gcodeBuffer = gcodeFile.buffer;
        gcodeFileName = gcodeFile.originalName || payload.gcodeFileName || `${slug}.gcode`;
        fs.writeFileSync(path.join(itemDownloadDir, gcodeFileName), gcodeBuffer);
        gcodeUrl = `/media/downloads/community/${slug}/${encodeURIComponent(gcodeFileName)}`;
      }

      if (tdmFile) {
        const tdmBuffer = tdmFile.buffer;
        tdmFileName = tdmFile.originalName || payload.tdmFileName || `${slug}.3dm`;
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
      return item;
    },
    async deleteCommunityItem(id) {
      const items = readJsonFile(communityDataPath);
      const item = items.find((entry) => entry.id === id);

      if (!item) {
        const error = new Error('Community item not found');
        error.statusCode = 404;
        throw error;
      }

      const isDeletable = item.isUserCreated || item.author === 'You';
      if (!isDeletable) {
        const error = new Error('Only your uploaded items can be deleted');
        error.statusCode = 403;
        throw error;
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

      return item;
    },
  };
}

function createSupabaseCommunityStore(options) {
  const {
    supabaseUrl,
    supabaseServiceRoleKey,
    supabaseBucketName,
  } = options;

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  function publicUrlFor(pathname) {
    const { data } = supabase.storage.from(supabaseBucketName).getPublicUrl(pathname);
    return data.publicUrl;
  }

  function mapRowToItem(row) {
    return {
      id: row.id,
      title: row.title,
      author: row.author,
      image: row.image_url,
      views: row.views ?? '0',
      downloads: row.downloads ?? '0',
      description: row.description || '',
      gcodeFileName: row.gcode_file_name || undefined,
      gcodeUrl: row.gcode_url || undefined,
      tdmFileName: row.tdm_file_name || undefined,
      tdmUrl: row.tdm_url || undefined,
      isUserCreated: row.is_user_created ?? true,
      storageKey: row.storage_key || undefined,
    };
  }

  async function uploadDataUrlAsset(storageKey, dataUrl, providedFileName, folder) {
    if (!dataUrl) {
      return { fileName: undefined, url: undefined, path: undefined };
    }

    const { mimeType, buffer } = parseDataUrl(dataUrl);
    const parsedExtension = extensionFromMimeType(mimeType);
    const rawExtension = path.extname(providedFileName || '').replace('.', '').toLowerCase();
    const extension = rawExtension || parsedExtension;
    const fileName = providedFileName || `${folder}-${storageKey}.${extension}`;
    const assetPath = `${folder}/${storageKey}/${fileName}`;

    const { error } = await supabase.storage.from(supabaseBucketName).upload(assetPath, buffer, {
      contentType: mimeType,
      upsert: true,
    });

    if (error) {
      throw error;
    }

    return {
      fileName,
      url: publicUrlFor(assetPath),
      path: assetPath,
    };
  }

  async function uploadBufferAsset(storageKey, fileLike, folder) {
    if (!fileLike) {
      return { fileName: undefined, url: undefined, path: undefined };
    }

    const { mimeType, buffer, originalName } = fileLike;
    const parsedExtension = extensionFromMimeType(mimeType);
    const rawExtension = path.extname(originalName || '').replace('.', '').toLowerCase();
    const extension = rawExtension || parsedExtension;
    const fileName = originalName || `${folder}-${storageKey}.${extension}`;
    const assetPath = `${folder}/${storageKey}/${fileName}`;

    const { error } = await supabase.storage.from(supabaseBucketName).upload(assetPath, buffer, {
      contentType: mimeType,
      upsert: true,
    });

    if (error) {
      throw error;
    }

    return {
      fileName,
      url: publicUrlFor(assetPath),
      path: assetPath,
    };
  }

  return {
    mode: 'supabase',
    async listCommunityItems() {
      const { data, error } = await supabase
        .from('community_items')
        .select('*')
        .order('id', { ascending: false });

      if (error) {
        throw error;
      }

      return (data || []).map(mapRowToItem);
    },
    async createCommunityItem(payload) {
      const title = (payload.title || '').trim() || 'New V-Hook Creation';
      const author = (payload.author || '').trim() || 'You';
      const description = (payload.description || '').trim();
      const storageKey = slugify(title) || `community-${Date.now()}`;
      const id = Date.now();
      const coverImageFile = payload.coverImageFile
        || (payload.coverImageDataUrl
          ? { ...parseDataUrl(payload.coverImageDataUrl), originalName: payload.coverImageFileName }
          : null);
      const gcodeFile = payload.gcodeFile
        || (payload.gcodeDataUrl
          ? { ...parseDataUrl(payload.gcodeDataUrl), originalName: payload.gcodeFileName }
          : null);
      const tdmFile = payload.tdmFile
        || (payload.tdmDataUrl
          ? { ...parseDataUrl(payload.tdmDataUrl), originalName: payload.tdmFileName }
          : null);

      const imageAsset = coverImageFile
        ? await uploadBufferAsset(storageKey, coverImageFile, 'images')
        : { fileName: undefined, url: '/media/images/uploaded/home/cover.png', path: undefined };

      const gcodeAsset = gcodeFile
        ? await uploadBufferAsset(storageKey, gcodeFile, 'downloads')
        : { fileName: undefined, url: undefined, path: undefined };

      const tdmAsset = tdmFile
        ? await uploadBufferAsset(storageKey, tdmFile, 'downloads')
        : { fileName: undefined, url: undefined, path: undefined };

      const row = {
        id,
        title,
        author,
        image_url: imageAsset.url,
        image_path: imageAsset.path,
        views: '0',
        downloads: '0',
        description,
        gcode_file_name: gcodeAsset.fileName,
        gcode_url: gcodeAsset.url,
        gcode_path: gcodeAsset.path,
        tdm_file_name: tdmAsset.fileName,
        tdm_url: tdmAsset.url,
        tdm_path: tdmAsset.path,
        is_user_created: true,
        storage_key: storageKey,
      };

      const { data, error } = await supabase
        .from('community_items')
        .insert(row)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return mapRowToItem(data);
    },
    async deleteCommunityItem(id) {
      const { data: row, error: fetchError } = await supabase
        .from('community_items')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (fetchError) {
        throw fetchError;
      }

      if (!row) {
        const error = new Error('Community item not found');
        error.statusCode = 404;
        throw error;
      }

      const isDeletable = row.is_user_created || row.author === 'You';
      if (!isDeletable) {
        const error = new Error('Only your uploaded items can be deleted');
        error.statusCode = 403;
        throw error;
      }

      const assetPaths = [row.image_path, row.gcode_path, row.tdm_path].filter(Boolean);
      if (assetPaths.length > 0) {
        const { error: removeStorageError } = await supabase.storage.from(supabaseBucketName).remove(assetPaths);
        if (removeStorageError) {
          throw removeStorageError;
        }
      }

      const { error: deleteError } = await supabase
        .from('community_items')
        .delete()
        .eq('id', id);

      if (deleteError) {
        throw deleteError;
      }

      return mapRowToItem(row);
    },
  };
}

export function createCommunityStore(options) {
  const hasSupabaseConfig = Boolean(options.supabaseUrl && options.supabaseServiceRoleKey);

  if (hasSupabaseConfig) {
    return createSupabaseCommunityStore(options);
  }

  return createLocalCommunityStore(options);
}
