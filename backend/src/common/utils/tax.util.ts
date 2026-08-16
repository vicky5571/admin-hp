import { toCents } from './money.util';

export function calcExclusiveTax(net: number, ratePercent: number): number {
  return toCents((net * ratePercent) / 100);
}

export function calcInclusiveTax(gross: number, ratePercent: number): number {
  return toCents(gross - gross / (1 + ratePercent / 100));
}
