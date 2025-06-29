
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Camera, Heart, Users, Download, Share, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AlbumGalleryProps {
  album: any;
  onBack: () => void;
}

const AlbumGallery = ({ album, onBack }: AlbumGalleryProps) => {
  const [photos, setPhotos] = useState(album.photos || []);
  const [selectedPhoto, setSelectedPhoto] = useState<any>(null);
  const { toast } = useToast();

  // Refresh photos from localStorage
  useEffect(() => {
    const refreshPhotos = () => {
      const storedAlbum = JSON.parse(localStorage.getItem(`album_${album.id}`) || '{}');
      setPhotos(storedAlbum.photos || []);
    };

    refreshPhotos();
    const interval = setInterval(refreshPhotos, 2000); // Auto-refresh every 2 seconds
    return () => clearInterval(interval);
  }, [album.id]);

  const shareLink = `${window.location.origin}/guest/${album.id}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareLink);
    toast({
      title: "Ссылка скопирована! 📋",
      description: "Теперь поделитесь ей с гостями",
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-orange-50 py-8">
      <div className="container mx-auto px-4">
        <Button 
          variant="ghost" 
          onClick={onBack}
          className="mb-6 text-rose-600 hover:text-rose-700"
        >
          ← Назад к главной
        </Button>

        {/* Album Header */}
        <Card className="bg-white/70 backdrop-blur-sm border-rose-200 mb-8">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl text-rose-700 flex items-center justify-center">
              <Heart className="mr-3 h-8 w-8 text-pink-500" />
              Свадьба {album.brideName} и {album.groomName}
            </CardTitle>
            <CardDescription className="text-lg">
              {album.description && <p className="mb-2">{album.description}</p>}
              <p>Дата свадьбы: {formatDate(album.weddingDate)}</p>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-rose-600">{photos.length}</div>
                <div className="text-sm text-gray-600">Загруженных фото</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-rose-600">{album.photoLimit}</div>
                <div className="text-sm text-gray-600">Лимит на гостя</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-rose-600">
                  {new Set(photos.map((p: any) => p.deviceId)).size}
                </div>
                <div className="text-sm text-gray-600">Участников</div>
              </div>
            </div>
            
            <div className="mt-6 flex justify-center space-x-4">
              <Button
                onClick={handleCopyLink}
                className="bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600"
              >
                <Share className="mr-2 h-4 w-4" />
                Поделиться ссылкой
              </Button>
              
              {photos.length > 0 && (
                <Button variant="outline" className="border-rose-200 text-rose-600 hover:bg-rose-50">
                  <Download className="mr-2 h-4 w-4" />
                  Скачать все ({photos.length})
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Share Instructions */}
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 mb-8">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-blue-700 mb-1">Ссылка для гостей:</h3>
                <code className="text-sm bg-white px-3 py-1 rounded border text-blue-600">
                  weddingsnap.com/guest/{album.id}
                </code>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        {/* Photos Gallery */}
        {photos.length > 0 ? (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-800 text-center">
              Фотографии от ваших гостей
            </h2>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {photos.map((photo: any, index: number) => (
                <div
                  key={photo.id}
                  className="relative group cursor-pointer transform transition-all duration-300 hover:scale-105"
                  onClick={() => setSelectedPhoto(photo)}
                >
                  <img
                    src={photo.url}
                    alt={`Фото ${index + 1}`}
                    className="w-full h-48 object-cover rounded-lg border border-rose-200 shadow-sm"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300 rounded-lg flex items-center justify-center">
                    <Eye className="text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300 h-8 w-8" />
                  </div>
                  <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                    {new Date(photo.uploadedAt).toLocaleDateString('ru-RU')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <Card className="bg-white/70 backdrop-blur-sm border-rose-200">
            <CardContent className="py-12 text-center">
              <Camera className="mx-auto h-16 w-16 text-rose-300 mb-4" />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">
                Пока нет загруженных фото
              </h3>
              <p className="text-gray-600 mb-6">
                Поделитесь ссылкой с гостями, чтобы они могли загружать фотографии
              </p>
              <Button
                onClick={handleCopyLink}
                className="bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600"
              >
                <Share className="mr-2 h-4 w-4" />
                Скопировать ссылку для гостей
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Photo Modal */}
        {selectedPhoto && (
          <div 
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedPhoto(null)}
          >
            <div className="relative max-w-4xl max-h-full">
              <img
                src={selectedPhoto.url}
                alt="Увеличенное фото"
                className="max-w-full max-h-full object-contain rounded-lg"
              />
              <Button
                variant="outline"
                size="sm"
                className="absolute top-4 right-4 bg-white/90 hover:bg-white"
                onClick={() => setSelectedPhoto(null)}
              >
                ✕
              </Button>
              <div className="absolute bottom-4 left-4 bg-black/70 text-white px-3 py-2 rounded">
                Загружено: {new Date(selectedPhoto.uploadedAt).toLocaleString('ru-RU')}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AlbumGallery;
