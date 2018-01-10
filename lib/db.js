import treo from "treo";
import treoPromise from "treo-promise";
var schema = treo
    .schema()
    .version(1)
    .addStore("subscriptions", { key: "topic_id" })
    .version(2)
    .addStore("config", { key: "name" });
export default treo("pushkin-client", schema).use(treoPromise());
//# sourceMappingURL=db.js.map