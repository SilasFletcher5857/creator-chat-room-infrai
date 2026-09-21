import assert from "node:assert/strict";
import { deliveryRequest } from "./chat_service.ts";

const valid = { sessionId: "sess-1", creatorId: "creator-42", subscriberId: "subscriber-7", assetId: "asset-9", message: "ready" };
assert.equal(deliveryRequest.safeParse(valid).success, true);
assert.equal(deliveryRequest.safeParse({ ...valid, message: "" }).success, false);
console.log("delivery boundary accepts a complete request and rejects an empty update");
