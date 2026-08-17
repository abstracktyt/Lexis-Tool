import { useState, useEffect, useRef } from 'react';
import { Settings, Bind, BindAction } from '../types';
import { Plus, Trash } from 'lucide-react';
import { CODE_TO_KEY, getDisplayKey } from '../lib/hotkeys';

const ROLE_BIND_PRESETS: Record<string, Bind[]> = {
  junior: [
    { name: 'Проверить лицензию', hotkey: '', actions: [{ type: 'chat', value: '/license [id]' }] },
    { name: 'ДМ игроку', hotkey: '', actions: [{ type: 'chat', value: '/dm [id] Ваше сообщение' }] },
    { name: 'Открыть прайс', hotkey: '', actions: [{ type: 'chat', value: '/price' }] },
  ],
  admin: [
    { name: 'Выдать предупреждение', hotkey: '', actions: [{ type: 'chat', value: '/warn [id] Причина' }] },
    { name: 'Эвакуировать транспорт', hotkey: '', actions: [{ type: 'chat', value: '/ev [id]' }] },
    { name: 'Лицензия на оружие', hotkey: '', actions: [{ type: 'chat', value: '/gunlicense [id]' }] },
    { name: 'Наручники', hotkey: '', actions: [{ type: 'chat', value: '/cuff [id]' }] },
  ],
  senior: [
    { name: 'Выдать бан', hotkey: '', actions: [{ type: 'chat', value: '/ban [id] 0 Причина' }] },
    { name: 'Разбанить', hotkey: '', actions: [{ type: 'chat', value: '/unban [id]' }] },
    { name: 'Кикнуть игрока', hotkey: '', actions: [{ type: 'chat', value: '/kick [id] Причина' }] },
    { name: 'Телепорт', hotkey: '', actions: [{ type: 'chat', value: '/tp [id]' }] },
  ],
};

export function HotkeyRecorder({ value, onChange, style, placeholder }: {
  value: string, onChange: (val: string) => void,
  style?: React.CSSProperties, placeholder?: string
}) {
  const [isRecording, setIsRecording] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isRecording) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) return;

      if (e.code === 'Escape') {
        onChange('');
        setIsRecording(false);
        return;
      }

      const baseKey = CODE_TO_KEY[e.code] || e.code.replace(/^Key/, '').toUpperCase();

      const parts: string[] = [];
      if (e.ctrlKey) parts.push('Ctrl');
      if (e.altKey) parts.push('Alt');
      if (e.shiftKey) parts.push('Shift');
      parts.push(baseKey);

      onChange(parts.join('+'));
      setIsRecording(false);
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 3) {
        e.preventDefault();
        onChange('MOUSE4');
        setIsRecording(false);
        return;
      }
      if (e.button === 4) {
        e.preventDefault();
        onChange('MOUSE5');
        setIsRecording(false);
        return;
      }
      // any other mouse click outside = cancel
      if (btnRef.current && !btnRef.current.contains(e.target as Node)) {
        setIsRecording(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    window.addEventListener('mousedown', handleMouseDown, { capture: true });
    return () => {
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
      window.removeEventListener('mousedown', handleMouseDown, { capture: true });
    };
  }, [isRecording, onChange]);

  const display = getDisplayKey(value);

  return (
    <button
      ref={btnRef}
      type="button"
      onClick={() => setIsRecording(prev => !prev)}
      style={{
        background: isRecording ? 'rgba(239, 68, 68, 0.15)' : (value ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.03)'),
        border: `1px solid ${isRecording ? 'rgba(239,68,68,0.5)' : (value ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.08)')}`,
        borderRadius: '6px',
        padding: '6px 16px',
        color: isRecording ? '#ef4444' : (value ? 'white' : 'rgba(255,255,255,0.4)'),
        fontFamily: 'monospace',
        fontSize: '13px',
        fontWeight: 700,
        cursor: 'pointer',
        transition: 'all 0.2s',
        minWidth: '120px',
        textAlign: 'center',
        outline: 'none',
        letterSpacing: '0.5px',
        ...style
      }}
    >
      {isRecording ? 'Нажмите...' : (display || (placeholder || 'Не назначено'))}
    </button>
  );
}

