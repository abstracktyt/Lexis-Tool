export function roleGradient(level?: number): string {
  const g: Record<number, string> = {
    8: 'linear-gradient(90deg, #fbbf24, #7c2d12)',
    7: 'linear-gradient(90deg, #c084fc, #581c87)',
    6: 'linear-gradient(90deg, #60a5fa, #1e3a8a)',
    5: 'linear-gradient(90deg, #22d3ee, #155e75)',
    4: 'linear-gradient(90deg, #4ade80, #14532d)',
    3: 'linear-gradient(90deg, #cbd5e1, #475569)',
  };
  return g[level ?? -1] || 'linear-gradient(90deg, #cbd5e1, #475569)';
}

export const ROLE_GRADIENT_NAMES: Record<number, string> = {
  8: 'Chief',
  7: 'Deputy',
  6: 'Senior',
  5: 'Head Spectator',
  4: 'Admin',
  3: 'Junior',
};