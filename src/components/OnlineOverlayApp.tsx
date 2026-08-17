import { useState, useEffect } from 'react';
import { Users, Loader2, MicOff, VolumeX, Headphones } from 'lucide-react';
import { API_BASE } from '../lib/api';
import { roleGradient } from '../lib/roles';

interface VoiceOnlineMember {
  userId: string;
  username: string;
  avatarUrl?: string | null;
  roleName?: string | null;
  level?: number;
  channelId?: string | null;
  channelName?: string | null;
  selfMute?: boolean;
  serverMute?: boolean;
  selfDeaf?: boolean;
  serverDeaf?: boolean;
}

const ONLINE_CHANNEL_ID = '1232400428579295243';
const AFK_CHANNEL_ID = '1232400451438252032';

const CHANNEL_NAMES: Record<string, string> = {
  [ONLINE_CHANNEL_ID]: 'Канал админов',
  [AFK_CHANNEL_ID]: 'АФК',
  '1392835835044565002': 'Голосовой 1',
  '1232400423646658603': 'Голосовой 3',
  '1392836107862802472': 'Голосовой 4',
  '1392836075646353508': 'Голосовой 5',
  '1392836033418362992': 'Голосовой 6',
  '1392836202398482523': 'Голосовой 7',
  '1392836236141658193': 'Голосовой 8',
  '1392836284044673208': 'Голосовой 9',
  '1297236780113854545': 'Голосовой 11',
  '1232400460674236546': 'Голосовой 12',
};

function channelLabel(m: VoiceOnlineMember) {
  if (m.channelName) return m.channelName;
  if (m.channelId && CHANNEL_NAMES[m.channelId]) return CHANNEL_NAMES[m.channelId];
  return 'Войс-канал';
}

export default function OnlineOverlayApp() {
  const [members, setMembers] = useState<VoiceOnlineMember[]>([]);
  const [status, setStatus] = useState<'loading' | 'ok' | 'unavailable' | 'unauthorized'>('loading');

  useEffect(() => {
    const titlebar = document.getElementById('titlebar');
    if (titlebar) titlebar.style.cssText = 'display:none!important';
    const root = document.getElementById('root');
    if (root) { root.style.paddingTop = '0'; root.classList.remove('pt-8'); }
    document.body.style.backgroundColor = 'transparent';
    document.documentElement.style.backgroundColor = 'transparent';

    let cancelled = false;

    const load = async () => {
      let token: string | null = null;
      if (window.ipcRenderer) {
        try { token = await window.ipcRenderer.invoke('get-auth-token'); } catch (e) { token = localStorage.getItem('lexis-tools-auth-token'); }
      }
      if (!token) token = localStorage.getItem('lexis-tools-auth-token');
      if (!token) { if (!cancelled) setStatus('unauthorized'); return; }
      try {
        const res = await fetch(`${API_BASE}/api/voice-online`, { headers: { Authorization: `Bearer ${token}` } });
        if (cancelled) return;
        if (!res.ok) { if (!cancelled) setStatus(res.status === 401 || res.status === 403 ? 'unauthorized' : 'unavailable'); return; }
        const data: { online?: VoiceOnlineMember[] } = await res.json();
        if (cancelled) return;
        setMembers(data.online || []);
        setStatus('ok');
      } catch (err) {
        if (!cancelled) setStatus('unavailable');
      }
    };

    load();
    const id = window.setInterval(load, 30000);
    return () => { cancelled = true; window.clearInterval(id); };
  }, []);

  const groups = members.reduce<Record<string, VoiceOnlineMember[]>>((acc, m) => {
    const key = m.channelId || '';
    if (!acc[key]) acc[key] = [];
    acc[key].push(m);
    return acc;
  }, {});

  const renderMember = (m: VoiceOnlineMember) => {
    const muted = !!(m.selfMute || m.serverMute);
    const deaf = !!(m.selfDeaf || m.serverDeaf);
    return (
      <div key={m.userId} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '3px 10px', borderRadius: '6px', cursor: 'default' }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
      >
        {m.avatarUrl ? (
          <img src={m.avatarUrl} alt="" style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
        ) : (
          <div style={{ width: 24, height: 24, borderRadius: '50%', flexShrink: 0, background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>
            {(m.username || '?').charAt(0).toUpperCase()}
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.username}</div>
{m.roleName && (
                        <div style={{ fontSize: '10px', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', backgroundClip: 'text', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', color: 'transparent', backgroundImage: roleGradient(m.level) }}>{m.roleName}</div>
                      )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
          {deaf && <VolumeX size={12} style={{ color: '#ef4444' }} />}
          {muted && <MicOff size={12} style={{ color: '#ef4444' }} />}
        </div>
      </div>
    );
  };

  return (
    <div style={{
      width: '100vw', height: '100vh', boxSizing: 'border-box', display: 'flex', flexDirection: 'column',
      overflow: 'hidden'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '6px 12px', WebkitAppRegion: 'drag' as any, userSelect: 'none' }}>
        <Users size={13} style={{ color: 'var(--accent-color)' }} />
        <span style={{ flex: 1, fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.85)', textShadow: '0 1px 2px rgba(0,0,0,0.6)' }}>
          Онлайн в войсе
        </span>
        {status === 'ok' && <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', textShadow: '0 1px 2px rgba(0,0,0,0.6)' }}>{members.length}</span>}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '2px 0 6px' }}>
        {status === 'loading' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'rgba(255,255,255,0.6)', fontSize: '11px', padding: '8px 12px', textShadow: '0 1px 2px rgba(0,0,0,0.6)' }}>
            <Loader2 className="animate-spin" size={12} /> Загрузка...
          </div>
        )}
        {status === 'unavailable' && <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: '11px', padding: '8px 12px', textShadow: '0 1px 2px rgba(0,0,0,0.6)' }}>Онлайн недоступен</div>}
        {status === 'unauthorized' && <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: '11px', padding: '8px 12px', textShadow: '0 1px 2px rgba(0,0,0,0.6)' }}>Нет доступа</div>}
        {status === 'ok' && members.length === 0 && (
          <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: '11px', padding: '8px 12px', textShadow: '0 1px 2px rgba(0,0,0,0.6)' }}>Никого нет в войсе</div>
        )}
        {status === 'ok' && Object.entries(groups).map(([channelId, list]) => (
          <div key={channelId || 'none'}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '5px 12px 2px', fontSize: '10px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', textShadow: '0 1px 2px rgba(0,0,0,0.6)' }}>
              <Headphones size={10} />
              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {channelId ? channelLabel(list[0]) : 'Без канала'}
              </span>
              <span style={{ opacity: 0.6 }}>{list.length}</span>
            </div>
            {list.map(renderMember)}
          </div>
        ))}
      </div>
    </div>
  );
}