export default function BinderTab({ settings, binds, updateBinds, updateSettings }: {
  settings: Settings, binds: Bind[],
  updateBinds: (binds: Bind[]) => void,
  updateSettings: (data: Partial<Settings>) => void
}) {
  const applyPreset = (role: 'junior' | 'admin' | 'senior') => {
    const presets = ROLE_BIND_PRESETS[role];
    const existing = new Set(binds.map(b => b.name));
    const merged = presets.filter(p => !existing.has(p.name)).map(p => ({
      ...p,
      actions: p.actions.map(a => ({ ...a })),
    }));
    updateBinds([...binds, ...merged]);
  };
  const updateBind = (index: number, field: keyof Bind, value: any) => {
    const newBinds = [...binds];
    newBinds[index] = { ...newBinds[index], [field]: value };
    updateBinds(newBinds);
  };

  const addBind = () => {
    const newBinds: Bind[] = [...binds, {
      name: 'Новый бинд',
      hotkey: '',
      actions: [] as BindAction[]
    }];
    updateBinds(newBinds);
  };

  const deleteBind = (index: number) => {
    const newBinds = binds.filter((_, i) => i !== index);
    updateBinds(newBinds);
  };

  const updateAction = (bindIndex: number, actionIndex: number, value: string | number) => {
    const newBinds = [...binds];
    newBinds[bindIndex] = {
      ...newBinds[bindIndex],
      actions: newBinds[bindIndex].actions.map((a, i) =>
        i === actionIndex ? { ...a, value } : a
      )
    };
    updateBinds(newBinds);
  };

  const addAction = (bindIndex: number, type: 'key' | 'text' | 'chat' | 'delay') => {
    const newBinds = [...binds];
    const defaultValue = type === 'delay' ? 500 : '';
    newBinds[bindIndex] = {
      ...newBinds[bindIndex],
      actions: [...newBinds[bindIndex].actions, { type, value: defaultValue }]
    };
    updateBinds(newBinds);
  };

  const deleteAction = (bindIndex: number, actionIndex: number) => {
    const newBinds = [...binds];
    newBinds[bindIndex] = {
      ...newBinds[bindIndex],
      actions: newBinds[bindIndex].actions.filter((_, i) => i !== actionIndex)
    };
    updateBinds(newBinds);
  };

  const moveAction = (bindIndex: number, actionIndex: number, direction: 'up' | 'down') => {
    const newBinds = [...binds];
    const actions = [...newBinds[bindIndex].actions];
    if (direction === 'up' && actionIndex > 0) {
      const temp = actions[actionIndex];
      actions[actionIndex] = actions[actionIndex - 1];
      actions[actionIndex - 1] = temp;
    } else if (direction === 'down' && actionIndex < actions.length - 1) {
      const temp = actions[actionIndex];
      actions[actionIndex] = actions[actionIndex + 1];
      actions[actionIndex + 1] = temp;
    }
    newBinds[bindIndex] = { ...newBinds[bindIndex], actions };
    updateBinds(newBinds);
  };

  return (
    <div style={{ padding: '30px', maxWidth: '1000px', margin: '0 auto', paddingBottom: '100px', width: '100%' }}>

      <div style={{ marginBottom: '30px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 800, margin: 0 }}>Биндер</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{settings.binder_enabled !== false ? 'Включён' : 'Выключен'}</span>
            <button
              onClick={() => {
                const next = settings.binder_enabled !== false ? false : true;
                updateSettings({ binder_enabled: next });
                if (window.ipcRenderer) window.ipcRenderer.send('set-binder-enabled', next);
              }}
              title="Включить/выключить биндер"
              style={{
                width: 44, height: 24, borderRadius: 999, padding: 2, boxSizing: 'border-box',
                background: settings.binder_enabled !== false ? 'var(--accent-color)' : 'rgba(255,255,255,0.12)',
                border: 'none', cursor: 'pointer', transition: 'background 0.2s ease', position: 'relative'
              }}
            >
              <span style={{
                display: 'block', width: 20, height: 20, borderRadius: '50%', background: '#fff',
                position: 'absolute', top: 2, left: settings.binder_enabled !== false ? 22 : 2,
                transition: 'left 0.2s ease'
              }} />
            </button>
          </div>
          <button onClick={addBind} style={{ background: 'var(--accent-color)', border: 'none', padding: '10px 20px', borderRadius: '8px', color: 'var(--accent-text-color)', fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
          <Plus size={16} /> Создать бинд
          </button>
        </div>
      </div>

      <div style={{ marginBottom: '24px' }}>
        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Готовые пресеты по ролям</div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {(['junior', 'admin', 'senior'] as const).map(role => (
            <button
              key={role}
              onClick={() => applyPreset(role)}
              style={{
                padding: '9px 16px', borderRadius: '9px', cursor: 'pointer',
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
                color: 'var(--text-main)', fontSize: '13px', fontWeight: 600,
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(91,124,158,0.5)'; e.currentTarget.style.background = 'rgba(91,124,158,0.12)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
            >
              {role === 'junior' ? 'Junior Administrator' : role === 'admin' ? 'Administrator' : 'Senior Administrator'}
            </button>
          ))}
        </div>
      </div>

      {binds.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'rgba(255,255,255,0.3)' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⌨️</div>
          <div style={{ fontSize: '16px', fontWeight: 600 }}>Нет биндов</div>
          <div style={{ fontSize: '13px', marginTop: '8px' }}>Нажмите «Создать бинд» чтобы добавить первый</div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
        {binds.map((bind, bIdx) => (
          <div key={bIdx} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', overflow: 'hidden', position: 'relative' }}>

            <button onClick={() => deleteBind(bIdx)} title="Удалить бинд"
              style={{ position: 'absolute', top: '15px', right: '15px', background: 'transparent', border: 'none', color: 'rgba(239,68,68,0.5)', cursor: 'pointer', padding: '4px', display: 'flex', transition: 'color 0.2s' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(239,68,68,0.5)')}>
              <Trash size={16} />
            </button>

            {/* Bind Header */}
            <div style={{ padding: '20px 24px', paddingBottom: '10px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Название бинда</div>
              <input
                type="text"
                value={bind.name}
                onChange={e => updateBind(bIdx, 'name', e.target.value)}
                placeholder="Новый бинд"
                style={{ background: 'transparent', border: 'none', color: 'white', fontSize: '22px', fontWeight: 700, outline: 'none', width: '85%', marginBottom: '20px' }}
              />

              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <span style={{ fontSize: '14px', fontWeight: 600, color: 'white' }}>Комбинация</span>
                <HotkeyRecorder value={bind.hotkey} onChange={val => updateBind(bIdx, 'hotkey', val)} />
                {bind.hotkey && (
                  <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)', fontFamily: 'monospace' }}>
                    [{bind.hotkey}]
                  </span>
                )}
              </div>
            </div>

            {/* Actions Header */}
            <div style={{ padding: '10px 24px', fontSize: '12px', color: 'var(--text-muted)', borderTop: '1px solid rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.04)', marginTop: '12px' }}>
              {bind.actions.length} {bind.actions.length === 1 ? 'экшен' : bind.actions.length < 5 ? 'экшена' : 'экшенов'}
            </div>

            {/* Actions List */}
            <div style={{ padding: '20px 24px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {bind.actions.map((act, aIdx) => {
                  let color = '#8a919b';
                  let label = 'ПАУЗА';
                  if (act.type === 'key') { color = '#ef4444'; label = 'КЛАВИША'; }
                  if (act.type === 'text') { color = '#f59e0b'; label = 'ТЕКСТ (БУФЕР)'; }
                  if (act.type === 'chat') { color = '#10b981'; label = 'В ЧАТ'; }

                  return (
                    <div key={aIdx} style={{ display: 'flex', alignItems: 'center', gap: '12px', position: 'relative' }}>
                      <div style={{ width: '3px', alignSelf: 'stretch', background: color, borderRadius: '3px', flexShrink: 0 }} />
                      <div style={{ flex: 1, paddingLeft: '8px' }}>
                        <div style={{ fontSize: '10px', fontWeight: 700, color, textTransform: 'uppercase', marginBottom: '6px', letterSpacing: '0.08em' }}>
                          {label}
                        </div>

                        {act.type === 'key' && (
                          <HotkeyRecorder
                            value={act.value as string}
                            onChange={val => updateAction(bIdx, aIdx, val)}
                            placeholder="Нажмите клавишу"
                            style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '10px 14px', borderRadius: '8px', fontSize: '14px', textAlign: 'left', minWidth: 'auto', fontFamily: 'inherit' }}
                          />
                        )}
                        {act.type === 'text' && (
                          <input type="text" value={act.value as string} onChange={e => updateAction(bIdx, aIdx, e.target.value)} placeholder="Текст для буфера обмена" style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', outline: 'none', padding: '10px 14px', borderRadius: '8px', fontSize: '14px', fontWeight: 500, boxSizing: 'border-box' }} />
                        )}
                        {act.type === 'chat' && (
                          <input type="text" value={act.value as string} onChange={e => updateAction(bIdx, aIdx, e.target.value)} placeholder="Сообщение в чат" style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', outline: 'none', padding: '10px 14px', borderRadius: '8px', fontSize: '14px', fontWeight: 500, boxSizing: 'border-box' }} />
                        )}
                        {act.type === 'delay' && (
                          <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '4px 14px', maxWidth: '200px' }}>
                            <input type="number" value={act.value as number} onChange={e => updateAction(bIdx, aIdx, parseInt(e.target.value) || 0)} min={0} max={10000} style={{ flex: 1, background: 'transparent', border: 'none', color: 'white', outline: 'none', fontSize: '14px', fontWeight: 600, padding: '6px 0', width: '80px' }} />
                            <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>мс</span>
                          </div>
                        )}
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {aIdx > 0 && (
                          <button onClick={() => moveAction(bIdx, aIdx, 'up')} title="Вверх" style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', padding: '4px', display: 'flex', transition: 'color 0.2s' }} onMouseEnter={e => (e.currentTarget.style.color = 'white')} onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.3)')}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m18 15-6-6-6 6"/></svg>
                          </button>
                        )}
                        {aIdx < bind.actions.length - 1 && (
                          <button onClick={() => moveAction(bIdx, aIdx, 'down')} title="Вниз" style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', padding: '4px', display: 'flex', transition: 'color 0.2s' }} onMouseEnter={e => (e.currentTarget.style.color = 'white')} onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.3)')}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                          </button>
                        )}
                      </div>

                      <button onClick={() => deleteAction(bIdx, aIdx)} title="Удалить"
                        style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.25)', cursor: 'pointer', padding: '8px', display: 'flex', transition: 'color 0.2s', flexShrink: 0 }}
                        onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')}
                        onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.25)')}>
                        <Trash size={15} />
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Add Action Buttons */}
              <div style={{ marginTop: '24px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button onClick={() => addAction(bIdx, 'chat')} style={{ background: 'rgba(16, 185, 129, 0.06)', border: '1px solid rgba(16, 185, 129, 0.25)', color: '#10b981', borderRadius: '6px', padding: '7px 14px', fontSize: '12px', cursor: 'pointer', fontWeight: 600 }}>+ В чат</button>
                <button onClick={() => addAction(bIdx, 'key')} style={{ background: 'rgba(239, 68, 68, 0.06)', border: '1px solid rgba(239, 68, 68, 0.25)', color: '#ef4444', borderRadius: '6px', padding: '7px 14px', fontSize: '12px', cursor: 'pointer', fontWeight: 600 }}>+ Клавиша</button>
                <button onClick={() => addAction(bIdx, 'text')} style={{ background: 'rgba(245, 158, 11, 0.06)', border: '1px solid rgba(245, 158, 11, 0.25)', color: '#f59e0b', borderRadius: '6px', padding: '7px 14px', fontSize: '12px', cursor: 'pointer', fontWeight: 600 }}>+ Текст (Буфер)</button>
                <button onClick={() => addAction(bIdx, 'delay')} style={{ background: 'rgba(123, 152, 184, 0.06)', border: '1px solid rgba(123, 152, 184, 0.25)', color: '#8a919b', borderRadius: '6px', padding: '7px 14px', fontSize: '12px', cursor: 'pointer', fontWeight: 600 }}>+ Пауза</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
