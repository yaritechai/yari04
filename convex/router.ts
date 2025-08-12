import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { v } from "convex/values";

const http = httpRouter();

// MCP OAuth callback endpoint
http.route({
  path: "/mcp/oauth/callback",
  method: "GET",
  handler: httpAction(async (ctx, req) => {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const error = url.searchParams.get("error");

    if (code) {
      const html = `
        <html>
          <head>
            <title>MCP OAuth Success</title>
            <style>
              body { 
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                display: flex;
                align-items: center;
                justify-content: center;
                min-height: 100vh;
                margin: 0;
                background: #f5f5f5;
              }
              .container {
                text-align: center;
                background: white;
                padding: 2rem;
                border-radius: 8px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
              }
              .success { color: #22c55e; }
              .loading { color: #6b7280; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1 class="success">✅ Authorization Successful!</h1>
              <p class="loading">Completing connection...</p>
              <p>You can close this window.</p>
            </div>
            <script>
              // Send the auth code to the parent window
              if (window.opener) {
                window.opener.postMessage({ 
                  type: 'mcp-oauth-success', 
                  code: '${code}' 
                }, '*');
                window.close();
              } else {
                // Fallback: send message to self for iframe scenarios
                window.parent.postMessage({ 
                  type: 'mcp-oauth-callback', 
                  code: '${code}' 
                }, '*');
              }
            </script>
          </body>
        </html>
      `;

      return new Response(html, {
        headers: { "Content-Type": "text/html" },
      });
    } else if (error) {
      const html = `
        <html>
          <head>
            <title>MCP OAuth Error</title>
            <style>
              body { 
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                display: flex;
                align-items: center;
                justify-content: center;
                min-height: 100vh;
                margin: 0;
                background: #f5f5f5;
              }
              .container {
                text-align: center;
                background: white;
                padding: 2rem;
                border-radius: 8px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
              }
              .error { color: #ef4444; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1 class="error">❌ Authorization Failed</h1>
              <p>Error: ${error}</p>
              <p>You can close this window and try again.</p>
            </div>
            <script>
              if (window.opener) {
                window.opener.postMessage({ 
                  type: 'mcp-oauth-error', 
                  error: '${error}' 
                }, '*');
                window.close();
              } else {
                window.parent.postMessage({ 
                  type: 'mcp-oauth-callback', 
                  error: '${error}' 
                }, '*');
              }
            </script>
          </body>
        </html>
      `;

      return new Response(html, {
        headers: { "Content-Type": "text/html" },
      });
    }

    return new Response("Bad request", { status: 400 });
  }),
});

export default http;

// Serve images from Convex storage under our own domain
http.route({
  path: "/images",
  method: "GET",
  handler: httpAction(async (ctx, req) => {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    if (!id) return new Response("Missing id", { status: 400 });

    try {
      // Load from storage
      const blob = await ctx.storage.get(id as any);
      if (!blob) return new Response("Not found", { status: 404 });

      const headers = new Headers();
      headers.set("Content-Type", "image/png");
      headers.set("Cache-Control", "public, max-age=31536000, immutable");
      return new Response(blob, { status: 200, headers });
    } catch (e) {
      return new Response("Server error", { status: 500 });
    }
  }),
});

// Force a download with Content-Disposition so it saves directly to device
http.route({
  path: "/images/download",
  method: "GET",
  handler: httpAction(async (ctx, req) => {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    if (!id) return new Response("Missing id", { status: 400 });

    try {
      const blob = await ctx.storage.get(id as any);
      if (!blob) return new Response("Not found", { status: 404 });

      const headers = new Headers();
      headers.set("Content-Type", "application/octet-stream");
      headers.set(
        "Content-Disposition",
        `attachment; filename="generated-image.png"`
      );
      headers.set("Cache-Control", "public, max-age=31536000, immutable");
      return new Response(blob, { status: 200, headers });
    } catch (e) {
      return new Response("Server error", { status: 500 });
    }
  }),
});

// Generic file download route for CSV/XLSX and others
http.route({
  path: "/files/download",
  method: "GET",
  handler: httpAction(async (ctx, req) => {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    const fileName = url.searchParams.get("name") || "download";
    const mime = url.searchParams.get("type") || "application/octet-stream";
    if (!id) return new Response("Missing id", { status: 400 });

    try {
      const blob = await ctx.storage.get(id as any);
      if (!blob) return new Response("Not found", { status: 404 });

      const headers = new Headers();
      headers.set("Content-Type", mime);
      headers.set(
        "Content-Disposition",
        `attachment; filename="${fileName}"`
      );
      headers.set("Cache-Control", "public, max-age=31536000, immutable");
      return new Response(blob, { status: 200, headers });
    } catch (e) {
      return new Response("Server error", { status: 500 });
    }
  }),
});

// Mirror routes under /api/* to support environments that proxy Convex under /api
http.route({
  path: "/api/images",
  method: "GET",
  handler: httpAction(async (ctx, req) => {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    if (!id) return new Response("Missing id", { status: 400 });

    try {
      const blob = await ctx.storage.get(id as any);
      if (!blob) return new Response("Not found", { status: 404 });

      const headers = new Headers();
      headers.set("Content-Type", "image/png");
      headers.set("Cache-Control", "public, max-age=31536000, immutable");
      return new Response(blob, { status: 200, headers });
    } catch (e) {
      return new Response("Server error", { status: 500 });
    }
  }),
});

http.route({
  path: "/api/images/download",
  method: "GET",
  handler: httpAction(async (ctx, req) => {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    if (!id) return new Response("Missing id", { status: 400 });

    try {
      const blob = await ctx.storage.get(id as any);
      if (!blob) return new Response("Not found", { status: 404 });

      const headers = new Headers();
      headers.set("Content-Type", "application/octet-stream");
      headers.set(
        "Content-Disposition",
        `attachment; filename="generated-image.png"`
      );
      headers.set("Cache-Control", "public, max-age=31536000, immutable");
      return new Response(blob, { status: 200, headers });
    } catch (e) {
      return new Response("Server error", { status: 500 });
    }
  }),
});

http.route({
  path: "/api/files/download",
  method: "GET",
  handler: httpAction(async (ctx, req) => {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    const fileName = url.searchParams.get("name") || "download";
    const mime = url.searchParams.get("type") || "application/octet-stream";
    if (!id) return new Response("Missing id", { status: 400 });

    try {
      const blob = await ctx.storage.get(id as any);
      if (!blob) return new Response("Not found", { status: 404 });

      const headers = new Headers();
      headers.set("Content-Type", mime);
      headers.set(
        "Content-Disposition",
        `attachment; filename="${fileName}"`
      );
      headers.set("Cache-Control", "public, max-age=31536000, immutable");
      return new Response(blob, { status: 200, headers });
    } catch (e) {
      return new Response("Server error", { status: 500 });
    }
  }),
});
