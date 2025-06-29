
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Settings, Edit, Trash2, Users, Copy, Eye, EyeOff } from 'lucide-react';
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
  is_active: boolean;
  created_at: string;
}

interface AlbumSettingsProps {
  album: Album;
  onUpdate: (updatedAlbum: Album) => void;
  onDelete: () => void;
}

const AlbumSettings = ({ album, onUpdate, onDelete }: AlbumSettingsProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    bride_name: album.bride_name,
    groom_name: album.groom_name,
    wedding_date: album.wedding_date,
    description: album.description || '',
    photo_limit: album.photo_limit,
    is_active: album.is_active
  });
  const { toast } = useToast();

  const handleSave = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('albums')
        .update(formData)
        .eq('id', album.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating album:', error);
        toast({
          title: "Ошибка",
          description: "Не удалось обновить альбом",
          variant: "destructive"
        });
        return;
      }

      onUpdate(data);
      setIsEditing(false);
      toast({
        title: "Альбом обновлен! ✨",
        description: "Изменения сохранены",
      });
    } catch (error) {
      console.error('Error in handleSave:', error);
      toast({
        title: "Ошибка",
        description: "Произошла ошибка при сохранении",
        variant: "destructive"
      });
    }
    setLoading(false);
  };

  const handleDelete = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('albums')
        .delete()
        .eq('id', album.id);

      if (error) {
        console.error('Error deleting album:', error);
        toast({
          title: "Ошибка",
          description: "Не удалось удалить альбом",
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Альбом удален",
        description: "Альбом и все фотографии были удалены",
      });
      onDelete();
    } catch (error) {
      console.error('Error in handleDelete:', error);
      toast({
        title: "Ошибка",
        description: "Произошла ошибка при удалении",
        variant: "destructive"
      });
    }
    setLoading(false);
    setShowDeleteDialog(false);
  };

  const copyAlbumLink = () => {
    const link = `${window.location.origin}/guest/${album.album_code}`;
    navigator.clipboard.writeText(link);
    toast({
      title: "Ссылка скопирована! 📋",
      description: "Поделитесь этой ссылкой с гостями",
    });
  };

  const toggleAlbumAccess = async () => {
    const newStatus = !formData.is_active;
    setFormData(prev => ({ ...prev, is_active: newStatus }));
    
    try {
      const { error } = await supabase
        .from('albums')
        .update({ is_active: newStatus })
        .eq('id', album.id);

      if (error) {
        console.error('Error toggling album access:', error);
        setFormData(prev => ({ ...prev, is_active: !newStatus }));
        toast({
          title: "Ошибка",
          description: "Не удалось изменить доступ к альбому",
          variant: "destructive"
        });
        return;
      }

      toast({
        title: newStatus ? "Доступ включен 🟢" : "Доступ отключен 🔴",
        description: newStatus ? "Гости могут загружать фото" : "Загрузка фото заблокирована",
      });
    } catch (error) {
      console.error('Error in toggleAlbumAccess:', error);
      setFormData(prev => ({ ...prev, is_active: !newStatus }));
    }
  };

  return (
    <div className="space-y-4">
      <Card className="bg-white/70 backdrop-blur-sm border-rose-200">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Settings className="h-5 w-5 text-rose-500" />
              <span>Настройки альбома</span>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                onClick={() => setIsEditing(!isEditing)}
                variant="ghost"
                size="sm"
                className="text-rose-600 hover:text-rose-700"
              >
                <Edit className="h-4 w-4 mr-1" />
                {isEditing ? 'Отмена' : 'Редактировать'}
              </Button>
              <Button
                onClick={() => setShowDeleteDialog(true)}
                variant="ghost"
                size="sm"
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Удалить
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {isEditing ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="bride_name">Имя невесты</Label>
                  <Input
                    id="bride_name"
                    value={formData.bride_name}
                    onChange={(e) => setFormData({...formData, bride_name: e.target.value})}
                    disabled={loading}
                  />
                </div>
                <div>
                  <Label htmlFor="groom_name">Имя жениха</Label>
                  <Input
                    id="groom_name"
                    value={formData.groom_name}
                    onChange={(e) => setFormData({...formData, groom_name: e.target.value})}
                    disabled={loading}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="wedding_date">Дата свадьбы</Label>
                <Input
                  id="wedding_date"
                  type="date"
                  value={formData.wedding_date}
                  onChange={(e) => setFormData({...formData, wedding_date: e.target.value})}
                  disabled={loading}
                />
              </div>

              <div>
                <Label htmlFor="description">Описание</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="Расскажите о вашей особенной дате..."
                  rows={3}
                  disabled={loading}
                />
              </div>

              <div>
                <Label htmlFor="photo_limit">Лимит фото на гостя</Label>
                <Input
                  id="photo_limit"
                  type="number"
                  min="1"
                  max="50"
                  value={formData.photo_limit}
                  onChange={(e) => setFormData({...formData, photo_limit: parseInt(e.target.value)})}
                  disabled={loading}
                />
              </div>

              <div className="flex items-center justify-between pt-4">
                <Button
                  onClick={() => setIsEditing(false)}
                  variant="outline"
                  disabled={loading}
                >
                  Отмена
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={loading}
                  className="bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600"
                >
                  {loading ? 'Сохранение...' : 'Сохранить'}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-700">Невеста:</span>
                  <p>{album.bride_name}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Жених:</span>
                  <p>{album.groom_name}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Дата:</span>
                  <p>{new Date(album.wedding_date).toLocaleDateString('ru-RU')}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Лимит фото:</span>
                  <p>{album.photo_limit} на гостя</p>
                </div>
              </div>
              
              {album.description && (
                <div>
                  <span className="font-medium text-gray-700">Описание:</span>
                  <p className="text-gray-600 mt-1">{album.description}</p>
                </div>
              )}
            </div>
          )}

          {/* Управление доступом */}
          <div className="border-t pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {formData.is_active ? (
                  <Eye className="h-5 w-5 text-green-500" />
                ) : (
                  <EyeOff className="h-5 w-5 text-red-500" />
                )}
                <div>
                  <p className="font-medium">
                    {formData.is_active ? 'Доступ открыт' : 'Доступ закрыт'}
                  </p>
                  <p className="text-sm text-gray-600">
                    {formData.is_active ? 'Гости могут загружать фото' : 'Загрузка заблокирована'}
                  </p>
                </div>
              </div>
              <Switch
                checked={formData.is_active}
                onCheckedChange={toggleAlbumAccess}
              />
            </div>
          </div>

          {/* Ссылка для гостей */}
          <div className="border-t pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium flex items-center space-x-2">
                  <Users className="h-4 w-4" />
                  <span>Код для гостей: {album.album_code}</span>
                </p>
                <p className="text-sm text-gray-600">
                  {window.location.origin}/guest/{album.album_code}
                </p>
              </div>
              <Button
                onClick={copyAlbumLink}
                variant="outline"
                size="sm"
                className="border-rose-200 text-rose-600 hover:bg-rose-50"
              >
                <Copy className="h-4 w-4 mr-1" />
                Копировать
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Диалог удаления */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Удалить альбом?</DialogTitle>
            <DialogDescription>
              Это действие нельзя отменить. Альбом и все загруженные фотографии будут удалены навсегда.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              disabled={loading}
            >
              Отмена
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={loading}
            >
              {loading ? 'Удаление...' : 'Удалить'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AlbumSettings;
