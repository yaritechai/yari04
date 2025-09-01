import { auth } from "./auth";
import router from "./router";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";

const http = router;

auth.addHttpRoutes(http);

// Add a test endpoint for Groq API
http.route({
  path: "/test-groq",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    try {
      const url = new URL(request.url);
      const modelId = url.searchParams.get("model") || undefined;
      
      const result = await ctx.runAction(api.testGroq.testAllGroqModels, {});
      
      return Response.json({
        success: true,
        results: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      return Response.json({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }, { status: 500 });
    }
  }),
});

export default http;
