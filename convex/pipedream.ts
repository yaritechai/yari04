import { v } from "convex/values";
import { action, mutation, query, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";

// Store or update the user's Pipedream API credentials in the generic `integrations` table
export const saveCredentials = mutation({
	args: {
		apiKey: v.string(),
		orgId: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const userId = await getAuthUserId(ctx);
		if (!userId) throw new Error("Not authenticated");

		// Find existing integration record for Pipedream
		const existing = await ctx.db
			.query("integrations")
			.withIndex("by_user", (q) => q.eq("userId", userId))
			.filter((q) => q.eq(q.field("type"), "pipedream"))
			.first();

		if (existing) {
			await ctx.db.patch(existing._id, {
				config: { ...(existing.config || {}), apiKey: args.apiKey, orgId: args.orgId },
				isEnabled: true,
				updatedAt: Date.now(),
			});
			return existing._id;
		}

		return await ctx.db.insert("integrations", {
			userId,
			type: "pipedream",
			name: "Pipedream",
			description: "Pipedream REST API integration",
			isEnabled: true,
			config: { apiKey: args.apiKey, orgId: args.orgId },
			metadata: {},
			createdAt: Date.now(),
			updatedAt: Date.now(),
		});
	},
});

export const getStatus = query({
	args: {},
	handler: async (ctx) => {
		const userId = await getAuthUserId(ctx);
		if (!userId) throw new Error("Not authenticated");

		const integration = await ctx.db
			.query("integrations")
			.withIndex("by_user", (q) => q.eq("userId", userId))
			.filter((q) => q.eq(q.field("type"), "pipedream"))
			.first();

		return {
			connected: !!integration?.isEnabled && !!integration?.config?.apiKey,
			orgId: integration?.config?.orgId ?? null,
		};
	},
});

const getCredentialsForUser = internalQuery({
	args: { userId: v.id("users") },
	handler: async (ctx, args) => {
		const integration = await ctx.db
			.query("integrations")
			.withIndex("by_user", (q) => q.eq("userId", args.userId))
			.filter((q) => q.eq(q.field("type"), "pipedream"))
			.first();
		return integration?.config || null;
	},
});

export const getMe = action({
	args: {},
	returns: v.any(),
	handler: async (ctx) => {
		const userId = await getAuthUserId(ctx);
		if (!userId) throw new Error("Not authenticated");
		const creds: any = await ctx.runQuery(internal.integrations.getCredentialsForUser, { userId });
		if (!creds?.apiKey) throw new Error("Pipedream not connected");

		const resp = await fetch("https://api.pipedream.com/v1/users/me", {
			headers: {
				Authorization: `Bearer ${creds.apiKey}`,
				"Content-Type": "application/json",
				...(creds.orgId ? { "x-pd-org-id": creds.orgId } : {}),
			},
		});
		if (!resp.ok) {
			const text = await resp.text();
			throw new Error(`Pipedream API error (${resp.status}): ${text}`);
		}
		return await resp.json();
	},
});

export const listWorkflows = action({
	args: { limit: v.optional(v.number()) },
	returns: v.any(),
	handler: async (ctx, args) => {
		const userId = await getAuthUserId(ctx);
		if (!userId) throw new Error("Not authenticated");
		const creds: any = await ctx.runQuery(internal.integrations.getCredentialsForUser, { userId });
		if (!creds?.apiKey) throw new Error("Pipedream not connected");

		const url = new URL("https://api.pipedream.com/v1/workflows");
		if (args.limit) url.searchParams.set("limit", String(args.limit));

		const resp = await fetch(url.toString(), {
			headers: {
				Authorization: `Bearer ${creds.apiKey}`,
				"Content-Type": "application/json",
				...(creds.orgId ? { "x-pd-org-id": creds.orgId } : {}),
			},
		});
		if (!resp.ok) {
			const text = await resp.text();
			throw new Error(`Pipedream API error (${resp.status}): ${text}`);
		}
		return await resp.json();
	},
});

export const createWorkflow = action({
	args: {
		name: v.string(),
		description: v.optional(v.string()),
	},
	returns: v.any(),
	handler: async (ctx, args) => {
		const userId = await getAuthUserId(ctx);
		if (!userId) throw new Error("Not authenticated");
		const creds: any = await ctx.runQuery(internal.integrations.getCredentialsForUser, { userId });
		if (!creds?.apiKey) throw new Error("Pipedream not connected");

		const resp = await fetch("https://api.pipedream.com/v1/workflows", {
			method: "POST",
			headers: {
				Authorization: `Bearer ${creds.apiKey}`,
				"Content-Type": "application/json",
				...(creds.orgId ? { "x-pd-org-id": creds.orgId } : {}),
			},
			body: JSON.stringify({ name: args.name, description: args.description }),
		});
		if (!resp.ok) {
			const text = await resp.text();
			throw new Error(`Pipedream API error (${resp.status}): ${text}`);
		}
		return await resp.json();
	},
});

// =========================
// Connect OAuth (Pipedream Connect)
// =========================

function assertEnv(name: string, value: string | undefined): asserts value is string {
  if (!value) throw new Error(`Missing required env var: ${name}`);
}

async function fetchOAuthAccessToken(): Promise<string> {
  const clientId = process.env.PIPEDREAM_CLIENT_ID;
  const clientSecret = process.env.PIPEDREAM_CLIENT_SECRET;
  assertEnv("PIPEDREAM_CLIENT_ID", clientId);
  assertEnv("PIPEDREAM_CLIENT_SECRET", clientSecret);

  const resp = await fetch("https://api.pipedream.com/v1/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Failed to obtain OAuth token (${resp.status}): ${text}`);
  }
  const data = (await resp.json()) as { access_token: string };
  return data.access_token;
}

export const createConnectToken = action({
  args: {
    externalUserId: v.string(),
    allowedOrigins: v.optional(v.array(v.string())),
  },
  returns: v.object({ token: v.string(), expires_at: v.string(), connect_link_url: v.string() }),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const projectId = process.env.PIPEDREAM_PROJECT_ID;
    const environment = process.env.PIPEDREAM_ENVIRONMENT || "development";
    assertEnv("PIPEDREAM_PROJECT_ID", projectId);

    const accessToken = await fetchOAuthAccessToken();
    const url = `https://api.pipedream.com/v1/connect/${projectId}/tokens`;
    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
        "x-pd-environment": environment,
      },
      body: JSON.stringify({
        external_user_id: args.externalUserId,
        ...(args.allowedOrigins ? { allowed_origins: args.allowedOrigins } : {}),
      }),
    });
    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`Pipedream Connect token error (${resp.status}): ${text}`);
    }
    const data = await resp.json();
    return {
      token: data.token,
      expires_at: data.expires_at,
      connect_link_url: data.connect_link_url || `https://pipedream.com/_static/connect.html?token=${data.token}&connectLink=true`,
    };
  },
});

