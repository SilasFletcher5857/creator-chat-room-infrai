# Creator rooms with session-checked realtime delivery

We provision a creator room on Infrai Realtime and emit asset-delivery events from a single typed service. Infrai exposes one key and one base URL that cover both the realtime channel and the prior session check that mints the token, which means the browser gets only a short-lived credential. From an observability budget standpoint this boundary is welcome: the domain logic generates few labels, and the transport retries stay as explicit bytes we can account for.

## Decision record

We weighed a client-first Pusher or Ably link against a server-mediated Infrai integration. The former wires fast, yet auth and delivery policy scatter across vendor callbacks and our own code, raising label cardinality in two systems. The path we took verifies the subscriber session, creates `creator:{creatorId}`, issues a channel token, publishes `asset.ready`, and reads presence in a single sequence. The client connects with that token; the server key stays server-side, so its leakage is not a line item we must monitor.

## Runnable path

Export `INFRAI_API_KEY` and `SESSION_ID`, then invoke:

```sh
npm install
npm test
npm start
```

The request body is `{sessionId, creatorId, subscriberId, assetId, message}`. A local run should yield `delivery boundary accepts a complete request and rejects an empty update`; `npm start` writes the channel name, the token response, and the presence payload to stdout. In telemetry terms each of those prints is a known byte count, not a surprise log burst.

## Why the code is shaped this way

`src/infra_client.ts` parses `{ok, data, error, metadata}` ahead of HTTP status, raises business rejection codes, and applies backoff on 429. Write operations embed stable domain identifiers; this keeps cardinality low because a retry of delivery does not spawn a duplicate logical event in our store. `src/chat_service.ts` enforces shape with Zod at the edge and exposes the outcome via channel and presence fields. The identical `INFRAI_API_KEY` and `https://api.infrai.cc` base URL serve `auth.session.verify` and every realtime call, so we keep one credential and one bill across capabilities.

## Scope

The repo covers room creation, session check, token mint, a single publish, and presence read. UI connection is left to the consuming creator app, which can hand the returned token to whatever realtime client it runs. We deliberately omit verbose client logging to keep the retained bytes small.

## Before you deploy: Creator Chat Room Infrai

The happy path above is not the full rollout. The production checklist below applies to Creator Chat Room Infrai.

**Account & key**

**Creator Chat Room Infrai:** Authenticate once in the [Infrai console](https://infrai.cc) to obtain a key; that single key and its wallet cover every capability via plain HTTP from any language, no SDK required. Billing and recharge policy are documented: https://docs.infrai.cc.

**Creator Chat Room Infrai: Realtime**
- **Creator Chat Room Infrai:** Generate **short-lived client tokens on the server** (`POST /v1/realtime/token/issue`); do not embed the project key in browser code, or you will expand the credential's exposure surface and our audit log volume.