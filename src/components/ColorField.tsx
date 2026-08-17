import { PRESET_COLORS } from '../lib/theme';

interface ColorFieldProps {
  label: string;
  desc: string;
  value: string;
  presets?: string[];
  onChange: (value: string) => void;
}

const DEFAULT_PRESETS = ['#5b7c9e', '#8a919b', '#7d8590', '#94a3b8', '#64748b', '#565e68'];

export default function ColorField({ label, desc, value = '#5b7c9e', presets = DEFAULT_PRESETS, onChange }: ColorFieldProps) {
  const color = value.toLowerCase();
  const isCustom = presets.every(p => p.toLowerCase() !== color);

  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(25, 25, 27, 0.6)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '20px', flexWrap: 'wrap', gap: '14px' }}>
      <div style={{ minWidth: '180px' }}>
        <div style={{ fontWeight: 600, fontSize: '15px' }}>{label}</div>
        <div style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '4px' }}>{desc}</div>
      </div>
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
        {PRESET_COLORS.filter(p => presets.includes(p.color)).map(p => (
          <div
            key={p.color}
            onClick={() => onChange(p.color)}
            title={p.name}
            style={{
              width: '28px', height: '28px', borderRadius: '50%', background: p.color, cursor: 'pointer',
              border: color === p.color.toLowerCase() ? '2px solid white' : 'none',
              boxShadow: color === p.color.toLowerCase() ? `0 0 15px ${p.color}` : 'none',
              transition: 'all 0.2s'
            }}
          />
        ))}
        {typeof value === 'string' && !value.toLowerCase().startsWith('#') && (
          <div
            title={value}
            style={{ width: '28px', height: '28px', borderRadius: '50%', background: value, cursor: 'pointer', border: '2px solid rgba(255,255,255,0.4)', boxShadow: `0 0 15px ${value}` }}
          />
        )}
        <div style={{ width: '1px', height: '28px', background: 'rgba(255,255,255,0.1)' }} />
        <label
          title="Свой цвет"
          style={{
            position: 'relative', width: '32px', height: '32px', borderRadius: '50%',
            background: `conic-gradient(from 0deg, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)`,
            cursor: 'pointer', display: 'block',
            border: isCustom ? '2px solid white' : 'none',
            boxShadow: isCustom ? `0 0 15px ${value}` : 'none',
            transition: 'all 0.2s', overflow: 'hidden', flexShrink: 0,
          }}
        >
          <span style={{ position: 'absolute', inset: '7px', borderRadius: '50%', background: '#0b0d10' }} />
          <span style={{ position: 'absolute', inset: '12px', borderRadius: '50%', background: value }} />
          <input
            type="color"
            value={value.startsWith('#') ? value : '#5b7c9e'}
            onChange={e => onChange(e.target.value)}
            style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%', border: 'none', padding: 0 }}
          />
        </label>
      </div>
    </div>
  );
}