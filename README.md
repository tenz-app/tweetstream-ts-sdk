# TweetStream SDK for TypeScript

Official TypeScript SDK for [TweetStream](https://tweetstream.io) - Real-time Twitter/X and Truth Social streaming API.

[![npm version](https://badge.fury.io/js/tweetstream-sdk.svg)](https://www.npmjs.com/package/tweetstream-sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

- **Real-time streaming** via WebSocket with automatic reconnection
- **Full type safety** with TypeScript
- **Tweet content** including quotes, replies, and retweets
- **Metadata detection** for tokens, CEX markets, and prediction markets
- **Profile updates** and follow notifications
- **Historical data** via REST API
- **Account management** - add/remove tracked handles

## Installation

```bash
npm install tweetstream-sdk
```

## Quick Start

### Real-time Streaming

```typescript
import { TweetStreamClient } from "tweetstream-sdk";

const client = new TweetStreamClient({
  apiKey: "your-api-key",
});

// Listen for tweets
client.on("tweet", (tweet) => {
  console.log(`@${tweet.author.handle}: ${tweet.text}`);
  
  // Check for quoted tweets
  if (tweet.ref?.type === "quote") {
    console.log(`  Quoting: ${tweet.ref.text}`);
  }
});

// Listen for detected tokens
client.on("tweetMeta", (meta) => {
  if (meta.detected?.tokens) {
    for (const token of meta.detected.tokens) {
      console.log(`Token detected: ${token.symbol} on ${token.chain}`);
    }
  }
});

// Listen for profile updates
client.on("profileUpdate", (event) => {
  console.log(`@${event.actor.handle} updated their profile`);
  if (event.changes.bio) {
    console.log(`  New bio: ${event.changes.bio}`);
  }
});

// Listen for follows
client.on("follow", (event) => {
  console.log(`@${event.actor.handle} followed @${event.target.handle}`);
});

// Connection events
client.on("connected", () => console.log("Connected!"));
client.on("disconnected", (code, reason) => console.log(`Disconnected: ${reason}`));
client.on("reconnecting", (attempt, delay) => console.log(`Reconnecting in ${delay}ms...`));

// Connect
client.connect();
```

### REST API

```typescript
import { TweetStreamApi } from "tweetstream-sdk";

const api = new TweetStreamApi({
  apiKey: "your-api-key",
});

// Get historical tweets
const history = await api.getHistory({
  handles: ["elonmusk", "VitalikButerin"],
  limit: 100,
  startDate: "2024-01-01T00:00:00Z",
});

for (const tweet of history.data) {
  console.log(`${tweet.twitterHandle}: ${tweet.body}`);
}

// Add accounts to track
const added = await api.addAccounts(["newhandle1", "newhandle2"]);
console.log(`Added ${added.summary.succeeded} accounts`);

// Remove accounts
const removed = await api.removeAccounts("oldhandle");
console.log(`Removed ${removed.summary.succeeded} accounts`);
```

## Examples

### Token Alert Bot

```typescript
import { TweetStreamClient } from "tweetstream-sdk";

const client = new TweetStreamClient({ apiKey: "your-api-key" });

client.on("tweetMeta", (meta) => {
  const tokens = meta.detected?.tokens ?? [];
  const cex = meta.detected?.cex ?? [];
  
  // Alert on new token mentions
  for (const token of tokens) {
    if (token.chain === "solana" && token.priceUsd) {
      console.log(`[SOLANA] ${token.symbol}: $${token.priceUsd}`);
    }
  }
  
  // Alert on CEX listings
  for (const market of cex) {
    console.log(`[${market.exchange.toUpperCase()}] ${market.symbol}`);
  }
});

client.connect();
```

### Truth Social Monitor

```typescript
import { TweetStreamClient } from "tweetstream-sdk";

const client = new TweetStreamClient({ apiKey: "your-api-key" });

client.on("tweet", (tweet) => {
  if (tweet.author.platform === "truth_social") {
    console.log(`[Truth Social] @${tweet.author.handle}: ${tweet.text}`);
  }
});

client.connect();
```

### Profile Change Tracker

```typescript
import { TweetStreamClient } from "tweetstream-sdk";

const client = new TweetStreamClient({ apiKey: "your-api-key" });

client.on("profileUpdate", (event) => {
  const changes: string[] = [];
  
  if (event.changes.name) changes.push(`name: "${event.changes.name}"`);
  if (event.changes.bio) changes.push(`bio: "${event.changes.bio}"`);
  if (event.changes.avatar) changes.push("avatar updated");
  if (event.changes.handle) {
    changes.push(`handle: @${event.previous?.handle} -> @${event.changes.handle}`);
  }
  
  console.log(`@${event.actor.handle} changed: ${changes.join(", ")}`);
});

client.connect();
```

## API Reference

### TweetStreamClient

#### Constructor Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `apiKey` | `string` | *required* | Your TweetStream API key |
| `baseUrl` | `string` | `wss://ws.tweetstream.io/ws` | WebSocket endpoint |
| `autoReconnect` | `boolean` | `true` | Auto-reconnect on disconnect |
| `maxReconnectAttempts` | `number` | `Infinity` | Max reconnection attempts |
| `reconnectDelayMs` | `number` | `1000` | Initial reconnect delay |
| `maxReconnectDelayMs` | `number` | `30000` | Max reconnect delay |

#### Events

| Event | Payload | Description |
|-------|---------|-------------|
| `connected` | - | Connected to WebSocket |
| `disconnected` | `(code, reason)` | Disconnected from WebSocket |
| `error` | `Error` | Connection or parse error |
| `message` | `TweetStreamMessage` | Raw message envelope |
| `tweet` | `TweetContent` | New tweet |
| `tweetMeta` | `TweetMeta` | Tweet metadata (tokens, etc.) |
| `tweetUpdate` | `TweetUpdate` | Tweet updated |
| `tweetDelete` | `TweetDelete` | Tweet deleted |
| `profileUpdate` | `ProfileUpdateEvent` | Profile changed |
| `follow` | `FollowEvent` | Follow event |
| `reconnecting` | `(attempt, delayMs)` | Reconnecting |

### TweetStreamApi

#### Methods

| Method | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `getHistory` | `HistoryQuery` | `Promise<HistoryResponse>` | Fetch historical data |
| `addAccounts` | `string \| string[]` | `Promise<HandleResponse>` | Add accounts to track |
| `removeAccounts` | `string \| string[]` | `Promise<HandleResponse>` | Remove tracked accounts |

#### HistoryQuery Options

| Option | Type | Description |
|--------|------|-------------|
| `handles` | `string \| string[]` | Filter by handles |
| `limit` | `number` | Max results (default: 100, max: 1000) |
| `startDate` | `string` | ISO 8601 start date |
| `endDate` | `string` | ISO 8601 end date |
| `type` | `"TWEET" \| "PROFILE" \| "FOLLOW"` | Message type filter |

## Types

All types are exported for use in your application:

```typescript
import type {
  TweetContent,
  TweetMeta,
  DetectedToken,
  ProfileUpdateEvent,
  FollowEvent,
  // ... and more
} from "tweetstream-sdk";
```

## Links

- [TweetStream](https://tweetstream.io) - Get your API key
- [Documentation](https://tweetstream.io/docs)
- [Python SDK](https://github.com/tenz/tweetstream-py-sdk)

## License

MIT
