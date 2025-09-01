# Agent - ChatGPT Clone
  
This is a project built with [Chef](https://chef.convex.dev) using [Convex](https://convex.dev) as its backend.
 You can find docs about Chef with useful information like how to deploy to production [here](https://docs.convex.dev/chef).
  
This project is connected to the Convex deployment named [`valiant-hawk-538`](https://dashboard.convex.dev/d/valiant-hawk-538).
  
## Project structure
  
The frontend code is in the `app` directory and is built with [Vite](https://vitejs.dev/).
  
The backend code is in the `convex` directory.
  
`npm run dev` will start the frontend and backend servers.

## App authentication

Chef apps use [Convex Auth](https://auth.convex.dev/) with Anonymous auth for easy sign in. You may wish to change this before deploying your app.

## Groq API Integration

This app now uses Groq as the main model provider, supporting multiple models:

- **Llama 3 70B** (`groq/llama3-70b-8192`) - General purpose model
- **Mixtral 8x7B** (`groq/mixtral-8x7b-32768`) - Research and data analysis
- **Gemma 7B** (`groq/gemma-7b-it`) - Efficient summarization
- **Kimi K2** (`moonshotai/kimi-k2-instruct`) - Vision tasks

### Setup Instructions

1. **Get Groq API Key**
   - Sign up at [Groq Console](https://console.groq.com/)
   - Generate an API key

2. **Set Environment Variables**
   - Add your Groq API key to your Convex environment variables:
   ```
   npx convex env set GROQ_API_KEY=your_groq_api_key
   ```

3. **Test the Integration**
   - You can test a specific Groq model using the test function:
   ```javascript
   // Test a specific model
   await convex.run("testGroq:testGroqConnection", { modelId: "groq/llama3-70b-8192" });
   
   // Test all configured Groq models
   await convex.run("testGroq:testAllGroqModels");
   ```

4. **HTTP Test Endpoint**
   - A test endpoint is available at `/test-groq` to verify all Groq models
   - Access it in your browser or via curl:
   ```
   curl https://your-convex-deployment.convex.site/test-groq
   ```

### Troubleshooting

If you encounter issues with the Groq API integration:

1. **Check API Key**: Ensure your Groq API key is correctly set in the environment variables
2. **Model Availability**: Verify that the models you're trying to use are available in your Groq account
3. **Rate Limits**: Check if you've hit any rate limits on the Groq API
4. **Network Issues**: Ensure your Convex deployment has network access to the Groq API

For detailed error messages, check the Convex logs or use the test endpoints to diagnose specific issues.

## Pipedream Integration Setup

To enable the Agent Builder with Pipedream integration:

1. **Get Pipedream OAuth Credentials**
   - Go to [Pipedream Connect](https://pipedream.com/connect)
   - Create a new OAuth application
   - Note your Client ID and Client Secret
   - Create a project and note the Project ID

2. **Set Environment Variables**
   Add these to your `.env.local` file:
   ```bash
   # Pipedream OAuth
   PIPEDREAM_CLIENT_ID=your_client_id_here
   PIPEDREAM_CLIENT_SECRET=your_client_secret_here
   PIPEDREAM_PROJECT_ID=your_project_id_here
   PIPEDREAM_ENVIRONMENT=development
   ```

3. **Access Agent Builder**
   - Click "Agent Builder" in the left sidebar
   - Chat with AI to create automations
   - Connect apps through OAuth when prompted
   - See workflows build in real-time

## Developing and deploying your app

Check out the [Convex docs](https://docs.convex.dev/) for more information on how to develop with Convex.
* If you're new to Convex, the [Overview](https://docs.convex.dev/understanding/) is a good place to start
* Check out the [Hosting and Deployment](https://docs.convex.dev/production/) docs for how to deploy your app
* Read the [Best Practices](https://docs.convex.dev/understanding/best-practices/) guide for tips on how to improve you app further

## HTTP API

User-defined http routes are defined in the `convex/router.ts` file. We split these routes into a separate file from `convex/http.ts` to allow us to prevent the LLM from modifying the authentication routes.
