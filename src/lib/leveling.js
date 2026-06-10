// Fonte unica de verdade para XP <-> Level.
// Curva TRIANGULAR: nivel N->N+1 custa 100 * N de XP.
// Exemplos:
//   Para chegar ao nivel 2: 100 XP (total)
//   Para chegar ao nivel 3: 100 + 200 = 300 XP (total)
//   Para chegar ao nivel 5: 100 + 200 + 300 + 400 = 1000 XP
//   Para chegar ao nivel 10: 4500 XP
//   Para chegar ao nivel 20: 19000 XP
// Resultado: progresso real dentro de cada nivel, sem pular varios niveis com 1 missao.

export const BASE_XP_PER_LEVEL = 100;
export const MAX_LEVEL = 100;

export function safeXp(xp) {
  const n = Number(xp);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.floor(n);
}

// XP total acumulado necessario para ESTAR no nivel `level` (no inicio dele).
export function totalXpForLevel(level) {
  const lvl = Math.max(1, Math.floor(Number(level) || 1));
  if (lvl <= 1) return 0;
  return Math.round(BASE_XP_PER_LEVEL * lvl * (lvl - 1) / 2);
}

// XP necessario para subir do nivel `level` para `level + 1`.
export function xpForLevelStep(level) {
  const lvl = Math.max(1, Math.floor(Number(level) || 1));
  return BASE_XP_PER_LEVEL * lvl;
}

// Nivel atual dado o XP acumulado total do usuario.
export function levelFromXp(xp) {
  const x = safeXp(xp);
  // n*(n-1)/2 * BASE <= x  =>  n <= (1 + sqrt(1 + 8x/BASE)) / 2
  const ratio = (2 * x) / BASE_XP_PER_LEVEL;
  const level = Math.floor((1 + Math.sqrt(1 + 4 * ratio)) / 2);
  return Math.min(MAX_LEVEL, Math.max(1, level));
}

// Resumo de progresso usado pela UI: nivel, XP dentro do nivel, falta, barra.
export function progressInLevel(xp) {
  const x = safeXp(xp);
  const level = levelFromXp(x);
  const start = totalXpForLevel(level);
  const next = totalXpForLevel(level + 1);
  const size = Math.max(1, next - start);
  const xpInLevel = x - start;
  const xpToNext = Math.max(0, next - x);
  const progressPct = Math.min(100, Math.max(0, (xpInLevel / size) * 100));
  return { level, xpInLevel, xpToNext, levelSize: size, progressPct };
}

// Conveniencia: dada uma quantidade de XP a adicionar, retorna {newXp, newLevel, leveledUp}.
export function applyXpGain(currentXp, gain) {
  const before = safeXp(currentXp);
  const delta = Math.max(0, Math.floor(Number(gain) || 0));
  const after = before + delta;
  const oldLevel = levelFromXp(before);
  const newLevel = levelFromXp(after);
  return {
    newXp: after,
    newLevel,
    leveledUp: newLevel > oldLevel
  };
}
