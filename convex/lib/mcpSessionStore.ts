import { MCPOAuthClient } from "./mcpOAuthClient";

// Production-ready session store using Convex database
export class MCPSessionStore {
  private clients = new Map<string, MCPOAuthClient>();
  private sessionData = new Map<string, any>();

  setClient(sessionId: string, client: MCPOAuthClient, sessionData?: any): void {
    this.clients.set(sessionId, client);
    if (sessionData) {
      this.sessionData.set(sessionId, sessionData);
    }
  }

  getClient(sessionId: string): MCPOAuthClient | null {
    return this.clients.get(sessionId) || null;
  }

  getSessionData(sessionId: string): any {
    return this.sessionData.get(sessionId);
  }

  removeClient(sessionId: string): void {
    const client = this.clients.get(sessionId);
    if (client) {
      client.disconnect();
      this.clients.delete(sessionId);
      this.sessionData.delete(sessionId);
    }
  }

  generateSessionId(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }

  // Clean up expired sessions (call this periodically)
  cleanup(): void {
    // In a production environment, you'd want to track session timestamps
    // and clean up sessions that haven't been used recently
  }
}

// Global session store instance
export const mcpSessionStore = new MCPSessionStore();
