import { useEffect, useState } from 'react';
import { playNotificationSound } from '../lib/sound';

interface GameNotification {
  title: string;
  body: string;
}

export default function GameNotificationOverlay() {
  const [notification, setNotification] = useState<GameNotification>({
    title: 'Lexis Tools',
    body: '',
  });

  useEffect(() => {
    document.body.style.background = 'transparent';
    document.documentElement.style.background = 'transparent';
    const titlebar = document.getElementById('titlebar');
    if (titlebar) titlebar.style.display = 'none';

    const onNotification = (_event: unknown, data: GameNotification) => { setNotification(data); playNotificationSound(); };
    window.ipcRenderer?.on('game-notification', onNotification);
    return () => window.ipcRenderer?.removeListener('game-notification', onNotification);
  }, []);

  return (
    <div style={{ width: '100vw', height: '100vh', padding: '8px', boxSizing: 'border-box', fontFamily: 'Inter, Segoe UI, sans-serif' }}>
      <div style={{
        height: '100%', display: 'flex', alignItems: 'center', gap: '12px',
        padding: '16px 18px', boxSizing: 'border-box', borderRadius: '12px',
        background: 'linear-gradient(135deg, rgba(20,24,34,0.96), rgba(35,43,62,0.94))',
        border: '1px solid rgba(118,160,255,0.48)', boxShadow: '0 12px 34px rgba(0,0,0,0.42)',
        color: '#fff',
      }}>
        <div style={{ width: 34, height: 34, flexShrink: 0, borderRadius: '10px', display: 'grid', placeItems: 'center', background: 'rgba(92,132,255,0.24)', color: '#a9c4ff', fontSize: '18px' }}>✓</div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '4px' }}>{notification.title}</div>
          <div style={{ fontSize: '13px', lineHeight: 1.35, color: 'rgba(255,255,255,0.78)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{notification.body}</div>
        </div>
      </div>
    </div>
  );
}
