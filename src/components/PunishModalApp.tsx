import { useState, useEffect } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { Rule, Settings, Punishment } from '../types';
import { applyTheme } from '../lib/theme';

interface PunishModalData {
  rule: Rule;
  staticId?: string;
  categoryName?: string;
}

// Gunban durations are issued in HOURS on the server, but rules may store them
// in minutes. Convert stored minutes to hours so the sent value matches.
function gunbanToHours(type: string, unit: string | undefined, raw: string): string {
  if (!type.toLowerCase().includes('gunban')) return raw;
  if (!/мин|минут|min/i.test(unit || '')) return raw;
  const n = parseInt(raw, 10);
  if (isNaN(n) || n <= 0) return raw;
  return String(Math.max(1, Math.round(n / 60)));
}

function displayUnitFor(p: Punishment): string {
  return p.type.toLowerCase().includes('gunban') ? 'часов' : (p.unit || 'мин');
}

function displayDurationFor(p: Punishment): string {
  if (!p.duration) return '';
  if (p.type.toLowerCase().includes('gunban') && /мин|минут|min/i.test(p.unit || '')) {
    const parts = p.duration.split('-');
    if (parts.length === 2) return `${gunbanToHours(p.type, p.unit, parts[0])}-${gunbanToHours(p.type, p.unit, parts[1])}`;
    return gunbanToHours(p.type, p.unit, parts[0]);
  }
  return p.duration;
}

