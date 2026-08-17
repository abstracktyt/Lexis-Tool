import { useState, useEffect } from 'react';
import { Rule, Settings } from '../types';
import HighlightText from './HighlightText';
import { applyTheme } from '../lib/theme';

interface RuleDetail extends Rule { categoryName: string; }

export default function DetailApp() {
  const [rule, setRule] = useState<RuleDetail | null>(null);
  const [isPinnedContext, setIsPinnedContext] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
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

    const saved = localStorage.getItem('lexis-tools-settings');
    if (saved) { try { setSettings(prev => ({ ...prev, ...JSON.parse(saved) })); } catch(e) {} }

    document.body.style.backgroundColor = 'transparent';
    document.documentElement.style.backgroundColor = 'transparent';

    if (window.ipcRenderer) {
      window.ipcRenderer.on('show-detail', (_e: any, data: { rule: RuleDetail; isPinned: boolean; searchQuery?: string }) => {
        setRule(data.rule);
        setIsPinnedContext(data.isPinned);
        setSearchQuery(data.searchQuery || '');
      });
      window.ipcRenderer.on('sync-settings', (_e: any, data: Settings) => {
        setSettings(prev => ({ ...prev, ...data }));
      });
      // Listen for pin/unpin updates to refresh rule state
      window.ipcRenderer.on('unpin-rule', (_e: any, ruleId: string) => {
        setRule(prev => prev && prev.id === ruleId ? { ...prev, isPinned: false } : prev);
      });
      window.ipcRenderer.on('pin-rule', (_e: any, ruleId: string) => {
        setRule(prev => prev && prev.id === ruleId ? { ...prev, isPinned: true } : prev);
      });
    }
    return () => {
      if (window.ipcRenderer) {
        window.ipcRenderer.removeAllListeners('show-detail');
        window.ipcRenderer.removeAllListeners('sync-settings');
        window.ipcRenderer.removeAllListeners('unpin-rule');
        window.ipcRenderer.removeAllListeners('pin-rule');
      }
    };
  }, []);

  useEffect(() => {
    applyTheme(settings);
  }, [settings]);

  const handlePunish = () => {
    if (!rule) return;
    if (window.ipcRenderer) {
      window.ipcRenderer.send('open-punish-modal', { rule, categoryName: rule.categoryName });
    }
  };

  const handleClose = () => {
    if (window.ipcRenderer) window.ipcRenderer.send('close-detail');
  };

  const handlePinToggle = () => {
    if (!rule) return;
    if (isPinnedContext || rule.isPinned) {
      if (window.ipcRenderer) window.ipcRenderer.send('unpin-rule', rule.id);
      setRule(prev => prev ? { ...prev, isPinned: false } : prev);
    } else {
      if (window.ipcRenderer) window.ipcRenderer.send('pin-rule', rule.id);
      setRule(prev => prev ? { ...prev, isPinned: true } : prev);
    }
  };

  if (!rule) return (
    <div style={{
      width: '100vw', height: '100vh',
      background: 'rgba(18, 18, 22, 0.92)',
      backdropFilter: 'blur(12px)',
      borderRadius: '14px',
      border: '1px solid rgba(255,255,255,0.07)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: 'rgba(255,255,255,0.3)', fontSize: '14px'
    }}>
      Загрузка...
    </div>
  );

  const isCurrentlyPinned = isPinnedContext || rule.isPinned;

  return (
    <div style={{
      width: '100vw', height: '100vh',
      display: 'flex', flexDirection: 'column',
      background: 'rgba(18, 18, 22, 0.92)',
      backdropFilter: 'blur(12px)',
      borderRadius: '14px',
      border: '1px solid rgba(255,255,255,0.07)',
      overflow: 'hidden', boxSizing: 'border-box'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)',
        flexShrink: 0
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: '16px', color: 'white', marginBottom: '4px' }}>
            <HighlightText text={rule.name} query={searchQuery} />
          </div>
          <div style={{ fontWeight: 700, fontSize: '13px', color: '#ef4444', marginBottom: '8px' }}>
            <HighlightText text={rule.categoryName} query={searchQuery} />
          </div>
          {rule.punishments && rule.punishments.length > 0 ? (
            <div style={{ fontSize: '13px', color: 'rgba(255,200,100,0.9)', fontWeight: 600, display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
              {rule.punishments.map((p, i) => (
                <span key={i}>
                  {i > 0 && <span style={{ opacity: 0.4, margin: '0 2px' }}>/</span>}
                  {p.type}{p.duration ? ` · ${p.duration} ${p.unit || 'мин'}` : ''}
                </span>
              ))}
            </div>
          ) : rule.punishmentType && (
            <div style={{ fontSize: '13px', color: 'rgba(255,200,100,0.9)', fontWeight: 600 }}>
              {rule.punishmentType}{rule.duration ? ` · ${rule.duration} ${rule.durationUnit || 'мин'}` : ''}
            </div>
          )}
        </div>
        <button
          onClick={handleClose}
          style={{
            background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '6px', color: 'rgba(255,255,255,0.7)',
            cursor: 'pointer', fontSize: '14px', padding: '4px 10px', flexShrink: 0, marginLeft: '12px'
          }}
        >✕</button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px' }}>
        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.82)', lineHeight: 1.7, margin: 0, whiteSpace: 'pre-wrap' }}>
          <HighlightText text={rule.content} query={searchQuery} />
        </p>
        {rule.punishments && rule.punishments.some(p => p.type && p.type.trim() !== '' && p.type !== 'None') ? (
          <p style={{ marginTop: '16px', fontSize: '13px', color: '#ef6b6b', fontWeight: 700, margin: '16px 0 0' }}>
            Наказание: {rule.punishments.filter(p => p.type && p.type.trim() !== '' && p.type !== 'None').map(p => `${p.type}${p.duration ? `, ${p.duration} ${p.unit || 'мин'}` : ''}`).join(' / ')}
          </p>
        ) : rule.punishmentType && rule.punishmentType.trim() !== '' && rule.punishmentType !== 'None' ? (
          <p style={{ marginTop: '16px', fontSize: '13px', color: '#ef6b6b', fontWeight: 700, margin: '16px 0 0' }}>
            Наказание: {rule.punishmentType}{rule.duration ? `, ${rule.duration} ${rule.durationUnit || 'мин'}` : ''}
          </p>
        ) : null}
      </div>

      {/* Actions */}
      <div style={{ padding: '12px 14px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', gap: '8px', flexShrink: 0 }}>
        {/* Copy */}
        <button
          onClick={() => {
            if (window.ipcRenderer) {
              window.ipcRenderer.send('copy-to-clipboard', rule.content);
            } else {
              navigator.clipboard.writeText(rule.content).catch(() => {});
            }
          }}
          style={{
            width: '100%', padding: '13px',
            background: 'rgba(30, 80, 200, 0.25)',
            border: '1px solid rgba(80, 130, 255, 0.35)',
            borderRadius: '10px', color: '#7aaeff',
            fontSize: '14px', fontWeight: 600, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            transition: 'background 0.15s'
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
          </svg>
          Скопировать правило
        </button>

        {/* Pin / Unpin */}
        <button
          onClick={handlePinToggle}
          style={{
            width: '100%', padding: '13px',
            background: isCurrentlyPinned ? 'rgba(30, 100, 80, 0.2)' : 'rgba(80, 30, 180, 0.2)',
            border: `1px solid ${isCurrentlyPinned ? 'rgba(60, 180, 130, 0.3)' : 'rgba(130, 80, 255, 0.3)'}`,
            borderRadius: '10px', color: isCurrentlyPinned ? '#6fcfb0' : '#b08aff',
            fontSize: '14px', fontWeight: 600, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            transition: 'all 0.15s'
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
          </svg>
          {isCurrentlyPinned ? 'Открепить от оверлея' : 'Закрепить в оверлей'}
        </button>

        {/* Punish */}
        {(rule.punishments?.some(p => p.type && p.type.trim() !== '' && p.type !== 'None') || (rule.punishmentType && rule.punishmentType.trim() !== '' && rule.punishmentType !== 'None')) && (
          <button
            onClick={handlePunish}
            style={{
              width: '100%', padding: '13px',
              background: 'rgba(200, 50, 50, 0.25)',
              border: '1px solid rgba(255, 80, 80, 0.35)',
              borderRadius: '10px', color: '#ff8a8a',
              fontSize: '14px', fontWeight: 600, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              transition: 'background 0.15s'
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
            Наказать
          </button>
        )}
      </div>
    </div>
  );
}
