/**
 * TweetStream REST API Client
 * Historical data and account management
 */

import type {
  HistoryQuery,
  HistoryResponse,
  HandleResponse,
} from "./types.js";

const DEFAULT_API_URL = "https://api.tweetstream.io";

export type ApiClientOptions = {
  apiKey: string;
  baseUrl?: string;
};

export class TweetStreamApi {
  private apiKey: string;
  private baseUrl: string;

  constructor(options: ApiClientOptions) {
    if (!options.apiKey) {
      throw new Error("apiKey is required");
    }
    this.apiKey = options.apiKey;
    this.baseUrl = options.baseUrl ?? DEFAULT_API_URL;
  }

  /**
   * Fetch historical tweets, profile updates, or follow events
   *
   * @example
   * ```ts
   * // Get recent tweets from specific handles
   * const tweets = await api.getHistory({
   *   handles: ["elonmusk", "VitalikButerin"],
   *   limit: 50
   * });
   *
   * // Get profile updates from the last hour
   * const profiles = await api.getHistory({
   *   type: "PROFILE",
   *   startDate: new Date(Date.now() - 3600000).toISOString()
   * });
   * ```
   */
  async getHistory(query: HistoryQuery = {}): Promise<HistoryResponse> {
    const params = new URLSearchParams();

    if (query.handles) {
      const handles = Array.isArray(query.handles) ? query.handles : [query.handles];
      handles.forEach((h) => params.append("handles", h));
    }
    if (query.limit !== undefined) {
      params.set("limit", String(query.limit));
    }
    if (query.startDate) {
      params.set("startDate", query.startDate);
    }
    if (query.endDate) {
      params.set("endDate", query.endDate);
    }
    if (query.type) {
      params.set("type", query.type);
    }

    const url = `${this.baseUrl}/api/history?${params.toString()}`;
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
      },
    });

    if (!response.ok) {
      const error = await this.parseError(response);
      throw new TweetStreamApiError(error.message, response.status, error.details);
    }

    return response.json();
  }

  /**
   * Add Twitter/X accounts to track
   *
   * @example
   * ```ts
   * // Add a single account
   * const result = await api.addAccounts("elonmusk");
   *
   * // Add multiple accounts
   * const result = await api.addAccounts(["elonmusk", "VitalikButerin"]);
   * ```
   */
  async addAccounts(accounts: string | string[]): Promise<HandleResponse> {
    const response = await fetch(`${this.baseUrl}/api/add-account`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ accounts }),
    });

    if (!response.ok) {
      const error = await this.parseError(response);
      throw new TweetStreamApiError(error.message, response.status, error.details);
    }

    return response.json();
  }

  /**
   * Remove Twitter/X accounts from tracking
   *
   * @example
   * ```ts
   * // Remove a single account
   * const result = await api.removeAccounts("elonmusk");
   *
   * // Remove multiple accounts
   * const result = await api.removeAccounts(["elonmusk", "VitalikButerin"]);
   * ```
   */
  async removeAccounts(accounts: string | string[]): Promise<HandleResponse> {
    const response = await fetch(`${this.baseUrl}/api/remove-account`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ accounts }),
    });

    if (!response.ok) {
      const error = await this.parseError(response);
      throw new TweetStreamApiError(error.message, response.status, error.details);
    }

    return response.json();
  }

  private async parseError(response: Response): Promise<{ message: string; details?: unknown }> {
    try {
      const body = await response.json();
      return {
        message: body.error || body.message || `HTTP ${response.status}`,
        details: body.details,
      };
    } catch {
      return { message: `HTTP ${response.status}: ${response.statusText}` };
    }
  }
}

export class TweetStreamApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = "TweetStreamApiError";
  }
}
