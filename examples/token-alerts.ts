/**
 * Token Detection Alert Example
 *
 * Monitors tweets for cryptocurrency token mentions and displays alerts.
 *
 * Run: npx tsx examples/token-alerts.ts
 */

import { TweetStreamClient, type DetectedToken, type DetectedCexMarket } from "../src/index.js";

const API_KEY = process.env.TWEETSTREAM_API_KEY;

if (!API_KEY) {
  console.error("Please set TWEETSTREAM_API_KEY environment variable");
  process.exit(1);
}

const client = new TweetStreamClient({ apiKey: API_KEY });

// Store recent tweets to correlate with metadata
const recentTweets = new Map<string, { handle: string; text: string }>();

client.on("tweet", (tweet) => {
  recentTweets.set(tweet.tweetId, {
    handle: tweet.author.handle ?? "unknown",
    text: tweet.text,
  });

  // Cleanup old entries
  if (recentTweets.size > 1000) {
    const oldest = recentTweets.keys().next().value;
    if (oldest) recentTweets.delete(oldest);
  }
});

client.on("tweetMeta", (meta) => {
  const tweet = recentTweets.get(meta.tweetId);
  const handle = tweet?.handle ?? "unknown";

  // Check for onchain tokens
  const tokens = meta.detected?.tokens ?? [];
  for (const token of tokens) {
    printTokenAlert(handle, token);
  }

  // Check for CEX mentions
  const cexMarkets = meta.detected?.cex ?? [];
  for (const market of cexMarkets) {
    printCexAlert(handle, market);
  }

  // Check for prediction markets
  const predictions = meta.detected?.prediction ?? [];
  for (const prediction of predictions) {
    console.log(`[PREDICTION] @${handle} mentioned ${prediction.exchange}: ${prediction.title ?? prediction.marketId}`);
  }
});

function printTokenAlert(handle: string, token: DetectedToken) {
  const chain = token.chain?.toUpperCase() ?? "UNKNOWN";
  const symbol = token.symbol ?? "???";
  const price = token.priceUsd ? `$${token.priceUsd.toFixed(6)}` : "N/A";
  const source = token.sources.join(", ");

  console.log(`[${chain}] @${handle} mentioned ${symbol} | Price: ${price} | Source: ${source}`);

  if (token.contract) {
    console.log(`         Contract: ${token.contract}`);
  }
}

function printCexAlert(handle: string, market: DetectedCexMarket) {
  const exchange = market.exchange.toUpperCase();
  const pair = market.symbol ?? `${market.baseAsset}/${market.quoteAsset}`;
  const price = market.priceUsd ? `$${market.priceUsd.toFixed(2)}` : "N/A";

  console.log(`[${exchange}] @${handle} mentioned ${pair} | Price: ${price}`);
}

client.on("connected", () => {
  console.log("Connected! Monitoring for token mentions...\n");
});

client.on("error", (error) => {
  console.error("Error:", error.message);
});

client.connect();

process.on("SIGINT", () => {
  client.disconnect();
  process.exit(0);
});
