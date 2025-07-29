import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";

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
