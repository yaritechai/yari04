/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as agentBuilder from "../agentBuilder.js";
import type * as ai from "../ai.js";
import type * as auth from "../auth.js";
import type * as conversations from "../conversations.js";
import type * as debug from "../debug.js";
import type * as files from "../files.js";
import type * as folders from "../folders.js";
import type * as http from "../http.js";
import type * as integrations from "../integrations.js";
import type * as lib_mcpOAuthClient from "../lib/mcpOAuthClient.js";
import type * as lib_mcpSessionStore from "../lib/mcpSessionStore.js";
import type * as mcp from "../mcp.js";
import type * as mcpOAuth from "../mcpOAuth.js";
import type * as mcpOAuthInternal from "../mcpOAuthInternal.js";
import type * as mcpTools from "../mcpTools.js";
import type * as messages from "../messages.js";
import type * as modelRouter from "../modelRouter.js";
import type * as paragon from "../paragon.js";
import type * as preferences from "../preferences.js";
import type * as router from "../router.js";
import type * as simpleAgentBuilder from "../simpleAgentBuilder.js";
import type * as smithery from "../smithery.js";
import type * as streaming from "../streaming.js";
import type * as websearch from "../websearch.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  agentBuilder: typeof agentBuilder;
  ai: typeof ai;
  auth: typeof auth;
  conversations: typeof conversations;
  debug: typeof debug;
  files: typeof files;
  folders: typeof folders;
  http: typeof http;
  integrations: typeof integrations;
  "lib/mcpOAuthClient": typeof lib_mcpOAuthClient;
  "lib/mcpSessionStore": typeof lib_mcpSessionStore;
  mcp: typeof mcp;
  mcpOAuth: typeof mcpOAuth;
  mcpOAuthInternal: typeof mcpOAuthInternal;
  mcpTools: typeof mcpTools;
  messages: typeof messages;
  modelRouter: typeof modelRouter;
  paragon: typeof paragon;
  preferences: typeof preferences;
  router: typeof router;
  simpleAgentBuilder: typeof simpleAgentBuilder;
  smithery: typeof smithery;
  streaming: typeof streaming;
  websearch: typeof websearch;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
