import { useState, useEffect } from 'react';

export function useOfflineDetector() {
  const [isOnline, setIsOnline] = useState(window.navigator.onLine);
  const [lastOnlineAt, setLastOnlineAt] = useState(
    localStorage.getItem('last_online_ts') ? parseInt(localStorage.getItem('last_online_ts')) : null
  );

  useEffect(() => {
    const handleOnline = () => {
      (async () => {
        setIsOnline(true);
        const pending = JSON.parse(localStorage.getItem('pending_mutations') || '[]');
        if (pending.length > 0) {
          for (const mutation of pending) {
            try {
              await fetch(mutation.url, {
                method: mutation.method,
                headers: { 'Content-Type': 'application/json' },
                body: mutation.body
              });
            } catch (e) {
              console.error('Failed to replay mutation:', e);
            }
          }
          localStorage.removeItem('pending_mutations');
        }
      })();
    };
    const handleOffline = () => {
      const ts = Date.now();
      localStorage.setItem('last_online_ts', ts);
      setLastOnlineAt(ts);
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return { isOnline, lastOnlineAt };
}
