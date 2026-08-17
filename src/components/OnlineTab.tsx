import { useState, useEffect, ReactNode } from 'react';
import { Users, Loader2, MicOff, VolumeX, Video, Radio, MapPin } from 'lucide-react';
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
  selfDeaf?: boolean;
  serverMute?: boolean;
  serverDeaf?: boolean;
  streaming?: boolean;
  video?: boolean;
}

interface VoiceOnlineResponse {
  online?: VoiceOnlineMember[];
  total?: number;
  channels_monitored?: number;
}

const ONLINE_CHANNEL_ID = '1232400428579295243';
const AFK_CHANNEL_ID = '1232400451438252032';

// Человеческие названия известных каналов (для остальных берём channelName из ответа).
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

export default function OnlineTab() {
  const [members, setMembers] = useState<VoiceOnlineMember[]>([]);
  const [total, setTotal] = useState(0);
  const [channelsMonitored, setChannelsMonitored] = useState<number | null>(null);
  const [status, setStatus] = useState<'loading' | 'ok' | 'unavailable' | 'unauthorized'>('loading');
  const [lastError, setLastError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      let token: string | null = null;
      if (window.ipcRenderer) {
        try {
          token = await window.ipcRenderer.invoke('get-auth-token');
        } catch (e) {
          token = localStorage.getItem('lexis-tools-auth-token');
        }
      }
      if (!token) token = localStorage.getItem('lexis-tools-auth-token');
      if (!token) {
        if (!cancelled) setStatus('unauthorized');
        return;
      }
      try {
        const res = await fetch(`${API_BASE}/api/voice-online`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (cancelled) return;
        if (!res.ok) {
          setLastError(`HTTP ${res.status}`);
          setStatus(res.status === 401 || res.status === 403 ? 'unauthorized' : 'unavailable');
          return;
        }
        const data: VoiceOnlineResponse = await res.json();
        if (cancelled) return;
        setMembers(data.online || []);
        setTotal(data.total || (data.online || []).length);
        setChannelsMonitored(typeof data.channels_monitored === 'number' ? data.channels_monitored : null);
        setLastError(null);
        setStatus('ok');
      } catch (err) {
        if (!cancelled) setLastError('нет ответа от сервера');
        if (!cancelled) setStatus('unavailable');
      }
    };

    load();
    const id = window.setInterval(load, 30000);
    return () => { cancelled = true; window.clearInterval(id); };
  }, []);

  const renderStatusIcons = (m: VoiceOnlineMember) => {
    const icons: { active: boolean; color: string; node: ReactNode }[] = [
      { active: !!(m.selfMute || m.serverMute), color: '#ef4444', node: <MicOff size={14} /> },
      { active: !!(m.selfDeaf || m.serverDeaf), color: '#ef4444', node: <VolumeX size={14} /> },
      { active: !!m.streaming, color: '#a855f7', node: <Radio size={14} /> },
      { active: !!m.video, color: '#22c55e', node: <Video size={14} /> },
    ];
    return icons.filter(i => i.active).map(i => (
      <span key={i.node as string} style={{ color: i.color, display: 'flex', flexShrink: 0 }}>{i.node}</span>
    ));
  };

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '4px 4px 24px 4px' }}>
      {status === 'loading' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '13px', padding: '20px 4px' }}>
          <Loader2 className="animate-spin" size={16} /> Загрузка списка онлайн...
        </div>
      )}
      {status === 'unauthorized' && (
        <div style={{ color: 'var(--text-muted)', fontSize: '13px', padding: '20px 4px' }}>Нет доступа к списку</div>
      )}
      {status === 'unavailable' && (
        <div style={{ color: 'var(--text-muted)', fontSize: '13px', padding: '20px 4px' }}>
          Онлайн недоступен{lastError ? ` (${lastError})` : ''}
        </div>
      )}
      {status === 'ok' && channelsMonitored === 0 && (
        <div style={{ color: '#f59e0b', fontSize: '13px', padding: '20px 4px' }}>Войс-каналы не настроены (channels_monitored = 0)</div>
      )}
      {status === 'ok' && channelsMonitored !== 0 && members.length === 0 && (
        <div style={{ color: 'var(--text-muted)', fontSize: '13px', padding: '20px 4px' }}>Никого нет в войсе</div>
      )}
      {status === 'ok' && channelsMonitored !== 0 && members.length > 0 && (
        <>
          <div className="anim-fade" style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '0 4px 16px', flexWrap: 'wrap' }}>
            <Users size={18} style={{ color: 'var(--accent-color)' }} />
            <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-main)' }}>Администрация онлайн</span>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Всего в войсе: {total}</span>
          </div>

          <div className="anim-fade" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '10px' }}>
            {members.map(m => {
              const isTarget = m.channelId === ONLINE_CHANNEL_ID;
              const isAfk = m.channelId === AFK_CHANNEL_ID;
              return (
                <div
                  key={m.userId}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 16px',
                    background: 'var(--bg-card)', border: `1px solid ${isTarget ? 'rgba(91,124,158,0.4)' : 'var(--border-glass)'}`,
                    borderRadius: '14px'
                  }}
                >
                  {m.avatarUrl ? (
                    <img src={m.avatarUrl} alt="" style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '1px solid var(--border-glass)' }} />
                  ) : (
                    <div style={{
                      width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
                      background: 'var(--bg-muted)', border: '1px solid var(--border-glass)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '18px', fontWeight: 700, color: 'var(--text-muted)'
                    }}>
                      {(m.username || '?').charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {m.username}
                      </span>
                      {m.roleName && (
                        <span style={{ fontSize: '11px', fontWeight: 700, backgroundClip: 'text', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', color: 'transparent', backgroundImage: roleGradient(m.level), whiteSpace: 'nowrap', paddingRight: '2px' }}>
                          {m.roleName}
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', fontSize: '12px', color: 'var(--text-muted)' }}>
                      <MapPin size={13} style={{ flexShrink: 0 }} />
                      {isAfk
                        ? <span style={{ color: '#f59e0b' }}>АФК</span>
                        : <span style={{ color: isTarget ? '#4ade80' : 'var(--text-muted)' }}>В канале: {channelLabel(m)}</span>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '7px', flexShrink: 0 }}>
                    {renderStatusIcons(m)}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}