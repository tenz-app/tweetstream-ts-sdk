/**
 * TweetStream SDK
 * Real-time Twitter/X and Truth Social streaming API
 *
 * @example
 * ```ts
 * import { TweetStreamClient, TweetStreamApi } from "tweetstream-sdk";
 *
 * // Real-time streaming
 * const client = new TweetStreamClient({ apiKey: "your-api-key" });
 * client.on("tweet", (tweet) => console.log(tweet));
 * client.connect();
 *
 * // REST API
 * const api = new TweetStreamApi({ apiKey: "your-api-key" });
 * const history = await api.getHistory({ handles: ["elonmusk"], limit: 10 });
 * ```
 */

export { TweetStreamClient } from "./client.js";
export { TweetStreamApi, TweetStreamApiError } from "./api.js";
export type { ApiClientOptions } from "./api.js";

// Re-export all types
export type {
  // Envelope
  EnvelopeV1,
  MessageOperation,

  // Media
  Media,
  MediaType,

  // Authors
  Platform,
  TweetAuthor,
  AccountActor,

  // References
  ReferenceType,
  TweetReference,

  // Tweet types
  TweetContent,
  TweetMeta,
  TweetUpdate,
  MetaSource,
  DetectedToken,
  DetectedCexMarket,
  DetectedPredictionMarket,

  // Account events
  ProfileChanges,
  ProfileUpdateEvent,
  FollowEvent,
  AccountEvent,

  // Messages
  TweetContentMessage,
  TweetMetaMessage,
  TweetUpdateMessage,
  ProfileUpdateMessage,
  FollowMessage,
  TweetStreamMessage,

  // Client
  TweetStreamOptions,
  TweetStreamEvents,

  // REST API
  MessageType,
  HistoryQuery,
  HistoricalTweet,
  HistoryResponse,
  HandleOperationState,
  HandleOperationResult,
  HandleResponse,
} from "./types.js";
