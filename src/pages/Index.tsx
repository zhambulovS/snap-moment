
import React from 'react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Camera, Heart, Users, Upload, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import GuestPhotoUpload from '@/components/GuestPhotoUpload';
import AlbumGallery from '@/components/AlbumGallery';

const Index = () => {
  const [currentView, setCurrentView] = useState<'home' | 'create' | 'album' | 'guest'>('home');
  const [albumData, setAlbumData] = useState<any>(null);
  const [guestAlbumId, setGuestAlbumId] = useState<string>('');
  const { toast } = useToast();

  const handleCreateAlbum = (formData: any) => {
    const albumId = Math.random().toString(36).substring(2, 15);
    const newAlbum = {
      id: albumId,
      ...formData,
      photos: [],
      uploadCounts: new Map(),
      createdAt: new Date().toISOString()
    };
    
    // Store in localStorage for demo purposes
    localStorage.setItem(`album_${albumId}`, JSON.stringify(newAlbum));
    setAlbumData(newAlbum);
    setCurrentView('album');
    
    toast({
      title: "Альбом создан! 🎉",
      description: `Поделитесь ссылкой с гостями: weddingsnap.com/guest/${albumId}`,
    });
  };

  const handleGuestAccess = (albumId: string) => {
    const storedAlbum = localStorage.getItem(`album_${albumId}`);
    if (storedAlbum) {
      setAlbumData(JSON.parse(storedAlbum));
      setGuestAlbumId(albumId);
      setCurrentView('guest');
    } else {
      toast({
        title: "Альбом не найден",
        description: "Проверьте правильность ссылки",
        variant: "destructive"
      });
    }
  };

  if (currentView === 'create') {
    return <CreateAlbumForm onSubmit={handleCreateAlbum} onBack={() => setCurrentView('home')} />;
  }

  if (currentView === 'album' && albumData) {
    return <AlbumGallery album={albumData} onBack={() => setCurrentView('home')} />;
  }

  if (currentView === 'guest' && albumData) {
    return <GuestPhotoUpload album={albumData} albumId={guestAlbumId} onBack={() => setCurrentView('home')} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-orange-50">
      {/* Header */}
      <header className="relative overflow-hidden bg-white/70 backdrop-blur-sm border-b border-rose-200">
        <div className="absolute inset-0 bg-gradient-to-r from-rose-100/50 to-pink-100/50"></div>
        <div className="relative container mx-auto px-4 py-8">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <Camera className="h-8 w-8 text-rose-500" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-rose-600 to-pink-600 bg-clip-text text-transparent">
              WeddingSnap
            </h1>
            <Heart className="h-6 w-6 text-pink-500 animate-pulse" />
          </div>
          <p className="text-center text-lg text-gray-600 max-w-2xl mx-auto">
            Соберите все фотографии со своей свадьбы в одном месте. Ваши гости легко загрузят фото без установки приложений.
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center space-x-8 mb-8">
            <Button
              onClick={() => setCurrentView('create')}
              size="lg"
              className="bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white px-8 py-6 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
            >
              <Heart className="mr-2 h-5 w-5" />
              Создать альбом
            </Button>
            
            <div className="text-gray-500">или</div>
            
            <GuestAccessForm onAccess={handleGuestAccess} />
          </div>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <Card className="border-rose-200 hover:shadow-lg transition-all duration-300 transform hover:scale-105 bg-white/70 backdrop-blur-sm">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-gradient-to-br from-rose-100 to-pink-100 rounded-full flex items-center justify-center mb-4">
                <Users className="h-8 w-8 text-rose-500" />
              </div>
              <CardTitle className="text-rose-700">Для гостей</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 text-center">
                Гости загружают фото прямо из браузера без регистрации и установки приложений
              </p>
            </CardContent>
          </Card>

          <Card className="border-rose-200 hover:shadow-lg transition-all duration-300 transform hover:scale-105 bg-white/70 backdrop-blur-sm">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-gradient-to-br from-rose-100 to-pink-100 rounded-full flex items-center justify-center mb-4">
                <Upload className="h-8 w-8 text-rose-500" />
              </div>
              <CardTitle className="text-rose-700">Простая загрузка</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 text-center">
                Интуитивный интерфейс позволяет быстро загружать фото с любого устройства
              </p>
            </CardContent>
          </Card>

          <Card className="border-rose-200 hover:shadow-lg transition-all duration-300 transform hover:scale-105 bg-white/70 backdrop-blur-sm">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-gradient-to-br from-rose-100 to-pink-100 rounded-full flex items-center justify-center mb-4">
                <Download className="h-8 w-8 text-rose-500" />
              </div>
              <CardTitle className="text-rose-700">Все в одном месте</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 text-center">
                Все фотографии автоматически собираются в вашем альбоме для удобного просмотра
              </p>
            </CardContent>
          </Card>
        </div>

        {/* How it works */}
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-800 mb-8">Как это работает?</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="space-y-4">
              <div className="w-12 h-12 bg-gradient-to-br from-rose-500 to-pink-500 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto">
                1
              </div>
              <h3 className="text-xl font-semibold text-gray-700">Создайте альбом</h3>
              <p className="text-gray-600">Укажите название свадьбы и получите уникальную ссылку</p>
            </div>
            
            <div className="space-y-4">
              <div className="w-12 h-12 bg-gradient-to-br from-rose-500 to-pink-500 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto">
                2
              </div>
              <h3 className="text-xl font-semibold text-gray-700">Поделитесь ссылкой</h3>
              <p className="text-gray-600">Отправьте ссылку гостям или разместите QR-код на столах</p>
            </div>
            
            <div className="space-y-4">
              <div className="w-12 h-12 bg-gradient-to-br from-rose-500 to-pink-500 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto">
                3
              </div>
              <h3 className="text-xl font-semibold text-gray-700">Наслаждайтесь результатом</h3>
              <p className="text-gray-600">Все фото автоматически появятся в вашем альбоме</p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white/70 backdrop-blur-sm border-t border-rose-200 py-8">
        <div className="container mx-auto px-4 text-center">
          <p className="text-gray-600">
            © 2024 WeddingSnap. Сделано с ❤️ для особенных моментов
          </p>
        </div>
      </footer>
    </div>
  );
};

