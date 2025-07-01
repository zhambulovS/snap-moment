
import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Camera, Heart, Calendar, Upload, Play, Pause, Volume2, VolumeX } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useParams } from 'react-router-dom';

interface Album {
  id: string;
  bride_name: string;
  groom_name: string;
  wedding_date: string;
  description: string;
  photo_limit: number;
  album_code: string;
  is_active: boolean;
}

interface MediaFile {
  id: string;
  file_name: string;
  file_size: number;
  file_type: string;
  duration?: number;
  uploaded_at: string;
  device_id: string;
  url?: string;
  thumbnail_url?: string;
}

const PublicAlbumView = () => {
  const { albumCode } = useParams<{ albumCode: string }>();
  const [album, setAlbum] = useState<Album | null>(null);
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMedia, setSelectedMedia] = useState<MediaFile | null>(null);
  const [playingVideo, setPlayingVideo] = useState<string | null>(null);
  const [videoMuted, setVideoMuted] = useState(false);
  const { toast } = useToast();

  const loadAlbum = useCallback(async () => {
    if (!albumCode) return;

    try {
      const { data: albumData, error: albumError } = await supabase
        .from('albums')
        .select('*')
        .eq('album_code', albumCode)
        .eq('is_active', true)
        .single();

      if (albumError) {
        console.error('Error loading album:', albumError);
        toast({
          title: "Альбом не найден",
          description: "Проверьте правильность ссылки",
          variant: "destructive"
        });
        setLoading(false);
        return;
      }

      setAlbum(albumData);

      // Load media files
      const { data: mediaData, error: mediaError } = await supabase
        .from('photos')
        .select('*')
        .eq('album_id', albumData.id)
        .order('uploaded_at', { ascending: false });

      if (mediaError) {
        console.error('Error loading media:', mediaError);
        toast({
          title: "Ошибка",
          description: "Не удалось загрузить медиафайлы",
          variant: "destructive"
        });
        setLoading(false);
        return;
      }

      const mediaWithUrls = await Promise.all(
        (mediaData || []).map(async (media) => {
          try {
            const { data } = supabase.storage
              .from('wedding-media')
              .getPublicUrl(media.storage_path || media.file_name);
            
            return {
              ...media,
              url: data.publicUrl
            };
          } catch (error) {
            console.error('Error getting media URL:', error);
            return media;
          }
        })
      );

      setMediaFiles(mediaWithUrls);
      setLoading(false);
    } catch (error) {
      console.error('Error in loadAlbum:', error);
      setLoading(false);
    }
  }, [albumCode, toast]);

  useEffect(() => {
    loadAlbum();
  }, [loadAlbum]);

  const handleVideoPlay = (mediaId: string) => {
    setPlayingVideo(mediaId);
  };

  const handleVideoPause = () => {
    setPlayingVideo(null);
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
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-orange-50 flex items-center justify-center">
        <Card className="bg-white/70 backdrop-blur-sm border-rose-200 max-w-md">
          <CardContent className="text-center py-12">
            <Heart className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              Альбом не найден
            </h3>
            <p className="text-gray-600">
              Проверьте правильность ссылки или QR-кода
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-orange-50 py-8">
      <div className="container mx-auto px-4">
        {/* Album Header */}
        <Card className="bg-white/70 backdrop-blur-sm border-rose-200 mb-8">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl text-rose-700 mb-2">
              <Heart className="inline mr-2 h-8 w-8" />
              {album.bride_name} & {album.groom_name}
            </CardTitle>
            <div className="flex items-center justify-center space-x-4 text-gray-600">
              <div className="flex items-center space-x-1">
                <Calendar className="h-4 w-4" />
                <span>{new Date(album.wedding_date).toLocaleDateString('ru-RU')}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Camera className="h-4 w-4" />
                <span>{mediaFiles.length} медиафайлов</span>
              </div>
            </div>
            {album.description && (
              <p className="text-gray-600 mt-4">{album.description}</p>
            )}
            <Button
              onClick={() => window.location.href = `/guest/${album.album_code}/upload`}
              className="mt-4 bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600"
            >
              <Upload className="mr-2 h-4 w-4" />
              Загрузить фото/видео
            </Button>
          </CardHeader>
        </Card>

        {/* Media Gallery */}
        {mediaFiles.length === 0 ? (
          <Card className="bg-white/70 backdrop-blur-sm border-rose-200">
            <CardContent className="text-center py-12">
              <Camera className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">
                Пока нет медиафайлов
              </h3>
              <p className="text-gray-600 mb-4">
                Станьте первым, кто поделится воспоминаниями!
              </p>
              <Button
                onClick={() => window.location.href = `/guest/${album.album_code}/upload`}
                className="bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600"
              >
                <Upload className="mr-2 h-4 w-4" />
                Загрузить фото/видео
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {mediaFiles.map((media) => (
              <Card 
                key={media.id}
                className="bg-white/70 backdrop-blur-sm border-rose-200 overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer group"
                onClick={() => setSelectedMedia(media)}
              >
                <div className="aspect-square relative">
                  {media.file_type === 'video' ? (
                    <div className="w-full h-full bg-black flex items-center justify-center relative">
                      <video
                        className="w-full h-full object-cover"
                        muted
                        loop
                        onMouseEnter={(e) => e.currentTarget.play()}
                        onMouseLeave={(e) => e.currentTarget.pause()}
                      >
                        <source src={media.url} type="video/mp4" />
                      </video>
                      <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center">
                        <Play className="h-12 w-12 text-white opacity-80" />
                      </div>
                      <div className="absolute bottom-2 right-2 bg-black/50 text-white px-2 py-1 rounded text-xs">
                        {media.duration ? `${Math.floor(media.duration / 60)}:${String(media.duration % 60).padStart(2, '0')}` : 'Видео'}
                      </div>
                    </div>
                  ) : (
                    <img
                      src={media.url}
                      alt="Wedding media"
                      className="w-full h-full object-cover"
                      loading="lazy"
                      onError={(e) => {
                        console.error('Failed to load image:', media.url);
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  )}
                </div>
                <CardContent className="p-2">
                  <p className="text-xs text-gray-500 truncate">
                    {new Date(media.uploaded_at).toLocaleDateString('ru-RU')} {new Date(media.uploaded_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Media Modal */}
        {selectedMedia && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedMedia(null)}
          >
            <div className="max-w-4xl max-h-full relative">
              {selectedMedia.file_type === 'video' ? (
                <video
                  controls
                  autoPlay
                  muted={videoMuted}
                  className="max-w-full max-h-full object-contain rounded-lg"
                  onClick={(e) => e.stopPropagation()}
                >
                  <source src={selectedMedia.url} type="video/mp4" />
                </video>
              ) : (
                <img
                  src={selectedMedia.url}
                  alt="Wedding media"
                  className="max-w-full max-h-full object-contain rounded-lg"
                />
              )}
              
              <Button
                onClick={() => setSelectedMedia(null)}
                variant="ghost"
                size="sm"
                className="absolute top-4 right-4 text-white hover:bg-white hover:bg-opacity-20"
              >
                ✕
              </Button>
              
              {selectedMedia.file_type === 'video' && (
                <Button
                  onClick={() => setVideoMuted(!videoMuted)}
                  variant="ghost"
                  size="sm"
                  className="absolute top-4 left-4 text-white hover:bg-white hover:bg-opacity-20"
                >
                  {videoMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                </Button>
              )}
              
              <div className="absolute bottom-4 left-4 bg-black/50 text-white px-3 py-2 rounded-lg">
                <p className="text-sm">
                  {new Date(selectedMedia.uploaded_at).toLocaleDateString('ru-RU')} в {new Date(selectedMedia.uploaded_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                </p>
                <p className="text-xs opacity-80">
                  {selectedMedia.file_type === 'video' ? 'Видео' : 'Фото'} • {(selectedMedia.file_size / (1024 * 1024)).toFixed(1)} МБ
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PublicAlbumView;
