import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Camera, Download, Heart, Users, Calendar, Eye, Settings, Images, QrCode, Trash2, Play, Volume2, VolumeX, Video } from 'lucide-react';
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

interface MediaFile {
  id: string;
  file_name: string;
  file_size: number;
  file_type: string;
  duration?: number;
  uploaded_at: string;
  device_id: string;
  storage_path?: string;
  url?: string;
  thumbnail_url?: string;
}

interface AlbumGalleryProps {
  album: Album;
  onBack: () => void;
  onUpdate: (updatedAlbum: Album) => void;
  onDelete: () => void;
}

const AlbumGallery = ({ album: initialAlbum, onBack, onUpdate, onDelete }: AlbumGalleryProps) => {
  const [album, setAlbum] = useState(initialAlbum);
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [uploadStats, setUploadStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMedia, setSelectedMedia] = useState<MediaFile | null>(null);
  const [activeTab, setActiveTab] = useState('gallery');
  const [showQRCode, setShowQRCode] = useState(false);
  const [deletingFiles, setDeletingFiles] = useState<Set<string>>(new Set());
  const [videoMuted, setVideoMuted] = useState(false);
  const { toast } = useToast();

  // Optimized photo loading with error handling
  const loadMediaFiles = useCallback(async () => {
    try {
      console.log('Loading media files for album:', album.id);
      
      const { data: mediaData, error } = await supabase
        .from('photos')
        .select('*')
        .eq('album_id', album.id)
        .order('uploaded_at', { ascending: false });

      if (error) {
        console.error('Error loading media files:', error);
        toast({
          title: "Ошибка",
          description: "Не удалось загрузить медиафайлы",
          variant: "destructive"
        });
        return;
      }

      if (!mediaData || mediaData.length === 0) {
        console.log('No media files found for album');
        setMediaFiles([]);
        setLoading(false);
        return;
      }

      // Batch process URLs to avoid overwhelming the browser
      const batchSize = 10;
      const mediaWithUrls: MediaFile[] = [];
      
      for (let i = 0; i < mediaData.length; i += batchSize) {
        const batch = mediaData.slice(i, i + batchSize);
        const batchWithUrls = await Promise.all(
          batch.map(async (media) => {
            try {
              // Use new storage bucket
              const { data } = supabase.storage
                .from('wedding-media')
                .getPublicUrl(media.storage_path || media.file_name);
              
              return {
                ...media,
                url: data.publicUrl
              };
            } catch (error) {
              console.error('Error getting media URL for:', media.file_name, error);
              return media;
            }
          })
        );
        mediaWithUrls.push(...batchWithUrls);
      }

      setMediaFiles(mediaWithUrls);
      setLoading(false);
    } catch (error) {
      console.error('Error in loadMediaFiles:', error);
      setLoading(false);
    }
  }, [album.id, toast]);

  // Optimized upload stats loading
  const loadUploadStats = useCallback(async () => {
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
  }, [album.id]);

  useEffect(() => {
    loadMediaFiles();
    loadUploadStats();
  }, [loadMediaFiles, loadUploadStats]);

  const handleAlbumUpdate = useCallback((updatedAlbum: Album) => {
    setAlbum(updatedAlbum);
    onUpdate(updatedAlbum);
  }, [onUpdate]);

  // Updated delete function for new storage bucket
  const handleDeleteMedia = useCallback(async (media: MediaFile) => {
    if (deletingFiles.has(media.id)) {
      console.log('Media already being deleted:', media.id);
      return;
    }
    
    setDeletingFiles(prev => new Set(prev).add(media.id));
    
    try {
      console.log('Starting deletion process for media:', media.id, media.file_name);
      
      // First, try to delete from storage
      const { error: storageError } = await supabase.storage
        .from('wedding-media')
        .remove([media.storage_path || media.file_name]);

      if (storageError) {
        console.error('Storage deletion error:', storageError);
        // Continue with database deletion even if storage fails
      }

      // Delete from database
      const { error: dbError } = await supabase
        .from('photos')
        .delete()
        .eq('id', media.id);

      if (dbError) {
        console.error('Database deletion error:', dbError);
        throw new Error(`Не удалось удалить файл из базы данных: ${dbError.message}`);
      }

      console.log('Media deleted successfully from database');
      
      // Update upload limits - find the device and decrease count
      const deviceStat = uploadStats.find(s => s.device_id === media.device_id);
      if (deviceStat && deviceStat.upload_count > 0) {
        const { error: limitError } = await supabase
          .from('upload_limits')
          .update({
            upload_count: Math.max(0, deviceStat.upload_count - 1)
          })
          .eq('album_id', album.id)
          .eq('device_id', media.device_id);

        if (limitError) {
          console.error('Error updating upload limits:', limitError);
        }
      }

      // Update UI immediately
      setMediaFiles(prev => prev.filter(m => m.id !== media.id));
      setSelectedMedia(null);
      
      // Reload stats to ensure consistency
      loadUploadStats();
      
      toast({
        title: "Файл удален",
        description: "Медиафайл успешно удален",
      });
      
    } catch (error) {
      console.error('Error in handleDeleteMedia:', error);
      toast({
        title: "Ошибка удаления",
        description: error instanceof Error ? error.message : "Произошла ошибка при удалении файла",
        variant: "destructive"
      });
    } finally {
      setDeletingFiles(prev => {
        const newSet = new Set(prev);
        newSet.delete(media.id);
        return newSet;
      });
    }
  }, [deletingFiles, uploadStats, album.id, loadUploadStats, toast]);

  const copyAlbumLink = useCallback(() => {
    const link = `${window.location.origin}/guest/${album.album_code}`;
    navigator.clipboard.writeText(link);
    toast({
      title: "Ссылка скопирована!",
      description: "Поделитесь этой ссылкой с гостями",
    });
  }, [album.album_code, toast]);

  const generateQRCode = useCallback(() => {
    const link = `${window.location.origin}/guest/${album.album_code}`;
    return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(link)}`;
  }, [album.album_code]);

  const downloadQRCode = useCallback(() => {
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
  }, [generateQRCode, album.bride_name, album.groom_name, toast]);

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

        {/* Album Header */}
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
                    <span>{mediaFiles.length} медиафайлов</span>
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

        {/* Tabs */}
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
            {mediaFiles.length === 0 ? (
              <Card className="bg-white/70 backdrop-blur-sm border-rose-200">
                <CardContent className="text-center py-12">
                  <Camera className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-700 mb-2">
                    Пока нет медиафайлов
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Поделитесь ссылкой с гостями, чтобы они могли загружать фото и видео
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
                            <Video className="inline h-3 w-3 mr-1" />
                            {media.duration ? `${Math.floor(media.duration / 60)}:${String(media.duration % 60).padStart(2, '0')}` : 'Видео'}
                          </div>
                        </div>
                      ) : (
                        <>
                          {media.url ? (
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
                          ) : (
                            <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                              <Camera className="h-8 w-8 text-gray-400" />
                            </div>
                          )}
                        </>
                      )}
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-300 flex items-center justify-center">
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex space-x-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            className="bg-white/80 text-gray-800 hover:bg-white"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteMedia(media);
                            }}
                            variant="destructive"
                            size="sm"
                            disabled={deletingFiles.has(media.id)}
                            className="bg-red-500/80 hover:bg-red-600"
                          >
                            {deletingFiles.has(media.id) ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
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
          </TabsContent>

          <TabsContent value="settings" className="mt-6">
            <AlbumSettings 
              album={album}
              onUpdate={handleAlbumUpdate}
              onDelete={onDelete}
            />
            
            {/* Guest Statistics */}
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
                          <p className="text-sm text-gray-600">файлов</p>
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
                  Отсканируйте QR-код для загрузки фото и видео
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
              
              <div className="absolute bottom-4 right-4 flex space-x-2">
                <Button
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = selectedMedia.url!;
                    link.download = selectedMedia.file_name;
                    link.click();
                  }}
                  variant="secondary"
                  size="sm"
                  className="bg-white/80 text-gray-800 hover:bg-white"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Скачать
                </Button>
                <Button
                  onClick={() => handleDeleteMedia(selectedMedia)}
                  variant="destructive"
                  size="sm"
                  disabled={deletingFiles.has(selectedMedia.id)}
                >
                  {deletingFiles.has(selectedMedia.id) ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  ) : (
                    <Trash2 className="mr-2 h-4 w-4" />
                  )}
                  Удалить
                </Button>
              </div>
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

export default AlbumGallery;