export const listConnectAccounts = action({
  args: {
    externalUserId: v.optional(v.string()),
    app: v.optional(v.string()),
    includeCredentials: v.optional(v.boolean()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const projectId = process.env.PIPEDREAM_PROJECT_ID;
    assertEnv("PIPEDREAM_PROJECT_ID", projectId);
    const accessToken = await fetchOAuthAccessToken();

    const url = new URL(`https://api.pipedream.com/v1/connect/${projectId}/accounts`);
    if (args.app) url.searchParams.set("app", args.app);
    if (args.externalUserId) url.searchParams.set("external_user_id", args.externalUserId);
    if (args.includeCredentials) url.searchParams.set("include_credentials", String(args.includeCredentials));
    const resp = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`Pipedream list accounts error (${resp.status}): ${text}`);
    }
    return await resp.json();
  },
});

export const proxyRequest = action({
  args: {
    externalUserId: v.string(),
    accountId: v.string(),
    url: v.string(), // full URL or relative path depending on app
    method: v.string(),
    body: v.optional(v.any()),
    headers: v.optional(v.record(v.string(), v.string())),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const projectId = process.env.PIPEDREAM_PROJECT_ID;
    const environment = process.env.PIPEDREAM_ENVIRONMENT || "development";
    assertEnv("PIPEDREAM_PROJECT_ID", projectId);
    const accessToken = await fetchOAuthAccessToken();

    const urlSafe = Buffer.from(args.url).toString("base64");
    const proxyUrl = `https://api.pipedream.com/v1/connect/${projectId}/proxy/${urlSafe}?external_user_id=${encodeURIComponent(args.externalUserId)}&account_id=${encodeURIComponent(args.accountId)}`;

    const resp = await fetch(proxyUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "x-pd-environment": environment,
        "Content-Type": "application/json",
        ...(args.headers || {}),
      },
      body: JSON.stringify({
        // The upstream request details go in the body
        ...(args.method ? { method: args.method } : {}),
        ...(args.body !== undefined ? { data: args.body } : {}),
      }),
    });
    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`Pipedream proxy error (${resp.status}): ${text}`);
    }
    return await resp.json();
  },
});

export const getComponents = action({
  args: {
    app: v.optional(v.string()),
    q: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const projectId = process.env.PIPEDREAM_PROJECT_ID;
    assertEnv("PIPEDREAM_PROJECT_ID", projectId);
    const accessToken = await fetchOAuthAccessToken();

    const url = new URL(`https://api.pipedream.com/v1/connect/${projectId}/components`);
    if (args.app) url.searchParams.set("app", args.app);
    if (args.q) url.searchParams.set("q", args.q);
    if (args.limit) url.searchParams.set("limit", String(args.limit));

    const resp = await fetch(url.toString(), { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`Pipedream get components error (${resp.status}): ${text}`);
    }
    return await resp.json();
  },
});

export const runAction = action({
  args: {
    id: v.string(), // action key (e.g., gitlab-list-commits)
    externalUserId: v.string(),
    configuredProps: v.any(),
    stashId: v.optional(v.union(v.string(), v.boolean())),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const projectId = process.env.PIPEDREAM_PROJECT_ID;
    const environment = process.env.PIPEDREAM_ENVIRONMENT || "development";
    assertEnv("PIPEDREAM_PROJECT_ID", projectId);
    const accessToken = await fetchOAuthAccessToken();

    const resp = await fetch(`https://api.pipedream.com/v1/connect/${projectId}/actions/run`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "x-pd-environment": environment,
      },
      body: JSON.stringify({
        id: args.id,
        external_user_id: args.externalUserId,
        configured_props: args.configuredProps,
        ...(args.stashId !== undefined ? { stash_id: args.stashId } : {}),
      }),
    });
    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`Pipedream run action error (${resp.status}): ${text}`);
    }
    return await resp.json();
  },
});



