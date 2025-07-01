
// Utility for working with secure album codes
export const generateSecureAlbumCode = async (): Promise<string> => {
  const { data, error } = await supabase.rpc('generate_secure_album_code');
  
  if (error) {
    console.error('Failed to generate secure album code:', error);
    throw new Error('Failed to generate album code');
  }
  
  return data;
};

// Validate album code format
export const isValidAlbumCodeFormat = (code: string): boolean => {
  return /^[A-Z0-9]{12}$/.test(code);
};

// Clean and format album code input
export const formatAlbumCode = (input: string): string => {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, '');
};
