/**
 * Basic TweetStream Example
 *
 * Run: npx tsx examples/basic.ts
 */

import { TweetStreamClient } from "../src/index.js";

const API_KEY = process.env.TWEETSTREAM_API_KEY;

if (!API_KEY) {
  console.error("Please set TWEETSTREAM_API_KEY environment variable");
  process.exit(1);
}

const client = new TweetStreamClient({ apiKey: API_KEY });

client.on("connected", () => {
  console.log("Connected to TweetStream!");
});

client.on("tweet", (tweet) => {
  const platform = tweet.author.platform === "truth_social" ? "[Truth]" : "[X]";
  console.log(`${platform} @${tweet.author.handle}: ${tweet.text.slice(0, 100)}...`);
});

client.on("tweetMeta", (meta) => {
  const tokens = meta.detected?.tokens ?? [];
  if (tokens.length > 0) {
    console.log(`  Tokens: ${tokens.map((t) => t.symbol).join(", ")}`);
  }
});

client.on("profileUpdate", (event) => {
  console.log(`[Profile] @${event.actor.handle} updated their profile`);
});

client.on("follow", (event) => {
  console.log(`[Follow] @${event.actor.handle} -> @${event.target.handle}`);
});

client.on("disconnected", (code, reason) => {
  console.log(`Disconnected: ${code} - ${reason}`);
});

client.on("reconnecting", (attempt, delay) => {
  console.log(`Reconnecting (attempt ${attempt}) in ${delay}ms...`);
});

client.on("error", (error) => {
  console.error("Error:", error.message);
});

console.log("Connecting to TweetStream...");
client.connect();

// Handle graceful shutdown
process.on("SIGINT", () => {
  console.log("\nDisconnecting...");
  client.disconnect();
  process.exit(0);
});
