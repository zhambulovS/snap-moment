
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Camera, Download, Heart, Users, Calendar, Eye, Settings, Images, QrCode } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import AlbumSettings from './AlbumSettings';

interface Album {
  id: string;
  bride_name: string;
  groom_name: string;
  wedding_date: string;
  description: string;
  photo_limit: number;
  album_code: string;
  is_active: boolean;
  created_at: string;
}

interface Photo {
  id: string;
  file_name: string;
  file_size: number;
  uploaded_at: string;
  device_id: string;
  url?: string;
}

interface AlbumGalleryProps {
  album: Album;
  onBack: () => void;
  onUpdate: (updatedAlbum: Album) => void;
  onDelete: () => void;
}

const AlbumGallery = ({ album: initialAlbum, onBack, onUpdate, onDelete }: AlbumGalleryProps) => {
  const [album, setAlbum] = useState(initialAlbum);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [uploadStats, setUploadStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [activeTab, setActiveTab] = useState('gallery');
  const [showQRCode, setShowQRCode] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadPhotos();
    loadUploadStats();
  }, [album.id]);

  const loadPhotos = async () => {
    try {
      const { data: photosData, error } = await supabase
        .from('photos')
        .select('*')
        .eq('album_id', album.id)
        .order('uploaded_at', { ascending: false });

      if (error) {
        console.error('Error loading photos:', error);
        toast({
          title: "Ошибка",
          description: "Не удалось загрузить фотографии",
          variant: "destructive"
        });
        return;
      }

      const photosWithUrls = await Promise.all(
        (photosData || []).map(async (photo) => {
          try {
            const { data } = supabase.storage
              .from('wedding-photos')
              .getPublicUrl(photo.file_name);
            
            return {
              ...photo,
              url: data.publicUrl
            };
          } catch (error) {
            console.error('Error getting photo URL:', error);
            return photo;
          }
        })
      );

      setPhotos(photosWithUrls);
      setLoading(false);
    } catch (error) {
      console.error('Error in loadPhotos:', error);
      setLoading(false);
    }
  };

  const loadUploadStats = async () => {
    try {
      const { data, error } = await supabase
        .from('upload_limits')
        .select('device_id, upload_count, last_upload')
        .eq('album_id', album.id)
        .order('last_upload', { ascending: false });

      if (error) {
        console.error('Error loading upload stats:', error);
        return;
      }

      setUploadStats(data || []);
    } catch (error) {
      console.error('Error in loadUploadStats:', error);
    }
  };

  const handleAlbumUpdate = (updatedAlbum: Album) => {
    setAlbum(updatedAlbum);
    onUpdate(updatedAlbum);
  };

  const handleDeletePhoto = async (photo: Photo) => {
    try {
      console.log('Deleting photo:', photo);
      
      // First delete from database
      const { error: dbError } = await supabase
        .from('photos')
        .delete()
        .eq('id', photo.id);

      if (dbError) {
        console.error('Error deleting from database:', dbError);
        toast({
          title: "Ошибка",
          description: "Не удалось удалить фотографию из базы данных",
          variant: "destructive"
        });
        return;
      }

      // Then delete from storage
      const { error: storageError } = await supabase.storage
        .from('wedding-photos')
        .remove([photo.file_name]);

      if (storageError) {
        console.error('Error deleting from storage:', storageError);
        // Continue anyway as the DB record is already deleted
        toast({
          title: "Предупреждение",
          description: "Фото удалено из альбома, но могло остаться в хранилище",
        });
      }

      // Update upload limits
      const deviceStat = uploadStats.find(s => s.device_id === photo.device_id);
      if (deviceStat && deviceStat.upload_count > 0) {
        const { error: limitError } = await supabase
          .from('upload_limits')
          .update({
            upload_count: deviceStat.upload_count - 1
          })
          .eq('album_id', album.id)
          .eq('device_id', photo.device_id);

        if (limitError) {
          console.error('Error updating upload limits:', limitError);
        }
      }

      // Update UI
      setPhotos(prev => prev.filter(p => p.id !== photo.id));
      setSelectedPhoto(null);
      loadUploadStats();
      
      toast({
        title: "Фото удалено",
        description: "Фотография успешно удалена",
      });
    } catch (error) {
      console.error('Error in handleDeletePhoto:', error);
      toast({
        title: "Ошибка",
        description: "Произошла ошибка при удалении фото",
        variant: "destructive"
      });
    }
  };

  const copyAlbumLink = () => {
    const link = `${window.location.origin}/guest/${album.album_code}`;
    navigator.clipboard.writeText(link);
    toast({
      title: "Ссылка скопирована!",
      description: "Поделитесь этой ссылкой с гостями",
    });
  };

  const generateQRCode = () => {
    const link = `${window.location.origin}/guest/${album.album_code}`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(link)}`;
    return qrUrl;
  };

  const downloadQRCode = () => {
    const qrUrl = generateQRCode();
    const link = document.createElement('a');
    link.href = qrUrl;
    link.download = `qr-${album.bride_name}-${album.groom_name}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: "QR-код загружен!",
      description: "QR-код сохранен в загрузки",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-orange-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-rose-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Загрузка...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-orange-50 py-8">
      <div className="container mx-auto px-4">
        <Button 
          variant="ghost" 
          onClick={onBack}
          className="mb-6 text-rose-600 hover:text-rose-700"
        >
          ← Назад к альбомам
        </Button>

        {/* Заголовок альбома */}
        <Card className="bg-white/70 backdrop-blur-sm border-rose-200 mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-3xl text-rose-700 mb-2">
                  <Heart className="inline mr-2 h-8 w-8" />
                  {album.bride_name} & {album.groom_name}
                </CardTitle>
                <div className="flex items-center space-x-4 text-gray-600">
                  <div className="flex items-center space-x-1">
                    <Calendar className="h-4 w-4" />
                    <span>{new Date(album.wedding_date).toLocaleDateString('ru-RU')}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Camera className="h-4 w-4" />
                    <span>{photos.length} фото</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Users className="h-4 w-4" />
                    <span>{uploadStats.length} гостей</span>
                  </div>
                </div>
              </div>
              <div className="flex space-x-2">
                <Button
                  onClick={() => setShowQRCode(true)}
                  variant="outline"
                  className="border-rose-300 text-rose-600 hover:bg-rose-50"
                >
                  <QrCode className="mr-2 h-4 w-4" />
                  QR-код
                </Button>
                <Button
                  onClick={copyAlbumLink}
                  className="bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600"
                >
                  <Users className="mr-2 h-4 w-4" />
                  Поделиться ссылкой
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Вкладки */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 bg-white/70 backdrop-blur-sm border-rose-200">
            <TabsTrigger value="gallery" className="flex items-center space-x-2">
              <Images className="h-4 w-4" />
              <span>Галерея</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center space-x-2">
              <Settings className="h-4 w-4" />
              <span>Настройки</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="gallery" className="mt-6">
            {photos.length === 0 ? (
              <Card className="bg-white/70 backdrop-blur-sm border-rose-200">
                <CardContent className="text-center py-12">
                  <Camera className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-700 mb-2">
                    Пока нет фотографий
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Поделитесь ссылкой с гостями, чтобы они могли загружать фото
                  </p>
                  <Button
                    onClick={copyAlbumLink}
                    className="bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600"
                  >
                    <Users className="mr-2 h-4 w-4" />
                    Поделиться ссылкой
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {photos.map((photo) => (
                  <Card 
                    key={photo.id}
                    className="bg-white/70 backdrop-blur-sm border-rose-200 overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer group"
                    onClick={() => setSelectedPhoto(photo)}
                  >
                    <div className="aspect-square relative">
                      {photo.url ? (
                        <img
                          src={photo.url}
                          alt="Wedding photo"
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                          <Camera className="h-8 w-8 text-gray-400" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-300 flex items-center justify-center">
                        <Eye className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      </div>
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeletePhoto(photo);
                        }}
                        variant="destructive"
                        size="sm"
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                      >
                        ×
                      </Button>
                    </div>
                    <CardContent className="p-2">
                      <p className="text-xs text-gray-500">
                        {new Date(photo.uploaded_at).toLocaleDateString('ru-RU')}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="settings" className="mt-6">
            <AlbumSettings 
              album={album}
              onUpdate={handleAlbumUpdate}
              onDelete={onDelete}
            />
            
            {/* Статистика гостей */}
            {uploadStats.length > 0 && (
              <Card className="bg-white/70 backdrop-blur-sm border-rose-200 mt-6">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Users className="h-5 w-5 text-rose-500" />
                    <span>Статистика гостей</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {uploadStats.map((stat, index) => (
                      <div key={stat.device_id} className="flex items-center justify-between p-3 bg-rose-50 rounded-lg">
                        <div>
                          <p className="font-medium">Гость #{index + 1}</p>
                          <p className="text-sm text-gray-600">
                            Последняя загрузка: {new Date(stat.last_upload).toLocaleDateString('ru-RU')}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-rose-600">{stat.upload_count}/{album.photo_limit}</p>
                          <p className="text-sm text-gray-600">фото</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* QR Code Modal */}
        {showQRCode && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4"
            onClick={() => setShowQRCode(false)}
          >
            <div className="bg-white rounded-lg p-8 max-w-md w-full text-center" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-2xl font-bold text-gray-800 mb-4">QR-код для гостей</h3>
              <div className="mb-4">
                <img
                  src={generateQRCode()}
                  alt="QR Code"
                  className="mx-auto rounded-lg shadow-lg"
                />
              </div>
              <div className="mb-6">
                <p className="text-lg font-semibold text-rose-600 mb-2">
                  {album.bride_name} & {album.groom_name}
                </p>
                <p className="text-sm text-gray-600">
                  Отсканируйте QR-код для загрузки фото
                </p>
              </div>
              <div className="flex space-x-2">
                <Button
                  onClick={downloadQRCode}
                  className="flex-1 bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Скачать
                </Button>
                <Button
                  onClick={() => setShowQRCode(false)}
                  variant="outline"
                  className="flex-1"
                >
                  Закрыть
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Модальное окно для просмотра фото */}
        {selectedPhoto && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedPhoto(null)}
          >
            <div className="max-w-4xl max-h-full relative">
              <img
                src={selectedPhoto.url}
                alt="Wedding photo"
                className="max-w-full max-h-full object-contain"
              />
              <Button
                onClick={() => setSelectedPhoto(null)}
                variant="ghost"
                size="sm"
                className="absolute top-4 right-4 text-white hover:bg-white hover:bg-opacity-20"
              >
                ✕
              </Button>
              <Button
                onClick={() => handleDeletePhoto(selectedPhoto)}
                variant="destructive"
                size="sm"
                className="absolute bottom-4 right-4"
              >
                Удалить фото
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AlbumGallery;
