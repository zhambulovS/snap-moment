import React from 'react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Camera, Heart, Users, Upload, Download, LogOut, Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import AuthPage from '@/components/AuthPage';
import AlbumGallery from '@/components/AlbumGallery';
import { supabase } from '@/integrations/supabase/client';
import { generateAlbumCode } from '@/utils/albumCode';
import { useNavigate } from 'react-router-dom';

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
  const [currentView, setCurrentView] = useState<'home' | 'create' | 'album'>('home');
  const [selectedAlbum, setSelectedAlbum] = useState<Album | null>(null);
  const [userAlbums, setUserAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

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

    // Перенаправляем на страницу гостя
    navigate(`/guest/${albumCode.trim().toUpperCase()}`);
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

  if (!user) {
    return <AuthPage />;
  }

  if (currentView === 'create') {
    return <CreateAlbumForm onSubmit={handleCreateAlbum} onBack={() => setCurrentView('home')} loading={loading} />;
  }

  if (currentView === 'album' && selectedAlbum) {
    return <AlbumGallery album={selectedAlbum} onBack={() => setCurrentView('home')} />;
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
          </div>
          
          <p className="text-center text-lg text-gray-600 max-w-2xl mx-auto mt-4">
            Создавайте альбомы и собирайте фотографии со своих праздников
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        <UserDashboard 
          userAlbums={userAlbums}
          loading={loading}
          onCreateAlbum={() => setCurrentView('create')}
          onViewAlbum={(album) => {
            setSelectedAlbum(album);
            setCurrentView('album');
          }}
          onGuestAccess={handleGuestAccess}
        />
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

const UserDashboard = ({ 
  userAlbums, 
  loading, 
  onCreateAlbum, 
  onViewAlbum,
  onGuestAccess
}: { 
  userAlbums: Album[];
  loading: boolean;
  onCreateAlbum: () => void;
  onViewAlbum: (album: Album) => void;
  onGuestAccess: (code: string) => void;
}) => {
  const { toast } = useToast();
  const [guestCode, setGuestCode] = useState('');

  const copyAlbumLink = (albumCode: string) => {
    const link = `${window.location.origin}/guest/${albumCode}`;
    navigator.clipboard.writeText(link);
    toast({
      title: "Ссылка скопирована!",
      description: "Поделитесь этой ссылкой с гостями",
    });
  };

  const handleGuestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (guestCode.trim()) {
      onGuestAccess(guestCode.trim());
    }
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
      {/* Гостевой доступ */}
      <Card className="bg-white/70 backdrop-blur-sm border-rose-200 mb-8">
        <CardHeader>
          <CardTitle className="text-center text-rose-700">
            <Users className="inline mr-2 h-6 w-6" />
            Гостевой доступ
          </CardTitle>
          <CardDescription className="text-center">
            Есть код альбома? Введите его для загрузки фото
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleGuestSubmit} className="flex items-center space-x-2">
            <Input
              placeholder="Введите код альбома"
              value={guestCode}
              onChange={(e) => setGuestCode(e.target.value)}
              className="border-rose-200 focus:border-rose-400"
            />
            <Button 
              type="submit"
              className="bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600"
            >
              Войти как гость
            </Button>
          </form>
        </CardContent>
      </Card>

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
                    <span>Ссылка для гостей:</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyAlbumLink(album.album_code)}
                      className="text-rose-600 hover:text-rose-700 p-1 h-auto"
                    >
                      <Copy className="h-4 w-4 mr-1" />
                      Копировать
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
