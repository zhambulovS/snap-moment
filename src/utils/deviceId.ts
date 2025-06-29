
// Генерируем уникальный ID устройства для ограничения загрузок
export const getDeviceId = (): string => {
  let deviceId = localStorage.getItem('wedding-device-id');
  
  if (!deviceId) {
    // Создаем уникальный ID на основе различных характеристик браузера
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx?.fillText('device-fingerprint', 10, 10);
    const canvasFingerprint = canvas.toDataURL();
    
    const fingerprint = [
      navigator.userAgent,
      navigator.language,
      screen.width + 'x' + screen.height,
      new Date().getTimezoneOffset(),
      canvasFingerprint
    ].join('|');
    
    deviceId = btoa(fingerprint).replace(/[^a-zA-Z0-9]/g, '').substring(0, 32);
    localStorage.setItem('wedding-device-id', deviceId);
  }
  
  return deviceId;
};
