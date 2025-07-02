
import { supabase } from '@/integrations/supabase/client';

export interface FileValidationResult {
  valid: boolean;
  errors: string[];
}

// Enhanced client-side file validation
export const validateFileClient = (file: File): FileValidationResult => {
  const errors: string[] = [];
  
  // Check file size
  const maxImageSize = 50 * 1024 * 1024; // 50MB
  const maxVideoSize = 1024 * 1024 * 1024; // 1GB
  
  const isImage = file.type.startsWith('image/');
  const isVideo = file.type.startsWith('video/');
  
  if (!isImage && !isVideo) {
    errors.push('File must be an image or video');
  }
  
  if (isImage && file.size > maxImageSize) {
    errors.push('Image file too large (max 50MB)');
  }
  
  if (isVideo && file.size > maxVideoSize) {
    errors.push('Video file too large (max 1GB)');
  }
  
  // Check file extensions
  const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  const allowedVideoTypes = ['video/mp4', 'video/mov', 'video/avi', 'video/mkv', 'video/webm'];
  
  if (isImage && !allowedImageTypes.includes(file.type)) {
    errors.push('Invalid image format. Allowed: JPG, PNG, GIF, WebP');
  }
  
  if (isVideo && !allowedVideoTypes.includes(file.type)) {
    errors.push('Invalid video format. Allowed: MP4, MOV, AVI, MKV, WebM');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
};

// Server-side validation through our enhanced function
export const validateFileServer = async (
  file: File,
  deviceId: string,
  albumId: string
): Promise<FileValidationResult> => {
  try {
    const fileExtension = file.name.split('.').pop()?.toLowerCase() || '';
    const fileType = file.type.startsWith('image/') ? 'image' : 'video';
    
    const { data, error } = await supabase.rpc('validate_media_upload_enhanced', {
      file_size_bytes: file.size,
      file_type: fileType,
      file_extension: fileExtension,
      device_id: deviceId,
      album_id: albumId
    });
    
    if (error) {
      console.error('Server validation error:', error);
      return {
        valid: false,
        errors: ['Server validation failed']
      };
    }
    
    return data as unknown as FileValidationResult;
  } catch (error) {
    console.error('File validation error:', error);
    return {
      valid: false,
      errors: ['Validation error occurred']
    };
  }
};

// Comprehensive file validation (client + server)
export const validateFile = async (
  file: File,
  deviceId: string,
  albumId: string
): Promise<FileValidationResult> => {
  // First do client-side validation for immediate feedback
  const clientValidation = validateFileClient(file);
  if (!clientValidation.valid) {
    return clientValidation;
  }
  
  // Then do server-side validation for security
  return await validateFileServer(file, deviceId, albumId);
};
