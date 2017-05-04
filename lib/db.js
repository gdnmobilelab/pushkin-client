"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var treo_1 = require("treo");
var treo_promise_1 = require("treo-promise");
var schema = treo_1.default.schema()
    .version(1)
    .addStore('subscriptions', { key: "topic_id" })
    .version(2)
    .addStore('config', { key: 'name' });
exports.default = treo_1.default('pushkin-client', schema)
    .use(treo_promise_1.default());
