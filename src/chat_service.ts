import { z } from "zod";
import { InfraiClient, InfraiError } from "./infra_client.ts";

export const deliveryRequest = z.object({ sessionId: z.string().min(1), creatorId: z.string().min(1), subscriberId: z.string().min(1), assetId: z.string().min(1), message: z.string().min(1) });
export type DeliveryRequest = z.infer<typeof deliveryRequest>;

export async function deliverAsset(input: DeliveryRequest, client: InfraiClient) {
  const request = deliveryRequest.parse(input);
  await client.verifySession(request.sessionId);
  const channel = `creator:${request.creatorId}`;
  await client.createChannel(channel);
  const token = await client.issueToken(request.subscriberId, [channel]);
  await client.publish(channel, "asset.ready", { asset_id: request.assetId, message: request.message }, request.creatorId);
  const presence = await client.presence(channel);
  return { channel, token, presence };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const input = deliveryRequest.parse({ sessionId: process.env.SESSION_ID, creatorId: "creator-42", subscriberId: "subscriber-7", assetId: "pack-2026", message: "Your download is ready" });
  const key = process.env.INFRAI_API_KEY;
  if (!key) throw new Error("INFRAI_API_KEY is required");
  deliverAsset(input, new InfraiClient(key)).then(result => console.log(JSON.stringify(result, null, 2))).catch(error => { if (error instanceof InfraiError) console.error(error.code); else console.error(error); process.exitCode = 1; });
}
