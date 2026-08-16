"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calcExclusiveTax = calcExclusiveTax;
exports.calcInclusiveTax = calcInclusiveTax;
const money_util_1 = require("./money.util");
function calcExclusiveTax(net, ratePercent) {
    return (0, money_util_1.toCents)((net * ratePercent) / 100);
}
function calcInclusiveTax(gross, ratePercent) {
    return (0, money_util_1.toCents)(gross - gross / (1 + ratePercent / 100));
}
//# sourceMappingURL=tax.util.js.map