# TweetStream SDK for TypeScript

Official TypeScript/JavaScript SDK for [TweetStream](https://tweetstream.io) - the real-time Twitter WebSocket API built for crypto traders.

[![npm version](https://badge.fury.io/js/tweetstream-sdk.svg)](https://www.npmjs.com/package/tweetstream-sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Why TweetStream?

- **~200ms latency** - Get tweets before they hit your feed
- **1M+ signals daily** - Battle-tested infrastructure
- **Token detection** - Automatic $ticker and contract address extraction with live prices
- **OCR built-in** - Extract text from screenshot tweets
- **CEX & prediction markets** - Detect Binance, Bybit, Polymarket mentions
- **No infrastructure** - Just connect and stream

Perfect for trading bots, Discord alerts, sentiment analysis, and real-time portfolio tracking.

## Installation

```bash
npm install tweetstream-sdk
# or
yarn add tweetstream-sdk
# or
pnpm add tweetstream-sdk
```

## Quick Start

### Real-time Tweet Streaming

```typescript
import { TweetStreamClient } from "tweetstream-sdk";

const client = new TweetStreamClient({
  apiKey: "your-api-key", // Get one at https://tweetstream.io
});

// Stream tweets in real-time
client.on("tweet", (tweet) => {
  console.log(`@${tweet.author.handle}: ${tweet.text}`);
});

// Detect tokens mentioned in tweets
client.on("tweetMeta", (meta) => {
  if (meta.detected?.tokens) {
    for (const token of meta.detected.tokens) {
      console.log(`Token: ${token.symbol} | Chain: ${token.chain} | Price: $${token.priceUsd}`);
    }
  }
});

client.on("connected", () => console.log("Streaming tweets..."));
client.connect();
```

### REST API for Historical Data

```typescript
import { TweetStreamApi } from "tweetstream-sdk";

const api = new TweetStreamApi({ apiKey: "your-api-key" });

// Fetch historical tweets for backtesting
const history = await api.getHistory({
  handles: ["elonmusk", "VitalikButerin"],
  limit: 100,
  startDate: "2024-01-01T00:00:00Z",
});

// Manage tracked accounts
await api.addAccounts(["whale_alert", "lookonchain"]);
await api.removeAccounts("old_account");
```

## Features

### Real-time WebSocket Streaming

- **Tweet content** - Full tweet with author, media, timestamps
- **Quotes, replies, retweets** - Complete reference chain
- **Truth Social** - Stream from both Twitter/X and Truth Social
- **Profile updates** - Name, bio, avatar changes
- **Follow notifications** - Know when tracked accounts follow others
- **Auto-reconnect** - Built-in exponential backoff

### Metadata Detection

Every tweet is enriched with:

```typescript
client.on("tweetMeta", (meta) => {
  // Crypto tokens with live prices
  meta.detected?.tokens?.forEach((token) => {
    console.log(`${token.symbol} on ${token.chain}: $${token.priceUsd}`);
    console.log(`Contract: ${token.contract}`);
  });

  // CEX trading pairs
  meta.detected?.cex?.forEach((market) => {
    console.log(`${market.exchange}: ${market.symbol} @ $${market.priceUsd}`);
  });

  // Prediction markets (Polymarket, Kalshi)
  meta.detected?.prediction?.forEach((market) => {
    console.log(`${market.exchange}: ${market.title}`);
  });

  // OCR from images
  if (meta.ocr) {
    console.log(`Image text: ${meta.ocr.text}`);
  }
});
```

### Account Management API

```typescript
// Add accounts to track
const result = await api.addAccounts(["trader1", "trader2", "trader3"]);
console.log(`Added ${result.summary.succeeded} of ${result.summary.total}`);

// Remove accounts
await api.removeAccounts("old_account");

// Get historical data with filters
const tweets = await api.getHistory({
  handles: ["specific_trader"],
  type: "TWEET", // or "PROFILE", "FOLLOW"
  startDate: "2024-01-01T00:00:00Z",
  endDate: "2024-01-31T23:59:59Z",
  limit: 500,
});
```

## Examples

### Trading Bot Alert

```typescript
import { TweetStreamClient, TweetContent, TweetMeta } from "tweetstream-sdk";

const client = new TweetStreamClient({ apiKey: "your-api-key" });

const recentTweets = new Map<string, TweetContent>();

client.on("tweet", (tweet) => {
  recentTweets.set(tweet.tweetId, tweet);
});

client.on("tweetMeta", (meta) => {
  const tweet = recentTweets.get(meta.tweetId);
  if (!meta.detected?.tokens?.length) return;

  for (const token of meta.detected.tokens) {
    if (token.chain === "solana") {
      console.log(`[ALERT] @${tweet?.author.handle} mentioned ${token.symbol}`);
      console.log(`  Contract: ${token.contract}`);
      console.log(`  Price: $${token.priceUsd}`);
      // Send to your trading bot...
    }
  }
});

client.connect();
```

### Discord Webhook Integration

```typescript
import { TweetStreamClient } from "tweetstream-sdk";

const client = new TweetStreamClient({ apiKey: "your-api-key" });
const DISCORD_WEBHOOK = "https://discord.com/api/webhooks/...";

client.on("tweet", async (tweet) => {
  await fetch(DISCORD_WEBHOOK, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      content: `**@${tweet.author.handle}**: ${tweet.text}\n${tweet.link}`,
    }),
  });
});

client.connect();
```

### Profile Change Monitor

```typescript
client.on("profileUpdate", (event) => {
  console.log(`@${event.actor.handle} updated their profile:`);
  if (event.changes.name) {
    console.log(`  Name: ${event.previous?.name} -> ${event.changes.name}`);
  }
  if (event.changes.bio) {
    console.log(`  Bio: ${event.changes.bio}`);
  }
  if (event.changes.avatar) {
    console.log(`  New avatar: ${event.changes.avatar}`);
  }
  if (event.changes.handle) {
    console.log(`  Handle changed: @${event.previous?.handle} -> @${event.changes.handle}`);
  }
});
```

### Follow Event Monitor

```typescript
client.on("follow", (event) => {
  console.log(
    `@${event.actor.handle} followed @${event.target.handle}`
  );
  console.log(`  ${event.actor.name} (${event.actor.followersCount} followers)`);
  console.log(`  Now following: ${event.target.name}`);
});
```

### Tweet Edit Tracking

```typescript
client.on("tweetUpdate", (update) => {
  console.log(`Tweet ${update.tweetId} was edited:`);
  if (update.text) {
    console.log(`  New text: ${update.text}`);
  }
  if (update.media?.length) {
    console.log(`  Media updated: ${update.media.length} items`);
  }
});
```

### Handling Quotes, Replies, and Retweets

```typescript
client.on("tweet", (tweet) => {
  if (tweet.ref) {
    switch (tweet.ref.type) {
      case "reply":
        console.log(`@${tweet.author.handle} replied to @${tweet.ref.author?.handle}:`);
        console.log(`  Original: ${tweet.ref.text}`);
        console.log(`  Reply: ${tweet.text}`);
        break;
      case "quote":
        console.log(`@${tweet.author.handle} quoted @${tweet.ref.author?.handle}:`);
        console.log(`  Quoted: ${tweet.ref.text}`);
        console.log(`  Comment: ${tweet.text}`);
        break;
      case "retweet":
        console.log(`@${tweet.author.handle} retweeted @${tweet.ref.author?.handle}`);
        break;
    }
  }
});
```

### Multi-Platform Streaming (Twitter + Truth Social)

```typescript
client.on("tweet", (tweet) => {
  const platform = tweet.author.platform === "truth_social" ? "Truth Social" : "Twitter/X";
  console.log(`[${platform}] @${tweet.author.handle}: ${tweet.text}`);
});
```

## API Reference

### TweetStreamClient

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `apiKey` | `string` | required | Your TweetStream API key |
| `baseUrl` | `string` | `wss://ws.tweetstream.io/ws` | WebSocket endpoint |
| `autoReconnect` | `boolean` | `true` | Auto-reconnect on disconnect |
| `maxReconnectAttempts` | `number` | `Infinity` | Max reconnection attempts |

### Events

| Event | Payload | Description |
|-------|---------|-------------|
| `tweet` | `TweetContent` | New tweet (includes replies, quotes, retweets) |
| `tweetMeta` | `TweetMeta` | Token/CEX/prediction market detection, OCR |
| `tweetUpdate` | `TweetUpdate` | Tweet was edited |
| `profileUpdate` | `ProfileUpdateEvent` | Profile name/bio/avatar changed |
| `follow` | `FollowEvent` | Account followed another account |
| `connected` | - | WebSocket connected |
| `disconnected` | `(code, reason)` | WebSocket disconnected |
| `reconnecting` | `(attempt, delayMs)` | Attempting reconnection |
| `message` | `TweetStreamMessage` | Raw envelope (for advanced use) |

### TweetStreamApi

| Method | Description |
|--------|-------------|
| `getHistory(query)` | Fetch historical tweets/events |
| `addAccounts(handles)` | Add accounts to track |
| `removeAccounts(handles)` | Remove tracked accounts |

## Get Started

1. **Sign up** at [tweetstream.io](https://tweetstream.io) (7-day free trial)
2. **Get your API key** from the dashboard
3. **Install the SDK** and start streaming

```bash
npm install tweetstream-sdk
```

## Links

- [TweetStream](https://tweetstream.io) - Sign up and get your API key
- [Documentation](https://tweetstream.io/docs) - Full API docs
- [Python SDK](https://github.com/tenz-app/tweetstream-py-sdk) - Python version

## License

MIT - See [LICENSE](LICENSE) for details.
