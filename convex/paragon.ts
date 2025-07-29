"use node";

import { v } from "convex/values";
import { action, internalAction } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";
import crypto from "crypto";
import jwt from "jsonwebtoken";

// Generate a Paragon User Token (JWT) for authentication
export const generateUserToken = action({
  args: {},
  handler: async (ctx, args): Promise<{ token: string }> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Get user info through a query
    const user = await ctx.runQuery(internal.auth.getUserById, { userId });
    if (!user) {
      throw new Error("User not found");
    }

    const signingKey = process.env.PARAGON_SIGNING_KEY;
    const projectId = process.env.PARAGON_PROJECT_ID;
    
    if (!signingKey || !projectId) {
      throw new Error("Paragon configuration missing. Please set PARAGON_SIGNING_KEY and PARAGON_PROJECT_ID environment variables.");
    }

    try {
      const currentTime = Math.floor(Date.now() / 1000);
      const token = jwt.sign(
        {
          sub: userId, // Use Convex user ID as the subject
          aud: `useparagon.com/${projectId}`,
          iat: currentTime,
          exp: currentTime + (60 * 60), // 1 hour from now
        },
        signingKey,
        {
          algorithm: "RS256",
        }
      );

      return { token };
    } catch (error) {
      console.error("Failed to generate Paragon user token:", error);
      throw new Error("Failed to generate authentication token");
    }
  },
});

// Internal function to generate user token (for use by other actions)
export const generateUserTokenInternal = internalAction({
  args: { userId: v.id("users") },
  handler: async (ctx, args): Promise<{ token: string }> => {
    const signingKey = process.env.PARAGON_SIGNING_KEY;
    const projectId = process.env.PARAGON_PROJECT_ID;
    
    if (!signingKey || !projectId) {
      throw new Error("Paragon configuration missing. Please set PARAGON_SIGNING_KEY and PARAGON_PROJECT_ID environment variables.");
    }

    try {
      const currentTime = Math.floor(Date.now() / 1000);
      const token = jwt.sign(
        {
          sub: args.userId, // Use Convex user ID as the subject
          aud: `useparagon.com/${projectId}`,
          iat: currentTime,
          exp: currentTime + (60 * 60), // 1 hour from now
        },
        signingKey,
        {
          algorithm: "RS256",
        }
      );

      return { token };
    } catch (error) {
      console.error("Failed to generate Paragon user token:", error);
      throw new Error("Failed to generate authentication token");
    }
  },
});

// Verify Paragon webhook signature
function verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
  try {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
    
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
}

// Paragon webhook handler for integration events
export const handleWebhook = action({
  args: {
    event: v.string(),
    userId: v.string(),
    integration: v.object({
      type: v.string(),
      name: v.string(),
      description: v.optional(v.string()),
      enabled: v.boolean(),
      metadata: v.optional(v.object({
        accountId: v.optional(v.string()),
        accountName: v.optional(v.string()),
        permissions: v.optional(v.array(v.string())),
      })),
    }),
    signature: v.optional(v.string()),
    rawPayload: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ success: boolean; error?: string }> => {
    try {
      // Verify webhook signature if provided
      if (args.signature && args.rawPayload) {
        const webhookSecret = process.env.PARAGON_WEBHOOK_SECRET;
        if (webhookSecret && !verifyWebhookSignature(args.rawPayload, args.signature, webhookSecret)) {
          console.error("Invalid webhook signature");
          return { success: false, error: "Invalid signature" };
        }
      }

      // Find user by Convex user ID (the userId from Paragon should match our user ID)
      const user = await ctx.runQuery(internal.auth.getUserById, { userId: args.userId as any });
      if (!user) {
        console.error("User not found for Paragon webhook:", args.userId);
        return { success: false, error: "User not found" };
      }

      switch (args.event) {
        case "integration.enabled":
        case "integration.install":
          await ctx.runMutation(internal.integrations.createOrUpdate, {
            userId: user._id,
            type: args.integration.type,
            name: args.integration.name,
            description: args.integration.description,
            isEnabled: true,
            metadata: {
              accountId: args.integration.metadata?.accountId,
              accountName: args.integration.metadata?.accountName,
              permissions: args.integration.metadata?.permissions,
              lastSyncAt: Date.now(),
            },
          });
          break;

        case "integration.disabled":
          await ctx.runMutation(internal.integrations.disable, {
            userId: user._id,
            type: args.integration.type,
          });
          break;

        case "integration.removed":
        case "integration.uninstall":
          await ctx.runMutation(internal.integrations.removeByType, {
            userId: user._id,
            type: args.integration.type,
          });
          break;

        default:
          console.log("Unknown Paragon event:", args.event);
      }

      return { success: true };
    } catch (error) {
      console.error("Paragon webhook error:", error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  },
});

// Get integration data for AI context
export const getIntegrationData = action({
  args: {
    integrationType: v.string(),
    query: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<any> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    try {
      // Generate user token for authentication
      const { token }: { token: string } = await ctx.runAction(internal.paragon.generateUserTokenInternal, { userId });
      
      // Get data from the integration through Paragon's unified API
      const response: Response = await fetch(`https://api.useparagon.com/integrations/${args.integrationType}/data`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Paragon API error: ${response.statusText}`);
      }

      const data: any = await response.json();
      return data;
    } catch (error) {
      console.error("Failed to get integration data:", error);
      throw error;
    }
  },
});

// Execute actions through integrations
export const executeIntegrationAction = action({
  args: {
    integrationType: v.string(),
    action: v.string(),
    parameters: v.object({}),
  },
  handler: async (ctx, args): Promise<any> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    try {
      // Generate user token for authentication
      const { token }: { token: string } = await ctx.runAction(internal.paragon.generateUserTokenInternal, { userId });

      // Execute action through Paragon
      const response: Response = await fetch(`https://api.useparagon.com/integrations/${args.integrationType}/actions/${args.action}`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(args.parameters),
      });

      if (!response.ok) {
        throw new Error(`Paragon API error: ${response.statusText}`);
      }

      const result: any = await response.json();
      return result;
    } catch (error) {
      console.error("Failed to execute integration action:", error);
      throw error;
    }
  },
});
