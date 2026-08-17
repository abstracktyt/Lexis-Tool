declare module '*.mp4' {
  const src: string;
  export default src;
}

// Typed bridge exposed by electron/preload.ts via contextBridge
interface IpcBridge {
  send(channel: string, ...args: any[]): void;
  invoke(channel: string, ...args: any[]): Promise<any>;
  on(channel: string, listener: (event: any, ...args: any[]) => void): () => void;
  once(channel: string, listener: (event: any, ...args: any[]) => void): void;
  removeListener(channel: string, listener: (event: any, ...args: any[]) => void): void;
  removeAllListeners(channel?: string): void;
}

interface Window {
  ipcRenderer?: IpcBridge;
}

// Extend React CSSProperties to allow Electron's -webkit-app-region
declare namespace React {
  interface CSSProperties {
    WebkitAppRegion?: 'drag' | 'no-drag';
  }
}