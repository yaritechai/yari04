# Agent Builder Guide - Your Lindy Competitor

## Overview

The Agent Builder is a powerful chat-based interface for creating AI agents with Pipedream integrations. It allows you to build complex automations through natural conversation, similar to Lindy.

## Key Features

### 1. **Chat-Based Agent Creation**
- Simply describe what you want to automate in natural language
- The AI understands your intent and builds the workflow for you
- Live preview on the right shows your agent in action

### 2. **2000+ App Integrations**
- Connect to Slack, GitHub, Gmail, Discord, Stripe, and thousands more
- OAuth-based authentication for secure connections
- No API keys needed - just click "Connect" when prompted

### 3. **Visual Workflow Builder**
- See your workflow visualization at the top of the chat
- Track connected apps and workflow steps
- Hide/show the visualization as needed

### 4. **AI-Powered Actions**
The AI can execute these Pipedream commands for you:
- `pipedream_connect` - Connect to any app
- `pipedream_list_accounts` - Show connected accounts
- `pipedream_run_action` - Execute app actions
- `pipedream_search_components` - Find available integrations
- `pipedream_create_workflow` - Build complete workflows
- `agent_create_workflow` - Create agent-specific workflows
- `agent_update_capabilities` - Modify agent abilities
- `agent_execute_workflow` - Run workflows on demand

## Getting Started

1. **Access Agent Builder**
   - Click "Agent Builder" in the left sidebar
   - You'll see a two-panel interface:
     - Left: Chat with AI to build your agent
     - Right: Live preview of your agent

2. **Connect Your First App**
   - Say: "Connect my Slack workspace"
   - The AI will guide you through OAuth connection
   - Your connected apps appear at the top

3. **Create Your First Workflow**
   - Example: "Create a Slack bot that notifies me when someone stars my GitHub repo"
   - The AI will:
     - Connect required apps (GitHub, Slack)
     - Set up the GitHub webhook trigger
     - Configure the Slack message action
     - Show the workflow visualization

4. **Test Your Agent**
   - The right panel shows a live preview
   - Test your agent by interacting with it
   - Make adjustments through the builder chat

## Example Conversations

### Email Automation
```
You: "I want to automatically save Gmail attachments to Google Drive"
AI: I'll help you create an automation that saves Gmail attachments to Google Drive. Let me set this up for you...
[AI connects Gmail and Google Drive, creates workflow]
```

### GitHub + Slack Integration
```
You: "Notify my team in Slack when someone opens a pull request"
AI: I'll create a GitHub webhook that triggers when PRs are opened and sends notifications to your Slack channel...
[AI creates complete workflow]
```

### Scheduled Tasks
```
You: "Every Monday at 9am, send me a summary of last week's Stripe payments"
AI: I'll set up a scheduled workflow that runs weekly and sends you a Stripe payment summary...
[AI creates scheduled workflow with Stripe integration]
```

## Advanced Features

### Multi-Step Workflows
- Chain multiple actions together
- Add conditional logic
- Transform data between steps
- Use custom code when needed

### AI Agent Capabilities
Your agents can:
- Process natural language
- Make decisions based on data
- Interact with multiple services
- Learn from interactions
- Execute complex business logic

### Live Updates
- Workflow visualization updates in real-time
- See connected apps instantly
- Preview changes immediately
- Test without leaving the builder

## Best Practices

1. **Start Simple**: Begin with single-app automations, then expand
2. **Be Specific**: The more details you provide, the better the AI builds
3. **Test Often**: Use the preview panel to test as you build
4. **Iterate**: Refine your agent through conversation
5. **Save Progress**: Your conversations and workflows are automatically saved

## Troubleshooting

### Connection Issues
- Ensure pop-ups are allowed for OAuth flows
- Check that you're logged into the target service
- Try disconnecting and reconnecting the app

### Workflow Errors
- Review the error message in the chat
- Ask the AI to fix specific issues
- Check that all required fields are configured

### Performance
- Complex workflows may take time to execute
- Use webhooks instead of polling when possible
- Optimize data transformations

## Next Steps

1. Explore the [Pipedream documentation](https://pipedream.com/docs)
2. Browse available [components](https://pipedream.com/apps)
3. Join the community for tips and examples
4. Build increasingly complex automations

Remember: The Agent Builder makes you as powerful as a $200,000/year automation engineer! 🚀




