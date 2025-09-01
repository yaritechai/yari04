# Pipedream Integration Guide

This guide explains how to set up and use the Pipedream integration in Yari AI.

## Overview

The Pipedream integration allows Yari AI to:
- Connect to 2000+ apps and services
- Build and execute automated workflows
- Create AI agents that can perform actions across multiple platforms
- Use the Agent Builder interface to create complex automation flows

## Setup

### 1. Get Pipedream OAuth Credentials

1. Go to [Pipedream Connect](https://pipedream.com/connect)
2. Create a new OAuth application
3. Note your Client ID and Client Secret
4. Create a project and note the Project ID

### 2. Configure Environment Variables

Add these to your `.env.local` file:

```bash
# Pipedream OAuth Client Credentials
PIPEDREAM_CLIENT_ID=your_client_id_here
PIPEDREAM_CLIENT_SECRET=your_client_secret_here

# Pipedream Project Configuration
PIPEDREAM_PROJECT_ID=proj_xxxxxxx
PIPEDREAM_ENVIRONMENT=development # or production

# Optional: Pipedream MCP Chat URL (for Agent Builder)
VITE_PD_CHAT_URL=http://localhost:3000 # or https://chat.pipedream.com
```

### 3. Start the Application

```bash
npm run dev
```

## Using Pipedream in Chat

### Connect Apps

Ask the AI to connect an app:
- "Connect my Slack account"
- "Connect GitHub"
- "Link my Google Sheets"

### List Connected Accounts

- "Show my connected accounts"
- "What apps have I connected?"

### Search for Actions

- "What can I do with Slack?"
- "Search for GitHub actions"
- "Find email sending components"

### Execute Actions

- "Send a Slack message to #general saying 'Hello World'"
- "Create a GitHub issue in my repo"
- "Add a row to my Google Sheet"

### Create Workflows

- "Create a workflow that posts to Slack when I get a GitHub issue"
- "Build an automation that emails me daily summaries"
- "Set up a workflow to backup data weekly"

## Using the Agent Builder

### Access the Agent Builder

1. Click "Agent Builder" in the left sidebar
2. The Pipedream MCP Chat interface will load

### Building Agents

In the Agent Builder, you can:
- Design complex multi-step workflows
- Connect multiple services together
- Create scheduled automations
- Build event-driven workflows
- Test and debug your agents

### Agent Capabilities

Agents can:
- Monitor GitHub repos and notify on changes
- Process form submissions and update databases
- Generate reports from multiple data sources
- Automate social media posting
- Sync data between different services
- And much more!

## Available Integrations

Popular integrations include:
- **Communication**: Slack, Discord, Email, SMS
- **Development**: GitHub, GitLab, Bitbucket
- **Productivity**: Google Sheets, Notion, Airtable
- **Social Media**: Twitter/X, LinkedIn, Facebook
- **Databases**: PostgreSQL, MySQL, MongoDB
- **Cloud Services**: AWS, Google Cloud, Azure
- And 2000+ more!

## API Reference

### Pipedream Tools Available in Chat

1. **pipedream_connect**: Connect a new app via OAuth
2. **pipedream_list_accounts**: List all connected accounts
3. **pipedream_run_action**: Execute a Pipedream action
4. **pipedream_search_components**: Search for available components
5. **pipedream_create_workflow**: Create a new workflow

### Agent Builder Tools

1. **agent_create_workflow**: Create an agent workflow
2. **agent_update_capabilities**: Update agent capabilities
3. **agent_execute_workflow**: Execute an agent workflow

## Troubleshooting

### Connection Issues

If you can't connect an app:
1. Check that your OAuth credentials are correct
2. Ensure the redirect URI is properly configured
3. Try refreshing the page and connecting again

### Action Execution Failures

If actions fail to execute:
1. Verify the account is still connected
2. Check that you have the necessary permissions
3. Ensure all required parameters are provided

### Agent Builder Not Loading

If the Agent Builder doesn't load:
1. Check the VITE_PD_CHAT_URL environment variable
2. Ensure the Pipedream MCP server is running
3. Check browser console for errors

## Best Practices

1. **Test in Development First**: Use the development environment for testing
2. **Use Descriptive Names**: Give workflows and agents clear, descriptive names
3. **Error Handling**: Add error handling steps to workflows
4. **Rate Limits**: Be aware of API rate limits for connected services
5. **Security**: Never expose sensitive credentials in workflows

## Support

For help with:
- **Pipedream Platform**: Visit [Pipedream Docs](https://pipedream.com/docs)
- **Yari AI Integration**: Contact support@yari.ai
- **Agent Builder**: Check the [MCP Documentation](https://github.com/PipedreamHQ/mcp)




