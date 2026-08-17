import DiscordRPC from 'discord-rpc';

const rpcClientId = '740977042979422350';

let rpc: any = null;
const rpcStartTimestamp = new Date();

export function setupDiscordRPC() {
  DiscordRPC.register(rpcClientId);
  rpc = new DiscordRPC.Client({ transport: 'ipc' });
  rpc.on('ready', () => {
    console.log('[Discord RPC] Ready');
    updateDiscordRPC('Не выполнен вход', 'Ожидание авторизации');
  });
  rpc.login({ clientId: rpcClientId }).catch((e: any) => {
    console.error('[Discord RPC] Failed to connect:', e);
  });
}

export function updateDiscordRPC(details: string, state: string) {
  if (!rpc) return;
  try {
    rpc.setActivity({
      details,
      state,
      startTimestamp: rpcStartTimestamp,
      largeImageKey: 'icon',
      largeImageText: 'Lexis Tools',
      instance: false,
    });
  } catch (e) {
    console.error('[Discord RPC] Error setting activity', e);
  }
}