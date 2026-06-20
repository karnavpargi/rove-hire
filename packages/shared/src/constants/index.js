"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SESSION_CONSTRAINTS = exports.MAGIC_LINK_CONSTRAINTS = exports.FILE_CONSTRAINTS = exports.SUPPORTED_CURRENCIES = void 0;
__exportStar(require("./pipeline"), exports);
__exportStar(require("./limits"), exports);
exports.SUPPORTED_CURRENCIES = ['USD', 'EUR', 'GBP', 'INR', 'AED'];
exports.FILE_CONSTRAINTS = {
    MAX_SIZE_BYTES: 10 * 1024 * 1024,
    ALLOWED_MIME_TYPES: ['application/pdf'],
};
exports.MAGIC_LINK_CONSTRAINTS = {
    EXPIRY_DAYS: 14,
    TOKEN_BYTES: 32,
};
exports.SESSION_CONSTRAINTS = {
    MAX_LIFETIME_HOURS: 8,
    RATE_LIMIT_ATTEMPTS: 5,
    RATE_LIMIT_WINDOW_MINUTES: 15,
    RATE_LIMIT_PER_IP_PER_MINUTE: 10,
};
//# sourceMappingURL=index.js.map