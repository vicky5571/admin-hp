export function toCents(amount: number): number {
  return Math.round(amount);
}

export function sumAmounts(values: number[]): number {
  return values.reduce((acc, value) => acc + toCents(value), 0);
}

export function calcPercentAmount(base: number, percent: number): number {
  return toCents((base * percent) / 100);
}
