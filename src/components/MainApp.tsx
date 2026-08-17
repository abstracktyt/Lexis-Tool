import { useState, useEffect, useRef, CSSProperties } from 'react';
import { Settings as SettingsIcon, Book, LayoutDashboard, Loader2, Crown, Globe, User, Keyboard, MessageSquareText, Info, LogOut, Trophy, CheckCircle2, Users, HelpCircle, X } from 'lucide-react';

import { Rule, RuleCategory, Settings, Profile, Bind, QuickCategory } from '../types';
import ProfilesTab from './ProfilesTab';
import RulesEditorTab from './RulesEditorTab';
import RulesParserTab from './RulesParserTab';
import AhelpTab from './AhelpTab';
import BinderTab from './BinderTab';
import QuickRepliesTab, { DEFAULT_QUICK_CATEGORIES } from './QuickRepliesTab';
import HotkeyInput from './HotkeyInput';
import EventsTab from './EventsTab';
import WindowControls from './WindowControls';
import OnlineTab from './OnlineTab';
import Scanner from './Scanner';
import EchoText from './EchoText';
import ProfileCard from './ProfileCard';
import { applyTheme } from '../lib/theme';
import { API_BASE } from '../lib/api';
import { roleGradient } from '../lib/roles';

import { CHANGELOG } from '../lib/changelog';