const CreateAlbumForm = ({ onSubmit, onBack }: { onSubmit: (data: any) => void; onBack: () => void }) => {
  const [formData, setFormData] = useState({
    brideName: '',
    groomName: '',
    description: '',
    photoLimit: 5,
    weddingDate: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-orange-50 py-12">
      <div className="container mx-auto px-4 max-w-2xl">
        <Button 
          variant="ghost" 
          onClick={onBack}
          className="mb-6 text-rose-600 hover:text-rose-700"
        >
          ← Назад
        </Button>
        
        <Card className="bg-white/70 backdrop-blur-sm border-rose-200">
          <CardHeader>
            <CardTitle className="text-2xl text-center text-rose-700">
              <Heart className="inline mr-2 h-6 w-6" />
              Создание свадебного альбома
            </CardTitle>
            <CardDescription className="text-center">
              Заполните информацию о вашей свадьбе
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="brideName">Имя невесты</Label>
                  <Input
                    id="brideName"
                    value={formData.brideName}
                    onChange={(e) => setFormData({...formData, brideName: e.target.value})}
                    placeholder="Айнура"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="groomName">Имя жениха</Label>
                  <Input
                    id="groomName"
                    value={formData.groomName}
                    onChange={(e) => setFormData({...formData, groomName: e.target.value})}
                    placeholder="Али"
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="weddingDate">Дата свадьбы</Label>
                <Input
                  id="weddingDate"
                  type="date"
                  value={formData.weddingDate}
                  onChange={(e) => setFormData({...formData, weddingDate: e.target.value})}
                  required
                />
              </div>

              <div>
                <Label htmlFor="description">Описание (необязательно)</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="Расскажите немного о вашей особенной дате..."
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="photoLimit">Лимит фото на гостя</Label>
                <Input
                  id="photoLimit"
                  type="number"
                  min="1"
                  max="20"
                  value={formData.photoLimit}
                  onChange={(e) => setFormData({...formData, photoLimit: parseInt(e.target.value)})}
                />
              </div>

              <Button 
                type="submit" 
                className="w-full bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600"
                size="lg"
              >
                <Camera className="mr-2 h-5 w-5" />
                Создать альбом
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

const GuestAccessForm = ({ onAccess }: { onAccess: (albumId: string) => void }) => {
  const [albumId, setAlbumId] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (albumId.trim()) {
      onAccess(albumId.trim());
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center space-x-2">
      <Input
        placeholder="Введите ID альбома"
        value={albumId}
        onChange={(e) => setAlbumId(e.target.value)}
        className="border-rose-200 focus:border-rose-400"
      />
      <Button 
        type="submit"
        variant="outline"
        className="border-rose-200 text-rose-600 hover:bg-rose-50"
      >
        Войти как гость
      </Button>
    </form>
  );
};

export default Index;
