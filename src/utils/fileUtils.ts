// Utilities for file handling and name sanitization

/**
 * Sanitizes file name to be compatible with Supabase Storage
 * Removes cyrillic characters, special characters and spaces
 */
export const sanitizeFileName = (fileName: string): string => {
  // Get file extension
  const lastDotIndex = fileName.lastIndexOf('.');
  const name = lastDotIndex > 0 ? fileName.substring(0, lastDotIndex) : fileName;
  const extension = lastDotIndex > 0 ? fileName.substring(lastDotIndex) : '';
  
  // Replace cyrillic and special characters with latin equivalents or remove them
  const cyrillicMap: { [key: string]: string } = {
    'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo',
    'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
    'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
    'ф': 'f', 'х': 'kh', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'sch',
    'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya',
    'А': 'A', 'Б': 'B', 'В': 'V', 'Г': 'G', 'Д': 'D', 'Е': 'E', 'Ё': 'YO',
    'Ж': 'ZH', 'З': 'Z', 'И': 'I', 'Й': 'Y', 'К': 'K', 'Л': 'L', 'М': 'M',
    'Н': 'N', 'О': 'O', 'П': 'P', 'Р': 'R', 'С': 'S', 'Т': 'T', 'У': 'U',
    'Ф': 'F', 'Х': 'KH', 'Ц': 'TS', 'Ч': 'CH', 'Ш': 'SH', 'Щ': 'SCH',
    'Ъ': '', 'Ы': 'Y', 'Ь': '', 'Э': 'E', 'Ю': 'YU', 'Я': 'YA'
  };
  
  // Replace cyrillic characters
  let sanitizedName = name.split('').map(char => cyrillicMap[char] || char).join('');
  
  // Remove special characters and spaces, replace with underscores
  sanitizedName = sanitizedName
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^_+|_+$/g, '');
  
  // If name becomes empty, use default
  if (!sanitizedName) {
    sanitizedName = 'file';
  }
  
  return sanitizedName + extension.toLowerCase();
};

/**
 * Generates a unique file name for storage
 */
export const generateUniqueFileName = (originalFileName: string, albumId: string): string => {
  const sanitized = sanitizeFileName(originalFileName);
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 8);
  
  const lastDotIndex = sanitized.lastIndexOf('.');
  const name = lastDotIndex > 0 ? sanitized.substring(0, lastDotIndex) : sanitized;
  const extension = lastDotIndex > 0 ? sanitized.substring(lastDotIndex) : '';
  
  return `${albumId}/${timestamp}-${randomString}-${name}${extension}`;
};

/**
 * Validates file type and size
 */
export const validateFileUpload = (file: File): { valid: boolean; error?: string } => {
  const maxImageSize = 50 * 1024 * 1024; // 50MB
  const maxVideoSize = 1024 * 1024 * 1024; // 1GB
  
  const isImage = file.type.startsWith('image/');
  const isVideo = file.type.startsWith('video/');
  
  if (!isImage && !isVideo) {
    return { valid: false, error: 'Файл должен быть изображением или видео' };
  }
  
  if (isImage && file.size > maxImageSize) {
    return { valid: false, error: 'Размер изображения превышает 50MB' };
  }
  
  if (isVideo && file.size > maxVideoSize) {
    return { valid: false, error: 'Размер видео превышает 1GB' };
  }
  
  const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/heic', 'image/heif'];
  const allowedVideoTypes = ['video/mp4', 'video/mov', 'video/avi', 'video/mkv', 'video/webm'];
  
  if (isImage && !allowedImageTypes.includes(file.type.toLowerCase())) {
    return { valid: false, error: 'Неподдерживаемый формат изображения' };
  }
  
  if (isVideo && !allowedVideoTypes.includes(file.type.toLowerCase())) {
    return { valid: false, error: 'Неподдерживаемый формат видео' };
  }
  
  return { valid: true };
};