import { useState, useEffect, useRef } from 'react';
import { CalendarDays, MapPin, Terminal, Search, Check, Trophy } from 'lucide-react';
import { EventTemplate, EventLocation, COMMAND_GROUPS, DEFAULT_LOCATIONS, DEFAULT_TEMPLATES, copyText } from '../lib/events';
import { Settings } from '../types';
import { applyTheme } from '../lib/theme';
import ScaledContent from './ScaledContent';

type SubTab = 'events' | 'locations' | 'commands';

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

export default function EventsOverlayApp() {
  const [templates, setTemplates] = useState<EventTemplate[]>(DEFAULT_TEMPLATES);
  const [locations, setLocations] = useState<EventLocation[]>(DEFAULT_LOCATIONS);
  const [settings, setSettings] = useState<Settings>({
    overlayHotkey: 'Alt+O', autoEnter: true, chatKey: 'T', sendKey: 'ENTER',
    overlayOpacity: 0.9, overlayScale: 1.0, memoEnabled: true, memoText: '', accentColor: '#5b7c9e'
  });
  const [subTab, setSubTab] = useState<SubTab>('events');
  const [searchQuery, setSearchQuery] = useState('');
  const [copied, setCopied] = useState<string | null>(null);

  const flashCopied = (key: string) => {
    setCopied(key);
    setTimeout(() => setCopied(null), 1200);
  };

  useEffect(() => {
    const titlebar = document.getElementById('titlebar');
    if (titlebar) titlebar.style.cssText = 'display:none!important';
    const root = document.getElementById('root');
    if (root) { root.style.paddingTop = '0'; root.classList.remove('pt-8'); }

    try {
      const savedEvents = localStorage.getItem('lexis-events-templates');
      if (savedEvents) { const p = JSON.parse(savedEvents); if (Array.isArray(p)) setTemplates(p); }
    } catch (e) {}
    try {
      const savedLocs = localStorage.getItem('lexis-events-locations');
      if (savedLocs) { const p = JSON.parse(savedLocs); if (Array.isArray(p)) setLocations(p); }
    } catch (e) {}
    const savedSettings = localStorage.getItem('lexis-tools-settings');
    if (savedSettings) { try { setSettings(prev => ({ ...prev, ...JSON.parse(savedSettings) })); } catch (e) {} }

    if (window.ipcRenderer) {
      window.ipcRenderer.on('sync-events', (_e: any, data: { templates?: EventTemplate[]; locations?: EventLocation[] }) => {
        if (data) {
          if (Array.isArray(data.templates)) setTemplates(data.templates);
          if (Array.isArray(data.locations)) setLocations(data.locations);
        }
      });
      window.ipcRenderer.on('sync-settings', (_e: any, data: Settings) => setSettings(prev => ({ ...prev, ...data })));
    }
    document.body.style.backgroundColor = 'transparent';
    document.documentElement.style.backgroundColor = 'transparent';
    return () => {
      if (window.ipcRenderer) {
        window.ipcRenderer.removeAllListeners('sync-events');
        window.ipcRenderer.removeAllListeners('sync-settings');
      }
    };
  }, []);

  useEffect(() => {
    applyTheme(settings);
  }, [settings]);

  const filteredTemplates = templates.filter(t => t.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredLocations = locations.filter(l =>
    l.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (l.coords || '').toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredCommands = COMMAND_GROUPS.map(g => ({
    ...g,
    commands: g.commands.filter(c => c.cmd.toLowerCase().includes(searchQuery.toLowerCase()) || c.desc.toLowerCase().includes(searchQuery.toLowerCase())),
  })).filter(g => g.commands.length > 0);

  const subTabs: { id: SubTab; label: string; icon: any }[] = [
    { id: 'events', label: 'Эвенты', icon: CalendarDays },
    { id: 'locations', label: 'Локации', icon: MapPin },
    { id: 'commands', label: 'Команды', icon: Terminal },
  ];

  const rowStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: '8px',
    padding: '8px 10px', marginBottom: '6px',
    background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.04)',
    borderRadius: '9px', cursor: 'pointer', transition: 'all 0.15s ease',
    WebkitAppRegion: 'no-drag' as any,
  };

  const copiedChip = (key: string) => (
    copied === key ? (
      <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#4ade80', fontWeight: 600, flexShrink: 0 }}>
        <Check size={12} /> Скопировано
      </span>
    ) : (
      <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)', flexShrink: 0 }}>копировать</span>
    )
  );

  return (
    <ScaledContent baseWidth={400} baseHeight={650}>
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
        {/* Header — draggable */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          padding: '12px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)',
          WebkitAppRegion: 'drag' as any, userSelect: 'none', flexShrink: 0
        }}>
          <div style={{ WebkitAppRegion: 'drag' as any, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.5 }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="white">
              <circle cx="5" cy="4" r="1.3"/><circle cx="11" cy="4" r="1.3"/>
              <circle cx="5" cy="8" r="1.3"/><circle cx="11" cy="8" r="1.3"/>
              <circle cx="5" cy="12" r="1.3"/><circle cx="11" cy="12" r="1.3"/>
            </svg>
          </div>
          <Trophy size={16} style={{ color: 'rgba(167,139,250,0.9)', flexShrink: 0, WebkitAppRegion: 'no-drag' as any }} />
          <span style={{ fontWeight: 700, fontSize: '13px', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'white' }}>
            Эвенты
          </span>
        </div>

        {/* Sub tabs */}
        <div style={{ display: 'flex', gap: '4px', padding: '10px 12px 4px', flexShrink: 0, WebkitAppRegion: 'no-drag' as any }}>
          {subTabs.map(t => {
            const active = subTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setSubTab(t.id)}
                style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                  padding: '7px 0', borderRadius: '8px', cursor: 'pointer', border: 'none',
                  fontSize: '12px', fontWeight: 600,
                  background: active ? 'rgba(123,152,184,0.28)' : 'rgba(255,255,255,0.04)',
                  color: active ? '#fff' : 'rgba(255,255,255,0.5)',
                  transition: 'all 0.18s',
                }}
              >
                <t.icon size={13} /> {t.label}
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div style={{ padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.05)', flexShrink: 0, WebkitAppRegion: 'no-drag' as any }}>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.35)' }} />
            <input
              type="text"
              placeholder="Поиск..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                width: '100%', padding: '8px 12px 8px 32px',
                background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: '8px', color: 'white', fontSize: '13px', outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '10px', WebkitAppRegion: 'no-drag' as any }}>
          {subTab === 'events' && (
            <>
              {[{ sponsor: false, title: 'Без спонсора' }, { sponsor: true, title: 'Со спонсором' }].map(group => {
                const items = filteredTemplates.filter(t => t.sponsor === group.sponsor);
                if (items.length === 0) return null;
                return (
                  <div key={String(group.sponsor)} style={{ marginBottom: '10px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: group.sponsor ? 'rgba(167,139,250,0.8)' : 'rgba(255,255,255,0.35)', marginBottom: '6px', padding: '0 2px' }}>
                      {group.title} · {items.length}
                    </div>
                    {items.map(ev => (
                      <div
                        key={ev.id}
                        style={rowStyle}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.2)')}
                        onClick={() => { copyText(ev.name); flashCopied('ev-' + ev.id); }}
                      >
                        <CalendarDays size={14} style={{ color: 'rgba(123,152,184,0.8)', flexShrink: 0 }} />
                        <span style={{ flex: 1, fontSize: '13px', fontWeight: 500, color: 'white', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {ev.name}
                        </span>
                        {copiedChip('ev-' + ev.id)}
                      </div>
                    ))}
                  </div>
                );
              })}
              {filteredTemplates.length === 0 && (
                <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '13px', padding: '28px 0' }}>Эвенты не найдены</div>
              )}
            </>
          )}

          {subTab === 'locations' && (
            <>
              {filteredLocations.map(loc => (
                <div
                  key={loc.id}
                  style={rowStyle}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.2)')}
                  onClick={() => {
                    const c = (loc.coords || '').split(',').map(s => s.trim()).filter(Boolean);
                    copyText(c.length >= 2 ? `/tpc ${c[0]} ${c[1]} ${c[2] || '0'}` : loc.name);
                    flashCopied('loc-' + loc.id);
                  }}
                >
                  <MapPin size={14} style={{ color: 'rgba(96,165,250,0.85)', flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: '13px', fontWeight: 500, color: 'white', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {loc.name}
                  </span>
                  {loc.coords ? (
                    <span style={{ fontSize: '11px', color: 'rgba(157,184,210,0.8)', fontFamily: 'monospace', background: 'rgba(123,152,184,0.12)', border: '1px solid rgba(123,152,184,0.2)', padding: '1px 6px', borderRadius: '999px', flexShrink: 0 }}>
                      {loc.coords}
                    </span>
                  ) : copiedChip('loc-' + loc.id)}
                </div>
              ))}
              {filteredLocations.length === 0 && (
                <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '13px', padding: '28px 0' }}>Локации не найдены</div>
              )}
            </>
          )}

          {subTab === 'commands' && (
            <>
              {filteredCommands.map((group, i) => (
                <div key={i} style={{ marginBottom: '10px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', marginBottom: '6px', padding: '0 2px' }}>
                    {group.title}
                  </div>
                  {group.commands.map((cmd, j) => (
                    <div
                      key={j}
                      style={rowStyle}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.2)')}
                      onClick={() => { copyText(cmd.cmd); flashCopied('cmd-' + i + '-' + j); }}
                    >
                      <Terminal size={14} style={{ color: 'rgba(52,211,153,0.8)', flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontFamily: 'monospace', fontSize: '12px', color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{cmd.cmd}</div>
                        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)', marginTop: '2px' }}>{cmd.desc}</div>
                      </div>
                      {copiedChip('cmd-' + i + '-' + j)}
                    </div>
                  ))}
                </div>
              ))}
              {filteredCommands.length === 0 && (
                <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '13px', padding: '28px 0' }}>Команды не найдены</div>
              )}
            </>
          )}
        </div>

        <ResizeHandle />
      </div>
    </div>
    </ScaledContent>
  );
}