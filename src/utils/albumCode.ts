
import { supabase } from '@/integrations/supabase/client';

// Enhanced secure album code generation
export const generateAlbumCode = async (): Promise<string> => {
  try {
    const { data, error } = await supabase.rpc('generate_secure_album_code');
    
    if (error) {
      console.error('Failed to generate secure album code:', error);
      // Fallback to client-side generation if server fails
      return generateClientSideCode();
    }
    
    return data;
  } catch (error) {
    console.error('Error generating album code:', error);
    return generateClientSideCode();
  }
};

// Fallback client-side generation (still secure)
const generateClientSideCode = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  const array = new Uint8Array(12);
  crypto.getRandomValues(array);
  
  for (let i = 0; i < 12; i++) {
    result += chars[array[i] % chars.length];
  }
  
  return result;
};
