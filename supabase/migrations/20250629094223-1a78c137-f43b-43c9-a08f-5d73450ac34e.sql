
-- Создаем таблицу для профилей пользователей
CREATE TABLE public.profiles (
  id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Создаем таблицу для альбомов
CREATE TABLE public.albums (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  bride_name TEXT NOT NULL,
  groom_name TEXT NOT NULL,
  wedding_date DATE NOT NULL,
  description TEXT,
  photo_limit INTEGER NOT NULL DEFAULT 5,
  album_code TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Создаем таблицу для фотографий
CREATE TABLE public.photos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  album_id UUID REFERENCES public.albums(id) ON DELETE CASCADE NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  device_id TEXT NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Создаем таблицу для отслеживания лимитов загрузки
CREATE TABLE public.upload_limits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  album_id UUID REFERENCES public.albums(id) ON DELETE CASCADE NOT NULL,
  device_id TEXT NOT NULL,
  upload_count INTEGER NOT NULL DEFAULT 0,
  last_upload TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(album_id, device_id)
);

-- Включаем Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.albums ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.upload_limits ENABLE ROW LEVEL SECURITY;

-- Политики для profiles
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Политики для albums
CREATE POLICY "Users can view own albums" ON public.albums
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own albums" ON public.albums
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own albums" ON public.albums
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own albums" ON public.albums
  FOR DELETE USING (auth.uid() = user_id);

-- Публичный доступ к альбомам для гостей (только чтение по коду)
CREATE POLICY "Public can view albums by code" ON public.albums
  FOR SELECT USING (is_active = true);

-- Политики для photos (гости могут добавлять, владельцы могут видеть)
CREATE POLICY "Album owners can view photos" ON public.photos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.albums 
      WHERE albums.id = photos.album_id 
      AND albums.user_id = auth.uid()
    )
  );
CREATE POLICY "Public can insert photos" ON public.photos
  FOR INSERT WITH CHECK (true);

-- Политики для upload_limits
CREATE POLICY "Album owners can view upload limits" ON public.upload_limits
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.albums 
      WHERE albums.id = upload_limits.album_id 
      AND albums.user_id = auth.uid()
    )
  );
CREATE POLICY "Public can manage upload limits" ON public.upload_limits
  FOR ALL USING (true) WITH CHECK (true);

-- Создаем функцию для автоматического создания профиля при регистрации
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', '')
  );
  RETURN new;
END;
$$;

-- Создаем триггер для автоматического создания профиля
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Создаем storage bucket для фотографий
INSERT INTO storage.buckets (id, name, public)
VALUES ('wedding-photos', 'wedding-photos', true);

-- Политика для storage bucket
CREATE POLICY "Anyone can upload wedding photos" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'wedding-photos');

CREATE POLICY "Anyone can view wedding photos" ON storage.objects
  FOR SELECT USING (bucket_id = 'wedding-photos');

CREATE POLICY "Album owners can delete photos" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'wedding-photos' AND
    EXISTS (
      SELECT 1 FROM public.albums 
      WHERE albums.user_id = auth.uid()
    )
  );
