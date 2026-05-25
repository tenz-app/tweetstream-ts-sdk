/**
 * TweetStream WebSocket Client
 * Real-time Twitter/X and Truth Social streaming
 */

import type {
  TweetStreamOptions,
  TweetStreamEvents,
  TweetStreamMessage,
  TweetContent,
  TweetMeta,
  TweetUpdate,
  TweetDelete,
  ProfileUpdateEvent,
  FollowEvent,
  TwitterHandlesResult,
} from "./types.js";

const DEFAULT_WS_URL = "wss://ws.tweetstream.io/ws";
const DEFAULT_RECONNECT_DELAY_MS = 1000;
const DEFAULT_MAX_RECONNECT_DELAY_MS = 30000;
const DEFAULT_MAX_RECONNECT_ATTEMPTS = Infinity;
const OPEN_READY_STATE = 1;

// Close codes that should not trigger reconnection
const NO_RECONNECT_CODES = new Set([
  1000, // Normal close (client initiated)
  4001, // Invalid API key
  4003, // Plan/subscription issue
  4029, // Connection limit reached
]);

// Close codes for immediate reconnect (server restart/deploy)
const IMMEDIATE_RECONNECT_CODES = new Set([
  1012, // Server shutting down
]);

const NO_RECONNECT_HTTP_STATUSES = new Set([400, 401, 403, 429]);

type WebSocketConstructor = {
  new (url: string | URL, protocols?: string | string[]): WebSocket;
};

type WebSocketErrorEvent = Event & {
  error?: unknown;
  message?: string;
};

type EventCallback<K extends keyof TweetStreamEvents> = TweetStreamEvents[K];
type UntypedEventCallback = (...args: unknown[]) => void;
type EventListeners = {
  [K in keyof TweetStreamEvents]: Set<EventCallback<K>>;
};

export class TweetStreamClient {
  private ws: WebSocket | null = null;
  private options: Required<Omit<TweetStreamOptions, "apiKey">> & { apiKey: string };
  private reconnectAttempts = 0;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private shouldReconnect = true;
  private isConnecting = false;

  private listeners: EventListeners = {
    connected: new Set(),
    disconnected: new Set(),
    error: new Set(),
    message: new Set(),
    tweet: new Set(),
    tweetMeta: new Set(),
    tweetUpdate: new Set(),
    tweetDelete: new Set(),
    profileUpdate: new Set(),
    follow: new Set(),
    twitterHandlesResult: new Set(),
    reconnecting: new Set(),
  };

  constructor(options: TweetStreamOptions) {
    if (!options.apiKey) {
      throw new Error("apiKey is required");
    }

    this.options = {
      apiKey: options.apiKey,
      baseUrl: options.baseUrl ?? DEFAULT_WS_URL,
      autoReconnect: options.autoReconnect ?? true,
      maxReconnectAttempts: options.maxReconnectAttempts ?? DEFAULT_MAX_RECONNECT_ATTEMPTS,
      reconnectDelayMs: options.reconnectDelayMs ?? DEFAULT_RECONNECT_DELAY_MS,
      maxReconnectDelayMs: options.maxReconnectDelayMs ?? DEFAULT_MAX_RECONNECT_DELAY_MS,
    };
  }

  /**
   * Connect to the TweetStream WebSocket
   */
  connect(): void {
    if (this.ws?.readyState === OPEN_READY_STATE || this.isConnecting) {
      return;
    }

    this.isConnecting = true;
    this.shouldReconnect = true;
    this.clearReconnectTimeout();

    void this.openConnection();
  }

  /**
   * Disconnect from the WebSocket
   */
  disconnect(): void {
    this.shouldReconnect = false;
    this.clearReconnectTimeout();

    if (this.ws) {
      this.ws.close(1000, "Client disconnect");
      this.ws = null;
    }
  }

  /**
   * Check if the client is connected
   */
  get connected(): boolean {
    return this.ws?.readyState === OPEN_READY_STATE;
  }

  /**
   * Add an event listener
   */
  on<K extends keyof TweetStreamEvents>(event: K, callback: EventCallback<K>): this {
    this.listenerSet(event).add(callback);
    return this;
  }

  /**
   * Remove an event listener
   */
  off<K extends keyof TweetStreamEvents>(event: K, callback: EventCallback<K>): this {
    this.listenerSet(event).delete(callback);
    return this;
  }

  /**
   * Add a one-time event listener
   */
  once<K extends keyof TweetStreamEvents>(event: K, callback: EventCallback<K>): this {
    const wrapper = ((...args: unknown[]) => {
      this.off(event, wrapper as EventCallback<K>);
      (callback as UntypedEventCallback)(...args);
    }) as EventCallback<K>;
    return this.on(event, wrapper);
  }

  private listenerSet<K extends keyof TweetStreamEvents>(event: K): Set<EventCallback<K>> {
    return this.listeners[event];
  }

