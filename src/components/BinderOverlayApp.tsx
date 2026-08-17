import { useEffect, useState } from 'react';
import { Settings, Bind } from '../types';

export default function BinderOverlayApp() {
  const [settings, setSettings] = useState<Settings>({ binder_enabled: true } as any);
  const [binds, setBinds] = useState<Bind[]>([]);
  const [activeBindHotkey, setActiveBindHotkey] = useState<string | null>(null);

  useEffect(() => {
    const ipcRenderer = window.ipcRenderer;
    if (!ipcRenderer) return;
    ipcRenderer.on('sync-settings', (_e: any, data: Settings) => setSettings(data));
    ipcRenderer.on('sync-binds', (_e: any, data: Bind[]) => setBinds(data || []));
    ipcRenderer.on('binder-macro-start', (_e: any, hotkey: string) => {
      setActiveBindHotkey(hotkey);
    });
    ipcRenderer.on('binder-macro-end', () => {
      setActiveBindHotkey(null);
    });
    
    document.body.style.overflow = 'hidden';
    document.body.style.background = 'transparent';
    return () => {
      document.body.style.overflow = 'auto';
      document.body.style.background = '';
    };
  }, []);

  if (settings.binder_enabled === false || !binds || binds.length === 0) {
    return null;
  }

  return (
    <div style={{ padding: '16px 12px', background: 'transparent' }}>
      <style>{`
        @keyframes bindPulse {
          0% { box-shadow: 0 0 0 0 rgba(99, 220, 130, 0.7), 0 4px 12px rgba(0,0,0,0.15); border-color: rgba(99, 220, 130, 0.8); }
          50% { box-shadow: 0 0 0 6px rgba(99, 220, 130, 0), 0 4px 12px rgba(0,0,0,0.15); border-color: rgba(99, 220, 130, 0.4); }
          100% { box-shadow: 0 0 0 0 rgba(99, 220, 130, 0), 0 4px 12px rgba(0,0,0,0.15); border-color: rgba(99, 220, 130, 0.8); }
        }
        .bind-active {
          animation: bindPulse 0.6s ease infinite !important;
          background: rgba(40, 70, 45, 0.95) !important;
          border-color: rgba(99, 220, 130, 0.8) !important;
        }
        .bind-active .bind-key-box {
          background: rgba(99, 220, 130, 0.15) !important;
        }
        .bind-active .bind-key-text {
          color: rgb(99, 220, 130) !important;
        }
      `}</style>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        
        {/* Header (Drag Region) */}
        <div style={{ 
          background: 'rgba(28, 28, 30, 0.95)', 
          borderRadius: '8px', 
          padding: '10px 14px', 
          display: 'flex', 
          alignItems: 'center', 
          gap: '12px',
          border: '1px solid rgba(255,255,255,0.05)',
          boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
        }}>
          <div style={{ background: 'rgba(255,255,255,0.05)', padding: '6px', borderRadius: '6px', display: 'flex', WebkitAppRegion: 'drag', cursor: 'grab' } as any}>
            <svg width="12" height="12" viewBox="0 0 16 16" fill="rgba(255,255,255,0.4)">
              <circle cx="5" cy="4" r="1.3"/><circle cx="11" cy="4" r="1.3"/>
              <circle cx="5" cy="8" r="1.3"/><circle cx="11" cy="8" r="1.3"/>
              <circle cx="5" cy="12" r="1.3"/><circle cx="11" cy="12" r="1.3"/>
            </svg>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3"/></svg>
            <span style={{ fontSize: '13px', fontWeight: 800, color: 'white', letterSpacing: '0.5px' }}>БИНДЕР</span>
          </div>
        </div>

        {/* Binds List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {binds.map((bind: Bind, i: number) => bind.name ? (() => {
            const isActive = activeBindHotkey && bind.hotkey && 
              bind.hotkey.toUpperCase() === activeBindHotkey.toUpperCase();
            return (
              <div key={i} className={isActive ? 'bind-active' : ''} style={{
                background: 'rgba(44, 44, 46, 0.95)', border: '1px solid rgba(255,255,255,0.03)',
                borderRadius: '8px', display: 'flex', overflow: 'hidden', alignItems: 'stretch',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                transition: 'all 0.15s ease'
              }}>
                <div style={{ flex: 1, padding: '12px 16px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <span style={{ fontSize: '12px', fontWeight: 800, color: 'white', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                    {bind.name}
                  </span>
                </div>
                <div className="bind-key-box" style={{ borderLeft: '1px solid rgba(255, 255, 255, 0.05)', padding: '8px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', background: 'rgba(255, 255, 255, 0.02)', minWidth: '70px', transition: 'all 0.15s ease' }}>
                  <span className="bind-key-text" style={{ fontSize: '14px', fontWeight: 800, color: 'white', transition: 'color 0.15s ease' }}>{bind.hotkey || 'Нет'}</span>
                  <span style={{ fontSize: '9px', color: 'rgba(255, 255, 255, 0.4)', textTransform: 'uppercase', marginTop: '2px', letterSpacing: '0.5px', fontWeight: 700 }}>кнопка</span>
                </div>
              </div>
            );
          })() : null)}
        </div>

      </div>
    </div>
  );
}
