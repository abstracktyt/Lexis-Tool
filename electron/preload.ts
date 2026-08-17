import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';

type Listener = (event: IpcRendererEvent, ...args: any[]) => void;

// Keep a registry so removeListener/removeAllListeners work with the
// original listener references even though we pass wrappers to ipcRenderer.
const listenerRegistry = new Map<string, Map<Listener, Listener>>();

function wrapListener(channel: string, listener: Listener): Listener {
  let channelMap = listenerRegistry.get(channel);
  if (!channelMap) {
    channelMap = new Map();
    listenerRegistry.set(channel, channelMap);
  }
  const existing = channelMap.get(listener);
  if (existing) return existing;
  const wrapped = (event: IpcRendererEvent, ...args: any[]) => listener(event, ...args);
  channelMap.set(listener, wrapped);
  return wrapped;
}

function removeListener(channel: string, listener: Listener) {
  const channelMap = listenerRegistry.get(channel);
  const wrapped = channelMap?.get(listener);
  if (wrapped) {
    ipcRenderer.removeListener(channel, wrapped);
    channelMap!.delete(listener);
  }
}

export function removeAllListeners(channel?: string) {
  if (channel) {
    const channelMap = listenerRegistry.get(channel);
    if (channelMap) {
      for (const wrapped of channelMap.values()) {
        ipcRenderer.removeListener(channel, wrapped);
      }
      channelMap.clear();
    }
    ipcRenderer.removeAllListeners(channel);
  } else {
    // Fallback: IPCRenderer untyped overloaded signature to avoid TS granularity issue.
    (ipcRenderer as any).removeAllListeners();
    listenerRegistry.clear();
  }
}

const bridge = {
  send: (channel: string, ...args: any[]) => ipcRenderer.send(channel, ...args),
  invoke: (channel: string, ...args: any[]) => ipcRenderer.invoke(channel, ...args),
  on: (channel: string, listener: Listener) => {
    ipcRenderer.on(channel, wrapListener(channel, listener));
    return () => removeListener(channel, listener);
  },
  once: (channel: string, listener: Listener) => {
    ipcRenderer.once(channel, wrapListener(channel, listener));
  },
  removeListener: (channel: string, listener: Listener) => removeListener(channel, listener),
  removeAllListeners: (channel?: string) => removeAllListeners(channel),
};

export type IpcBridge = typeof bridge;

contextBridge.exposeInMainWorld('ipcRenderer', bridge);