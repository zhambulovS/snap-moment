
import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Camera, Upload, Heart, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface GuestPhotoUploadProps {
  album: any;
  albumId: string;
  onBack: () => void;
}

const GuestPhotoUpload = ({ album, albumId, onBack }: GuestPhotoUploadProps) => {
  const [uploadedPhotos, setUploadedPhotos] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Simulate device ID for demo
  const deviceId = localStorage.getItem('deviceId') || Math.random().toString(36).substring(2, 15);
  if (!localStorage.getItem('deviceId')) {
    localStorage.setItem('deviceId', deviceId);
  }

  // Get current upload count for this device
  const currentUploads = parseInt(localStorage.getItem(`uploads_${albumId}_${deviceId}`) || '0');
  const remainingUploads = Math.max(0, album.photoLimit - currentUploads);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const validFiles = files.filter(file => file.type.startsWith('image/'));
    
    if (validFiles.length + currentUploads > album.photoLimit) {
      toast({
        title: "Превышен лимит",
        description: `Вы можете загрузить ещё только ${remainingUploads} фото`,
        variant: "destructive"
      });
      return;
    }

    setUploadedPhotos(validFiles);
  };

  const handleUpload = async () => {
    if (uploadedPhotos.length === 0) return;

    setIsUploading(true);
    
    // Simulate upload delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Update album data
    const storedAlbum = JSON.parse(localStorage.getItem(`album_${albumId}`) || '{}');
    const newPhotos = uploadedPhotos.map(file => ({
      id: Math.random().toString(36).substring(2, 15),
      name: file.name,
      size: file.size,
      uploadedAt: new Date().toISOString(),
      deviceId: deviceId,
      url: URL.createObjectURL(file) // In real app, this would be a server URL
    }));

    storedAlbum.photos = [...(storedAlbum.photos || []), ...newPhotos];
    localStorage.setItem(`album_${albumId}`, JSON.stringify(storedAlbum));

    // Update upload count
    const newCount = currentUploads + uploadedPhotos.length;
    localStorage.setItem(`uploads_${albumId}_${deviceId}`, newCount.toString());

    setIsUploading(false);
    setUploadedPhotos([]);
    
    toast({
      title: "Фото загружены! 📸",
      description: `Загружено ${uploadedPhotos.length} фото. Спасибо за участие!`,
    });

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const canUploadMore = remainingUploads > 0;

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
            <CardTitle className="text-2xl text-rose-700 flex items-center justify-center">
              <Heart className="mr-2 h-6 w-6 text-pink-500" />
              Свадьба {album.brideName} и {album.groomName}
            </CardTitle>
            <CardDescription>
              {album.description && <p className="mb-2">{album.description}</p>}
              <p>Дата: {new Date(album.weddingDate).toLocaleDateString('ru-RU')}</p>
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="bg-white/70 backdrop-blur-sm border-rose-200">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-rose-100 to-pink-100 rounded-full flex items-center justify-center mb-4">
              <Camera className="h-8 w-8 text-rose-500" />
            </div>
            <CardTitle className="text-xl text-rose-700">Загрузка фотографий</CardTitle>
            <CardDescription>
              {canUploadMore ? (
                <>Вы можете загрузить ещё <strong>{remainingUploads}</strong> из {album.photoLimit} фото</>
              ) : (
                <span className="text-green-600 font-semibold">
                  <Check className="inline w-4 h-4 mr-1" />
                  Вы уже загрузили максимальное количество фото. Спасибо!
                </span>
              )}
            </CardDescription>
          </CardHeader>
          
          {canUploadMore && (
            <CardContent className="space-y-6">
              <div className="border-2 border-dashed border-rose-200 rounded-lg p-8 text-center hover:border-rose-300 transition-colors">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="photo-upload"
                />
                <label htmlFor="photo-upload" className="cursor-pointer">
                  <Upload className="mx-auto h-12 w-12 text-rose-400 mb-4" />
                  <p className="text-lg font-medium text-gray-700 mb-2">
                    Нажмите для выбора фото
                  </p>
                  <p className="text-sm text-gray-500">
                    Или перетащите файлы сюда
                  </p>
                </label>
              </div>

              {uploadedPhotos.length > 0 && (
                <div className="space-y-4">
                  <h3 className="font-medium text-gray-700">Выбранные фото ({uploadedPhotos.length}):</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {uploadedPhotos.map((file, index) => (
                      <div key={index} className="relative">
                        <img
                          src={URL.createObjectURL(file)}
                          alt={`Preview ${index + 1}`}
                          className="w-full h-24 object-cover rounded-lg border border-rose-200"
                        />
                        <div className="absolute bottom-1 left-1 bg-black/70 text-white text-xs px-2 py-1 rounded">
                          {Math.round(file.size / 1024)}KB
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <Button
                    onClick={handleUpload}
                    disabled={isUploading}
                    className="w-full bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600"
                    size="lg"
                  >
                    {isUploading ? (
                      <>Загружаем... ⏳</>
                    ) : (
                      <>
                        <Upload className="mr-2 h-5 w-5" />
                        Загрузить {uploadedPhotos.length} фото
                      </>
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          )}
        </Card>

        <div className="text-center mt-6 text-sm text-gray-600">
          💕 Спасибо, что делитесь особенными моментами!
        </div>
      </div>
    </div>
  );
};

export default GuestPhotoUpload;
