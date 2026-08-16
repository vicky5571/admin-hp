"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toCents = toCents;
exports.sumAmounts = sumAmounts;
exports.calcPercentAmount = calcPercentAmount;
function toCents(amount) {
    return Math.round(amount);
}
function sumAmounts(values) {
    return values.reduce((acc, value) => acc + toCents(value), 0);
}
function calcPercentAmount(base, percent) {
    return toCents((base * percent) / 100);
}
//# sourceMappingURL=money.util.js.map