  private emit<K extends keyof TweetStreamEvents>(
    event: K,
    ...args: Parameters<TweetStreamEvents[K]>
  ): void {
    for (const callback of this.listenerSet(event)) {
      try {
        (callback as UntypedEventCallback)(...args);
      } catch (error) {
        console.error(`Error in ${event} listener:`, error);
      }
    }
  }

  private async openConnection(): Promise<void> {
    try {
      const WebSocketImpl = await this.loadWebSocketImplementation();
      if (!this.shouldReconnect) {
        this.isConnecting = false;
        return;
      }

      // Use subprotocol for auth (works in browsers, Bun, and Node.js via ws fallback).
      const ws = new WebSocketImpl(this.options.baseUrl, [
        `tweetstream.auth.token.${this.options.apiKey}`,
        "tweetstream.v1",
      ]);

      this.ws = ws;

      ws.addEventListener("open", () => {
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.emit("connected");
      });

      ws.addEventListener("close", (event) => {
        this.isConnecting = false;
        this.ws = null;
        this.emit("disconnected", event.code, event.reason || "Connection closed");
        this.handleReconnect(event.code);
      });

      ws.addEventListener("error", (event) => {
        this.isConnecting = false;
        const error = this.toWebSocketError(event as WebSocketErrorEvent);
        if (this.isNonReconnectableHandshakeError(error)) {
          this.shouldReconnect = false;
        }
        this.emit("error", error);
      });

      ws.addEventListener("message", (event) => {
        this.handleMessage(event.data);
      });
    } catch (error) {
      this.isConnecting = false;
      this.emit("error", error instanceof Error ? error : new Error(String(error)));
      this.handleReconnect(1006);
    }
  }

  private async loadWebSocketImplementation(): Promise<WebSocketConstructor> {
    if (typeof globalThis.WebSocket === "function") {
      return globalThis.WebSocket as WebSocketConstructor;
    }

    const wsModule = await import("ws");
    const WebSocketImpl = (wsModule.WebSocket ??
      wsModule.default ??
      wsModule) as unknown as WebSocketConstructor;

    if (typeof WebSocketImpl !== "function") {
      throw new Error("Failed to load WebSocket implementation");
    }

    return WebSocketImpl;
  }

  private handleMessage(data: string | ArrayBuffer): void {
    try {
      const text = typeof data === "string" ? data : new TextDecoder().decode(data);
      const message = JSON.parse(text) as TweetStreamMessage;

      // Emit raw message
      this.emit("message", message);

      // Emit typed events
      switch (message.op) {
        case "content":
          this.emit("tweet", message.d as TweetContent);
          break;
        case "meta":
          this.emit("tweetMeta", message.d as TweetMeta);
          break;
        case "update":
          this.emit("tweetUpdate", message.d as TweetUpdate);
          break;
        case "delete":
          this.emit("tweetDelete", message.d as TweetDelete);
          break;
        case "profile_update":
          this.emit("profileUpdate", message.d as ProfileUpdateEvent);
          break;
        case "follow":
          this.emit("follow", message.d as FollowEvent);
          break;
        case "twitter_handles_result":
          this.emit("twitterHandlesResult", message.d as TwitterHandlesResult);
          break;
      }
    } catch (error) {
      this.emit("error", new Error(`Failed to parse message: ${error}`));
    }
  }

  private toWebSocketError(event: WebSocketErrorEvent): Error {
    if (event.error instanceof Error) {
      return event.error;
    }
    if (typeof event.message === "string" && event.message.length > 0) {
      return new Error(event.message);
    }
    if (typeof event.error === "string" && event.error.length > 0) {
      return new Error(event.error);
    }
    return new Error("WebSocket connection error");
  }

  private isNonReconnectableHandshakeError(error: Error): boolean {
    const match = error.message.match(/(?:Unexpected server response:|HTTP\s+)(\d{3})/i);
    if (!match) {
      return false;
    }

    const status = Number(match[1]);
    return NO_RECONNECT_HTTP_STATUSES.has(status);
  }

  private handleReconnect(closeCode: number): void {
    if (!this.options.autoReconnect || !this.shouldReconnect) {
      return;
    }

    // Don't reconnect for auth/billing errors
    if (NO_RECONNECT_CODES.has(closeCode)) {
      return;
    }

    if (this.reconnectAttempts >= this.options.maxReconnectAttempts) {
      this.emit("error", new Error("Max reconnection attempts reached"));
      return;
    }

    // Calculate delay with exponential backoff
    let delayMs: number;
    if (IMMEDIATE_RECONNECT_CODES.has(closeCode)) {
      // Server restart - reconnect quickly
      delayMs = 100;
    } else {
      delayMs = Math.min(
        this.options.reconnectDelayMs * Math.pow(2, this.reconnectAttempts),
        this.options.maxReconnectDelayMs
      );
      // Add jitter
      delayMs += Math.random() * 1000;
    }

    this.reconnectAttempts++;
    this.emit("reconnecting", this.reconnectAttempts, delayMs);

    this.reconnectTimeout = setTimeout(() => {
      this.connect();
    }, delayMs);
  }

  private clearReconnectTimeout(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }
}
