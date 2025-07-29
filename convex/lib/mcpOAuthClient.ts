"use node";

import { URL } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import {
  OAuthClientInformation,
  OAuthClientInformationFull,
  OAuthClientMetadata,
  OAuthTokens,
} from "@modelcontextprotocol/sdk/shared/auth.js";
import {
  CallToolRequest,
  ListToolsRequest,
  CallToolResultSchema,
  ListToolsResultSchema,
  ListToolsResult,
  CallToolResult,
} from "@modelcontextprotocol/sdk/types.js";
import {
  OAuthClientProvider,
  UnauthorizedError,
} from "@modelcontextprotocol/sdk/client/auth.js";

class ConvexOAuthClientProvider implements OAuthClientProvider {
  private _clientInformation?: OAuthClientInformationFull;
  private _tokens?: OAuthTokens;
  private _codeVerifier?: string;

  constructor(
    private readonly _redirectUrl: string | URL,
    private readonly _clientMetadata: OAuthClientMetadata,
    private readonly onRedirect?: (url: URL) => void
  ) {}

  get redirectUrl(): string | URL {
    return this._redirectUrl;
  }

  get clientMetadata(): OAuthClientMetadata {
    return this._clientMetadata;
  }

  clientInformation(): OAuthClientInformation | undefined {
    return this._clientInformation;
  }

  saveClientInformation(clientInformation: OAuthClientInformationFull): void {
    this._clientInformation = clientInformation;
  }

  tokens(): OAuthTokens | undefined {
    return this._tokens;
  }

  saveTokens(tokens: OAuthTokens): void {
    this._tokens = tokens;
  }

  redirectToAuthorization(authorizationUrl: URL): void {
    if (this.onRedirect) {
      this.onRedirect(authorizationUrl);
    }
  }

  saveCodeVerifier(codeVerifier: string): void {
    this._codeVerifier = codeVerifier;
  }

  codeVerifier(): string {
    if (!this._codeVerifier) {
      throw new Error("No code verifier saved");
    }
    return this._codeVerifier;
  }
}

export class MCPOAuthClient {
  private client: Client | null = null;
  private oauthProvider: ConvexOAuthClientProvider | null = null;
  private isConnected = false;

  constructor(
    private serverUrl: string,
    private callbackUrl: string,
    private credentials?: {
      apiKey?: string;
      tokens?: OAuthTokens;
      authHeaders?: Record<string, string>;
    },
    private onRedirect?: (url: string) => void
  ) {}

  async connect(): Promise<{ requiresAuth: boolean; authUrl?: string }> {
    const clientMetadata: OAuthClientMetadata = {
      client_name: "Convex AI Agent MCP Client",
      redirect_uris: [this.callbackUrl],
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      token_endpoint_auth_method: "client_secret_post",
      scope: "mcp:tools",
    };

    this.oauthProvider = new ConvexOAuthClientProvider(
      this.callbackUrl,
      clientMetadata,
      (redirectUrl: URL) => {
        if (this.onRedirect) {
          this.onRedirect(redirectUrl.toString());
        }
      }
    );

    // If we have existing tokens, restore them
    if (this.credentials?.tokens) {
      this.oauthProvider.saveTokens(this.credentials.tokens);
    }

    this.client = new Client(
      {
        name: "convex-ai-agent",
        version: "1.0.0",
      },
      { capabilities: {} }
    );

    try {
      await this.attemptConnection();
      this.isConnected = true;
      return { requiresAuth: false };
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        // OAuth authorization is required
        return { requiresAuth: true };
      } else {
        throw error;
      }
    }
  }

  private async attemptConnection(): Promise<void> {
    if (!this.client || !this.oauthProvider) {
      throw new Error("Client not initialized");
    }

    const baseUrl = new URL(this.serverUrl);

    const transport = new StreamableHTTPClientTransport(baseUrl, {
      authProvider: this.oauthProvider,
    });

    await this.client.connect(transport);
  }

  async finishAuth(authCode: string): Promise<void> {
    if (!this.client || !this.oauthProvider) {
      throw new Error("Client not initialized");
    }

    const baseUrl = new URL(this.serverUrl);
    const transport = new StreamableHTTPClientTransport(baseUrl, {
      authProvider: this.oauthProvider,
    });

    await transport.finishAuth(authCode);
    await this.client.connect(transport);
    this.isConnected = true;
  }

  async listTools(): Promise<ListToolsResult> {
    if (!this.client || !this.isConnected) {
      throw new Error("Not connected to server");
    }

    const request: ListToolsRequest = {
      method: "tools/list",
      params: {},
    };

    return await this.client.request(request, ListToolsResultSchema);
  }

  async callTool(
    toolName: string,
    toolArgs: Record<string, unknown>
  ): Promise<CallToolResult> {
    if (!this.client || !this.isConnected) {
      throw new Error("Not connected to server");
    }

    const request: CallToolRequest = {
      method: "tools/call",
      params: {
        name: toolName,
        arguments: toolArgs,
      },
    };

    return await this.client.request(request, CallToolResultSchema);
  }

  getConnectionStatus(): boolean {
    return this.isConnected;
  }

  getTokens(): OAuthTokens | undefined {
    return this.oauthProvider?.tokens();
  }

  disconnect(): void {
    if (this.client) {
      // Note: The SDK doesn't have a disconnect method, so we just null the references
      this.client = null;
    }
    this.oauthProvider = null;
    this.isConnected = false;
  }
}
