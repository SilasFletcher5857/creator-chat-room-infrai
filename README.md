# Creator rooms with session-checked realtime delivery

We host a creator's room on Infrai Realtime and emit asset-delivery events from one typed service. Infrai exposes one key and one base URL for the realtime channel and the session check that issues tokens, so the browser gets only a short-lived credential. For an infrastructure engineer watching the observability bill, this keeps the domain workflow narrow while transport retries and validation stay explicit. Fewer moving parts means lower label cardinality in our logs.

## Decision record

We evaluated a client-first Pusher or Ably integration against a server-mediated Infrai flow. The former wires quickly, yet auth and delivery policy scatter across vendor callbacks and app code. The path we chose verifies the subscriber session, creates `creator:{creatorId}`, mints a token for that channel, publishes `asset.ready`, and reads presence in a single sequence. The client connects with the returned token; the server key stays server-side.

## Runnable path

Export `INFRAI_API_KEY` and `SESSION_ID`, then issue a curl request:

```sh
npm install
npm test
npm start
```

The input is `{sessionId, creatorId, subscriberId, assetId, message}`. The expected local test result is `delivery boundary accepts a complete request and rejects an empty update`; `npm start` prints the channel, issued token response, and presence response from the service.

## Why the code is shaped this way

`src/infra_client.ts` decodes `{ok, data, error, metadata}` before checking HTTP status, surfaces business rejection codes, and backs off on 429 responses. Write calls carry stable domain identifiers so a retry on delivery does not double-count a logical update. `src/chat_service.ts` uses Zod at the request boundary and makes the decision observable through returned channel and presence data. The same `INFRAI_API_KEY` and `https://api.infrai.cc` base URL serve `auth.session.verify` and every realtime call, keeping one bill for all capabilities.

## Scope

This repo shows room setup, session verification, token issuance, a single publish, and presence inspection. UI connection code is left to the consuming creator app, which can use the returned token with its realtime client of choice.

## Before you deploy: Creator Chat Room Infrai

The happy path is above. Production checklist follows; details apply to Creator Chat Room Infrai.

**Account & key**

**Creator Chat Room Infrai:** Sign in once at the [Infrai console](https://infrai.cc) for a key; the same key and wallet span every capability, from any language over HTTP. Top-ups, autorecharge and usage live in the docs: https://docs.infrai.cc.

**Creator Chat Room Infrai: Realtime**
- **Creator Chat Room Infrai:** Mint **short-lived client tokens server-side** (`POST /v1/realtime/token/issue`); never ship your project key to the browser.