import Cookies from 'js-cookie';

interface CachedAlbum {
  id: string;
  bride_name: string;
  groom_name: string;
  wedding_date: string;
  description: string;
  photo_limit: number;
  album_code: string;
  is_active: boolean;
  cached_at: number;
}

interface CachedMediaFile {
  id: string;
  file_name: string;
  file_size: number;
  file_type: string;
  duration?: number;
  uploaded_at: string;
  device_id: string;
  url?: string;
  cached_at: number;
}

const CACHE_DURATION = 30 * 60 * 1000; // 30 минут в миллисекундах
const COOKIE_OPTIONS = {
  expires: 1, // 1 день
  sameSite: 'strict' as const,
  secure: window.location.protocol === 'https:'
};

export class CookieCache {
  static setAlbum(albumCode: string, album: any) {
    try {
      const cachedAlbum: CachedAlbum = {
        ...album,
        cached_at: Date.now()
      };
      
      const compressed = JSON.stringify(cachedAlbum);
      // Проверяем размер (cookies имеют лимит ~4KB)
      if (compressed.length < 3000) {
        Cookies.set(`album_${albumCode}`, compressed, COOKIE_OPTIONS);
        console.log('Album cached in cookies:', albumCode);
      } else {
        console.warn('Album data too large for cookies, using localStorage');
        localStorage.setItem(`album_${albumCode}`, compressed);
      }
    } catch (error) {
      console.error('Error caching album:', error);
    }
  }

  static getAlbum(albumCode: string): CachedAlbum | null {
    try {
      // Сначала проверяем cookies
      let cached = Cookies.get(`album_${albumCode}`);
      
      // Если нет в cookies, проверяем localStorage
      if (!cached) {
        cached = localStorage.getItem(`album_${albumCode}`);
      }

      if (!cached) return null;

      const album: CachedAlbum = JSON.parse(cached);
      
      // Проверяем не истек ли кеш
      if (Date.now() - album.cached_at > CACHE_DURATION) {
        this.removeAlbum(albumCode);
        return null;
      }

      console.log('Album loaded from cache:', albumCode);
      return album;
    } catch (error) {
      console.error('Error loading cached album:', error);
      return null;
    }
  }

  static removeAlbum(albumCode: string) {
    Cookies.remove(`album_${albumCode}`);
    localStorage.removeItem(`album_${albumCode}`);
    console.log('Album cache cleared:', albumCode);
  }

  static setMediaFiles(albumCode: string, mediaFiles: any[]) {
    try {
      const cachedMedia: CachedMediaFile[] = mediaFiles.map(media => ({
        ...media,
        cached_at: Date.now()
      }));

      const compressed = JSON.stringify(cachedMedia);
      
      // Медиафайлы обычно слишком большие для cookies, используем localStorage
      localStorage.setItem(`media_${albumCode}`, compressed);
      console.log('Media files cached:', albumCode, mediaFiles.length);
    } catch (error) {
      console.error('Error caching media files:', error);
    }
  }

  static getMediaFiles(albumCode: string): CachedMediaFile[] | null {
    try {
      const cached = localStorage.getItem(`media_${albumCode}`);
      
      if (!cached) return null;

      const mediaFiles: CachedMediaFile[] = JSON.parse(cached);
      
      // Проверяем не истек ли кеш (для медиафайлов используем меньший срок - 15 минут)
      const mediaCacheDuration = 15 * 60 * 1000;
      if (mediaFiles.length > 0 && Date.now() - mediaFiles[0].cached_at > mediaCacheDuration) {
        this.removeMediaFiles(albumCode);
        return null;
      }

      console.log('Media files loaded from cache:', albumCode, mediaFiles.length);
      return mediaFiles;
    } catch (error) {
      console.error('Error loading cached media files:', error);
      return null;
    }
  }

  static removeMediaFiles(albumCode: string) {
    localStorage.removeItem(`media_${albumCode}`);
    console.log('Media files cache cleared:', albumCode);
  }

  static setDevicePreferences(preferences: any) {
    try {
      Cookies.set('device_preferences', JSON.stringify(preferences), {
        ...COOKIE_OPTIONS,
        expires: 30 // 30 дней для настроек устройства
      });
    } catch (error) {
      console.error('Error saving device preferences:', error);
    }
  }

  static getDevicePreferences(): any {
    try {
      const prefs = Cookies.get('device_preferences');
      return prefs ? JSON.parse(prefs) : {};
    } catch (error) {
      console.error('Error loading device preferences:', error);
      return {};
    }
  }

  static clearAll() {
    // Очищаем все кеши альбомов
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('album_') || key.startsWith('media_')) {
        localStorage.removeItem(key);
      }
    });

    // Очищаем cookies альбомов
    document.cookie.split(';').forEach(cookie => {
      const name = cookie.split('=')[0].trim();
      if (name.startsWith('album_')) {
        Cookies.remove(name);
      }
    });

    console.log('All caches cleared');
  }
}