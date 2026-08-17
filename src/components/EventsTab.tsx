import { useState, useEffect } from 'react';
import type { CSSProperties } from 'react';
import { MapPin, CalendarDays, Terminal, Plus, Trash2, Copy, Search, Pencil, Check, X, Trophy, Users, StickyNote } from 'lucide-react';
import { EventLocation, EventTemplate, COMMAND_GROUPS, DEFAULT_LOCATIONS, DEFAULT_TEMPLATES, uid, copyText } from '../lib/events';

type SubTab = 'list' | 'locations' | 'commands';

export default function EventsTab() {
  const [subTab, setSubTab] = useState<SubTab>('list');

  const [locations, setLocations] = useState<EventLocation[]>(() => {
    try {
      const saved = localStorage.getItem('lexis-events-locations');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return DEFAULT_LOCATIONS;
  });

  const [templates, setTemplates] = useState<EventTemplate[]>(() => {
    try {
      const saved = localStorage.getItem('lexis-events-templates');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return DEFAULT_TEMPLATES;
  });

  useEffect(() => {
    localStorage.setItem('lexis-events-locations', JSON.stringify(locations));
  }, [locations]);

  useEffect(() => {
    localStorage.setItem('lexis-events-templates', JSON.stringify(templates));
  }, [templates]);

  useEffect(() => {
    if (window.ipcRenderer) {
      window.ipcRenderer.send('sync-events', { templates, locations });
    }
  }, [templates, locations]);

  const [search, setSearch] = useState('');
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  // Location editing state
  const [newLocationName, setNewLocationName] = useState('');
  const [newLocationCoords, setNewLocationCoords] = useState('');
  const [editingLocId, setEditingLocId] = useState<string | null>(null);
  const [editLocName, setEditLocName] = useState('');
  const [editLocCoords, setEditLocCoords] = useState('');

  const [newEventName, setNewEventName] = useState('');
  const [newEventSponsor, setNewEventSponsor] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [editEventName, setEditEventName] = useState('');
  const [editEventSponsor, setEditEventSponsor] = useState(false);

  const [copied, setCopied] = useState<string | null>(null);

  const flashCopied = (key: string) => {
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  };

  const addLocation = () => {
    if (!newLocationName.trim()) return;
    setLocations(prev => [...prev, { id: uid(), name: newLocationName.trim(), coords: newLocationCoords.trim() }]);
    setNewLocationName('');
    setNewLocationCoords('');
  };

  const startEditLocation = (loc: EventLocation) => {
    setEditingLocId(loc.id);
    setEditLocName(loc.name);
    setEditLocCoords(loc.coords || '');
  };

  const saveLocation = (id: string) => {
    setLocations(prev => prev.map(l => l.id === id ? { ...l, name: editLocName.trim() || l.name, coords: editLocCoords.trim() } : l));
    setEditingLocId(null);
  };

  const addEvent = () => {
    if (!newEventName.trim()) return;
    setTemplates(prev => [...prev, { id: uid(), name: newEventName.trim(), sponsor: newEventSponsor }]);
    setNewEventName('');
  };

  const startEditEvent = (ev: EventTemplate) => {
    setEditingEventId(ev.id);
    setEditEventName(ev.name);
    setEditEventSponsor(ev.sponsor);
  };

  const saveEvent = (id: string) => {
    setTemplates(prev => prev.map(e => e.id === id ? { ...e, name: editEventName.trim() || e.name, sponsor: editEventSponsor } : e));
    setEditingEventId(null);
  };

  const subTabs: { id: SubTab; label: string; icon: any; count: number }[] = [
    { id: 'list', label: 'Список эвентов', icon: CalendarDays, count: templates.length },
    { id: 'locations', label: 'Локации', icon: MapPin, count: locations.length },
    { id: 'commands', label: 'Команды', icon: Terminal, count: COMMAND_GROUPS.length },
  ];

  const filteredTemplates = templates.filter(t => t.name.toLowerCase().includes(search.toLowerCase()));
  const filteredLocations = locations.filter(l =>
    l.name.toLowerCase().includes(search.toLowerCase()) ||
    (l.coords || '').toLowerCase().includes(search.toLowerCase())
  );

  const inputStyle: CSSProperties = {
    width: '100%', padding: '10px 12px', background: 'rgba(255,255,255,0.06)',
    border: '1px solid var(--border-glass)', borderRadius: '8px', color: '#fff',
    fontSize: '13px', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s, box-shadow 0.2s',
  };

  const actionBtn: CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: '30px', height: '30px', flexShrink: 0,
    background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-glass)', borderRadius: '8px',
    color: 'var(--text-muted)', cursor: 'pointer', transition: 'all 0.2s',
  };

  return (
    <div style={{ padding: '30px', maxWidth: '860px' }}>
      <style>{`
        .ev-row:hover {
          border-color: color-mix(in srgb, var(--accent-color) 40%, var(--border-glass)) !important;
          box-shadow: 0 2px 12px color-mix(in srgb, var(--accent-color) 10%, transparent);
        }
        .ev-action:hover {
          background: rgba(255,255,255,0.1) !important;
          color: #fff !important;
          border-color: rgba(255,255,255,0.2) !important;
        }
        .ev-action.danger:hover {
          background: rgba(239,68,68,0.18) !important;
          color: #ff6b6b !important;
          border-color: rgba(239,68,68,0.35) !important;
        }
        .ev-action.ok:hover {
          background: color-mix(in srgb, var(--accent-color) 25%, transparent) !important;
          color: #fff !important;
          border-color: color-mix(in srgb, var(--accent-color) 50%, transparent) !important;
        }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '26px', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '52px', height: '52px', borderRadius: '14px', flexShrink: 0,
            background: 'color-mix(in srgb, var(--accent-color) 18%, transparent)',
            border: '1px solid color-mix(in srgb, var(--accent-color) 35%, transparent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--accent-color)',
          }}>
            <Trophy size={26} />
          </div>
          <div>
            <h2 style={{ fontSize: '26px', fontWeight: 800, margin: 0, marginBottom: '4px' }}>Эвенты</h2>
            <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '13px' }}>Регламент проведения мероприятий для администрации</p>
          </div>
        </div>
        <div style={{ position: 'relative', width: '240px' }}>
          <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Поиск..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', boxSizing: 'border-box', background: 'var(--bg-card)', border: '1px solid var(--border-glass)', borderRadius: '9px', padding: '9px 12px 9px 34px', color: '#fff', fontSize: '13px', outline: 'none' }}
          />
        </div>
      </div>

      {/* Sub tabs */}
      <div style={{ display: 'inline-flex', gap: '4px', padding: '4px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-glass)', borderRadius: '12px', marginBottom: '24px' }}>
        {subTabs.map(t => {
          const active = subTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setSubTab(t.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 14px', borderRadius: '9px', cursor: 'pointer',
                fontSize: '13px', fontWeight: 600, border: 'none',
                background: active ? 'var(--button-color, var(--accent-color))' : 'transparent',
                color: active ? '#fff' : 'var(--text-muted)',
                boxShadow: active ? '0 4px 14px color-mix(in srgb, var(--accent-color) 35%, transparent)' : 'none',
                transition: 'all 0.22s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            >
              <t.icon size={15} />
              {t.label}
              <span style={{
                background: active ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.07)',
                color: active ? '#fff' : 'var(--text-muted)',
                borderRadius: '999px', padding: '1px 7px', fontSize: '11px', lineHeight: '16px',
              }}>{t.count}</span>
            </button>
          );
        })}
      </div>

      {/* LIST */}
      {subTab === 'list' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Add form */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-glass)', borderRadius: '14px', padding: '18px', display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 240px', minWidth: '200px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>Название эвента</label>
              <input
                type="text"
                placeholder="Например: Гонка на хищниках"
                value={newEventName}
                onChange={e => setNewEventName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') addEvent(); }}
                style={inputStyle}
              />
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0 4px 10px 0', cursor: 'pointer', userSelect: 'none' }}>
              <input type="checkbox" checked={newEventSponsor} onChange={e => setNewEventSponsor(e.target.checked)} style={{ accentColor: 'var(--accent-color)' }} />
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Со спонсором</span>
            </label>
            <button className="primary-btn" onClick={addEvent} style={{ padding: '10px 18px', marginBottom: '2px' }}>
              <Plus size={15} /> Добавить
            </button>
          </div>

          {[{ sponsor: false, title: 'Без спонсора', icon: Users }, { sponsor: true, title: 'Со спонсором', icon: Trophy }].map(group => {
            const items = filteredTemplates.filter(t => t.sponsor === group.sponsor);
            const groupKey = `events-${group.sponsor}`;
            const isCollapsed = collapsedGroups[groupKey];
            return (
              <div key={String(group.sponsor)} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-glass)', borderRadius: '14px', overflow: 'hidden' }}>
                <div style={{ padding: '13px 18px', background: 'rgba(255,255,255,0.03)', borderBottom: isCollapsed ? 'none' : '1px solid var(--border-glass)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <group.icon size={16} style={{ color: 'var(--accent-color)' }} />
                  <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, flex: 1 }}>{group.title}</h3>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.06)', padding: '2px 9px', borderRadius: '999px' }}>{items.length}</span>
                  <button
                    onClick={() => setCollapsedGroups(prev => ({ ...prev, [groupKey]: !isCollapsed }))}
                    style={{ width: '28px', height: '28px', border: '1px solid var(--border-glass)', borderRadius: '8px', background: 'rgba(255,255,255,0.04)', color: 'var(--text-main)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    {isCollapsed ? '+' : '−'}
                  </button>
                </div>
                {!isCollapsed && (
                  <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {items.map(ev => (
                      <div key={ev.id} className="ev-row" style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(255,255,255,0.035)', border: '1px solid var(--border-glass)', borderRadius: '10px', padding: '9px 12px', transition: 'all 0.2s' }}>
                        {editingEventId === ev.id ? (
                          <>
                            <input type="text" value={editEventName} onChange={e => setEditEventName(e.target.value)} style={{ ...inputStyle, flex: 1 }} />
                            <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}>
                              <input type="checkbox" checked={editEventSponsor} onChange={e => setEditEventSponsor(e.target.checked)} style={{ accentColor: 'var(--accent-color)' }} />
                              Спонсор
                            </label>
                            <button className="ev-action ok" onClick={() => saveEvent(ev.id)} title="Сохранить" style={actionBtn}><Check size={14} /></button>
                            <button className="ev-action" onClick={() => setEditingEventId(null)} title="Отмена" style={actionBtn}><X size={14} /></button>
                          </>
                        ) : (
                          <>
                            <CalendarDays size={16} style={{ color: 'var(--accent-color)', flexShrink: 0, opacity: 0.8 }} />
                            <span style={{ flex: 1, fontSize: '14px', fontWeight: 500, color: '#fff', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.name}</span>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)', background: ev.sponsor ? 'rgba(167,139,250,0.14)' : 'rgba(255,255,255,0.06)', border: `1px solid ${ev.sponsor ? 'rgba(167,139,250,0.3)' : 'var(--border-glass)'}`, padding: '3px 9px', borderRadius: '999px' }}>
                              {ev.sponsor ? 'Со спонсором' : 'Без спонсора'}
                            </span>
                            <button className="ev-action" onClick={() => { copyText(ev.name); flashCopied('ev-' + ev.id); }} title="Скопировать" style={{ ...actionBtn, color: copied === 'ev-' + ev.id ? '#10b981' : 'var(--text-muted)' }}>
                              {copied === 'ev-' + ev.id ? <Check size={14} /> : <Copy size={14} />}
                            </button>
                            <button className="ev-action" onClick={() => startEditEvent(ev)} title="Изменить" style={actionBtn}><Pencil size={14} /></button>
                            <button className="ev-action danger" onClick={() => setTemplates(prev => prev.filter(e => e.id !== ev.id))} title="Удалить" style={actionBtn}><Trash2 size={14} /></button>
                          </>
                        )}
                      </div>
                    ))}
                    {items.length === 0 && (
                      <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                        {search ? 'По запросу ничего не найдено' : 'Пока пусто — добавьте первый эвент'}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          {filteredTemplates.length === 0 && !search && (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Ничего не найдено</div>
          )}
        </div>
      )}

      {/* LOCATIONS */}
      {subTab === 'locations' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-glass)', borderRadius: '14px', padding: '18px', display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 220px', minWidth: '160px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>Название локации</label>
              <input type="text" placeholder="Например: Пляж" value={newLocationName} onChange={e => setNewLocationName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') addLocation(); }} style={inputStyle} />
            </div>
            <div style={{ flex: '1 1 180px', minWidth: '140px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>Координаты (tpc x y z)</label>
              <input type="text" placeholder="x, y, z" value={newLocationCoords} onChange={e => setNewLocationCoords(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') addLocation(); }} style={inputStyle} />
            </div>
            <button className="primary-btn" onClick={addLocation} style={{ padding: '10px 18px', marginBottom: '2px' }}>
              <Plus size={15} /> Добавить
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {filteredLocations.map(loc => (
              <div key={loc.id} className="ev-row" style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--bg-card)', border: '1px solid var(--border-glass)', borderRadius: '12px', padding: '11px 14px', transition: 'all 0.2s' }}>
                <div style={{
                  width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0,
                  background: 'color-mix(in srgb, var(--accent-color) 14%, transparent)',
                  border: '1px solid color-mix(in srgb, var(--accent-color) 25%, transparent)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-color)',
                }}>
                  <MapPin size={17} />
                </div>
                {editingLocId === loc.id ? (
                  <>
                    <input type="text" value={editLocName} onChange={e => setEditLocName(e.target.value)} style={{ ...inputStyle, flex: 1 }} />
                    <input type="text" value={editLocCoords} onChange={e => setEditLocCoords(e.target.value)} placeholder="x, y, z" style={{ ...inputStyle, flex: '1' }} />
                    <button className="ev-action ok" onClick={() => saveLocation(loc.id)} title="Сохранить" style={actionBtn}><Check size={14} /></button>
                    <button className="ev-action" onClick={() => setEditingLocId(null)} title="Отмена" style={actionBtn}><X size={14} /></button>
                  </>
                ) : (
                  <>
                    <span style={{ flex: 1, fontSize: '14px', fontWeight: 500, color: '#fff', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{loc.name}</span>
                    {loc.coords ? (
                      <span style={{ fontSize: '12px', color: '#9db8d2', fontFamily: 'monospace', background: 'rgba(123,152,184,0.12)', border: '1px solid rgba(123,152,184,0.25)', padding: '3px 9px', borderRadius: '999px' }}>{loc.coords}</span>
                    ) : (
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)', opacity: 0.6, fontStyle: 'italic' }}>без координат</span>
                    )}
                    {loc.coords && (
                      <button
                        className="ev-action"
                        onClick={() => { const c = loc.coords!.split(',').map(s => s.trim()).filter(Boolean); copyText(c.length >= 2 ? `/tpc ${c[0]} ${c[1]} ${c[2] || '0'}` : loc.coords!); flashCopied('loc-copy-' + loc.id); }}
                        title="Скопировать телепорт"
                        style={{ ...actionBtn, color: copied === 'loc-copy-' + loc.id ? '#10b981' : 'var(--text-muted)' }}
                      >
                        {copied === 'loc-copy-' + loc.id ? <Check size={14} /> : <Copy size={14} />}
                      </button>
                    )}
                    <button className="ev-action" onClick={() => startEditLocation(loc)} title="Изменить" style={actionBtn}><Pencil size={14} /></button>
                    <button className="ev-action danger" onClick={() => setLocations(prev => prev.filter(l => l.id !== loc.id))} title="Удалить" style={actionBtn}><Trash2 size={14} /></button>
                  </>
                )}
              </div>
            ))}
            {filteredLocations.length === 0 && (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                {search ? 'По запросу ничего не найдено' : 'Локации не добавлены'}
              </div>
            )}
          </div>
        </div>
      )}

      {/* COMMANDS */}
      {subTab === 'commands' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Regulation info */}
          <div style={{ background: 'rgba(16, 185, 129, 0.04)', border: '1px solid rgba(16, 185, 129, 0.18)', borderRadius: '14px', padding: '18px' }}>
            <div style={{ color: '#10b981', fontWeight: 600, fontSize: '14px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <StickyNote size={16} /> Правила проведения
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: '13px', lineHeight: '1.8', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '2px 20px' }}>
              <span>• Если проводите МП с другим админом — засчитывается каждому в лимит</span>
              <span>• Минимальный уровень администратора: 3</span>
              <span>• Длительность МП: до 45 минут</span>
              <span>• Максимум МП на админа: 10 в сутки</span>
              <span>• Дименшен любой, кроме 0</span>
              <span>• Приоритет: сначала репорты → потом МП</span>
            </div>
          </div>

          {COMMAND_GROUPS.map((group, i) => (
            <div key={i} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-glass)', borderRadius: '14px', overflow: 'hidden' }}>
              <div style={{ padding: '13px 18px', background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--border-glass)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Terminal size={16} style={{ color: 'var(--accent-color)' }} />
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, flex: 1 }}>{group.title}</h3>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.06)', padding: '2px 9px', borderRadius: '999px' }}>{group.commands.length}</span>
              </div>
              <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {group.commands.map((cmd, j) => (
                  <div key={j} className="ev-row" style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(255,255,255,0.035)', border: '1px solid var(--border-glass)', borderRadius: '10px', padding: '10px 12px', transition: 'all 0.2s' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: 'monospace', fontSize: '13px', color: '#fff', wordBreak: 'break-word', userSelect: 'text' }}>{cmd.cmd}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '3px' }}>{cmd.desc}</div>
                    </div>
                    <button
                      className="ev-action ok"
                      onClick={() => { copyText(cmd.cmd); flashCopied('cmd-' + i + '-' + j); }}
                      title="Скопировать"
                      style={{ ...actionBtn, color: copied === 'cmd-' + i + '-' + j ? '#10b981' : 'var(--text-muted)' }}
                    >
                      {copied === 'cmd-' + i + '-' + j ? <Check size={14} /> : <Copy size={14} />}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}