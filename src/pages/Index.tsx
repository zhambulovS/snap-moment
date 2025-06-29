import React from 'react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Camera, Heart, Users, Upload, Download, LogOut } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import AuthPage from '@/components/AuthPage';
import GuestPhotoUpload from '@/components/GuestPhotoUpload';
import AlbumGallery from '@/components/AlbumGallery';
import { supabase } from '@/integrations/supabase/client';
import { generateAlbumCode } from '@/utils/albumCode';

interface Album {
  id: string;
  bride_name: string;
  groom_name: string;
  wedding_date: string;
  description: string;
  photo_limit: number;
  album_code: string;
  created_at: string;
}

const Index = () => {
  const { user, loading: authLoading, signOut } = useAuth();
  const [currentView, setCurrentView] = useState<'home' | 'create' | 'album' | 'guest'>('home');
  const [selectedAlbum, setSelectedAlbum] = useState<Album | null>(null);
  const [guestAlbumCode, setGuestAlbumCode] = useState<string>('');
  const [userAlbums, setUserAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  React.useEffect(() => {
    if (user && currentView === 'home') {
      loadUserAlbums();
    }
  }, [user, currentView]);

  const loadUserAlbums = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('albums')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading albums:', error);
        toast({
          title: "Ошибка",
          description: "Не удалось загрузить альбомы",
          variant: "destructive"
        });
        return;
      }

      setUserAlbums(data || []);
    } catch (error) {
      console.error('Error in loadUserAlbums:', error);
    }
    setLoading(false);
  };

  const handleCreateAlbum = async (formData: any) => {
    if (!user) return;

    setLoading(true);
    try {
      const albumCode = generateAlbumCode();
      
      const { data, error } = await supabase
        .from('albums')
        .insert({
          user_id: user.id,
          bride_name: formData.brideName,
          groom_name: formData.groomName,
          wedding_date: formData.weddingDate,
          description: formData.description,
          photo_limit: formData.photoLimit,
          album_code: albumCode,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating album:', error);
        toast({
          title: "Ошибка",
          description: "Не удалось создать альбом",
          variant: "destructive"
        });
        return;
      }

      setSelectedAlbum(data);
      setCurrentView('album');
      
      toast({
        title: "Альбом создан! 🎉",
        description: `Код альбома: ${albumCode}`,
      });
    } catch (error) {
      console.error('Error in handleCreateAlbum:', error);
      toast({
        title: "Ошибка",
        description: "Произошла ошибка при создании альбома",
        variant: "destructive"
      });
    }
    setLoading(false);
  };

  const handleGuestAccess = async (albumCode: string) => {
    if (!albumCode.trim()) {
      toast({
        title: "Ошибка",
        description: "Введите код альбома",
        variant: "destructive"
      });
      return;
    }

    setGuestAlbumCode(albumCode.trim().toUpperCase());
    setCurrentView('guest');
  };

  const handleLogout = async () => {
    await signOut();
    setCurrentView('home');
    setUserAlbums([]);
    setSelectedAlbum(null);
  };

  // Показываем страницу аутентификации если пользователь не авторизован
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-orange-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-rose-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Загрузка...</p>
        </div>
      </div>
    );
  }

  if (!user && currentView !== 'guest') {
    return <AuthPage />;
  }

  if (currentView === 'create') {
    return <CreateAlbumForm onSubmit={handleCreateAlbum} onBack={() => setCurrentView('home')} loading={loading} />;
  }

  if (currentView === 'album' && selectedAlbum) {
    return <AlbumGallery album={selectedAlbum} onBack={() => setCurrentView('home')} />;
  }

  if (currentView === 'guest') {
    return <GuestPhotoUpload albumCode={guestAlbumCode} onBack={() => setCurrentView('home')} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-orange-50">
      {/* Header */}
      <header className="relative overflow-hidden bg-white/70 backdrop-blur-sm border-b border-rose-200">
        <div className="absolute inset-0 bg-gradient-to-r from-rose-100/50 to-pink-100/50"></div>
        <div className="relative container mx-auto px-4 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Camera className="h-8 w-8 text-rose-500" />
              <h1 className="text-4xl font-bold bg-gradient-to-r from-rose-600 to-pink-600 bg-clip-text text-transparent">
                WeddingSnap
              </h1>
              <Heart className="h-6 w-6 text-pink-500 animate-pulse" />
            </div>
            
            {user && (
              <div className="flex items-center space-x-4">
                <span className="text-gray-600">Привет, {user.email}!</span>
                <Button
                  onClick={handleLogout}
                  variant="ghost"
                  size="sm"
                  className="text-rose-600 hover:text-rose-700"
                >
                  <LogOut className="h-4 w-4 mr-1" />
                  Выйти
                </Button>
              </div>
            )}
          </div>
          
          {user && (
            <p className="text-center text-lg text-gray-600 max-w-2xl mx-auto mt-4">
              Создавайте альбомы и собирайте фотографии со своих праздников
            </p>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        {user ? (
          // Авторизованный пользователь - показываем личный кабинет
          <UserDashboard 
            userAlbums={userAlbums}
            loading={loading}
            onCreateAlbum={() => setCurrentView('create')}
            onViewAlbum={(album) => {
              setSelectedAlbum(album);
              setCurrentView('album');
            }}
          />
        ) : (
          // Неавторизованный пользователь - показываем главную страницу
          <>
            {/* Hero Section */}
            <div className="text-center mb-16">
              <div className="inline-flex items-center space-x-8 mb-8">
                <GuestAccessForm onAccess={handleGuestAccess} />
              </div>
              <p className="text-gray-600 mb-8">
                Есть код альбома? Введите его выше для загрузки фото
              </p>
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
                  <h3 className="text-xl font-semibold text-gray-700">Зарегистрируйтесь</h3>
                  <p className="text-gray-600">Создайте аккаунт и получите доступ к созданию альбомов</p>
                </div>
                
                <div className="space-y-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-rose-500 to-pink-500 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto">
                    2
                  </div>
                  <h3 className="text-xl font-semibold text-gray-700">Создайте альбом</h3>
                  <p className="text-gray-600">Укажите детали свадьбы и получите уникальный код альбома</p>
                </div>
                
                <div className="space-y-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-rose-500 to-pink-500 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto">
                    3
                  </div>
                  <h3 className="text-xl font-semibold text-gray-700">Поделитесь кодом</h3>
                  <p className="text-gray-600">Гости используют код для загрузки фото прямо в ваш альбом</p>
                </div>
              </div>
            </div>
          </>
        )}
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

const CreateAlbumForm = ({ onSubmit, onBack, loading }: { onSubmit: (data: any) => void; onBack: () => void; loading: boolean }) => {
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
          disabled={loading}
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
                    disabled={loading}
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
                    disabled={loading}
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
                  disabled={loading}
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
                  disabled={loading}
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
                  disabled={loading}
                />
              </div>

              <Button 
                type="submit" 
                className="w-full bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600"
                size="lg"
                disabled={loading}
              >
                <Camera className="mr-2 h-5 w-5" />
                {loading ? 'Создание...' : 'Создать альбом'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

const GuestAccessForm = ({ onAccess }: { onAccess: (albumCode: string) => void }) => {
  const [albumCode, setAlbumCode] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (albumCode.trim()) {
      onAccess(albumCode.trim().toUpperCase());
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center space-x-2">
      <Input
        placeholder="Введите код альбома"
        value={albumCode}
        onChange={(e) => setAlbumCode(e.target.value)}
        className="border-rose-200 focus:border-rose-400"
      />
      <Button 
        type="submit"
        className="bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600"
      >
        Войти как гость
      </Button>
    </form>
  );
};

const UserDashboard = ({ 
  userAlbums, 
  loading, 
  onCreateAlbum, 
  onViewAlbum 
}: { 
  userAlbums: Album[];
  loading: boolean;
  onCreateAlbum: () => void;
  onViewAlbum: (album: Album) => void;
}) => {
  const { toast } = useToast();

  const copyAlbumCode = (albumCode: string) => {
    navigator.clipboard.writeText(albumCode);
    toast({
      title: "Код скопирован!",
      description: "Поделитесь этим кодом с гостями",
    });
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-rose-500 mx-auto mb-4"></div>
        <p className="text-gray-600">Загрузка альбомов...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-3xl font-bold text-gray-800">Мои альбомы</h2>
        <Button
          onClick={onCreateAlbum}
          className="bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600"
        >
          <Heart className="mr-2 h-5 w-5" />
          Создать альбом
        </Button>
      </div>

      {userAlbums.length === 0 ? (
        <Card className="bg-white/70 backdrop-blur-sm border-rose-200">
          <CardContent className="text-center py-12">
            <Camera className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              У вас пока нет альбомов
            </h3>
            <p className="text-gray-600 mb-4">
              Создайте свой первый альбом для сбора фотографий с праздника
            </p>
            <Button
              onClick={onCreateAlbum}
              className="bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600"
            >
              <Heart className="mr-2 h-5 w-5" />
              Создать первый альбом
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {userAlbums.map((album) => (
            <Card key={album.id} className="bg-white/70 backdrop-blur-sm border-rose-200 hover:shadow-lg transition-all duration-300">
              <CardHeader>
                <CardTitle className="text-rose-700 flex items-center">
                  <Heart className="mr-2 h-5 w-5" />
                  {album.bride_name} & {album.groom_name}
                </CardTitle>
                <CardDescription>
                  {new Date(album.wedding_date).toLocaleDateString('ru-RU')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {album.description && (
                  <p className="text-gray-600 text-sm mb-4">{album.description}</p>
                )}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <span>Код альбома:</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyAlbumCode(album.album_code)}
                      className="text-rose-600 hover:text-rose-700 p-1 h-auto"
                    >
                      {album.album_code}
                    </Button>
                  </div>
                  <Button
                    onClick={() => onViewAlbum(album)}
                    className="w-full bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600"
                  >
                    Просмотреть альбом
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Index;
