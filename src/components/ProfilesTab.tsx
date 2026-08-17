import { useState, useEffect } from 'react';
import { Settings, Edit2, Trash2, User, Download, Upload } from 'lucide-react';
import { Profile } from '../types';
import { DEFAULT_QUICK_CATEGORIES } from './QuickRepliesTab';

interface Props {
  profiles: Profile[];
  activeProfileId: string;
  setProfiles: (p: Profile[]) => void;
  setActiveProfileId: (id: string) => void;
  username: string;
}

export default function ProfilesTab({ profiles, activeProfileId, setProfiles, setActiveProfileId, username }: Props) {
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, profileId: string } | null>(null);
  const [renameModal, setRenameModal] = useState<{ id: string, name: string } | null>(null);

  useEffect(() => {
    const closeMenu = () => setContextMenu(null);
    window.addEventListener('click', closeMenu);
    return () => window.removeEventListener('click', closeMenu);
  }, []);

  const handleCreateProfile = () => {
    const newProfile = { id: Date.now().toString(), name: 'Новый профиль', author: username, ruleCount: 0, quickReplies: DEFAULT_QUICK_CATEGORIES };
    setProfiles([...profiles, newProfile]);
  };

  const handleSaveEdit = () => {
    if (renameModal && renameModal.name.trim()) {
      setProfiles(profiles.map(p => p.id === renameModal.id ? { ...p, name: renameModal.name.trim() } : p));
      setRenameModal(null);
    }
  };

  const handleDelete = (id: string) => {
    let nextProfiles = profiles.filter(p => p.id !== id);
    if (nextProfiles.length === 0) {
      nextProfiles = [{ id: Date.now().toString(), name: 'Новый профиль', author: username, ruleCount: 0, quickReplies: DEFAULT_QUICK_CATEGORIES }];
    }
    setProfiles(nextProfiles);
    if (activeProfileId === id) {
      setActiveProfileId(nextProfiles[0].id);
    }
    localStorage.removeItem(`lexis-tools-rules-${id}`);
  };

  const handleExport = (profileId: string) => {
    const profile = profiles.find(p => p.id === profileId);
    if (!profile) return;
    const rulesStr = localStorage.getItem(`lexis-tools-rules-${profileId}`);
    const rules = rulesStr ? JSON.parse(rulesStr) : [];
    
    const data = { profile, rules };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lexis-profile-${profile.name.replace(/\s+/g, '-')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = (e: any) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = JSON.parse(event.target?.result as string);
          if (data.profile && Array.isArray(data.rules)) {
            const newId = Date.now().toString();
            const newProfile = { ...data.profile, id: newId };
            setProfiles([...profiles, newProfile]);
            localStorage.setItem(`lexis-tools-rules-${newId}`, JSON.stringify(data.rules));
          }
        } catch(err) {
          alert("Ошибка при импорте профиля");
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  return (
    <div style={{ padding: '20px', height: '100%', overflowY: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 700 }}>Профили конфигураций</h2>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            onClick={handleImport}
            style={{ background: 'transparent', border: '1px solid var(--border-light)', color: 'white', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Upload size={16} /> Импорт
          </button>
          <button 
            onClick={handleCreateProfile}
            style={{ background: 'var(--accent-color)', color: 'var(--accent-text-color)', padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 600 }}
          >
            Создать профиль
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
        {profiles.map(profile => {
          const isActive = profile.id === activeProfileId;
          return (
            <div 
              key={profile.id}
              onClick={() => setActiveProfileId(profile.id)}
              onContextMenu={(e) => {
                e.preventDefault();
                setContextMenu({ x: e.clientX, y: e.clientY, profileId: profile.id });
              }}
              style={{
                background: 'var(--bg-card)',
                border: `1px solid ${isActive ? 'var(--accent-color)' : 'var(--border-light)'}`,
                borderRadius: '12px',
                padding: '20px',
                cursor: 'pointer',
                position: 'relative',
                boxShadow: isActive ? '0 0 15px color-mix(in srgb, var(--accent-color) 40%, transparent)' : 'none'
              }}
            >
              {isActive && (
                <div style={{ position: 'absolute', top: '-10px', right: '20px', background: 'var(--accent-color)', color: 'var(--accent-text-color)', padding: '4px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: 700 }}>
                  АКТИВЕН
                </div>
              )}
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'color-mix(in srgb, var(--accent-color) 20%, transparent)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <Settings color="var(--accent-color)" size={20} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '16px', fontWeight: 600, margin: 0, fontFamily: 'var(--font-main)' }}>{profile.name}</h3>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>{profile.ruleCount || 0} правил</p>
                  </div>
                </div>
              </div>
              
              <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <User size={14} /> {profile.author || 'User'}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {contextMenu && (
        <div style={{
          position: 'fixed', top: contextMenu.y, left: contextMenu.x, zIndex: 1000,
          background: '#121214', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px',
          boxShadow: '0 4px 15px rgba(0,0,0,0.5)', minWidth: '150px', padding: '4px'
        }}>
          <div 
            onClick={() => {
              const p = profiles.find(x => x.id === contextMenu.profileId);
              if (p) {
                setRenameModal({ id: p.id, name: p.name });
              }
              setContextMenu(null);
            }}
            style={{ padding: '8px 12px', cursor: 'pointer', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <Edit2 size={14} /> Переименовать
          </div>
          <div 
            onClick={() => {
              handleExport(contextMenu.profileId);
              setContextMenu(null);
            }}
            style={{ padding: '8px 12px', cursor: 'pointer', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <Download size={14} /> Экспорт
          </div>
          <div 
            onClick={() => {
              handleDelete(contextMenu.profileId);
              setContextMenu(null);
            }}
            style={{ padding: '8px 12px', cursor: 'pointer', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#ef4444' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.1)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <Trash2 size={14} /> Удалить
          </div>
        </div>
      )}

      {/* Rename Profile Modal */}
      {renameModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', WebkitAppRegion: 'no-drag' as any }}>
          <div style={{ background: '#18181b', border: '1px solid rgba(255,255,255,0.1)', padding: '24px', borderRadius: '16px', width: '320px', boxShadow: '0 20px 40px rgba(0,0,0,0.4)', fontFamily: 'var(--font-main)' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 600, color: '#fff' }}>Переименовать профиль</h3>
            <input
              type="text"
              value={renameModal.name}
              onChange={e => setRenameModal({ ...renameModal, name: e.target.value })}
              onKeyDown={e => {
                if (e.key === 'Enter') handleSaveEdit();
                if (e.key === 'Escape') setRenameModal(null);
              }}
              autoFocus
              style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '10px 12px', color: '#fff', fontSize: '14px', outline: 'none', marginBottom: '20px', fontFamily: 'var(--font-main)' }}
            />
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button onClick={() => setRenameModal(null)} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)', padding: '8px 16px', borderRadius: '8px', fontSize: '13px', cursor: 'pointer' }}>
                Отмена
              </button>
              <button onClick={handleSaveEdit} style={{ background: 'var(--accent-color)', color: 'var(--accent-text-color)', border: 'none', padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                Сохранить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
