import { taruviStorageProvider, type StorageUploadVariables } from "../providers/refineProviders";

/**
 * Generate storage URL from bucket name and file path
 */
export const getStorageUrl = (bucket: string, path: string | null | undefined): string => {
  if (!path) return "https://via.placeholder.com/400x600?text=No+Image";

  const baseUrl = __TARUVI_SITE_URL__;
  const appSlug = __TARUVI_APP_SLUG__;

  return `${baseUrl}/api/apps/${appSlug}/storage/buckets/${bucket}/objects/${path}`;
};

/**
 * Download a storage object with a browser save prompt instead of navigating to the file URL.
 */
export const downloadStorageFile = async (
  bucket: string,
  path: string,
  fileName?: string | null,
): Promise<void> => {
  const url = getStorageUrl(bucket, path);
  const response = await fetch(url, {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error(`Failed to download file: ${response.status}`);
  }

  const blob = await response.blob();
  const objectUrl = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = fileName || path.split("/").pop() || "download";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(objectUrl);
};

/**
 * Convenience wrapper for play posters
 */
export const getPosterUrl = (posterPath: string | null | undefined): string => {
  return getStorageUrl("play-posters", posterPath);
};

/**
 * Convenience wrapper for play banners
 */
export const getBannerUrl = (bannerPath: string | null | undefined): string => {
  return getStorageUrl("play-banners", bannerPath);
};

/**
 * Generate unique file path with timestamp
 */
export const generateFilePath = (file: File, prefix: string = "file"): string => {
  return `${prefix}-${Date.now()}-${file.name}`;
};

/**
 * Upload file to storage bucket
 * Returns the generated file path on success
 */
export const uploadFile = async (
  bucket: string,
  file: File,
  options?: {
    prefix?: string;
    onProgress?: (progress: number) => void;
  }
): Promise<string> => {
  const path = generateFilePath(file, options?.prefix);

  const uploadVars: StorageUploadVariables = {
    files: [file],
    paths: [path],
  };

  await taruviStorageProvider.create({
    resource: bucket,
    variables: uploadVars,
    meta: {},
  });

  console.log(`[Upload] File uploaded to ${bucket}, path: ${path}`);
  return path;
};

/**
 * Delete file from storage bucket
 */
export const deleteFile = async (bucket: string, path: string): Promise<void> => {
  try {
    await taruviStorageProvider.deleteOne({
      resource: bucket,
      id: path,
      meta: {},
    });
    console.log(`[Delete] File deleted from ${bucket}: ${path}`);
  } catch (error) {
    console.warn(`[Delete] Failed to delete file from ${bucket}:`, error);
    throw error;
  }
};

/**
 * Upload file with automatic cleanup of old file (for edit forms)
 * Deletes old file before uploading new one
 */
export const uploadFileWithCleanup = async (
  bucket: string,
  file: File,
  oldPath?: string | null,
  options?: {
    prefix?: string;
  }
): Promise<string> => {
  // Delete old file if exists
  if (oldPath) {
    try {
      await deleteFile(bucket, oldPath);
    } catch (error) {
      console.warn(`[Cleanup] Failed to delete old file, continuing with upload...`);
    }
  }

  // Upload new file
  return uploadFile(bucket, file, options);
};
