import * as tslib_1 from "tslib";
import * as treo from "treo";
import * as treoPromise from "treo-promise";
import { getRegistrationPrefix } from "./registration";
console.log("t", treo, treoPromise);
var schema = treo
    .schema()
    .version(1)
    .addStore("subscriptions", { key: "topic_id" })
    .version(2)
    .addStore("config", { key: "name" });
var db = null;
export function getDatabase() {
    return tslib_1.__awaiter(this, void 0, void 0, function () {
        var prefix;
        return tslib_1.__generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (db) {
                        return [2 /*return*/, db];
                    }
                    return [4 /*yield*/, getRegistrationPrefix()];
                case 1:
                    prefix = _a.sent();
                    db = treo("pushkin-client_" + prefix, schema).use(treoPromise());
                    return [2 /*return*/, db];
            }
        });
    });
}
//# sourceMappingURL=db.js.map