import { useState, useEffect, useRef } from 'react';
import { Search, Pin, Maximize2, Minimize2, ChevronDown, ChevronRight } from 'lucide-react';
import { RuleCategory, Settings, Rule } from '../types';
import HighlightText from './HighlightText';
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

export default function OverlayApp() {
  const [categories, setCategories] = useState<RuleCategory[]>([]);
  const [settings, setSettings] = useState<Settings>({
    overlayHotkey: 'Alt+O',
    autoEnter: true, chatKey: 'T', sendKey: 'ENTER',
    overlayOpacity: 0.9, overlayScale: 1.0,
    memoEnabled: true, memoText: '', accentColor: '#5b7c9e'
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [localPinned, setLocalPinned] = useState<Set<string>>(new Set());
  const [overlayPinned, setOverlayPinned] = useState(false);
  const [compact, setCompact] = useState(false);
  const [collapsedCats, setCollapsedCats] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem('lexis-overlay-collapsed-cats');
      if (raw) return new Set(JSON.parse(raw));
    } catch (e) {}
    return new Set();
  });

  const toggleCat = (name: string) => {
    setCollapsedCats(prev => {
      const s = new Set(prev);
      if (s.has(name)) s.delete(name); else s.add(name);
      try { localStorage.setItem('lexis-overlay-collapsed-cats', JSON.stringify([...s])); } catch (e) {}
      return s;
    });
  };

  useEffect(() => {
    // Hide custom HTML titlebar
    const titlebar = document.getElementById('titlebar');
    if (titlebar) titlebar.style.cssText = 'display:none!important';
    const root = document.getElementById('root');
    if (root) { root.style.paddingTop = '0'; root.classList.remove('pt-8'); }

    const activeProfile = localStorage.getItem('lexis-tools-active-profile') || 'default';
    const savedRules = localStorage.getItem(`lexis-tools-rules-${activeProfile}`);
    if (savedRules) { try { setCategories(JSON.parse(savedRules)); } catch(e) {} }
    const savedSettings = localStorage.getItem('lexis-tools-settings');
    if (savedSettings) { try { setSettings(prev => ({ ...prev, ...JSON.parse(savedSettings) })); } catch(e) {} }
    if (window.ipcRenderer) {
      window.ipcRenderer.on('sync-rules', (_e: any, data: RuleCategory[]) => setCategories(data));
      window.ipcRenderer.on('sync-settings', (_e: any, data: Settings) => setSettings(prev => ({ ...prev, ...data })));
      window.ipcRenderer.on('overlay-pin-state', (_e: any, pinned: boolean) => setOverlayPinned(pinned));
      // Track pin/unpin to update UI instantly
      window.ipcRenderer.on('pin-rule', (_e: any, ruleId: string) => setLocalPinned(prev => new Set([...prev, ruleId])));
      window.ipcRenderer.on('unpin-rule', (_e: any, ruleId: string) => setLocalPinned(prev => { const s = new Set(prev); s.delete(ruleId); return s; }));
    }
    document.body.style.backgroundColor = 'transparent';
    document.documentElement.style.backgroundColor = 'transparent';
    return () => {
      if (window.ipcRenderer) {
        window.ipcRenderer.removeAllListeners('sync-rules');
        window.ipcRenderer.removeAllListeners('sync-settings');
        window.ipcRenderer.removeAllListeners('overlay-pin-state');
        window.ipcRenderer.removeAllListeners('pin-rule');
        window.ipcRenderer.removeAllListeners('unpin-rule');
      }
    };
  }, []);

  useEffect(() => {
    applyTheme(settings);
  }, [settings]);

  const q = searchQuery.toLowerCase();
  const grouped = categories
    .map(c => ({
      cat: c,
      rules: c.rules
        .filter(r =>
          q === '' ||
          r.name.toLowerCase().includes(q) ||
          r.content.toLowerCase().includes(q) ||
          c.name.toLowerCase().includes(q)
        )
        .map(r => ({ ...r, categoryName: c.name }))
    }))
    .filter(g => g.rules.length > 0);

  const openDetail = (rule: RuleWithCat) => {
    if (window.ipcRenderer) {
      window.ipcRenderer.send('open-detail', { rule, isPinned: false, searchQuery });
    }
  };

  const handlePinToggle = (e: React.MouseEvent, rule: RuleWithCat) => {
    e.stopPropagation();
    const isPinned = localPinned.has(rule.id) || rule.isPinned;
    if (isPinned) {
      if (window.ipcRenderer) window.ipcRenderer.send('unpin-rule', rule.id);
      setLocalPinned(prev => { const s = new Set(prev); s.delete(rule.id); return s; });
    } else {
      if (window.ipcRenderer) window.ipcRenderer.send('pin-rule', rule.id);
      setLocalPinned(prev => new Set([...prev, rule.id]));
    }
  };

  const togglePinOverlay = () => {
    if (window.ipcRenderer) window.ipcRenderer.send('toggle-overlay-pin');
  };

  const toggleCompact = () => {
    const next = !compact;
    setCompact(next);
    if (window.ipcRenderer) window.ipcRenderer.send('set-overlay-compact', next);
  };

  const headerBtnStyle = (active: boolean) => ({
    display: 'flex' as const, alignItems: 'center' as const, justifyContent: 'center' as const,
    width: 26, height: 26, borderRadius: 6, cursor: 'pointer' as const, border: 'none',
    background: active ? 'rgba(91,124,158,0.25)' : 'rgba(255,255,255,0.06)',
    color: active ? '#9db8d2' : 'rgba(255,255,255,0.55)',
    WebkitAppRegion: 'no-drag' as any, transition: 'background 0.15s ease, color 0.15s ease', flexShrink: 0,
  });

  return (
    <ScaledContent baseWidth={compact ? 300 : 420} baseHeight={compact ? 48 : 680}>
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        background: 'rgba(18, 18, 22, 0.92)',
        backdropFilter: 'blur(12px)',
        borderRadius: '14px',
        border: '1px solid rgba(255,255,255,0.07)',
        overflow: 'hidden', position: 'relative',
        opacity: settings.overlayOpacity
      }}>
        {/* Header — draggable via CSS */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          padding: compact ? '8px 10px' : '12px 14px', borderBottom: compact ? 'none' : '1px solid rgba(255,255,255,0.06)',
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
          <Search size={16} style={{ color: 'rgba(255,255,255,0.5)', flexShrink: 0, WebkitAppRegion: 'no-drag' as any }} />
          <span style={{ fontWeight: 700, fontSize: '14px', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'white', flex: 1, whiteSpace: 'nowrap' }}>
            {compact ? 'Правила' : 'Поиск Правил'}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              onClick={togglePinOverlay}
              title={overlayPinned ? 'Открепить оверлей' : 'Закрепить оверлей'}
              style={headerBtnStyle(overlayPinned)}
            >
              <Pin size={14} style={overlayPinned ? { fill: 'currentColor' } : undefined} />
            </button>
            <button
              onClick={toggleCompact}
              title={compact ? 'Развернуть оверлей' : 'Свернуть оверлей'}
              style={headerBtnStyle(false)}
            >
              {compact ? <Maximize2 size={14} /> : <Minimize2 size={14} />}
            </button>
          </div>
        </div>

        {!compact && (
        <>
        {/* Search input */}
        <div style={{ padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,0.05)', flexShrink: 0 }}>
          <input
            type="text"
            placeholder="Введите ключевое слово..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{
              width: '100%', padding: '9px 12px',
              background: 'rgba(0,0,0,0.35)',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: '8px', color: 'white',
              fontSize: '14px', outline: 'none', boxSizing: 'border-box',
              WebkitAppRegion: 'no-drag' as any
            }}
          />
        </div>

        {/* Rules list grouped by chapters */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
          {grouped.map(g => {
            const catName = g.cat.name;
            const isCollapsed = q === '' && collapsedCats.has(catName);
            return (
              <div key={catName} style={{ marginBottom: '8px' }}>
                {/* Chapter header */}
                <div
                  onClick={() => toggleCat(catName)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '8px 10px', marginBottom: '6px', cursor: 'pointer',
                    background: isCollapsed ? 'rgba(91,124,158,0.1)' : 'rgba(91,124,158,0.16)',
                    border: '1px solid rgba(91,124,158,0.3)',
                    borderRadius: '8px', userSelect: 'none',
                    WebkitAppRegion: 'no-drag' as any, transition: 'background 0.15s ease'
                  }}
                  title={isCollapsed ? 'Развернуть главу' : 'Скрыть главу'}
                >
                  {isCollapsed
                    ? <ChevronRight size={15} style={{ color: '#9db8d2', flexShrink: 0 }} />
                    : <ChevronDown size={15} style={{ color: '#9db8d2', flexShrink: 0 }} />}
                  <span style={{
                    flex: 1, fontSize: '13px', fontWeight: 700, letterSpacing: '0.05em',
                    textTransform: 'uppercase', color: '#9db8d2', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                  }}>
                    <HighlightText text={catName} query={searchQuery} />
                  </span>
                  <span style={{
                    background: 'rgba(91,124,158,0.25)', color: '#b8cbe0', borderRadius: '6px',
                    padding: '1px 8px', fontSize: '12px', fontWeight: 700, flexShrink: 0
                  }}>
                    {g.rules.length}
                  </span>
                </div>

                {!isCollapsed && g.rules.map(rule => {
                  const pinned = localPinned.has(rule.id) || rule.isPinned;
                  return (
                    <div
                      key={rule.id}
                      onClick={() => openDetail(rule)}
                      style={{
                        padding: '10px 12px 12px 12px', marginBottom: '6px', marginLeft: '10px',
                        background: 'rgba(0,0,0,0.2)',
                        border: '1px solid rgba(255,255,255,0.04)',
                        borderRadius: '9px', cursor: 'pointer', position: 'relative',
                        transition: 'all 0.15s ease'
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.2)')}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '6px', marginBottom: '6px' }}>
                        <span style={{ fontWeight: 600, fontSize: '16px', color: 'white', flex: 1 }}>
                          <HighlightText text={rule.name} query={searchQuery} />
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
                          {/* Pin button */}
                          <button
                            onClick={e => handlePinToggle(e, rule)}
                            title={pinned ? 'Открепить' : 'Закрепить'}
                            style={{
                              background: pinned ? 'rgba(80,130,255,0.2)' : 'rgba(255,255,255,0.07)',
                              border: `1px solid ${pinned ? 'rgba(80,130,255,0.4)' : 'rgba(255,255,255,0.12)'}`,
                              borderRadius: '5px', cursor: 'pointer', padding: '3px 5px',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              color: pinned ? '#7aaeff' : 'rgba(255,255,255,0.45)',
                              WebkitAppRegion: 'no-drag' as any
                            }}
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
                            </svg>
                          </button>
                          {/* Arrow */}
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="rgba(255,255,255,0.25)" style={{ flexShrink: 0 }}>
                            <path d="M3 4.5L6 7.5L9 4.5"/>
                          </svg>
                        </div>
                      </div>
                      <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.55)', lineHeight: 1.45, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '6px' }}>
                        <HighlightText text={rule.content} query={searchQuery} />
                      </div>
                      {rule.punishments && rule.punishments.length > 0 ? (
                        <div style={{ fontSize: '12px', color: 'rgba(255,200,100,0.85)', fontWeight: 600, display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                          {rule.punishments.map((p, i) => (
                            <span key={i}>
                              {i > 0 && <span style={{ opacity: 0.4, margin: '0 2px' }}>/</span>}
                              {p.type}{p.duration ? <span style={{ opacity: 0.6 }}> · {p.duration} {p.unit || 'мин'}</span> : null}
                            </span>
                          ))}
                        </div>
                      ) : rule.punishmentType && (
                        <div style={{ fontSize: '12px', color: 'rgba(255,200,100,0.85)', fontWeight: 600, display: 'flex', gap: '4px' }}>
                          <span>{rule.punishmentType}</span>
                          {rule.duration ? <span style={{ opacity: 0.6 }}>· {rule.duration} {rule.durationUnit || 'мин'}</span> : null}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
          {grouped.length === 0 && (
            <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '13px', padding: '32px 0' }}>
              Ничего не найдено
            </div>
          )}
        </div>

        <ResizeHandle />
        </>
        )}
      </div>
    </div>
    </ScaledContent>
  );
}