export default function PunishModalApp() {
  const [data, setData] = useState<PunishModalData | null>(null);
  const [staticId, setStaticId] = useState('');
  const [selectedPunishmentIndex, setSelectedPunishmentIndex] = useState(0);
  const [duration, setDuration] = useState<string>('');
  const [isOffline, setIsOffline] = useState(false);
  const [submitError, setSubmitError] = useState('');
  
  const [settings, setSettings] = useState<Settings>({
    overlayHotkey: 'Alt+O',
    autoEnter: true, chatKey: 'T', sendKey: 'ENTER',
    overlayOpacity: 0.92, overlayScale: 1.0,
    memoEnabled: true, memoText: '', accentColor: '#5b7c9e'
  });

  useEffect(() => {
    // Hide custom HTML titlebar
    const titlebar = document.getElementById('titlebar');
    if (titlebar) titlebar.style.cssText = 'display:none!important';
    const root = document.getElementById('root');
    if (root) { root.style.paddingTop = '0'; root.classList.remove('pt-8'); }

    document.body.style.backgroundColor = 'transparent';
    document.documentElement.style.backgroundColor = 'transparent';

    const saved = localStorage.getItem('lexis-tools-settings');
    if (saved) { try { setSettings(prev => ({ ...prev, ...JSON.parse(saved) })); } catch(e) {} }

    if (window.ipcRenderer) {
      window.ipcRenderer.on('show-punish-modal', (_e: any, incoming: PunishModalData) => {
        setData(incoming);
        setStaticId(incoming.staticId || '');
        setSelectedPunishmentIndex(0);
        setSubmitError('');
        
        // initialize duration
        const punishments = incoming.rule.punishments || [{
          type: incoming.rule.punishmentType, 
          duration: incoming.rule.duration, 
          unit: incoming.rule.durationUnit
        }];
        
        if (punishments.length > 0 && punishments[0].duration) {
          const parts = punishments[0].duration.split('-');
          setDuration(gunbanToHours(punishments[0].type, punishments[0].unit, parts[0]));
        } else {
          setDuration('');
        }
      });
      window.ipcRenderer.on('sync-settings', (_e: any, data: Settings) => {
        setSettings(prev => ({ ...prev, ...data }));
      });
    }
    return () => {
      if (window.ipcRenderer) {
        window.ipcRenderer.removeAllListeners('show-punish-modal');
        window.ipcRenderer.removeAllListeners('sync-settings');
      }
    };
  }, []);

  useEffect(() => {
    applyTheme(settings);
  }, [settings]);

  useEffect(() => {
    const container = document.getElementById('punish-modal-container');
    if (!container) return;
    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const height = Math.ceil(entry.contentRect.height) + 48; // add padding
        if (window.ipcRenderer) {
          window.ipcRenderer.send('resize-punish-modal', { width: 480, height });
        }
      }
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [data]);

  if (!data) return null;

  const rule = data.rule;
  const punishments = rule.punishments || [{
    type: rule.punishmentType,
    duration: rule.duration,
    unit: rule.durationUnit
  }];
  
  const currentPunishment = punishments[selectedPunishmentIndex] || punishments[0];
  const isRange = currentPunishment.duration?.includes('-');
  const rangeParts = isRange ? currentPunishment.duration!.split('-').map(Number) : [];

  const isGunban = currentPunishment.type.toLowerCase().includes('gunban');
  const displayUnit = displayUnitFor(currentPunishment);
  const rangeMin = isGunban ? Math.max(1, parseInt(gunbanToHours(currentPunishment.type, currentPunishment.unit, String(rangeParts[0])), 10)) : rangeParts[0];
  const rangeMax = isGunban ? Math.max(rangeMin, parseInt(gunbanToHours(currentPunishment.type, currentPunishment.unit, String(rangeParts[1])), 10)) : rangeParts[1];

  const handleClose = () => {
    if (window.ipcRenderer) window.ipcRenderer.send('close-punish-modal');
  };

  const handlePunish = async () => {
    if (!staticId.trim() || !currentPunishment) return;
    
    let ruleName = rule.name;
    
    const isTextRule = !/^\d/.test(ruleName);
    
    if (isTextRule) {
      if (ruleName.includes('(')) {
        ruleName = ruleName.split('(')[0].trim();
      } else if (ruleName.includes('-')) {
        ruleName = ruleName.split('-')[0].trim();
      }
      ruleName = ruleName.split(' ')[0];
    }
    
    if (data?.categoryName && !isTextRule) {
      ruleName = `${ruleName} ${data.categoryName}`;
    }
    
    const lowerType = currentPunishment.type.toLowerCase();
    let cmdPrefix = lowerType.includes('jail') || lowerType.includes('demorgan') ? '/demorgan'
      : lowerType.includes('mute') ? '/mute'
      : lowerType.includes('gunban') ? '/gunban'
      : lowerType.includes('hardban') ? '/hardban'
      : lowerType.includes('ban') ? '/ban'
      : lowerType.includes('warn') ? '/warn' 
      : `/${lowerType}`;
      
    if (isOffline) {
      if (cmdPrefix === '/mute') cmdPrefix = '/offmute';
      else if (cmdPrefix === '/demorgan') cmdPrefix = '/offjail';
      else if (cmdPrefix === '/ban') cmdPrefix = '/offban';
      else if (cmdPrefix === '/hardban') cmdPrefix = '/offhardban';
      else if (cmdPrefix === '/warn') cmdPrefix = '/offwarn';
      else if (cmdPrefix === '/gunban') cmdPrefix = '/offgunban';
    }
      
    const finalDuration = currentPunishment.duration ? duration : '';
    const command = [cmdPrefix, staticId, finalDuration, ruleName].filter(Boolean).join(' ');
    
    if (window.ipcRenderer) {
      setSubmitError('');
      const result = await window.ipcRenderer.invoke('execute-command', { command, autoEnter: settings.autoEnter, chatKey: settings.chatKey });
      if (!result?.ok) {
        setSubmitError(result?.error || 'Не удалось отправить команду в игру.');
        return;
      }
      window.ipcRenderer.send('punish-issued', {
        id: staticId.trim(),
        type: currentPunishment.type,
        isOffline,
        duration: finalDuration,
        unit: displayUnit,
      });
      handleClose();
    }
  };



  return (
    <div style={{
      width: '100vw', height: '100vh',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px', boxSizing: 'border-box',
    }}>
      <style>{`
        input[type=number]::-webkit-inner-spin-button, 
        input[type=number]::-webkit-outer-spin-button { 
          -webkit-appearance: none; 
          margin: 0; 
        }
        input[type=number] {
          -moz-appearance: textfield;
        }
      `}</style>
      <div id="punish-modal-container" style={{
        width: '100%', maxWidth: '440px',
        background: 'rgba(18, 18, 22, 0.95)',
        backdropFilter: 'blur(16px)',
        borderRadius: '24px',
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <h2 style={{ margin: 0, fontSize: '16px', color: 'white', fontWeight: 600 }}>Выдача наказания</h2>
          <button onClick={handleClose} style={{
            background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.5)',
            cursor: 'pointer', fontSize: '16px', padding: '4px'
          }}>✕</button>
        </div>

        {/* Content */}
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div style={{ background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.03)' }}>
            <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px' }}>Правило</div>
            <div style={{ fontSize: '14px', color: 'white', fontWeight: 500, lineHeight: 1.4 }}>{rule.name}</div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.03)' }}>
            <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.8)', fontWeight: 500 }}>Выдать наказание Offline</span>
            <div 
              onClick={() => setIsOffline(!isOffline)}
              style={{
                width: '44px', height: '24px', background: isOffline ? settings.accentColor : 'rgba(255,255,255,0.1)',
                borderRadius: '12px', position: 'relative', cursor: 'pointer', transition: 'background 0.3s'
              }}
            >
              <div style={{
                width: '20px', height: '20px', background: 'white', borderRadius: '50%',
                position: 'absolute', top: '2px', left: isOffline ? '22px' : '2px',
                transition: 'left 0.3s cubic-bezier(0.4, 0.0, 0.2, 1)',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
              }} />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', color: 'rgba(255,255,255,0.6)', marginBottom: '8px' }}>StaticID или ID</label>
            <input
              autoFocus
              type="text"
              value={staticId}
              onChange={e => setStaticId(e.target.value)}
              placeholder="Например: 12345"
              style={{
                width: '100%', padding: '12px', boxSizing: 'border-box',
                background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px', color: 'white', fontSize: '14px', outline: 'none'
              }}
            />
            
            {isOffline && (
              <div style={{ 
                marginTop: '12px', 
                padding: '12px 14px', 
                background: 'rgba(0, 0, 0, 0.3)', 
                borderLeft: '4px solid #10b981', 
                borderRadius: '8px',
                display: 'flex',
                gap: '12px',
                alignItems: 'flex-start'
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="16" x2="12" y2="12"></line>
                  <line x1="12" y1="8" x2="12.01" y2="8"></line>
                </svg>
                <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.8)', lineHeight: '1.4' }}>
                  <span style={{ color: '#10b981', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Внимание!</span>
                  Выдача оффлайн наказаний происходит строго через <b>StaticID</b>. Убедитесь, что вы вводите StaticID игрока.
                </div>
              </div>
            )}
          </div>

          {punishments.length > 1 && (
            <div>
              <label style={{ display: 'block', fontSize: '13px', color: 'rgba(255,255,255,0.6)', marginBottom: '8px' }}>Тип наказания</label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {punishments.map((p, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setSelectedPunishmentIndex(i);
                      if (p.duration) {
                        const parts = p.duration.split('-');
                        setDuration(gunbanToHours(p.type, p.unit, parts[0]));
                      } else {
                        setDuration('');
                      }
                    }}
                    style={{
                      padding: '8px 12px', borderRadius: '8px', fontSize: '13px', cursor: 'pointer',
                      border: selectedPunishmentIndex === i ? `1px solid ${settings.accentColor}` : '1px solid rgba(255,255,255,0.1)',
                      background: selectedPunishmentIndex === i ? `${settings.accentColor}40` : 'rgba(255,255,255,0.05)',
                      color: selectedPunishmentIndex === i ? 'white' : 'rgba(255,255,255,0.7)',
                      transition: 'all 0.2s'
                    }}
                  >
                    {p.type} {p.duration ? `(${displayDurationFor(p)} ${displayUnitFor(p)})` : ''}
                  </button>
                ))}
              </div>
            </div>
          )}

          {currentPunishment.duration && (
            <div>
              <label style={{ display: 'block', fontSize: '13px', color: 'rgba(255,255,255,0.6)', marginBottom: '8px' }}>
                Срок ({displayUnit})
              </label>
              
              {isRange ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <input
                    type="range"
                    min={rangeMin}
                    max={rangeMax}
                    value={duration}
                    onChange={e => setDuration(e.target.value)}
                    style={{ flex: 1, accentColor: settings.accentColor }}
                  />
                  <div style={{ position: 'relative', width: '80px' }}>
                    <input
                      type="number"
                      min={rangeMin}
                      max={rangeMax}
                      value={duration}
                      onChange={e => setDuration(e.target.value)}
                      style={{
                        width: '100%', padding: '8px 24px 8px 8px', boxSizing: 'border-box',
                        background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '8px', color: 'white', fontSize: '14px', outline: 'none', textAlign: 'center'
                      }}
                    />
                    <div style={{ position: 'absolute', right: '4px', top: '4px', bottom: '4px', display: 'flex', flexDirection: 'column', gap: '2px', width: '16px' }}>
                      <button type="button" onClick={() => setDuration(String(Math.min(rangeMax, (parseInt(duration) || 0) + 1)))} style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: 'none', color: 'rgba(255,255,255,0.6)', borderRadius: '3px', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'} onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}><ChevronUp size={10} /></button>
                      <button type="button" onClick={() => setDuration(String(Math.max(rangeMin, (parseInt(duration) || 0) - 1)))} style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: 'none', color: 'rgba(255,255,255,0.6)', borderRadius: '3px', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'} onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}><ChevronDown size={10} /></button>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ position: 'relative' }}>
                  <input
                    type="number"
                    value={duration}
                    onChange={e => setDuration(e.target.value)}
                    style={{
                      width: '100%', padding: '12px', paddingRight: '40px', boxSizing: 'border-box',
                      background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '8px', color: 'white', fontSize: '14px', outline: 'none'
                    }}
                  />
                  <div style={{ position: 'absolute', right: '6px', top: '6px', bottom: '6px', display: 'flex', flexDirection: 'column', gap: '2px', width: '24px' }}>
                    <button type="button" onClick={() => setDuration(String((parseInt(duration) || 0) + 1))} style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: 'none', color: 'rgba(255,255,255,0.6)', borderRadius: '4px', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'} onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}><ChevronUp size={14} /></button>
                    <button type="button" onClick={() => setDuration(String(Math.max(0, (parseInt(duration) || 0) - 1)))} style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: 'none', color: 'rgba(255,255,255,0.6)', borderRadius: '4px', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'} onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}><ChevronDown size={14} /></button>
                  </div>
                </div>
              )}
            </div>
          )}
          
        </div>

        {/* Footer */}
        <div style={{ padding: '20px 24px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          {submitError && (
            <div style={{ marginBottom: '12px', color: '#ff9b9b', fontSize: '13px', lineHeight: 1.35 }}>{submitError}</div>
          )}
          <button
            onClick={handlePunish}
            disabled={!staticId.trim()}
            style={{
              width: '100%', padding: '16px',
              background: staticId.trim() ? 'rgba(200, 50, 50, 0.35)' : 'rgba(255,255,255,0.05)',
              border: `1px solid ${staticId.trim() ? 'rgba(255, 80, 80, 0.4)' : 'rgba(255,255,255,0.08)'}`,
              borderRadius: '14px',
              color: staticId.trim() ? '#ff8a8a' : 'rgba(255,255,255,0.3)',
              fontSize: '14px', fontWeight: 600,
              cursor: staticId.trim() ? 'pointer' : 'default',
              transition: 'all 0.2s',
              display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px'
            }}
          >
             <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
            Выдать наказание
          </button>
        </div>
      </div>
    </div>
  );
}
