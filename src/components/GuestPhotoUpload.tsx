
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Camera, Upload, Heart, AlertCircle, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { getDeviceId } from '@/utils/deviceId';

interface Album {
  id: string;
  bride_name: string;
  groom_name: string;
  photo_limit: number;
  wedding_date: string;
}

interface GuestPhotoUploadProps {
  albumCode: string;
  onBack: () => void;
}

const GuestPhotoUpload = ({ albumCode, onBack }: GuestPhotoUploadProps) => {
  const [album, setAlbum] = useState<Album | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadCount, setUploadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const deviceId = getDeviceId();

  useEffect(() => {
    loadAlbumData();
  }, [albumCode]);

  const loadAlbumData = async () => {
    try {
      // Загружаем данные альбома
      const { data: albumData, error: albumError } = await supabase
        .from('albums')
        .select('*')
        .eq('album_code', albumCode)
        .eq('is_active', true)
        .single();

      if (albumError || !albumData) {
        toast({
          title: "Альбом не найден",
          description: "Проверьте правильность ссылки",
          variant: "destructive"
        });
        onBack();
        return;
      }

      setAlbum(albumData);

      // Проверяем количество уже загруженных фото с этого устройства
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
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить данные альбома",
        variant: "destructive"
      });
      onBack();
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0 || !album) return;

    const remainingUploads = album.photo_limit - uploadCount;
    if (remainingUploads <= 0) {
      toast({
        title: "Лимит достигнут",
        description: "Вы уже загрузили максимальное количество фото",
        variant: "destructive"
      });
      return;
    }

    const filesToUpload = files.slice(0, remainingUploads);
    setUploading(true);

    try {
      for (const file of filesToUpload) {
        // Проверяем размер файла (максимум 10MB)
        if (file.size > 10 * 1024 * 1024) {
          toast({
            title: "Файл слишком большой",
            description: `${file.name} превышает 10MB`,
            variant: "destructive"
          });
          continue;
        }

        // Создаем уникальное имя файла
        const fileExt = file.name.split('.').pop();
        const fileName = `${album.id}/${deviceId}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

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

        // Обновляем счетчик загрузок
        const { error: limitError } = await supabase
          .from('upload_limits')
          .upsert({
            album_id: album.id,
            device_id: deviceId,
            upload_count: uploadCount + 1
          });

        if (!limitError) {
          setUploadCount(prev => prev + 1);
        }
      }

      toast({
        title: "Фото загружены! 🎉",
        description: `Успешно загружено ${filesToUpload.length} фото`,
      });

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

  const remainingUploads = album.photo_limit - uploadCount;
  const canUpload = remainingUploads > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-orange-50 py-8">
      <div className="container mx-auto px-4 max-w-2xl">
        <Button 
          variant="ghost" 
          onClick={onBack}
          className="mb-6 text-rose-600 hover:text-rose-700"
        >
          ← Назад
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
            {/* Индикатор лимита */}
            <div className="bg-rose-50 border border-rose-200 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                {canUpload ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-500" />
                )}
                <span className="font-medium">
                  Загружено: {uploadCount} из {album.photo_limit}
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
                  Вы можете загрузить ещё {remainingUploads} фото
                </p>
              ) : (
                <p className="text-sm text-red-600 mt-2">
                  Лимит загрузок достигнут. Спасибо за участие! ❤️
                </p>
              )}
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
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default GuestPhotoUpload;