export default function MainApp() {
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [authLoading, setAuthLoading] = useState(true); // default true to check token on startup
  const [authError, setAuthError] = useState('');
  const [userProfile, setUserProfile] = useState<{ username: string; avatarUrl?: string; bannerUrl?: string; roles?: string[] } | null>(null);
  const [userLevel, setUserLevel] = useState<number>(0);
  const [userRole, setUserRole] = useState<string>('');
  const [startupPhase, setStartupPhase] = useState<'checking' | 'auth' | 'ready'>('checking');
  const [checkStep, setCheckStep] = useState<number>(-1);
  const authReadyRef = useRef(false);
  
  const [activeTab, setActiveTab] = useState<'dashboard' | 'rules' | 'settings' | 'profiles' | 'ahelp' | 'binder' | 'quickreplies' | 'events' | 'online'>('dashboard');
  const [rulesTab, setRulesTab] = useState<'summary' | 'editor' | 'parser'>('editor');
  const [settingsTab, setSettingsTab] = useState<'hotkeys' | 'overlay' | 'binder' | 'about' | 'profile'>('hotkeys');
  
  
  const [categories, setCategories] = useState<RuleCategory[]>([]);
  const [loadedProfileId, setLoadedProfileId] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>(() => {
    const saved = localStorage.getItem('lexis-tools-profiles');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {}
    }
    return [{id: 'default', name: 'Основной профиль', author: 'User', ruleCount: 0}];
  });
  const [activeProfileId, setActiveProfileId] = useState('default');
  
  const [isProcessDropdownOpen, setIsProcessDropdownOpen] = useState(false);
  
  const [processList, setProcessList] = useState<string[]>([]);
  
  const [updateInfo, setUpdateInfo] = useState<any>(null);
  const [updateProgress, setUpdateProgress] = useState(-1);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState('');

  const defaultSettings: Settings = {
    overlayHotkey: 'Alt+O',
    autoEnter: true,
    chatKey: 'T',
    sendKey: 'ENTER',
    overlayOpacity: 0.9,
    overlayScale: 1.0,
    memoEnabled: true,
    memoText: 'Миранда:\nВы имеете право хранить молчание...',
    accentColor: '#5b7c9e',
    backgroundColor: '#0c0e11',
    textColor: '#e7e9ec',
    textMutedColor: '#9aa0a8',
    buttonColor: '#5b7c9e',
    heroGradientColor1: '#5b7c9e',
    heroGradientColor2: '#6f8fae',
    eventsHotkey: 'Alt+E',
    onlineHotkey: 'Alt+U'
  };

  const [settings, setSettings] = useState<Settings>(() => {
    const saved = localStorage.getItem('lexis-tools-settings');
    if (saved) {
      try {
        const merged = { ...defaultSettings, ...JSON.parse(saved) };
        const legacyDefaults: Array<{ key: string; old: string }> = [
          { key: 'accentColor', old: '#1d4ed8' },
          { key: 'buttonColor', old: '#1d4ed8' },
          { key: 'backgroundColor', old: '#06090e' },
          { key: 'textColor', old: '#ffffff' },
          { key: 'textMutedColor', old: '#9ca3af' },
          { key: 'heroGradientColor1', old: '#1d4ed8' },
          { key: 'heroGradientColor2', old: '#8b5cf6' },
          { key: 'accentColor', old: '#1ea7eb' },
          { key: 'buttonColor', old: '#1ea7eb' },
          { key: 'backgroundColor', old: '#0f0f0f' },
          { key: 'textColor', old: '#fafafa' },
          { key: 'textMutedColor', old: '#c4c4c4' },
          { key: 'heroGradientColor1', old: '#1ea7eb' },
          { key: 'heroGradientColor2', old: '#0df2cc' },
          { key: 'accentColor', old: '#6366f1' },
          { key: 'buttonColor', old: '#6366f1' },
          { key: 'backgroundColor', old: '#0a0a0f' },
          { key: 'textColor', old: '#f2f2f5' },
          { key: 'textMutedColor', old: '#8a8a99' },
          { key: 'heroGradientColor1', old: '#6366f1' },
          { key: 'heroGradientColor2', old: '#8b5cf6' },
          { key: 'accentColor', old: '#9bbcff' },
          { key: 'buttonColor', old: '#9bbcff' },
          { key: 'backgroundColor', old: '#0b1118' },
          { key: 'textColor', old: '#edf2ff' },
          { key: 'textMutedColor', old: '#9aa7c2' },
          { key: 'heroGradientColor1', old: '#19c7b8' },
          { key: 'heroGradientColor2', old: '#6e5efc' },
        ];
        for (const item of legacyDefaults) {
          if ((merged as any)[item.key] === item.old) {
            (merged as any)[item.key] = (defaultSettings as any)[item.key];
          }
        }
        return merged;
      } catch(e) {}
    }
    return defaultSettings;
  });


  // Auth token persistence. In Electron the token is kept encrypted via safeStorage
  // in the main process; in a plain browser (dev) we fall back to localStorage.
  const persistToken = (token: string) => {
    if (window.ipcRenderer) window.ipcRenderer.send('save-auth-token', token);
    else localStorage.setItem('lexis-tools-auth-token', token);
  };

  const clearStoredToken = () => {
    if (window.ipcRenderer) window.ipcRenderer.send('clear-auth-token');
    localStorage.removeItem('lexis-tools-auth-token');
  };

  const getStoredToken = async (): Promise<string | null> => {
    if (window.ipcRenderer) {
      try {
        const token = await window.ipcRenderer.invoke('get-auth-token');
        return token || null;
      } catch (e) {
        return null;
      }
    }
    return localStorage.getItem('lexis-tools-auth-token');
  };

  const [profileSaved, setProfileSaved] = useState(false);
  const [profileConfirmOpen, setProfileConfirmOpen] = useState(false);
  const [profileDraft, setProfileDraft] = useState<{ avatarUrl: string; bannerUrl: string }>({ avatarUrl: '', bannerUrl: '' });
  const [changelogModal, setChangelogModal] = useState<{ tag: string; text: string; details: string } | null>(null);

  useEffect(() => {
    setProfileDraft({ avatarUrl: userProfile?.avatarUrl || '', bannerUrl: userProfile?.bannerUrl || '' });
  }, [userProfile?.avatarUrl, userProfile?.bannerUrl]);

  const confirmSaveProfile = () => {
    setUserProfile(prev => {
      const next = { ...(prev || { username: '' }), ...profileDraft };
      try { localStorage.setItem('lexis-tools-user-profile', JSON.stringify(next)); } catch (e) {}
      return next;
    });
    setProfileConfirmOpen(false);
    setProfileSaved(true);
    window.setTimeout(() => setProfileSaved(false), 2500);
  };

  const pickProfileFile = async (field: 'avatarUrl' | 'bannerUrl') => {
    if (!window.ipcRenderer) return;
    const dataUrl = await window.ipcRenderer.invoke('pick-image').catch(() => null);
    if (dataUrl) setProfileDraft(prev => ({ ...prev, [field]: dataUrl }));
  };

  const profileInputStyle: CSSProperties = {
    width: '100%', boxSizing: 'border-box',
    background: 'var(--bg-muted)', color: 'var(--text-main)',
    border: '1px solid var(--border-glass)', borderRadius: 8,
    padding: '10px 12px', fontSize: 13, outline: 'none',
    transition: 'border-color 0.15s ease',
  };

  const verifyToken = async (tokenStr: string) => {
    try {
      setAuthLoading(true);
      const res = await fetch(`${API_BASE}/api/me`, {
        headers: { Authorization: `Bearer ${tokenStr}` }
      });
      const data = await res.json();
      
      if (res.ok) {
        const rawRoles = Array.isArray(data.roles) ? data.roles : (data.roleName ? [data.roleName] : []);
        const roles = rawRoles
          .map((r: any) => (typeof r === 'string' ? r : (r?.name || r?.roleName || '')))
          .filter(Boolean);
        let avatarUrl = data.avatarUrl;
        let bannerUrl = data.bannerUrl || data.banner;
        try {
          const savedRaw = localStorage.getItem('lexis-tools-user-profile');
          if (savedRaw) {
            const saved = JSON.parse(savedRaw);
            if (saved.avatarUrl) avatarUrl = saved.avatarUrl;
            if (saved.bannerUrl) bannerUrl = saved.bannerUrl;
          }
        } catch (e) {}
        setUserProfile({ username: data.username, avatarUrl, bannerUrl });
        setUserLevel(data.level);
        setUserRole(data.roleName || (roles[0] || ''));
        setIsAuthorized(true);
        setStartupPhase('ready');
      } else {
        setAuthError(data.message || 'Ошибка проверки токена. Требуется повторный вход.');
        setIsAuthorized(false);
        if (window.ipcRenderer) {
          window.ipcRenderer.send('set-authorized', { status: false });
        }
        clearStoredToken();
      }
    } catch (err) {
      console.error('Auth verification error', err);
      setAuthError('Не удалось подключиться к серверу авторизации.');
      setIsAuthorized(false);
    } finally {
      setAuthLoading(false);
    }
  };

  const STARTUP_STEPS = ['Локальные данные', 'Профили и правила', 'Настройки приложения', 'Соединение с сервером'];

  // Keep a mirror of the auth state for the startup check callback.
  useEffect(() => { authReadyRef.current = isAuthorized; }, [isAuthorized]);

  // Startup window (small): brief "Проверка файлов" screen, then auth or straight into the app.
  useEffect(() => {
    let cancelled = false;
    const timers: number[] = STARTUP_STEPS.map((_, i) =>
      window.setTimeout(() => { if (!cancelled) setCheckStep(i); }, 320 + i * 420)
    );
    timers.push(window.setTimeout(() => {
      if (cancelled) return;
      setStartupPhase(authReadyRef.current ? 'ready' : 'auth');
    }, 320 + STARTUP_STEPS.length * 420 + 360));
    return () => { cancelled = true; timers.forEach(clearTimeout); };
  }, []);

  // Expand the small window to the full app only once the main UI is visible.
  useEffect(() => {
    if (!window.ipcRenderer) return;
    if (startupPhase !== 'checking' && isAuthorized) {
      window.ipcRenderer.send('set-authorized', { status: true, role: userRole, username: userProfile?.username || '' });
    }
  }, [startupPhase, isAuthorized, userRole, userProfile]);

  // Update Logic
  useEffect(() => {
    if (!window.ipcRenderer) return;
    const ipc = window.ipcRenderer;
    
    const onUpdateAvailable = (_e: any, info: any) => setUpdateInfo(info);
    const onUpdateProgress = (_e: any, prog: number) => setUpdateProgress(prog);
    const onUpdateDownloaded = () => {
      setUpdateProgress(100);
      setIsUpdating(false);
    };
    const onUpdateError = (_e: any, err: string) => {
      setUpdateError(err);
      setIsUpdating(false);
    };
    
    ipc.on('update-available', onUpdateAvailable);
    ipc.on('update-progress', onUpdateProgress);
    ipc.on('update-downloaded', onUpdateDownloaded);
    ipc.on('update-error', onUpdateError);
    
    return () => {
      ipc.removeListener('update-available', onUpdateAvailable);
      ipc.removeListener('update-progress', onUpdateProgress);
      ipc.removeListener('update-downloaded', onUpdateDownloaded);
      ipc.removeListener('update-error', onUpdateError);
    };
  }, []);

  // Auth check & logic
  useEffect(() => {
    (async () => {
      const token = await getStoredToken();
      if (!token) {
        setAuthLoading(false);
        return;
      }
      verifyToken(token);
    })();
  }, []);

  // Handle lexis:// callback token (second instance / custom protocol)
  useEffect(() => {
    if (!window.ipcRenderer) return;
    const onAuthSuccess = (_e: any, token: string) => {
      if (!token) return;
      persistToken(token);
      verifyToken(token);
    };
    window.ipcRenderer.on('auth-success', onAuthSuccess);
    return () => {
      window.ipcRenderer?.removeAllListeners('auth-success');
    };
  }, []);

