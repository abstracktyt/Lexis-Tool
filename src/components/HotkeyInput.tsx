import React, { useState, useEffect, useRef } from 'react';
import { Keyboard } from 'lucide-react';
import { CODE_TO_KEY, getDisplayKey } from '../lib/hotkeys';

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  style?: React.CSSProperties;
}

export default function HotkeyInput({ value, onChange, placeholder = 'Нажмите клавиши...', className, style }: Props) {
  const [isRecording, setIsRecording] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isRecording) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) return;
      if (e.code === 'Escape') {
        onChange('');
        setIsRecording(false);
        inputRef.current?.blur();
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
      inputRef.current?.blur();
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 3) {
        e.preventDefault();
        e.stopPropagation();
        onChange('MOUSE4');
        setIsRecording(false);
        inputRef.current?.blur();
      } else if (e.button === 4) {
        e.preventDefault();
        e.stopPropagation();
        onChange('MOUSE5');
        setIsRecording(false);
        inputRef.current?.blur();
      }
    };

    const preventContext = (e: MouseEvent) => {
      if (e.button === 3 || e.button === 4) e.preventDefault();
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    window.addEventListener('mousedown', handleMouseDown, { capture: true });
    window.addEventListener('contextmenu', preventContext, { capture: true });
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
      window.removeEventListener('mousedown', handleMouseDown, { capture: true });
      window.removeEventListener('contextmenu', preventContext, { capture: true });
    };
  }, [isRecording, onChange]);

  return (
    <div style={{ position: 'relative', width: '100%', ...style }} className={className}>
      <input 
        ref={inputRef}
        type="text" 
        value={isRecording ? 'Нажмите комбинацию...' : getDisplayKey(value)}
        onFocus={() => setIsRecording(true)}
        onBlur={() => setIsRecording(false)}
        readOnly
        placeholder={placeholder}
        style={{ 
          width: '100%', 
          padding: '10px 12px', 
          paddingRight: '36px',
          background: isRecording ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.2)', 
          border: `1px solid ${isRecording ? 'var(--accent-color)' : 'rgba(255,255,255,0.1)'}`, 
          borderRadius: '8px', 
          color: isRecording ? 'var(--accent-color)' : '#fff',
          fontSize: '14px',
          outline: 'none',
          cursor: 'pointer',
          transition: 'all 0.2s',
          boxSizing: 'border-box'
        }}
      />
      <Keyboard size={16} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)', pointerEvents: 'none' }} />
    </div>
  );
}
