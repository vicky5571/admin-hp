"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const data_source_1 = __importDefault(require("./data-source"));
const run_seeders_1 = require("./seeds/run-seeders");
(0, run_seeders_1.runSeeders)(data_source_1.default);
//# sourceMappingURL=seed-cli.js.map