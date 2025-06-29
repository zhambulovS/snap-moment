
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Camera, Upload, Heart, AlertCircle, CheckCircle, ArrowLeft, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { getDeviceId } from '@/utils/deviceId';

interface Album {
  id: string;
  bride_name: string;
  groom_name: string;
  photo_limit: number;
  wedding_date: string;
  is_active: boolean;
}

const GuestPhotoUpload = () => {
  const { albumCode } = useParams<{ albumCode: string }>();
  const navigate = useNavigate();
  const [album, setAlbum] = useState<Album | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadCount, setUploadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [deviceSession, setDeviceSession] = useState<string | null>(null);
  const { toast } = useToast();
  const deviceId = getDeviceId();

  useEffect(() => {
    if (albumCode) {
      loadAlbumData();
      initializeDeviceSession();
    }
  }, [albumCode]);

  const initializeDeviceSession = () => {
    // Создаем уникальную сессию для каждого захода
    const sessionId = `${deviceId}-${Date.now()}`;
    setDeviceSession(sessionId);
    console.log('Device session initialized:', sessionId);
  };

  const loadAlbumData = async () => {
    if (!albumCode) {
      navigate('/');
      return;
    }

    try {
      console.log('Loading album with code:', albumCode);
      
      const { data: albumData, error: albumError } = await supabase
        .from('albums')
        .select('*')
        .eq('album_code', albumCode)
        .eq('is_active', true)
        .single();

      if (albumError || !albumData) {
        console.error('Album error:', albumError);
        toast({
          title: "Альбом не найден",
          description: "Проверьте правильность ссылки или альбом может быть отключен",
          variant: "destructive"
        });
        navigate('/');
        return;
      }

      console.log('Album loaded:', albumData);
      setAlbum(albumData);

      // Проверяем количество уже загруженных фото с этого устройства
      const { data: limitData } = await supabase
        .from('upload_limits')
        .select('upload_count')
        .eq('album_id', albumData.id)
        .eq('device_id', deviceId)
        .single();

      console.log('Upload limits for device:', limitData);
      setUploadCount(limitData?.upload_count || 0);
      setLoading(false);
    } catch (error) {
      console.error('Error loading album:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить данные альбома",
        variant: "destructive"
      });
      navigate('/');
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0 || !album) return;

    const remainingUploads = album.photo_limit - uploadCount;
    if (remainingUploads <= 0) {
      toast({
        title: "Лимит достигнут 🚫",
        description: `Вы уже загрузили максимальное количество фото (${album.photo_limit})`,
        variant: "destructive"
      });
      return;
    }

    const filesToUpload = files.slice(0, remainingUploads);
    if (filesToUpload.length < files.length) {
      toast({
        title: "Некоторые файлы пропущены",
        description: `Можно загрузить только ${remainingUploads} фото из ${files.length} выбранных`,
      });
    }

    setUploading(true);

    try {
      let successCount = 0;
      
      for (const file of filesToUpload) {
        console.log('Uploading file:', file.name, 'Size:', file.size, 'Session:', deviceSession);
        
        // Проверяем размер файла (максимум 10MB)
        if (file.size > 10 * 1024 * 1024) {
          toast({
            title: "Файл слишком большой",
            description: `${file.name} превышает 10MB`,
            variant: "destructive"
          });
          continue;
        }

        // Создаем уникальное имя файла с информацией о сессии
        const fileExt = file.name.split('.').pop();
        const fileName = `${album.id}/${deviceId}/${deviceSession}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

        console.log('Uploading to storage with filename:', fileName);

        // Загружаем файл в storage
        const { error: uploadError } = await supabase.storage
          .from('wedding-photos')
          .upload(fileName, file);

        if (uploadError) {
          console.error('Upload error:', uploadError);
          toast({
            title: "Ошибка загрузки",
            description: `Не удалось загрузить ${file.name}`,
            variant: "destructive"
          });
          continue;
        }

        console.log('File uploaded to storage, saving to database');

        // Сохраняем информацию о фото в базе данных
        const { error: dbError } = await supabase
          .from('photos')
          .insert({
            album_id: album.id,
            file_name: fileName,
            file_size: file.size,
            device_id: deviceId
          });

        if (dbError) {
          console.error('Database error:', dbError);
          // Удаляем файл из storage если не удалось сохранить в БД
          await supabase.storage.from('wedding-photos').remove([fileName]);
          continue;
        }

        console.log('Photo saved to database');
        successCount++;
      }

      if (successCount > 0) {
        // Обновляем счетчик загрузок для этого устройства
        const newUploadCount = uploadCount + successCount;
        const { error: limitError } = await supabase
          .from('upload_limits')
          .upsert({
            album_id: album.id,
            device_id: deviceId,
            upload_count: newUploadCount
          });

        if (!limitError) {
          setUploadCount(newUploadCount);
          
          if (newUploadCount >= album.photo_limit) {
            toast({
              title: "Все фото загружены! 🎉",
              description: `Спасибо за участие! Вы загрузили ${newUploadCount} из ${album.photo_limit} фото`,
            });
          } else {
            toast({
              title: `Загружено ${successCount} фото! 📸`,
              description: `Осталось: ${album.photo_limit - newUploadCount} фото`,
            });
          }
        }
      }

    } catch (error) {
      console.error('Error uploading photos:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить фото. Попробуйте снова.",
        variant: "destructive"
      });
    }

    setUploading(false);
    // Очищаем input
    event.target.value = '';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-orange-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-rose-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Загрузка альбома...</p>
        </div>
      </div>
    );
  }

  if (!album) {
    return null;
  }

  // Проверяем, активен ли альбом
  if (!album.is_active) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-orange-50 flex items-center justify-center">
        <Card className="bg-white/70 backdrop-blur-sm border-rose-200 max-w-md mx-4">
          <CardContent className="text-center py-12">
            <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              Альбом временно недоступен
            </h3>
            <p className="text-gray-600 mb-4">
              Загрузка фотографий для этого альбома в данный момент отключена
            </p>
            <Button
              onClick={() => navigate('/')}
              variant="outline"
              className="border-rose-200 text-rose-600 hover:bg-rose-50"
            >
              На главную
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const remainingUploads = album.photo_limit - uploadCount;
  const canUpload = remainingUploads > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-orange-50 py-8">
      <div className="container mx-auto px-4 max-w-2xl">
        <Button 
          variant="ghost" 
          onClick={() => navigate('/')}
          className="mb-6 text-rose-600 hover:text-rose-700"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Назад
        </Button>

        <Card className="bg-white/70 backdrop-blur-sm border-rose-200 mb-6">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center space-x-2 mb-2">
              <Heart className="h-6 w-6 text-rose-500" />
              <CardTitle className="text-2xl text-rose-700">
                {album.bride_name} & {album.groom_name}
              </CardTitle>
              <Heart className="h-6 w-6 text-rose-500" />
            </div>
            <p className="text-gray-600">
              {new Date(album.wedding_date).toLocaleDateString('ru-RU')}
            </p>
          </CardHeader>
        </Card>

        <Card className="bg-white/70 backdrop-blur-sm border-rose-200">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Camera className="h-6 w-6 text-rose-500" />
              <span>Загрузка фотографий</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Индикатор лимита для этого устройства */}
            <div className="bg-rose-50 border border-rose-200 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                {canUpload ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-500" />
                )}
                <span className="font-medium">
                  Ваш прогресс: {uploadCount} из {album.photo_limit}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-rose-500 to-pink-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(uploadCount / album.photo_limit) * 100}%` }}
                ></div>
              </div>
              {canUpload ? (
                <p className="text-sm text-gray-600 mt-2">
                  🎉 Вы можете загрузить ещё {remainingUploads} фото с этого устройства
                </p>
              ) : (
                <p className="text-sm text-red-600 mt-2">
                  ✨ Спасибо! Вы загрузили максимальное количество фото с этого устройства ❤️
                </p>
              )}
            </div>

            {/* Информация о сессии устройства */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-center space-x-2">
                <Users className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium text-blue-700">
                  Уникальная сессия устройства
                </span>
              </div>
              <p className="text-xs text-blue-600 mt-1">
                Лимит применяется к каждому устройству отдельно. Если зайдете с другого устройства, у вас будет свой лимит.
              </p>
            </div>

            {/* Кнопки загрузки */}
            {canUpload && (
              <div className="space-y-4">
                <div>
                  <input
                    type="file"
                    id="camera-upload"
                    accept="image/*"
                    capture="environment"
                    multiple
                    onChange={handleFileUpload}
                    disabled={uploading}
                    className="hidden"
                  />
                  <Button
                    onClick={() => document.getElementById('camera-upload')?.click()}
                    disabled={uploading}
                    className="w-full bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600"
                    size="lg"
                  >
                    <Camera className="mr-2 h-5 w-5" />
                    {uploading ? 'Загрузка...' : 'Сделать фото'}
                  </Button>
                </div>

                <div>
                  <input
                    type="file"
                    id="gallery-upload"
                    accept="image/*"
                    multiple
                    onChange={handleFileUpload}
                    disabled={uploading}
                    className="hidden"
                  />
                  <Button
                    onClick={() => document.getElementById('gallery-upload')?.click()}
                    disabled={uploading}
                    variant="outline"
                    className="w-full border-rose-200 text-rose-600 hover:bg-rose-50"
                    size="lg"
                  >
                    <Upload className="mr-2 h-5 w-5" />
                    {uploading ? 'Загрузка...' : 'Выбрать из галереи'}
                  </Button>
                </div>
              </div>
            )}

            <div className="text-center text-sm text-gray-500">
              <p>Поддерживаются изображения до 10MB</p>
              <p>JPG, PNG, HEIC, WEBP</p>
              <p className="mt-2 text-xs">
                💡 Совет: Вы можете зайти с разных устройств для загрузки большего количества фото
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default GuestPhotoUpload;
