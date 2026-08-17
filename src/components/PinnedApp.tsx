import { useState, useEffect, useRef } from 'react';
import { RuleCategory, Settings, Rule } from '../types';
import { applyTheme } from '../lib/theme';
import ScaledContent from './ScaledContent';

interface RuleWithCat extends Rule { categoryName: string; }

function ResizeHandle() {
  const startRef = useRef<{ x: number; y: number; w: number; h: number } | null>(null);
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    startRef.current = { x: e.screenX, y: e.screenY, w: window.outerWidth, h: window.outerHeight };
    const onMove = (ev: MouseEvent) => {
      if (!startRef.current) return;
      const newW = startRef.current.w + (ev.screenX - startRef.current.x);
      const newH = startRef.current.h + (ev.screenY - startRef.current.y);
      if (window.ipcRenderer) window.ipcRenderer.send('resize-overlay', { width: newW, height: newH });
    };
    const onUp = () => { startRef.current = null; window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };
  return (
    <div onMouseDown={handleMouseDown} style={{ position: 'absolute', bottom: 4, right: 4, cursor: 'nwse-resize', width: 18, height: 18, display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end', zIndex: 100 }} title="Изменение размера">
      <svg width="12" height="12" viewBox="0 0 12 12" fill="rgba(255,255,255,0.35)">
        <path d="M12 8L8 12H12V8Z"/><path d="M12 2L2 12H5L12 5V2Z" opacity="0.5"/>
      </svg>
    </div>
  );
}

export default function PinnedApp() {
  const [categories, setCategories] = useState<RuleCategory[]>([]);
  const [settings, setSettings] = useState<Settings>({
    overlayHotkey: 'Alt+O',
    autoEnter: true, chatKey: 'T', sendKey: 'ENTER',
    overlayOpacity: 0.9, overlayScale: 1.0,
    memoEnabled: true, memoText: '', accentColor: '#5b7c9e'
  });
  const [isWindowPinned, setIsWindowPinned] = useState(() => {
    return localStorage.getItem('lexis-tools-overlay-pinned') === 'true';
  });
  const [isOverlayActive, setIsOverlayActive] = useState(false);

  useEffect(() => {
    // Hide the custom HTML titlebar injected from index.html
    const titlebar = document.getElementById('titlebar');
    if (titlebar) { titlebar.style.cssText = 'display:none!important'; }
    const root = document.getElementById('root');
    if (root) { root.style.paddingTop = '0'; root.classList.remove('pt-8'); }
    document.documentElement.style.overflow = 'hidden';

    const activeProfile = localStorage.getItem('lexis-tools-active-profile') || 'default';
    const savedRules = localStorage.getItem(`lexis-tools-rules-${activeProfile}`);
    if (savedRules) { try { setCategories(JSON.parse(savedRules)); } catch(e) {} }
    const savedSettings = localStorage.getItem('lexis-tools-settings');
    if (savedSettings) { try { setSettings(prev => ({ ...prev, ...JSON.parse(savedSettings) })); } catch(e) {} }

    if (window.ipcRenderer) {
      window.ipcRenderer.on('sync-rules', (_e: any, data: RuleCategory[]) => setCategories(data));
      window.ipcRenderer.on('sync-settings', (_e: any, data: Settings) => setSettings(prev => ({ ...prev, ...data })));
      window.ipcRenderer.on('unpin-rule', (_e: any, ruleId: string) => {
        setCategories(prev => prev.map(c => ({ ...c, rules: c.rules.map(r => r.id === ruleId ? { ...r, isPinned: false } : r) })));
      });
      window.ipcRenderer.on('pin-rule', (_e: any, ruleId: string) => {
        setCategories(prev => prev.map(c => ({ ...c, rules: c.rules.map(r => r.id === ruleId ? { ...r, isPinned: true } : r) })));
      });
      window.ipcRenderer.on('overlay-active', (_e: any, active: boolean) => setIsOverlayActive(active));
      
      // Sync initial pin state to main process
      window.ipcRenderer.send('toggle-pinned-window', localStorage.getItem('lexis-tools-overlay-pinned') === 'true');
    }
    document.body.style.backgroundColor = 'transparent';
    document.documentElement.style.backgroundColor = 'transparent';
    return () => {
      if (window.ipcRenderer) {
        window.ipcRenderer.removeAllListeners('sync-rules');
        window.ipcRenderer.removeAllListeners('sync-settings');
        window.ipcRenderer.removeAllListeners('unpin-rule');
        window.ipcRenderer.removeAllListeners('pin-rule');
        window.ipcRenderer.removeAllListeners('overlay-active');
      }
    };
  }, []);

  useEffect(() => {
    applyTheme(settings);
  }, [settings]);

  useEffect(() => {
    localStorage.setItem('lexis-tools-overlay-pinned', String(isWindowPinned));
  }, [isWindowPinned]);

  const allPinned: RuleWithCat[] = categories.flatMap(c =>
    c.rules.filter(r => r.isPinned).map(r => ({ ...r, categoryName: c.name }))
  );

  const openDetail = (rule: RuleWithCat) => {
    if (window.ipcRenderer) {
      // isPinned=true so detail window shows "Unpin" button
      window.ipcRenderer.send('open-detail', { rule, isPinned: true });
    }
  };

  useEffect(() => {
    if (window.ipcRenderer) {
      window.ipcRenderer.invoke('get-overlay-state').then((state: boolean) => {
        setIsOverlayActive(state);
      });
    }
  }, []);

  return (
    <ScaledContent baseWidth={340} baseHeight={600}>
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        background: 'rgba(18, 18, 22, 0.92)',
        backdropFilter: 'blur(12px)',
        borderRadius: '14px',
        border: '1px solid rgba(255,255,255,0.07)',
        overflow: 'hidden', position: 'relative',
        opacity: isOverlayActive ? settings.overlayOpacity : settings.overlayOpacity * 0.4,
        transition: 'opacity 0.2s ease'
      }}>
        {/* Header — draggable via CSS */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          padding: '12px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)',
          WebkitAppRegion: 'drag' as any, userSelect: 'none', flexShrink: 0
        }}>
          {/* Drag handle dots */}
          <div style={{ WebkitAppRegion: 'drag' as any, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.5 }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="white">
              <circle cx="5" cy="4" r="1.3"/><circle cx="11" cy="4" r="1.3"/>
              <circle cx="5" cy="8" r="1.3"/><circle cx="11" cy="8" r="1.3"/>
              <circle cx="5" cy="12" r="1.3"/><circle cx="11" cy="12" r="1.3"/>
            </svg>
          </div>
          <span style={{ fontWeight: 700, fontSize: '13px', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'white', flex: 1 }}>
            Закрепленные Правила
          </span>
          {/* Pin window toggle */}
          <button
            onClick={() => {
              const newState = !isWindowPinned;
              setIsWindowPinned(newState);
              if (window.ipcRenderer) {
                window.ipcRenderer.send('toggle-pinned-window', newState);
              }
            }}
            title={isWindowPinned ? "Открепить от экрана" : "Закрепить на экране"}
            style={{
              background: isWindowPinned ? 'rgba(80,130,255,0.2)' : 'rgba(255,255,255,0.07)',
              border: `1px solid ${isWindowPinned ? 'rgba(80,130,255,0.4)' : 'rgba(255,255,255,0.12)'}`,
              borderRadius: '6px', padding: '4px 6px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', WebkitAppRegion: 'no-drag' as any,
              color: isWindowPinned ? '#7aaeff' : 'rgba(255,255,255,0.6)',
              transition: 'all 0.15s'
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
            </svg>
          </button>
        </div>

        {/* Rules list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
          {allPinned.length === 0 && (
            <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.25)', fontSize: '13px', padding: '32px 12px' }}>
              Нет закреплённых правил
            </div>
          )}
          {allPinned.map(rule => (
            <div
              key={rule.id}
              onClick={() => openDetail(rule)}
              style={{
                padding: '10px 12px 12px 12px', marginBottom: '4px',
                background: 'rgba(0,0,0,0.2)',
                border: '1px solid rgba(255,255,255,0.04)',
                borderRadius: '9px', cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.2)')}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '6px', marginBottom: '4px' }}>
                <span style={{ fontWeight: 600, fontSize: '14px', color: 'white', flex: 1 }}>{rule.name}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
                  <span style={{
                    background: 'rgba(239,68,68,0.15)', color: '#ef4444',
                    padding: '3px 7px', borderRadius: '6px', fontSize: '11px', fontWeight: 700,
                    border: '1px solid rgba(239,68,68,0.25)', whiteSpace: 'nowrap'
                  }}>{rule.categoryName}</span>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="rgba(255,255,255,0.25)">
                    <path d="M3 4.5L6 7.5L9 4.5"/>
                  </svg>
                </div>
              </div>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.55)', lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '4px' }}>
                {rule.content}
              </div>
              {rule.punishments && rule.punishments.length > 0 ? (
                <div style={{ fontSize: '11px', color: 'rgba(255,200,100,0.85)', fontWeight: 600, display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                  {rule.punishments.map((p, i) => (
                    <span key={i}>
                      {i > 0 && <span style={{ opacity: 0.4, margin: '0 2px' }}>/</span>}
                      {p.type}{p.duration ? <span style={{ opacity: 0.6 }}> · {p.duration} {p.unit || 'мин'}</span> : null}
                    </span>
                  ))}
                </div>
              ) : rule.punishmentType && (
                <div style={{ fontSize: '11px', color: 'rgba(255,200,100,0.85)', fontWeight: 600, display: 'flex', gap: '4px' }}>
                  <span>{rule.punishmentType}</span>
                  {rule.duration ? <span style={{ opacity: 0.6 }}>· {rule.duration} {rule.durationUnit || 'мин'}</span> : null}
                </div>
              )}
            </div>
          ))}
        </div>
        <ResizeHandle />
      </div>
    </div>
    </ScaledContent>
  );
}
