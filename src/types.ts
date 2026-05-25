/**
 * TweetStream SDK Types
 * Real-time Twitter/X and Truth Social streaming API
 */

// Envelope structure
export type EnvelopeV1<T extends object> = {
  v: 1;
  t: "tweet" | "account" | "control";
  op: MessageOperation;
  id?: string;
  ts: number;
  d: T;
};

export type MessageOperation =
  | "content"
  | "meta"
  | "update"
  | "delete"
  | "profile_update"
  | "follow"
  | "auth_ping"
  | "auth_pong"
  | "twitter_handles_result";

// Media types
export type MediaType = "image" | "video" | "gif";

export type Media = {
  url: string;
  type?: MediaType;
  thumbnail?: string;
};

export type TweetUrl = {
  url: string;
  name?: string;
  tco?: string;
};

export type TweetMention = {
  handle?: string;
  id?: string;
  name?: string;
};

// Author types
export type Platform = "twitter" | "truth_social";
export type VerifiedType = "blue" | "business" | "government" | "none";

export type TweetAuthorMetrics = {
  likes?: number;
  tweets?: number;
};

export type TweetVerifiedLabel = {
  badge: string | null;
  description: string;
  url: string | null;
};

export type TweetAuthor = {
  banner?: string;
  bio?: string;
  followersCount?: number;
  followingCount?: number;
  handle?: string;
  id?: string;
  joinedAt?: number;
  location?: string;
  metrics?: TweetAuthorMetrics;
  name?: string;
  platform?: Platform;
  profileImage?: string;
  url?: string;
  verifiedLabel?: TweetVerifiedLabel;
  verifiedType?: VerifiedType;
};

export type AccountActor = TweetAuthor & {
  websiteUrl?: string;
};

// Reference types (quotes, replies, retweets)
export type ReferenceType = "reply" | "quote" | "retweet";

export type TweetReference = {
  type: ReferenceType;
  tweetId?: string;
  text?: string;
  author?: TweetAuthor;
  media?: Media[];
};

// Tweet content
export type TweetContent = {
  tweetId: string;
  text: string;
  createdAt: number;
  author: TweetAuthor;
  link?: string;
  media?: Media[];
  mentions?: TweetMention[];
  ref?: TweetReference;
  urls?: TweetUrl[];
};

// Tweet metadata - detected entities
export type MetaSource = "text" | "ocr";

export type DetectedToken = {
  symbol?: string;
  name?: string;
  contract?: string;
  chain?: string;
  networkId?: number;
  priceUsd?: number;
  sources: MetaSource[];
};

export type DetectedCexMarket = {
  exchange: "bybit" | "binance" | "hyperliquid";
  symbol?: string;
  baseAsset?: string;
  quoteAsset?: string;
  priceUsd?: number;
  url?: string;
  sources: MetaSource[];
};

export type DetectedPredictionMarket = {
  exchange: "polymarket" | "kalshi";
  marketId?: string;
  title?: string;
  priceUsd?: number;
  url?: string;
  sources: MetaSource[];
};

export type TweetMeta = {
  tweetId: string;
  detected?: {
    tokens?: DetectedToken[];
    cex?: DetectedCexMarket[];
    prediction?: DetectedPredictionMarket[];
  };
  ocr?: { text: string };
};

// Tweet update (partial)
export type TweetUpdate = {
  tweetId: string;
  author?: TweetAuthor;
  text?: string;
  media?: Media[];
  mentions?: TweetMention[];
  ref?: TweetReference;
  urls?: TweetUrl[];
};

export type TweetDelete = {
  tweetId: string;
};

// Profile update event
export type ProfileChanges = {
  name?: string;
  handle?: string;
  bio?: string;
  avatar?: string;
  banner?: string;
  location?: string;
};

export type ProfileUpdateEvent = {
  kind: "PROFILE";
  eventId: string;
  observedAt: number;
  actor: AccountActor;
  changes: ProfileChanges;
  previous?: ProfileChanges;
};

// Follow event
export type FollowEvent = {
  kind: "FOLLOW";
  eventId: string;
  observedAt: number;
  actor: AccountActor;
  target: AccountActor;
};

