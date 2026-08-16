"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.paginateMeta = paginateMeta;
function paginateMeta(total, page, limit) {
    return {
        total,
        page,
        limit,
        pageCount: Math.ceil(total / limit) || 1,
    };
}
//# sourceMappingURL=pagination.util.js.map