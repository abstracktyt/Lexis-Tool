function send(channel: string) {
  window.ipcRenderer?.send(channel);
}

export default function WindowControls() {
  return (
    <div className="window-controls">
      <button className="wc-btn" title="Свернуть" onClick={() => send('window-min')}>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
          <line x1="2.5" y1="6" x2="9.5" y2="6" />
        </svg>
      </button>
      <button className="wc-btn wc-close" title="Закрыть" onClick={() => send('window-close')}>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
          <line x1="3" y1="3" x2="9" y2="9" />
          <line x1="9" y1="3" x2="3" y2="9" />
        </svg>
      </button>
    </div>
  );
}