// Account event union
export type AccountEvent = ProfileUpdateEvent | FollowEvent;

// Control messages
export type TwitterHandlesResult = {
  action: "follow" | "unfollow";
  requestId: string | null;
  error: string | null;
  results: HandleOperationResult[];
};

// Message types
export type TweetContentMessage = EnvelopeV1<TweetContent> & { t: "tweet"; op: "content" };
export type TweetMetaMessage = EnvelopeV1<TweetMeta> & { t: "tweet"; op: "meta" };
export type TweetUpdateMessage = EnvelopeV1<TweetUpdate> & { t: "tweet"; op: "update" };
export type TweetDeleteMessage = EnvelopeV1<TweetDelete> & { t: "tweet"; op: "delete" };
export type ProfileUpdateMessage = EnvelopeV1<ProfileUpdateEvent> & {
  t: "account";
  op: "profile_update";
};
export type FollowMessage = EnvelopeV1<FollowEvent> & { t: "account"; op: "follow" };
export type TwitterHandlesResultMessage = EnvelopeV1<TwitterHandlesResult> & {
  t: "control";
  op: "twitter_handles_result";
};
export type AuthPingMessage = EnvelopeV1<Record<string, unknown>> & {
  t: "control";
  op: "auth_ping";
};
export type AuthPongMessage = EnvelopeV1<Record<string, unknown>> & {
  t: "control";
  op: "auth_pong";
};

export type TweetStreamMessage =
  | TweetContentMessage
  | TweetMetaMessage
  | TweetUpdateMessage
  | TweetDeleteMessage
  | ProfileUpdateMessage
  | FollowMessage
  | TwitterHandlesResultMessage
  | AuthPingMessage
  | AuthPongMessage;

// Client events
export type TweetStreamEvents = {
  connected: () => void;
  disconnected: (code: number, reason: string) => void;
  error: (error: Error) => void;
  message: (message: TweetStreamMessage) => void;
  tweet: (content: TweetContent) => void;
  tweetMeta: (meta: TweetMeta) => void;
  tweetUpdate: (update: TweetUpdate) => void;
  tweetDelete: (deleted: TweetDelete) => void;
  profileUpdate: (event: ProfileUpdateEvent) => void;
  follow: (event: FollowEvent) => void;
  twitterHandlesResult: (result: TwitterHandlesResult) => void;
  reconnecting: (attempt: number, delayMs: number) => void;
};

// Client options
export type TweetStreamOptions = {
  apiKey: string;
  baseUrl?: string;
  autoReconnect?: boolean;
  maxReconnectAttempts?: number;
  reconnectDelayMs?: number;
  maxReconnectDelayMs?: number;
};

// REST API types
export type MessageType = "TWEET" | "PROFILE" | "FOLLOW";

export type HistoryQuery = {
  handles?: string | string[];
  limit?: number;
  startDate?: string;
  endDate?: string;
  type?: MessageType;
};

export type HistoricalTweet = {
  tweetId: string;
  twitterId: string;
  twitterHandle: string | null;
  body: string;
  link: string;
  time: string;
  receivedTime: string;
  messageType: MessageType;
  content: TweetContent | ProfileUpdateEvent | FollowEvent;
  meta?: TweetMeta;
};

export type HistoryResponse = {
  data: HistoricalTweet[];
  metadata: {
    count: number;
    handle?: string;
    handles?: string[];
    startDate?: string;
    endDate?: string;
    type?: MessageType;
  };
};

export type HandleOperationState =
  | "added"
  | "already_following"
  | "invalid_input"
  | "duplicate"
  | "not_found"
  | "failed"
  | "removed"
  | "not_following";

export type HandleOperationResult = {
  input: string;
  state: HandleOperationState;
  handle?: string;
  normalizedHandle?: string;
  name?: string;
  profileImage?: string;
  twitterId?: string;
  message?: string;
};

export type HandleResponse = {
  action: "follow" | "unfollow";
  requestId: string | null;
  error: string | null;
  results: HandleOperationResult[];
  summary: {
    total: number;
    succeeded: number;
    failed: number;
  };
};
