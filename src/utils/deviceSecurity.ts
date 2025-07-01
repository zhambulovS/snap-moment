
import { supabase } from '@/integrations/supabase/client';

// Enhanced device ID generation with better fingerprinting
export const getSecureDeviceId = (): string => {
  let deviceId = localStorage.getItem('wedding-device-id');
  
  if (!deviceId) {
    // Create a more comprehensive device fingerprint
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx?.fillText('device-fingerprint-v2', 10, 10);
    const canvasFingerprint = canvas.toDataURL();
    
    const fingerprint = [
      navigator.userAgent,
      navigator.language,
      navigator.languages?.join(',') || '',
      screen.width + 'x' + screen.height,
      screen.colorDepth,
      new Date().getTimezoneOffset(),
      navigator.hardwareConcurrency || 0,
      navigator.deviceMemory || 0,
      canvasFingerprint,
      navigator.platform,
      Date.now() // Add timestamp for uniqueness
    ].join('|');
    
    // Generate secure device ID
    deviceId = btoa(fingerprint).replace(/[^a-zA-Z0-9]/g, '').substring(0, 32);
    localStorage.setItem('wedding-device-id', deviceId);
  }
  
  return deviceId;
};

// Device session management
export class DeviceSessionManager {
  private static sessions = new Map<string, string>();

  static async createSession(albumId: string, deviceId: string): Promise<string | null> {
    try {
      const { data, error } = await supabase.rpc('create_device_session', {
        p_device_id: deviceId,
        p_album_id: albumId,
        p_ip_address: null, // Will be populated server-side if needed
        p_user_agent: navigator.userAgent
      });

      if (error) {
        console.error('Failed to create device session:', error);
        return null;
      }

      const sessionToken = data as string;
      this.sessions.set(`${deviceId}-${albumId}`, sessionToken);
      localStorage.setItem(`session-${deviceId}-${albumId}`, sessionToken);
      
      return sessionToken;
    } catch (error) {
      console.error('Error creating device session:', error);
      return null;
    }
  }

  static getSession(deviceId: string, albumId: string): string | null {
    const key = `${deviceId}-${albumId}`;
    let sessionToken = this.sessions.get(key);
    
    if (!sessionToken) {
      sessionToken = localStorage.getItem(`session-${key}`);
      if (sessionToken) {
        this.sessions.set(key, sessionToken);
      }
    }
    
    return sessionToken;
  }

  static async validateSession(sessionToken: string, deviceId: string, albumId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('validate_device_session', {
        p_session_token: sessionToken,
        p_device_id: deviceId,
        p_album_id: albumId
      });

      if (error) {
        console.error('Failed to validate session:', error);
        return false;
      }

      return data as boolean;
    } catch (error) {
      console.error('Error validating session:', error);
      return false;
    }
  }

  static clearSession(deviceId: string, albumId: string): void {
    const key = `${deviceId}-${albumId}`;
    this.sessions.delete(key);
    localStorage.removeItem(`session-${key}`);
  }
}

// Rate limiting utilities
export class RateLimiter {
  static async checkRateLimit(identifier: string, action: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('rate_limits')
        .select('*')
        .eq('identifier', identifier)
        .eq('action', action)
        .single();

      if (error && error.code !== 'PGRST116') { // Not found is OK
        console.error('Rate limit check error:', error);
        return true; // Allow on error to avoid blocking legitimate users
      }

      if (!data) {
        // First attempt, create record
        await supabase
          .from('rate_limits')
          .insert({
            identifier,
            action,
            attempt_count: 1
          });
        return true;
      }

      // Check if blocked
      if (data.blocked_until && new Date(data.blocked_until) > new Date()) {
        return false;
      }

      // Check rate limits based on action
      const limits = {
        'album_access': { maxAttempts: 10, windowMinutes: 60 },
        'upload_attempt': { maxAttempts: 20, windowMinutes: 30 },
        'device_registration': { maxAttempts: 5, windowMinutes: 60 }
      };

      const limit = limits[action as keyof typeof limits];
      if (!limit) return true;

      const windowStart = new Date(data.window_start);
      const now = new Date();
      const windowAge = (now.getTime() - windowStart.getTime()) / (1000 * 60);

      if (windowAge > limit.windowMinutes) {
        // Reset window
        await supabase
          .from('rate_limits')
          .update({
            attempt_count: 1,
            window_start: now.toISOString(),
            blocked_until: null
          })
          .eq('id', data.id);
        return true;
      }

      if (data.attempt_count >= limit.maxAttempts) {
        // Block for remaining window time
        const blockUntil = new Date(windowStart.getTime() + (limit.windowMinutes * 60 * 1000));
        await supabase
          .from('rate_limits')
          .update({
            blocked_until: blockUntil.toISOString()
          })
          .eq('id', data.id);
        return false;
      }

      // Increment attempt count
      await supabase
        .from('rate_limits')
        .update({
          attempt_count: data.attempt_count + 1
        })
        .eq('id', data.id);

      return true;
    } catch (error) {
      console.error('Rate limiting error:', error);
      return true; // Allow on error
    }
  }
}

// Access logging utility
export const logAlbumAccess = async (
  albumId: string,
  deviceId: string,
  action: string,
  details?: any
) => {
  try {
    await supabase
      .from('album_access_logs')
      .insert({
        album_id: albumId,
        device_id: deviceId,
        action,
        details: details ? JSON.stringify(details) : null
      });
  } catch (error) {
    console.error('Failed to log album access:', error);
  }
};
