
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Camera, Download, Heart, Users, Calendar, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Album {
  id: string;
  bride_name: string;
  groom_name: string;
  wedding_date: string;
  description: string;
  photo_limit: number;
  album_code: string;
}

interface Photo {
  id: string;
  file_name: string;
  file_size: number;
  uploaded_at: string;
  url?: string;
}

interface AlbumGalleryProps {
  album: Album;
  onBack: () => void;
}

const AlbumGallery = ({ album, onBack }: AlbumGalleryProps) => {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadPhotos();
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

      // Получаем публичные URL для фотографий
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
      toast({
        title: "Ошибка",
        description: "Произошла ошибка при загрузке фотографий",
        variant: "destructive"
      });
    }
  };

  const handleDownloadAll = async () => {
    toast({
      title: "Скачивание",
      description: "Функция скачивания всех фото будет реализована в следующей версии",
    });
  };

  const copyAlbumLink = () => {
    const link = `${window.location.origin}/guest/${album.album_code}`;
    navigator.clipboard.writeText(link);
    toast({
      title: "Ссылка скопирована!",
      description: "Поделитесь этой ссылкой с гостями",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-orange-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-rose-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Загрузка фотографий...</p>
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

        {/* Информация об альбоме */}
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
                </div>
                {album.description && (
                  <p className="text-gray-600 mt-2">{album.description}</p>
                )}
              </div>
              <div className="text-right space-y-2">
                <Button
                  onClick={copyAlbumLink}
                  className="bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600"
                >
                  <Users className="mr-2 h-4 w-4" />
                  Поделиться ссылкой
                </Button>
                <br />
                <Button
                  onClick={handleDownloadAll}
                  variant="outline"
                  className="border-rose-200 text-rose-600 hover:bg-rose-50"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Скачать все
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Галерея фотографий */}
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
                className="bg-white/70 backdrop-blur-sm border-rose-200 overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer"
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
                  <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-20 transition-all duration-300 flex items-center justify-center">
                    <Eye className="h-6 w-6 text-white opacity-0 hover:opacity-100 transition-opacity duration-300" />
                  </div>
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

        {/* Модальное окно для просмотра фото */}
        {selectedPhoto && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedPhoto(null)}
          >
            <div className="max-w-4xl max-h-full">
              <img
                src={selectedPhoto.url}
                alt="Wedding photo"
                className="max-w-full max-h-full object-contain"
              />
            </div>
            <Button
              onClick={() => setSelectedPhoto(null)}
              variant="ghost"
              size="sm"
              className="absolute top-4 right-4 text-white hover:bg-white hover:bg-opacity-20"
            >
              ✕
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AlbumGallery;
