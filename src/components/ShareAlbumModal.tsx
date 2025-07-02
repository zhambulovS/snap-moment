import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { QrCode, Copy, Download, Users, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ShareAlbumModalProps {
  album: {
    id: string;
    bride_name: string;
    groom_name: string;
    album_code: string;
  };
  isOpen: boolean;
  onClose: () => void;
}

const ShareAlbumModal = ({ album, isOpen, onClose }: ShareAlbumModalProps) => {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const { toast } = useToast();

  const guestLink = `${window.location.origin}/guest/${album.album_code}`;
  const uploadLink = `${window.location.origin}/guest/${album.album_code}/upload`;

  const generateQRCode = (url: string) => {
    return `https://api.qrserver.com/v1/create-qr-code/?size=400x400&margin=10&data=${encodeURIComponent(url)}`;
  };

  const copyToClipboard = (text: string, description: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Скопировано!",
      description,
    });
  };

  const downloadQRCode = (url: string, filename: string) => {
    const qrUrl = generateQRCode(url);
    const link = document.createElement('a');
    link.href = qrUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: "QR-код загружен!",
      description: "QR-код сохранен в загрузки",
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl text-rose-700 flex items-center">
            <QrCode className="mr-2 h-6 w-6" />
            Поделиться альбомом
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Album Info */}
          <Card className="bg-gradient-to-r from-rose-50 to-pink-50 border-rose-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-rose-700">
                {album.bride_name} & {album.groom_name}
              </CardTitle>
            </CardHeader>
          </Card>

          {/* Guest View Link */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Eye className="h-5 w-5 text-blue-600" />
              <h3 className="font-semibold text-gray-800">Ссылка для просмотра альбома</h3>
            </div>
            <div className="flex space-x-2">
              <Input
                value={guestLink}
                readOnly
                className="flex-1"
              />
              <Button
                onClick={() => copyToClipboard(guestLink, "Ссылка для просмотра скопирована")}
                variant="outline"
                size="sm"
              >
                <Copy className="h-4 w-4" />
              </Button>
              <Button
                onClick={() => downloadQRCode(guestLink, `qr-view-${album.bride_name}-${album.groom_name}.png`)}
                variant="outline"
                size="sm"
              >
                <Download className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex justify-center">
              <img
                src={generateQRCode(guestLink)}
                alt="QR код для просмотра"
                className="w-32 h-32 border-2 border-gray-200 rounded-lg"
              />
            </div>
          </div>

          {/* Upload Link */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-rose-600" />
              <h3 className="font-semibold text-gray-800">Ссылка для загрузки фото/видео</h3>
            </div>
            <div className="flex space-x-2">
              <Input
                value={uploadLink}
                readOnly
                className="flex-1"
              />
              <Button
                onClick={() => copyToClipboard(uploadLink, "Ссылка для загрузки скопирована")}
                variant="outline"
                size="sm"
              >
                <Copy className="h-4 w-4" />
              </Button>
              <Button
                onClick={() => downloadQRCode(uploadLink, `qr-upload-${album.bride_name}-${album.groom_name}.png`)}
                variant="outline"
                size="sm"
              >
                <Download className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex justify-center">
              <img
                src={generateQRCode(uploadLink)}
                alt="QR код для загрузки"
                className="w-32 h-32 border-2 border-gray-200 rounded-lg"
              />
            </div>
          </div>

          {/* Instructions */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-4">
              <h4 className="font-semibold text-blue-800 mb-2">Как поделиться:</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Скопируйте ссылку и отправьте гостям в мессенджере</li>
                <li>• Скачайте QR-код и распечатайте на столах</li>
                <li>• Гости смогут сразу просматривать и загружать медиафайлы</li>
                <li>• Регистрация не требуется</li>
              </ul>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={onClose} variant="outline">
              Закрыть
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ShareAlbumModal;