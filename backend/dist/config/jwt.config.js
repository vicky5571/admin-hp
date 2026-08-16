"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = () => ({
    jwt: {
        secret: process.env.JWT_SECRET ?? 'replace_me',
        expiresIn: process.env.JWT_EXPIRES_IN ?? '8h',
    },
});
//# sourceMappingURL=jwt.config.js.map