const handleDiscordLogin = async () => {
    if (!window.ipcRenderer) {
      setAuthError('Доступно только в приложении (Electron)');
      return;
    }

    setAuthLoading(true);
    setAuthError('');
    try {
      const token = await window.ipcRenderer.invoke('start-discord-auth');
      if (token) {
        persistToken(token);
        await verifyToken(token);
      } else {
        setAuthError('Вход отменён. Попробуйте ещё раз, когда будете готовы.');
        setAuthLoading(false);
      }
    } catch (err: any) {
      setAuthError(err.message || 'Ошибка при входе');
      setAuthLoading(false);
    }
  };



  // Load profiles & Active ID
  useEffect(() => {
    let loadedProfiles = [{ id: 'default', name: 'Основной', description: 'Ваш основной профиль' }];
    const savedProfiles = localStorage.getItem('lexis-tools-profiles');
    if (savedProfiles) {
      try { loadedProfiles = JSON.parse(savedProfiles); } catch (e) {}
      if (!Array.isArray(loadedProfiles) || loadedProfiles.length === 0) {
        loadedProfiles = [{ id: 'default', name: 'Основной', description: 'Ваш основной профиль' }];
      }
    }
    
    setProfiles(loadedProfiles);

    const savedActive = localStorage.getItem('lexis-tools-active-profile');
    if (savedActive && loadedProfiles.find(p => p.id === savedActive)) {
      setActiveProfileId(savedActive);
    } else {
      setActiveProfileId(loadedProfiles[0].id);
    }
    
    const savedProfile = localStorage.getItem('lexis-tools-user-profile');
    if (savedProfile) {
      try { setUserProfile(JSON.parse(savedProfile)); } catch(e) {}
    }
  }, []);

  // Sync profile rules when profile changes
  useEffect(() => {
    const savedRules = localStorage.getItem(`lexis-tools-rules-${activeProfileId}`);
    if (savedRules) {
      try { 
        const parsed = JSON.parse(savedRules);
        if (Array.isArray(parsed) && parsed.length > 0 && !parsed[0].rules) {
          // Old flat rules format detected, migrate it!
          const migratedRules = parsed.map((r: any, i: number) => ({
            id: r.id || `migrated-${i}`,
            name: r.name || 'Правило',
            content: r.content || r.raw || 'Описание правила...',
            punishmentType: r.punishmentType || r.punishment || 'Demorgan',
            duration: r.duration || '60',
            severity: r.severity || 1,
            isPinned: r.isPinned || false
          }));
          setCategories([{ id: 'migrated', name: 'Старые правила (Без категории)', rules: migratedRules }]);
        } else {
          setCategories(parsed); 
        }
      } catch (e) { setCategories([]); }
    } else {
      setCategories([]);
    }
    
    setLoadedProfileId(activeProfileId);
    localStorage.setItem('lexis-tools-active-profile', activeProfileId);
    
    // update rules count in profile
    setProfiles(prev => prev.map(p => {
      if (p.id === activeProfileId) {
        const ruleCount = savedRules ? JSON.parse(savedRules).reduce((acc: number, c: any) => acc + (c.rules ? c.rules.length : 1), 0) : 0;
        return { ...p, ruleCount };
      }
      return p;
    }));
  }, [activeProfileId]);

  // Save rules
  useEffect(() => {
    if (loadedProfileId === activeProfileId) {
      localStorage.setItem(`lexis-tools-rules-${activeProfileId}`, JSON.stringify(categories));
    }
    
    if (window.ipcRenderer) {
      if (categories.length > 0) {
        window.ipcRenderer.send('sync-rules', categories);
      }
      
      const copyHandler = (_event: any, text: string) => {
        // Optional: show toast notification
      };
      
      window.ipcRenderer.on('quick-reply-copied', copyHandler);
      
      // Fetch every running process. This must not depend on rules being created,
      // otherwise the binder's process picker stays empty in a fresh profile.
      window.ipcRenderer.invoke('get-processes').then((procs: string[]) => {
        if (procs && Array.isArray(procs)) setProcessList(procs);
      }).catch(console.error);

      return () => {
        window.ipcRenderer!.removeListener('quick-reply-copied', copyHandler);
      };
    }
  }, [categories, activeProfileId]);
  
  // Save Profiles array and sync binds
  useEffect(() => {
    localStorage.setItem('lexis-tools-profiles', JSON.stringify(profiles));
    const activeP = profiles.find(p => p.id === activeProfileId);
    if (activeP && window.ipcRenderer) {
      window.ipcRenderer.send('sync-binds', activeP.binds || []);
    }
  }, [profiles, activeProfileId]);

  // Sync settings
  useEffect(() => {
    applyTheme(settings);
    localStorage.setItem('lexis-tools-settings', JSON.stringify(settings));
if (window.ipcRenderer) {
      window.ipcRenderer.send('sync-settings', settings);
    }
}, [settings]);

  useEffect(() => {
    const savedSettings = localStorage.getItem('lexis-tools-settings');
    let loadedSettings = settings;
    if (savedSettings) {
      try { 
        loadedSettings = { ...settings, ...JSON.parse(savedSettings) };
        setSettings(loadedSettings); 
      } catch(e) {}
    }
    
    // Send hotkeys to main process on startup
    if (window.ipcRenderer) {
      window.ipcRenderer.send('update-hotkeys', { overlay: loadedSettings.overlayHotkey, events: loadedSettings.eventsHotkey, online: loadedSettings.onlineHotkey || 'Alt+U' });
    }
  }, []);

  const updateSetting = (key: keyof Settings, value: any) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    if (key === 'overlayHotkey' && window.ipcRenderer) {
      window.ipcRenderer.send('update-hotkeys', { overlay: newSettings.overlayHotkey });
    }
    if (key === 'eventsHotkey' && window.ipcRenderer) {
      window.ipcRenderer.send('update-hotkeys', { events: newSettings.eventsHotkey });
    }
    if (key === 'onlineHotkey' && window.ipcRenderer) {
      window.ipcRenderer.send('update-hotkeys', { online: newSettings.onlineHotkey });
    }
  };

  const updateSettings = (updates: Partial<Settings>) => {
    const newSettings = { ...settings, ...updates };
    setSettings(newSettings);
    if (updates.overlayHotkey !== undefined && window.ipcRenderer) {
      window.ipcRenderer.send('update-hotkeys', { overlay: newSettings.overlayHotkey });
    }
    if (updates.eventsHotkey !== undefined && window.ipcRenderer) {
      window.ipcRenderer.send('update-hotkeys', { events: newSettings.eventsHotkey });
    }
    if (updates.onlineHotkey !== undefined && window.ipcRenderer) {
      window.ipcRenderer.send('update-hotkeys', { online: newSettings.onlineHotkey });
    }
  };

  const updateBinds = (newBinds: Bind[]) => {
    setProfiles(prev => {
      const targetId = prev.find(p => p.id === activeProfileId) ? activeProfileId : (prev[0]?.id || 'default');
      return prev.map(p => {
        if (p.id === targetId) return { ...p, binds: newBinds };
        return p;
      });
    });
  };

  const updateQuickReplies = (newReplies: QuickCategory[]) => {
    setProfiles(prev => {
      const targetId = prev.find(p => p.id === activeProfileId) ? activeProfileId : (prev[0]?.id || 'default');
      return prev.map(p => {
        if (p.id === targetId) return { ...p, quickReplies: newReplies };
        return p;
      });
    });
  };


  if (startupPhase === 'checking') {
    return (
      <div className="app-container" style={{justifyContent: 'center', alignItems: 'center'}}>
        <div id="titlebar" style={{ height: '32px', width: '100%', WebkitAppRegion: 'drag', position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999, display: 'flex', justifyContent: 'flex-end', padding: '0 16px', alignItems: 'center' } as any}>
          <WindowControls />
        </div>
        <div style={{ width: '100%', maxWidth: 420, padding: '0 24px', textAlign: 'center' }}>
          <div className="auth-logo">LEXIS</div>
          <h2 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 700 }}>Проверка файлов</h2>
          <p style={{ margin: '0 0 28px', fontSize: 13, color: 'var(--text-muted)' }}>Подготовка рабочей области...</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 280, margin: '0 auto', textAlign: 'left' }}>
            {STARTUP_STEPS.map((s, i) => (
              <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 14 }}>
                {i < checkStep ? (
                  <CheckCircle2 size={16} style={{ color: 'var(--accent-color)', flexShrink: 0 }} />
                ) : i === checkStep ? (
                  <Loader2 className="animate-spin" size={16} style={{ color: 'var(--accent-color)', flexShrink: 0 }} />
                ) : (
                  <span style={{ width: 16, height: 16, flexShrink: 0 }} />
                )}
                <span style={{ color: i <= checkStep ? 'var(--text-main)' : 'var(--text-muted)', opacity: i <= checkStep ? 1 : 0.45 }}>{s}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="app-container" style={{justifyContent: 'center', alignItems: 'center'}}>
        <div id="titlebar" style={{ height: '32px', width: '100%', WebkitAppRegion: 'drag', position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999, display: 'flex', justifyContent: 'flex-end', padding: '0 16px', alignItems: 'center' } as any}>
          <WindowControls />
        </div>
        <div style={{ width: '100%', maxWidth: 400, padding: '0 24px', textAlign: 'center' }}>
          <div className="auth-logo">LEXIS</div>
          <h2 style={{ margin: '0 0 10px', fontSize: 20, fontWeight: 700 }}>Доступ закрыт</h2>
          <p style={{ margin: '0 0 24px', fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5 }}>
            Для использования программы требуется авторизация через Discord и наличие прав Администратора на сервере.
          </p>

          {authError && (
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', color: '#ef4444', padding: '12px', borderRadius: '8px', marginBottom: '20px', fontSize: 13 }}>
              {authError}
            </div>
          )}

          <button
            className="discord-btn"
            onClick={handleDiscordLogin}
            disabled={authLoading}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', background: '#5865F2', color: '#fff', border: 'none', padding: '14px 24px', borderRadius: '8px', cursor: 'pointer', fontSize: '15px', fontWeight: 600, width: '100%', opacity: authLoading ? 0.7 : 1 }}
          >
            {authLoading ? <Loader2 className="animate-spin" size={20} /> : <Globe size={20} />}
            {authLoading ? 'Проверка...' : 'Войти через Discord'}
          </button>
        </div>
      </div>
    );
  }

  return (
<div className="app-container" style={{ 
          '--accent-color': settings.accentColor,
          background: 'radial-gradient(1200px 620px at 80% 0%, color-mix(in srgb, var(--accent-color) 9%, var(--bg-main)) 0%, var(--bg-main) 55%)'
        } as any}>
      <div className="stars-bg" style={{ zIndex: 0, opacity: 0.3 }}></div>
      <div id="titlebar" style={{ height: '32px', width: '100%', WebkitAppRegion: 'drag', position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999, display: 'flex', justifyContent: 'flex-end', padding: '0 16px', alignItems: 'center' } as any}>
          <WindowControls />
        </div>
      <style>{`
        .shimmer-text {
          background: linear-gradient(90deg, #ffffff 0%, #333333 50%, #ffffff 100%);
          background-size: 200% auto;
          color: #000;
          background-clip: text;
          text-fill-color: transparent;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: shimmer 3s linear infinite;
        }
        @keyframes shimmer {
          to {
            background-position: 200% center;
          }
        }
        .stars-bg {
          position: absolute;
          inset: 0;
          background:
            radial-gradient(circle at 20% 30%, rgba(138, 168, 255, 0.14), transparent 24%),
            radial-gradient(circle at 80% 12%, rgba(196, 181, 253, 0.12), transparent 30%),
            linear-gradient(180deg, rgba(255,255,255,0.02) 0%, transparent 100%);
          opacity: 0.7;
          pointer-events: none;
          z-index: 0;
          animation: ambientGlow 16s ease-in-out infinite alternate;
        }
        @keyframes ambientGlow {
          from { transform: scale(1) translate3d(0, 0, 0); }
          to { transform: scale(1.05) translate3d(0, -6px, 0); }
        }
        .app-card {
          background: linear-gradient(180deg, color-mix(in srgb, var(--bg-card) 96%, rgba(255,255,255,0.04)) 0%, var(--bg-card) 100%);
          border: 1px solid var(--border-glass);
          border-radius: 16px;
          padding: 20px;
          transition: all 0.2s ease;
          position: relative;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          box-shadow: var(--shadow-light);
        }
        .app-card:hover {
          transform: translateY(-4px);
          border-color: rgba(138, 168, 255, 0.24);
          box-shadow: 0 12px 28px rgba(15, 23, 42, 0.14);
        }
        .hero-card {
          background: linear-gradient(135deg, color-mix(in srgb, var(--bg-card) 88%, rgba(138,168,255,0.12)) 0%, rgba(15, 19, 25, 0.9) 100%);
          border: 1px solid rgba(148, 163, 184, 0.12);
          border-radius: 18px;
          padding: 50px 40px;
          overflow: hidden;
          position: relative;
          box-shadow: var(--shadow-light);
        }
        .hero-card::before {
          content: '';
          position: absolute;
          top: -30%;
          right: -10%;
          bottom: -30%;
          width: 62%;
          background: radial-gradient(ellipse at center, rgba(138, 168, 255, 0.28), transparent 68%);
          pointer-events: none;
          z-index: 1;
        }
        .hero-card::after {
          content: '';
          position: absolute;
          top: 0;
          right: 0;
          bottom: 0;
          width: 42%;
          background: linear-gradient(to right, transparent, rgba(138, 168, 255, 0.08));
          pointer-events: none;
          z-index: 1;
        }
      `}</style>
      <div className="stars-bg"></div>
      <div className={`sidebar ${activeTab === 'settings' ? 'collapsed' : ''}`} style={{ position: 'relative', zIndex: 1 }}>
        <div className="sidebar-logo">
          <div className="logo-text">
            {activeTab === 'settings' ? 'L' : <>LEXIS <span>TOOLS</span></>}
          </div>
        </div>
        <div className="sidebar-profile">
          <div className="upc-ext" style={{ position: 'relative' }}>
            <div className="upc-banner" style={{
              background: userProfile?.bannerUrl
                ? `url("${userProfile.bannerUrl}") center / cover no-repeat`
                : 'linear-gradient(135deg, rgba(91,124,158,0.5), rgba(91,124,158,0.12))'
            }} />
            <div style={{ display: 'flex', alignItems: 'flex-end', marginTop: '-24px', padding: '0 12px' }}>
              {userProfile?.avatarUrl ? (
                <img src={userProfile.avatarUrl} className="upc-avatar-square" alt="Avatar" />
              ) : (
                <div className="upc-avatar-square" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: 700, color: 'var(--text-muted)' }}>
                  {(userProfile?.username || '?').charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div style={{ padding: '8px 12px 12px' }}>
              <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {userProfile?.username || 'Пользователь'}
              </div>
              <div style={{ display: 'flex', gap: '5px', marginTop: '4px', flexWrap: 'wrap' }}>
                {userRole ? (
                  <span title={userRole} style={{ display: 'inline-flex', maxWidth: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', padding: '3px 10px', borderRadius: '999px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', backgroundClip: 'text', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', color: 'transparent', backgroundImage: roleGradient(userLevel) }}>{userRole}</span>
                  </span>
                ) : (
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>В сети</span>
                )}
              </div>
            </div>
            {isAuthorized && (
              <button
                title="Выйти с аккаунта"
                onClick={() => {
                  clearStoredToken();
                  setIsAuthorized(false);
                  setUserProfile(null);
                  if (window.ipcRenderer) {
                    window.ipcRenderer.send('set-authorized', { status: false });
                  }
                }}
                style={{
                  position: 'absolute', top: '6px', right: '8px',
                  background: 'rgba(0,0,0,0.35)', color: '#ef4444', border: 'none',
                  borderRadius: '6px', width: '26px', height: '26px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', padding: 0, transition: 'background 0.15s ease'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.25)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(0,0,0,0.35)'; }}
              >
                <LogOut size={14} />
              </button>
            )}
          </div>
        </div>
        <nav className="sidebar-nav">
          <a href="#" className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setActiveTab('dashboard'); }}>
            <LayoutDashboard size={18} /> <span className="nav-text">Главная</span>
          </a>
          
          <div className="nav-group">
            <a href="#" className={`nav-item ${activeTab === 'rules' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setActiveTab('rules'); }}>
              <Book size={18} /> <span className="nav-text">Правила</span>
            </a>
            <div className={`nav-sub-items ${activeTab === 'rules' ? 'expanded' : ''}`}>
              <a href="#" className={`nav-sub-item ${rulesTab === 'editor' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setRulesTab('editor'); }}>Редактор</a>
              <a href="#" className={`nav-sub-item ${rulesTab === 'parser' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setRulesTab('parser'); }}>Парсер Форума</a>
            </div>
          </div>
          
          <a href="#" className={`nav-item ${activeTab === 'profiles' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setActiveTab('profiles'); }}>
            <User size={18} /> <span className="nav-text">Профили</span>
          </a>
          <a href="#" className={`nav-item ${activeTab === 'binder' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setActiveTab('binder'); }}>
            <Keyboard size={18} /> <span className="nav-text">Биндер</span>
          </a>
          <a href="#" className={`nav-item ${activeTab === 'events' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setActiveTab('events'); }}>
            <Trophy size={18} /> <span className="nav-text">Эвенты</span>
          </a>
          <a href="#" className={`nav-item ${activeTab === 'online' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setActiveTab('online'); }}>
            <Users size={18} /> <span className="nav-text">Онлайн</span>
          </a>
          <a href="#" className={`nav-item ${activeTab === 'quickreplies' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setActiveTab('quickreplies'); }}>
            <MessageSquareText size={18} /> <span className="nav-text">Быстрые Ответы</span>
          </a>
          <a href="#" className={`nav-item ${activeTab === 'ahelp' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setActiveTab('ahelp'); }}>
            <Crown size={18} /> <span className="nav-text">Ahelp</span>
          </a>
          <a href="#" className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setActiveTab('settings'); }}>
            <SettingsIcon size={18} /> <span className="nav-text">Настройки</span>
          </a>
        </nav>
        <button
          onClick={() => window.ipcRenderer?.send('open-external', 'https://dsc.gg/lexis')}
          className="help-btn"
          title="Открыть Discord-канал"
          style={{
            display: 'flex', alignItems: 'center', gap: '14px', margin: '12px 12px 10px', padding: '10px 16px',
            background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '13px', fontWeight: 500,
            borderRadius: '8px', cursor: 'pointer', textAlign: 'left', transition: 'background 0.15s ease, color 0.15s ease'
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = 'var(--text-main)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; }}
        >
          <HelpCircle size={18} style={{ flexShrink: 0 }} />
          <span className="nav-text">Помощь</span>
        </button>
      </div>

      <main className="main-content">
        <header className="top-header" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '40px', minHeight: '40px'}}>
          <div className="header-left" style={{flex: 1}}>
            <div className="breadcrumbs">LEXIS <span className="slash">/</span> <span className="current">
              {activeTab === 'dashboard' ? 'Главная' : 
               activeTab === 'rules' ? 'Редактор Правил' : 
               activeTab === 'profiles' ? 'Профили' : 
               activeTab === 'binder' ? 'Биндер' : 
               activeTab === 'events' ? 'Эвенты' : 
               activeTab === 'online' ? 'Онлайн' : 
               activeTab === 'quickreplies' ? 'Быстрые Ответы' :
               activeTab === 'ahelp' ? 'Справочник Администратора' : 'Настройки'}
            </span></div>
          </div>
          <div className="header-right" style={{flex: 1, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '15px'}}>
          </div>
        </header>

        <div className="content-area" style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {activeTab === 'dashboard' && (
            <div style={{ padding: '30px' }}>
              <div className="hero-card" style={{ marginBottom: '30px', position: 'relative' }}>
                <div className="hero-scanner">
                  <Scanner color1="#5227FF" color2="#FF9FFC" color3="#FFFFFF" speed={0.4} sweepSpeed={0.22} opacity={0.6} mouseInteraction={false} vignette={0.35} />
                </div>
                <div style={{ position: 'relative', zIndex: 3, padding: '26px 36px', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <div className="hero-kicker">Добро пожаловать в Lexis Tools</div>
                  <h1 className="hero-name-line">
                    <span className="hero-greet-line">
                      {(() => {
                        const h = new Date().getHours();
                        if (h >= 0 && h < 5) return 'Доброй ночи,';
                        if (h >= 5 && h < 12) return 'Доброе утро,';
                        if (h >= 12 && h < 17) return 'Добрый день,';
                        return 'Добрый вечер,';
                      })()}
                    </span>
                    <span className="hero-user">
                      <EchoText
                        text={userProfile?.username || 'Пользователь'}
                        color="#ffffff"
                        tint={settings.heroGradientColor1 || settings.accentColor || '#7dd3fc'}
                        fontSize="inherit"
                        fontWeight={800}
                        echoes={10}
                        offset={34}
                        lag={0.22}
                        fade={0.75}
                        blur={2}
                        mode="entrance"
                        duration={1000}
                      />
                    </span>
                  </h1>
                  <p className="hero-sub">Ваше рабочее пространство готово: правила, профили, биндеры и онлайн — всё под рукой.</p>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div onClick={() => setActiveTab('rules')} className="app-card" style={{ padding: '30px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  <div style={{ color: 'var(--accent-color)' }}>
                    <Book size={30} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>Правила</h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '14px', lineHeight: '1.5' }}>Центральная база правил.<br/>Премиальный редактор и умный парсер для быстрого импорта.</p>
                  </div>
                </div>

                <div onClick={() => setActiveTab('quickreplies')} className="app-card" style={{ padding: '30px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  <div style={{ color: 'var(--accent-color)' }}>
                    <MessageSquareText size={30} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>Быстрые Ответы</h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '14px', lineHeight: '1.5' }}>Ваши шаблоны для быстрых ответов.<br/>Создавайте и используйте заготовки в один клик.</p>
                  </div>
                </div>
              </div>

              <div className="anim-rise" style={{ marginTop: '20px', background: 'var(--bg-card)', border: '1px solid var(--border-glass)', borderRadius: '14px', padding: '18px 22px' }}>
                <div style={{ fontSize: '15px', fontWeight: 700, marginBottom: '12px' }}>Последние обновления</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
                  {CHANGELOG.map((e, i) => (
                    <button
                      key={i}
                      onClick={() => setChangelogModal(e)}
                      style={{
                        display: 'flex', gap: '12px', alignItems: 'baseline', fontSize: '13px', width: '100%',
                        background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px 6px', borderRadius: 8,
                        textAlign: 'left', transition: 'background 0.15s ease', color: 'inherit'
                      }}
                      onMouseEnter={ev => (ev.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                      onMouseLeave={ev => (ev.currentTarget.style.background = 'transparent')}
                    >
                      <span style={{ color: 'var(--accent-color)', fontWeight: 700, flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>{e.tag}</span>
                      <span style={{ color: 'var(--text-muted)', flex: 1 }}>{e.text}</span>
                      <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px', flexShrink: 0 }}>Подробнее ›</span>
                    </button>
                  ))}
                </div>
              </div>

              {changelogModal && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 99999, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setChangelogModal(null)}>
                  <div className="anim-pop" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-glass)', borderRadius: '16px', padding: '24px 28px', maxWidth: 460, width: 'calc(100% - 40px)', boxShadow: 'var(--shadow-medium)' }} onClick={e => e.stopPropagation()}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                      <span style={{ color: 'var(--accent-color)', fontWeight: 800, fontSize: '15px' }}>{changelogModal.tag}</span>
                      <button onClick={() => setChangelogModal(null)} title="Закрыть" style={{ marginLeft: 'auto', cursor: 'pointer', color: 'var(--text-muted)', width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 6, background: 'transparent', border: 'none' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                        <X size={16} />
                      </button>
                    </div>
                    <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-main)', marginBottom: '8px' }}>{changelogModal.text}</div>
                    <div style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.6 }}>{changelogModal.details}</div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'rules' && rulesTab === 'editor' && <RulesEditorTab categories={categories} setCategories={setCategories} />}
          {activeTab === 'rules' && rulesTab === 'parser' && <RulesParserTab categories={categories} setCategories={setCategories} />}
          {activeTab === 'profiles' && <ProfilesTab profiles={profiles} setProfiles={setProfiles} activeProfileId={activeProfileId} setActiveProfileId={setActiveProfileId} username={userProfile?.username || 'Пользователь'} />}
          {activeTab === 'ahelp' && <AhelpTab userLevel={userLevel} userRole={userRole} />}
          {activeTab === 'events' && <EventsTab />}
          {activeTab === 'online' && <OnlineTab />}
          {activeTab === 'binder' && <BinderTab settings={settings} binds={profiles.find(p => p.id === activeProfileId)?.binds || []} updateBinds={updateBinds} updateSettings={updateSettings} />}
          {activeTab === 'quickreplies' && <QuickRepliesTab categories={profiles.find(p => p.id === activeProfileId)?.quickReplies || DEFAULT_QUICK_CATEGORIES} updateCategories={updateQuickReplies} />}
          
          {activeTab === 'settings' && (
            <div style={{ display: 'flex', height: '100%', padding: '30px 40px', gap: '40px', background: 'transparent' }}>
              {/* Settings sidebar - redesigned */}
              <div style={{ width: '220px', display: 'flex', flexDirection: 'column', gap: '4px', zIndex: 1, flexShrink: 0 }}>
                <h2 style={{ fontSize: '22px', fontWeight: 800, color: 'white', marginBottom: '16px', padding: '0 8px' }}>Настройки</h2>
                
                {(['hotkeys', 'overlay', 'binder', 'profile', 'about'] as const).map(tab => {
                  const labels: Record<string, string> = { hotkeys: 'Горячие Клавиши', overlay: 'Оверлей', appearance: 'Оформление', binder: 'Биндер', about: 'О приложении', profile: 'Настройки профиля' };
                  const icons: Record<string, JSX.Element> = {
                    hotkeys: <Keyboard size={17} />,
                    overlay: <LayoutDashboard size={17} />,
                    appearance: <SettingsIcon size={17} />,
                    binder: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3"/></svg>,
                    about: <Info size={17} />,
                    profile: <User size={17} />
                  };
                  const isActive = settingsTab === tab;
                  return (
                    <div key={tab} onClick={() => setSettingsTab(tab)} style={{
                      display: 'flex', alignItems: 'center', gap: '12px',
                      padding: '11px 14px', borderRadius: '10px', cursor: 'pointer',
                      background: isActive ? 'rgba(255,255,255,0.08)' : 'transparent',
                      color: isActive ? 'white' : 'rgba(255,255,255,0.5)',
                      fontWeight: isActive ? 600 : 400, fontSize: '14px',
                      transition: 'all 0.15s', border: isActive ? '1px solid rgba(255,255,255,0.08)' : '1px solid transparent'
                    }}
                    onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = 'rgba(255,255,255,0.8)'; } }}
                    onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; } }}
                    >
                      <span style={{ opacity: isActive ? 1 : 0.7 }}>{icons[tab]}</span>
                      {labels[tab]}
                    </div>
                  );
                })}
              </div>

              {/* Settings Content */}
              <div style={{ flex: 1, zIndex: 1, overflowY: 'auto', paddingRight: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                  <h1 style={{ fontSize: '26px', fontWeight: 800, color: 'white', margin: 0 }}>
                    {settingsTab === 'hotkeys' ? 'Горячие Клавиши' : 
                     settingsTab === 'overlay' ? 'Оверлей' : 
                     settingsTab === 'binder' ? 'Биндер' : 
                     settingsTab === 'about' ? 'О приложении' : 'Настройки профиля'}
                  </h1>
                </div>

                {settingsTab === 'hotkeys' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-card)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '20px' }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '15px' }}>Показать/скрыть оверлей</div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '4px' }}>Основная кнопка для вызова интерфейса внутри игры</div>
                      </div>
                      <HotkeyInput value={settings.overlayHotkey} onChange={val => updateSetting('overlayHotkey', val)} style={{ width: '200px' }} />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-card)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '20px' }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '15px' }}>Оверлей эвентов</div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '4px' }}>Клавиша открытия оверлея с эвентами и командами</div>
                      </div>
                      <HotkeyInput value={settings.eventsHotkey || 'Alt+E'} onChange={val => updateSetting('eventsHotkey', val)} style={{ width: '200px' }} />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-card)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '20px' }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '15px' }}>Оверлей онлайна</div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '4px' }}>Клавиша показа списка онлайн-участников</div>
                      </div>
                      <HotkeyInput value={settings.onlineHotkey || 'Alt+U'} onChange={val => updateSetting('onlineHotkey', val)} style={{ width: '200px' }} />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-card)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '20px' }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '15px' }}>Клавиша чата (в игре)</div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '4px' }}>Клавиша открытия игрового чата</div>
                      </div>
                      <HotkeyInput value={settings.chatKey} onChange={val => updateSetting('chatKey', val)} style={{ width: '200px' }} />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-card)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '20px' }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '15px' }}>Автоматическая отправка</div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '4px' }}>Отправлять команду в чат автоматически</div>
                      </div>
                      <label className="ios-switch">
                        <input type="checkbox" checked={settings.autoEnter} onChange={e => updateSetting('autoEnter', e.target.checked)} />
                        <span className="slider"></span>
                      </label>
                    </div>

                    {!settings.autoEnter && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-card)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '20px' }}>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '15px' }}>Клавиша отправки команды</div>
                          <div style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '4px' }}>Клавиша отправки команды в чат</div>
                        </div>
                        <HotkeyInput value={settings.sendKey} onChange={(val: string) => updateSetting('sendKey', val)} style={{ width: '200px' }} />
                      </div>
                    )}
                  </div>
                )}

                {settingsTab === 'overlay' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <div style={{ background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '12px', padding: '20px', display: 'flex', gap: '15px' }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '2px' }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                      <div>
                        <div style={{ color: '#10b981', fontWeight: 600, fontSize: '15px', marginBottom: '8px' }}>Как переместить оверлей?</div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '14px', lineHeight: '1.6' }}>
                          1. Откройте оверлей с помощью клавиши (по умолчанию <strong>{settings.overlayHotkey || 'Alt+O'}</strong>).<br/>
                          2. Потяните любую панель за иконку в левом верхнем углу.<br/>
                          3. Снова нажмите <strong>{settings.overlayHotkey || 'Alt+O'}</strong>, чтобы скрыть оверлей.
                        </div>
                      </div>
                    </div>

                    <div style={{ background: 'var(--bg-card)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '20px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <div style={{ fontWeight: 600, fontSize: '15px' }}>Прозрачность окон</div>
                      </div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '15px' }}>Насколько сильно оверлей перекрывает игровой процесс</div>
                      <input type="range" min="0.1" max="1" step="0.05" value={settings.overlayOpacity} onChange={e => updateSetting('overlayOpacity', parseFloat(e.target.value))} style={{ width: '100%', cursor: 'pointer' }} />
                    </div>
                  </div>
                )}

                {settingsTab === 'binder' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-card)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '20px' }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '15px' }}>Отображать оверлей биндера</div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '4px' }}>Включить или выключить видимость панели с биндами на экране</div>
                      </div>
                      <label className="ios-switch">
                        <input type="checkbox" checked={settings.binder_enabled !== false} onChange={e => updateSetting('binder_enabled', e.target.checked)} />
                        <span className="slider"></span>
                      </label>
                    </div>

                    <div style={{ background: 'var(--bg-card)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '20px' }}>
                      <div style={{ fontWeight: 600, fontSize: '15px', marginBottom: '4px' }}>Процесс для биндера</div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '14px' }}>Биндер будет срабатывать ТОЛЬКО когда активно окно с этим процессом. Оставьте пустым — срабатывает всегда. Нажмите на поле чтобы выбрать из запущенных.</div>
                      <div style={{ position: 'relative' }}>
                        <input
                          type="text"
                          value={settings.binder_process || ''}
                          onChange={e => updateSetting('binder_process' as any, e.target.value)}
                          onClick={() => setIsProcessDropdownOpen(!isProcessDropdownOpen)}
                          onFocus={e => { e.target.style.borderColor = 'rgba(255,255,255,0.25)'; setIsProcessDropdownOpen(true); }}
                          onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; setTimeout(() => setIsProcessDropdownOpen(false), 200); }}
                          placeholder="Например: GTA5.exe или RAGE-MP.exe"
                          style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '10px 14px', color: 'white', fontSize: '14px', outline: 'none', boxSizing: 'border-box', fontFamily: 'monospace' }}
                        />
                        <div style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'rgba(255,255,255,0.3)' }}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                        </div>
                        {isProcessDropdownOpen && (
                          <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '4px', background: '#1c1c1e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', maxHeight: '200px', overflowY: 'auto', zIndex: 10 }}>
                            {processList.filter(p => p.toLowerCase().includes((settings.binder_process || '').toLowerCase())).map(proc => (
                              <div
                                key={proc}
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  updateSetting('binder_process' as any, proc);
                                  setIsProcessDropdownOpen(false);
                                }}
                                style={{ padding: '8px 14px', cursor: 'pointer', fontFamily: 'monospace', fontSize: '13px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}
                                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                              >
                                {proc}
                              </div>
                            ))}
                            {processList.filter(p => p.toLowerCase().includes((settings.binder_process || '').toLowerCase())).length === 0 && (
                              <div style={{ padding: '8px 14px', fontSize: '13px', color: 'var(--text-muted)' }}>Ничего не найдено</div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-card)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '20px' }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '15px' }}>Проверять активность окна</div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '4px' }}>Не срабатывать если окно процесса свёрнуто или не в фокусе</div>
                      </div>
                      <label className="ios-switch">
                        <input type="checkbox" checked={settings.binder_check_focus !== false} onChange={e => updateSetting('binder_check_focus' as any, e.target.checked)} />
                        <span className="slider"></span>
                      </label>
                    </div>
                  </div>
                )}

                {settingsTab === 'profile' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', background: 'var(--bg-card)', border: '1px solid var(--border-glass)', borderRadius: '16px', padding: '20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <User size={16} style={{ color: 'var(--accent-color)' }} />
                        <div style={{ fontWeight: 700, fontSize: '15px' }}>Предпросмотр профиля</div>
                        {profileSaved && <span style={{ fontSize: '12px', color: '#22c55e', marginLeft: 'auto' }}>✓ Сохранено</span>}
                      </div>
                      <div style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border-glass)', background: 'var(--bg-muted)' }}>
                        <div style={{ height: 96, background: profileDraft.bannerUrl ? `url("${profileDraft.bannerUrl}") center / cover no-repeat` : 'linear-gradient(135deg, rgba(91,124,158,0.5), rgba(91,124,158,0.12))' }} />
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px' }}>
                          {profileDraft.avatarUrl ? (
                            <img src={profileDraft.avatarUrl} alt="avatar" style={{ width: 48, height: 48, borderRadius: 10, objectFit: 'cover', border: '2px solid var(--bg-card)' }} />
                          ) : (
                            <div style={{ width: 48, height: 48, borderRadius: 10, border: '2px solid var(--bg-card)', background: 'var(--bg-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, color: 'var(--text-muted)' }}>
                              {(userProfile?.username || '?').charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-main)' }}>{userProfile?.username || 'Пользователь'}</div>
                            {userRole && (
                              <div style={{ fontSize: '11px', fontWeight: 700, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', backgroundClip: 'text', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', color: 'transparent', backgroundImage: roleGradient(userLevel) }}>{userRole}</div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', background: 'var(--bg-card)', border: '1px solid var(--border-glass)', borderRadius: '16px', padding: '20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <SettingsIcon size={16} style={{ color: 'var(--accent-color)' }} />
                        <div style={{ fontWeight: 700, fontSize: '15px' }}>Аватарка и баннер</div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: 44, height: 44, borderRadius: 10, overflow: 'hidden', background: 'var(--bg-muted)', border: '1px solid var(--border-glass)', flexShrink: 0 }}>
                          {profileDraft.avatarUrl && <img src={profileDraft.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>Ссылка на аватарку</div>
                          <input type="text" placeholder="https://... (png/jpg/gif)"
                            value={profileDraft.avatarUrl}
                            onChange={e => setProfileDraft(p => ({ ...p, avatarUrl: e.target.value }))}
                            style={profileInputStyle} />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <button onClick={() => pickProfileFile('avatarUrl')} style={{ fontSize: '12px', padding: '7px 12px', borderRadius: 6, border: '1px solid var(--border-glass)', background: 'var(--bg-muted)', color: 'var(--text-main)', cursor: 'pointer' }}>Файл</button>
                          <button onClick={() => setProfileDraft(p => ({ ...p, avatarUrl: '' }))} style={{ fontSize: '12px', padding: '7px 12px', borderRadius: 6, border: '1px solid rgba(239,68,68,0.3)', background: 'transparent', color: 'rgba(239,68,68,0.8)', cursor: 'pointer' }}>Убрать</button>
                        </div>
                      </div>

                      <div style={{ height: '1px', background: 'var(--border-glass)' }} />

                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: 52, height: 40, borderRadius: 8, overflow: 'hidden', background: 'var(--bg-muted)', border: '1px solid var(--border-glass)', flexShrink: 0 }}>
                          {profileDraft.bannerUrl && <img src={profileDraft.bannerUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>Баннер (фон) — можно GIF</div>
                          <input type="text" placeholder="https://... (png/jpg/gif)"
                            value={profileDraft.bannerUrl}
                            onChange={e => setProfileDraft(p => ({ ...p, bannerUrl: e.target.value }))}
                            style={profileInputStyle} />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <button onClick={() => pickProfileFile('bannerUrl')} style={{ fontSize: '12px', padding: '7px 12px', borderRadius: 6, border: '1px solid var(--border-glass)', background: 'var(--bg-muted)', color: 'var(--text-main)', cursor: 'pointer' }}>Файл</button>
                          <button onClick={() => setProfileDraft(p => ({ ...p, bannerUrl: '' }))} style={{ fontSize: '12px', padding: '7px 12px', borderRadius: 6, border: '1px solid rgba(239,68,68,0.3)', background: 'transparent', color: 'rgba(239,68,68,0.8)', cursor: 'pointer' }}>Убрать</button>
                        </div>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '4px' }}>
                        <button onClick={() => setProfileConfirmOpen(true)} className="primary-btn">Сохранить профиль</button>
                      </div>
                    </div>

                    {profileConfirmOpen && (
                      <div style={{ position: 'fixed', inset: 0, zIndex: 99999, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-glass)', borderRadius: '16px', padding: '26px 28px', textAlign: 'center', maxWidth: 340, boxShadow: 'var(--shadow-medium)' }}>
                          <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-main)', marginBottom: 10 }}>Сохранить изменения профиля?</div>
                          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20, lineHeight: 1.5 }}>
                            Аватарка и баннер будут обновлены в карточке профиля.
                          </div>
                          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                            <button onClick={() => setProfileConfirmOpen(false)} style={{ padding: '9px 18px', borderRadius: 8, border: '1px solid var(--border-glass)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 14 }}>Отмена</button>
                            <button onClick={confirmSaveProfile} className="primary-btn">Подтвердить</button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {settingsTab === 'about' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', background: 'var(--bg-card)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '24px', alignItems: 'center', textAlign: 'center' }}>
                      <div style={{ width: '64px', height: '64px', background: 'linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.02))', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <Info size={32} color="rgba(255,255,255,0.8)" />
                      </div>
                      <h2 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 4px 0', color: 'white' }}>Lexis Tools</h2>
                      <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: '0 0 24px 0' }}>Версия 1.1.1</p>
                      
                      <div style={{ width: '100%', height: '1px', background: 'rgba(255,255,255,0.05)', margin: '0 0 24px 0' }} />
                      
                      <h3 style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 16px 0', color: 'rgba(255,255,255,0.9)' }}>Связь с разработчиками</h3>
                      
                      <div style={{ display: 'flex', gap: '18px', justifyContent: 'center', flexWrap: 'wrap' }}>
                          <ProfileCard className="mini" name="abstracktyt" title="Разработчик" showUserInfo handle="abstracktyt" status="Помощь" contactText="Discord" onContactClick={() => window.ipcRenderer?.send('open-external', 'https://dsc.gg/lexis')} />
                          <ProfileCard className="mini" name="strangerzv" title="Разработчик" showUserInfo handle="strangerzv" status="Помощь" contactText="Discord" onContactClick={() => window.ipcRenderer?.send('open-external', 'https://dsc.gg/lexis')} />
                          <ProfileCard className="mini" name="_emikor_" title="Разработчик" showUserInfo handle="_emikor_" status="Помощь" contactText="Discord" onContactClick={() => window.ipcRenderer?.send('open-external', 'https://dsc.gg/lexis')} />
                        </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Update Modal */}
      {updateInfo && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(5px)' }}>
          <div style={{ background: '#1c1c1e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', padding: '30px', width: '400px', maxWidth: '90%', display: 'flex', flexDirection: 'column', gap: '20px', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}>
            <div>
              <h2 style={{ color: 'white', fontSize: '22px', fontWeight: 800, margin: '0 0 8px 0' }}>Доступно обновление!</h2>
              <div style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Версия {updateInfo.version} готова к установке.</div>
            </div>
            
            {updateInfo.releaseNotes && (
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '10px', padding: '15px', color: 'rgba(255,255,255,0.8)', fontSize: '13px', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                {updateInfo.releaseNotes}
              </div>
            )}
            
            {updateError && (
              <div style={{ color: '#ef4444', fontSize: '13px', textAlign: 'center' }}>
                {updateError}
              </div>
            )}

            {updateProgress >= 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '12px' }}>
                  <span>Загрузка...</span>
                  <span>{updateProgress}%</span>
                </div>
                <div style={{ height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${updateProgress}%`, background: 'var(--accent-color)', transition: 'width 0.2s' }} />
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
              <button 
                onClick={() => setUpdateInfo(null)}
                disabled={isUpdating}
                style={{ flex: 1, padding: '12px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: 'white', cursor: isUpdating ? 'not-allowed' : 'pointer', fontWeight: 600, opacity: isUpdating ? 0.5 : 1 }}
              >
                Позже
              </button>
              <button 
                onClick={() => {
                  setIsUpdating(true);
                  if (window.ipcRenderer) {
                    window.ipcRenderer.send('start-update-download', updateInfo.url);
                  }
                }}
                disabled={isUpdating}
                style={{ flex: 1, padding: '12px', background: 'var(--accent-color)', border: 'none', borderRadius: '10px', color: 'var(--accent-text-color)', cursor: isUpdating ? 'not-allowed' : 'pointer', fontWeight: 600, opacity: isUpdating ? 0.7 : 1 }}
              >
                {isUpdating ? 'Загрузка...' : 'Обновить'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
