import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Camera, Upload, X, Heart, AlertCircle, CheckCircle, Video, Image, Shield } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useParams } from 'react-router-dom';
import { getSecureDeviceId, DeviceSessionManager, RateLimiter, logAlbumAccess } from '@/utils/deviceSecurity';
import { validateFile } from '@/utils/fileValidation';

interface Album {
  id: string;
  bride_name: string;
  groom_name: string;
  wedding_date: string;
  photo_limit: number;
  album_code: string;
  new_album_code?: string;
}

interface UploadFile {
  file: File;
  id: string;
  preview: string;
  type: 'image' | 'video';
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
}

const GuestMediaUpload = () => {
  const { albumCode } = useParams<{ albumCode: string }>();
  const [album, setAlbum] = useState<Album | null>(null);
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([]);
  const [uploadCount, setUploadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [securityStatus, setSecurityStatus] = useState<'checking' | 'valid' | 'blocked'>('checking');
  const { toast } = useToast();
  const deviceId = getSecureDeviceId();

  React.useEffect(() => {
    loadAlbum();
  }, [albumCode]);

  const loadAlbum = async () => {
    if (!albumCode) return;

    try {
      // Check rate limits first
      const canAccess = await RateLimiter.checkRateLimit(deviceId, 'album_access');
      if (!canAccess) {
        setSecurityStatus('blocked');
        toast({
          title: "Доступ ограничен",
          description: "Слишком много попыток доступа. Попробуйте позже.",
          variant: "destructive"
        });
        setLoading(false);
        return;
      }

      // Use new_album_code for secure codes
      const { data: albumData, error: albumError } = await supabase
        .from('albums')
        .select('*, new_album_code')
        .or(`album_code.eq.${albumCode},new_album_code.eq.${albumCode}`)
        .eq('is_active', true)
        .single();

      if (albumError) {
        await logAlbumAccess(albumCode, deviceId, 'access_denied', { reason: 'album_not_found' });
        toast({
          title: "Альбом не найден",
          description: "Проверьте правильность ссылки",
          variant: "destructive"
        });
        setSecurityStatus('blocked');
        setLoading(false);
        return;
      }

      setAlbum(albumData);
      setSecurityStatus('valid');

      // Create or get device session
      let token = DeviceSessionManager.getSession(deviceId, albumData.id);
      if (!token) {
        token = await DeviceSessionManager.createSession(albumData.id, deviceId);
      }
      
      if (token) {
        const isValid = await DeviceSessionManager.validateSession(token, deviceId, albumData.id);
        if (isValid) {
          setSessionToken(token);
        } else {
          // Create new session
          token = await DeviceSessionManager.createSession(albumData.id, deviceId);
          setSessionToken(token);
        }
      }

      // Log successful access
      await logAlbumAccess(albumData.id, deviceId, 'view');

      // Check current upload count for this device
      const { data: limitData } = await supabase
        .from('upload_limits')
        .select('upload_count')
        .eq('album_id', albumData.id)
        .eq('device_id', deviceId)
        .single();

      setUploadCount(limitData?.upload_count || 0);
      setLoading(false);
    } catch (error) {
      console.error('Error loading album:', error);
      setSecurityStatus('blocked');
      setLoading(false);
    }
  };

  const handleFileSelect = useCallback(async (files: FileList | null) => {
    if (!files || !album || !sessionToken) return;

    // Check rate limits for upload attempts
    const canUpload = await RateLimiter.checkRateLimit(deviceId, 'upload_attempt');
    if (!canUpload) {
      toast({
        title: "Превышен лимит загрузок",
        description: "Слишком много попыток загрузки. Попробуйте позже.",
        variant: "destructive"
      });
      return;
    }

    const newFiles: UploadFile[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      // Enhanced file validation
      const validation = await validateFile(file, deviceId, album.id);
      if (!validation.valid) {
        toast({
          title: "Ошибка валидации файла",
          description: validation.errors.join(', '),
          variant: "destructive"
        });
        continue;
      }

      const fileId = Math.random().toString(36).substring(7);
      const preview = URL.createObjectURL(file);
      const isVideo = file.type.startsWith('video/');
      
      newFiles.push({
        file,
        id: fileId,
        preview,
        type: isVideo ? 'video' : 'image',
        progress: 0,
        status: 'pending'
      });
    }

    setUploadFiles(prev => [...prev, ...newFiles]);
  }, [album, sessionToken, deviceId, toast]);

  const removeFile = (fileId: string) => {
    setUploadFiles(prev => {
      const file = prev.find(f => f.id === fileId);
      if (file) {
        URL.revokeObjectURL(file.preview);
      }
      return prev.filter(f => f.id !== fileId);
    });
  };

  const uploadFile = async (uploadFile: UploadFile) => {
    if (!album || !sessionToken) return;

    // Validate session before upload
    const sessionValid = await DeviceSessionManager.validateSession(sessionToken, deviceId, album.id);
    if (!sessionValid) {
      setUploadFiles(prev => prev.map(f => 
        f.id === uploadFile.id 
          ? { ...f, status: 'error', error: 'Сессия истекла' }
          : f
      ));
      return;
    }

    const fileName = `${album.id}/${Date.now()}-${uploadFile.file.name}`;
    
    try {
      setUploadFiles(prev => prev.map(f => 
        f.id === uploadFile.id 
          ? { ...f, status: 'uploading', progress: 0 }
          : f
      ));

      // Upload to storage
      const { data: storageData, error: storageError } = await supabase.storage
        .from('wedding-media')
        .upload(fileName, uploadFile.file, {
          cacheControl: '3600',
          upsert: false
        });

      if (storageError) {
        throw new Error(`Ошибка загрузки: ${storageError.message}`);
      }

      // Save to database with enhanced data
      const { error: dbError } = await supabase
        .from('photos')
        .insert({
          album_id: album.id,
          file_name: uploadFile.file.name,
          file_size: uploadFile.file.size,
          file_type: uploadFile.type,
          device_id: deviceId,
          storage_path: fileName
        });

      if (dbError) {
        throw new Error(`Ошибка сохранения: ${dbError.message}`);
      }

      // Update upload limits
      const { error: limitError } = await supabase
        .from('upload_limits')
        .upsert({
          album_id: album.id,
          device_id: deviceId,
          upload_count: uploadCount + 1,
          last_upload: new Date().toISOString()
        });

      if (limitError) {
        console.error('Error updating upload limits:', limitError);
      }

      // Log successful upload
      await logAlbumAccess(album.id, deviceId, 'upload', {
        fileName: uploadFile.file.name,
        fileSize: uploadFile.file.size,
        fileType: uploadFile.type
      });

      setUploadFiles(prev => prev.map(f => 
        f.id === uploadFile.id 
          ? { ...f, status: 'success', progress: 100 }
          : f
      ));

      setUploadCount(prev => prev + 1);

    } catch (error) {
      console.error('Upload error:', error);
      await logAlbumAccess(album.id, deviceId, 'upload_failed', {
        fileName: uploadFile.file.name,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      setUploadFiles(prev => prev.map(f => 
        f.id === uploadFile.id 
          ? { ...f, status: 'error', error: error instanceof Error ? error.message : 'Ошибка загрузки' }
          : f
      ));
    }
  };

  const handleUploadAll = async () => {
    if (!album || uploadFiles.length === 0) return;

    const remainingSlots = album.photo_limit - uploadCount;
    if (uploadFiles.length > remainingSlots) {
      toast({
        title: "Превышен лимит",
        description: `Вы можете загрузить еще ${remainingSlots} файлов`,
        variant: "destructive"
      });
      return;
    }

    setUploading(true);

    for (const file of uploadFiles.filter(f => f.status === 'pending')) {
      await uploadFile(file);
    }

    setUploading(false);
    
    toast({
      title: "Загрузка завершена!",
      description: "Ваши файлы успешно добавлены в альбом",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-orange-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-rose-500 mx-auto mb-4"></div>
          <p className="text-gray-600">
            {securityStatus === 'checking' ? 'Проверка безопасности...' : 'Загрузка...'}
          </p>
        </div>
      </div>
    );
  }

  if (securityStatus === 'blocked' || !album) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-orange-50 flex items-center justify-center">
        <Card className="bg-white/70 backdrop-blur-sm border-rose-200 max-w-md">
          <CardContent className="text-center py-12">
            <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              Доступ ограничен
            </h3>
            <p className="text-gray-600">
              {securityStatus === 'blocked' 
                ? 'Доступ временно ограничен из соображений безопасности'
                : 'Альбом не найден или недоступен'
              }
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const remainingSlots = album.photo_limit - uploadCount;

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-orange-50 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Security Status Indicator */}
        <div className="mb-4 flex items-center justify-between">
          <Button 
            variant="ghost" 
            onClick={() => window.location.href = `/guest/${album.new_album_code || album.album_code}`}
            className="text-rose-600 hover:text-rose-700"
          >
            ← Назад к альбому
          </Button>
          
          <div className="flex items-center space-x-2 text-sm text-green-600">
            <Shield className="h-4 w-4" />
            <span>Защищенное соединение</span>
          </div>
        </div>

        {/* Album Header */}
        <Card className="bg-white/70 backdrop-blur-sm border-rose-200 mb-8">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl text-rose-700 mb-2">
              <Heart className="inline mr-2 h-6 w-6" />
              {album.bride_name} & {album.groom_name}
            </CardTitle>
            <p className="text-gray-600">
              Загрузите ваши фото и видео воспоминания
            </p>
            <div className="mt-4 p-4 bg-rose-50 rounded-lg">
              <p className="text-sm text-gray-700">
                Использовано: <span className="font-semibold">{uploadCount}</span> из <span className="font-semibold">{album.photo_limit}</span> слотов
              </p>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div 
                  className="bg-rose-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(uploadCount / album.photo_limit) * 100}%` }}
                ></div>
              </div>
            </div>
          </CardHeader>
        </Card>

        {remainingSlots <= 0 ? (
          <Card className="bg-white/70 backdrop-blur-sm border-rose-200">
            <CardContent className="text-center py-12">
              <AlertCircle className="h-16 w-16 text-orange-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">
                Лимит исчерпан
              </h3>
              <p className="text-gray-600">
                Вы уже загрузили максимальное количество файлов для этого альбома
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Upload Zone */}
            <Card className="bg-white/70 backdrop-blur-sm border-rose-200 mb-6">
              <CardContent className="p-6">
                <div
                  className="border-2 border-dashed border-rose-300 rounded-lg p-8 text-center hover:border-rose-400 transition-colors cursor-pointer"
                  onClick={() => document.getElementById('file-input')?.click()}
                  onDrop={(e) => {
                    e.preventDefault();
                    handleFileSelect(e.dataTransfer.files);
                  }}
                  onDragOver={(e) => e.preventDefault()}
                >
                  <Camera className="h-12 w-12 text-rose-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">
                    Выберите фото и видео
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Перетащите файлы сюда или нажмите для выбора
                  </p>
                  <p className="text-sm text-gray-500">
                    Поддерживаются: JPG, PNG, GIF, WebP, MP4, MOV, AVI, MKV, WebM<br/>
                    Максимум: 50MB для фото, 1GB для видео
                  </p>
                  <Input
                    id="file-input"
                    type="file"
                    multiple
                    accept="image/*,video/*"
                    onChange={(e) => handleFileSelect(e.target.files)}
                    className="hidden"
                  />
                </div>
              </CardContent>
            </Card>

            {/* File List */}
            {uploadFiles.length > 0 && (
              <Card className="bg-white/70 backdrop-blur-sm border-rose-200 mb-6">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Выбранные файлы ({uploadFiles.length})</span>
                    <Button
                      onClick={handleUploadAll}
                      disabled={uploading || uploadFiles.filter(f => f.status === 'pending').length === 0}
                      className="bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600"
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      {uploading ? 'Загрузка...' : 'Загрузить все'}
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {uploadFiles.map((file) => (
                      <div key={file.id} className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg">
                        <div className="flex-shrink-0">
                          {file.type === 'video' ? (
                            <div className="w-16 h-16 bg-black rounded-lg flex items-center justify-center">
                              <Video className="h-8 w-8 text-white" />
                            </div>
                          ) : (
                            <img
                              src={file.preview}
                              alt="Preview"
                              className="w-16 h-16 object-cover rounded-lg"
                            />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {file.file.name}
                          </p>
                          <p className="text-sm text-gray-500">
                            {file.type === 'video' ? 'Видео' : 'Фото'} • {(file.file.size / (1024 * 1024)).toFixed(1)} МБ
                          </p>
                          {file.status === 'error' && (
                            <p className="text-sm text-red-600">{file.error}</p>
                          )}
                        </div>
                        <div className="flex-shrink-0 flex items-center space-x-2">
                          {file.status === 'success' && (
                            <CheckCircle className="h-5 w-5 text-green-500" />
                          )}
                          {file.status === 'error' && (
                            <AlertCircle className="h-5 w-5 text-red-500" />
                          )}
                          {file.status === 'uploading' && (
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-rose-500"></div>
                          )}
                          {file.status === 'pending' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeFile(file.id)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default GuestMediaUpload;
