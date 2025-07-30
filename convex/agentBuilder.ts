import { v } from "convex/values";
import { query, mutation, action, internalAction, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";

// Agent configuration types
interface AgentConfig {
  name: string;
  description: string;
  personality: string;
  systemPrompt: string;
  avatar?: string;
  color?: string;
  capabilities: string[];
  mcpConnections: string[];
  workflows: string[];
  scheduledTasks: string[];
  isActive: boolean;
}

interface AgentCapability {
  id: string;
  name: string;
  description: string;
  category: 'core' | 'integration' | 'workflow' | 'scheduling';
  required: boolean;
  config?: any;
}

interface Workflow {
  id: string;
  name: string;
  description: string;
  steps: WorkflowStep[];
  triggers: WorkflowTrigger[];
  isActive: boolean;
}

interface WorkflowStep {
  id: string;
  name: string;
  type: 'tool' | 'condition' | 'delay' | 'notification';
  config: any;
  nextSteps: string[];
}

interface WorkflowTrigger {
  type: 'manual' | 'scheduled' | 'webhook' | 'event';
  config: any;
}

// Get current agent configuration
export const getCurrentAgentConfig = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }

    const agent = await ctx.db
      .query("agents")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!agent) {
      // Return default configuration
      return {
        name: "My AI Agent",
        description: "A helpful AI assistant",
        personality: "friendly and professional",
        systemPrompt: "",
        capabilities: ["web_search", "file_management"],
        mcpConnections: [],
        workflows: [],
        scheduledTasks: [],
        isActive: false,
      };
    }

    return agent;
  },
});

// Update agent configuration
export const updateAgent = mutation({
  args: {
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    personality: v.optional(v.string()),
    systemPrompt: v.optional(v.string()),
    avatar: v.optional(v.string()),
    color: v.optional(v.string()),
    capabilities: v.optional(v.array(v.string())),
    mcpConnections: v.optional(v.array(v.string())),
    workflows: v.optional(v.array(v.string())),
    scheduledTasks: v.optional(v.array(v.string())),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Authentication required");
    }

    const existingAgent = await ctx.db
      .query("agents")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    const updateData = {
      userId,
      ...args,
      updatedAt: Date.now(),
    };

    if (existingAgent) {
      // Merge with existing configuration, preserving arrays
      const mergedData = {
        ...updateData,
        capabilities: args.capabilities || existingAgent.capabilities,
        mcpConnections: args.mcpConnections 
          ? [...new Set([...existingAgent.mcpConnections, ...args.mcpConnections])]
          : existingAgent.mcpConnections,
        workflows: args.workflows 
          ? [...new Set([...existingAgent.workflows, ...args.workflows])]
          : existingAgent.workflows,
        scheduledTasks: args.scheduledTasks 
          ? [...new Set([...existingAgent.scheduledTasks, ...args.scheduledTasks])]
          : existingAgent.scheduledTasks,
      };

      await ctx.db.patch(existingAgent._id, mergedData);
      return existingAgent._id;
    } else {
      // Create new agent
      const agentId = await ctx.db.insert("agents", {
        userId,
        name: args.name || "My AI Agent",
        description: args.description || "A helpful AI assistant",
        personality: args.personality || "friendly and professional",
        systemPrompt: args.systemPrompt || "",
        avatar: args.avatar,
        color: args.color,
        capabilities: args.capabilities || ["web_search", "file_management"],
        mcpConnections: args.mcpConnections || [],
        workflows: args.workflows || [],
        scheduledTasks: args.scheduledTasks || [],
        isActive: args.isActive || false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      return agentId;
    }
  },
});

// Get available capabilities
export const getAvailableCapabilities = query({
  args: {},
  handler: async (ctx) => {
    const capabilities: AgentCapability[] = [
      {
        id: "web_search",
        name: "Web Search",
        description: "Search the internet for information and research",
        category: "core",
        required: false,
      },
      {
        id: "file_management",
        name: "File Management",
        description: "Create, read, edit, and organize files and documents",
        category: "core",
        required: false,
      },
      {
        id: "code_execution",
        name: "Code Execution",
        description: "Execute code, run scripts, and perform system operations",
        category: "core",
        required: false,
      },
      {
        id: "web_browsing",
        name: "Web Browsing",
        description: "Navigate websites, scrape content, and interact with web applications",
        category: "core",
        required: false,
      },
      {
        id: "image_processing",
        name: "Image Processing",
        description: "Analyze images, extract text, and process visual content",
        category: "core",
        required: false,
      },
      {
        id: "data_analysis",
        name: "Data Analysis",
        description: "Process data, create reports, and generate insights",
        category: "core",
        required: false,
      },
    ];

    return capabilities;
  },
});

// Create workflow
export const createWorkflow = mutation({
  args: {
    name: v.string(),
    description: v.string(),
    steps: v.array(v.any()),
    triggers: v.array(v.any()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Authentication required");
    }

    const workflowId = await ctx.db.insert("workflows", {
      userId,
      name: args.name,
      description: args.description,
      steps: args.steps,
      triggers: args.triggers,
      isActive: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return workflowId;
  },
});

// Get user workflows
export const getWorkflows = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    return await ctx.db
      .query("workflows")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
  },
});

// Update workflow
export const updateWorkflow = mutation({
  args: {
    workflowId: v.id("workflows"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    steps: v.optional(v.array(v.any())),
    triggers: v.optional(v.array(v.any())),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Authentication required");
    }

    const workflow = await ctx.db.get(args.workflowId);
    if (!workflow || workflow.userId !== userId) {
      throw new Error("Workflow not found or access denied");
    }

    await ctx.db.patch(args.workflowId, {
      ...args,
      updatedAt: Date.now(),
    });

    return args.workflowId;
  },
});

// Delete workflow
export const deleteWorkflow = mutation({
  args: {
    workflowId: v.id("workflows"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Authentication required");
    }

    const workflow = await ctx.db.get(args.workflowId);
    if (!workflow || workflow.userId !== userId) {
      throw new Error("Workflow not found or access denied");
    }

    await ctx.db.delete(args.workflowId);
    return true;
  },
});

// Execute workflow
export const executeWorkflow = action({
  args: {
    workflowId: v.id("workflows"),
    parameters: v.optional(v.any()),
  },
  handler: async (ctx, args): Promise<{ executionId: any; status: string }> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Authentication required");
    }

    const workflow = await ctx.runQuery(internal.agentBuilder.getWorkflowInternal, {
      workflowId: args.workflowId,
      userId,
    });

    if (!workflow) {
      throw new Error("Workflow not found");
    }

    if (!workflow.isActive) {
      throw new Error("Workflow is not active");
    }

    // Execute workflow steps
    const executionId: any = await ctx.runMutation(internal.agentBuilder.createWorkflowExecution, {
      userId: workflow.userId,
      workflowId: args.workflowId,
      parameters: args.parameters,
    });

    try {
      for (const step of workflow.steps) {
        await ctx.runAction(internal.agentBuilder.executeWorkflowStep, {
          executionId,
          step,
          parameters: args.parameters,
        });
      }

      await ctx.runMutation(internal.agentBuilder.updateWorkflowExecution, {
        executionId,
        status: "completed",
      });

      return { executionId, status: "completed" };
    } catch (error) {
      await ctx.runMutation(internal.agentBuilder.updateWorkflowExecution, {
        executionId,
        status: "failed",
        error: error instanceof Error ? error.message : String(error),
      });

      throw error;
    }
  },
});

// Create scheduled trigger
export const createScheduledTrigger = mutation({
  args: {
    name: v.string(),
    description: v.string(),
    cronExpression: v.string(),
    workflowId: v.optional(v.id("workflows")),
    actionType: v.string(),
    actionConfig: v.any(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Authentication required");
    }

    const triggerId = await ctx.db.insert("scheduledTriggers", {
      userId,
      name: args.name,
      description: args.description,
      cronExpression: args.cronExpression,
      workflowId: args.workflowId,
      action: args.actionConfig || {},
      actionType: args.actionType,
      actionConfig: args.actionConfig,
      isActive: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return triggerId;
  },
});

// Get scheduled triggers
export const getScheduledTriggers = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    return await ctx.db
      .query("scheduledTriggers")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
  },
});

// Toggle scheduled trigger
export const toggleScheduledTrigger = mutation({
  args: {
    triggerId: v.id("scheduledTriggers"),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Authentication required");
    }

    const trigger = await ctx.db.get(args.triggerId);
    if (!trigger || trigger.userId !== userId) {
      throw new Error("Trigger not found or access denied");
    }

    await ctx.db.patch(args.triggerId, {
      isActive: args.isActive,
      updatedAt: Date.now(),
    });

    return args.triggerId;
  },
});

// Delete scheduled trigger
export const deleteScheduledTrigger = mutation({
  args: {
    triggerId: v.id("scheduledTriggers"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Authentication required");
    }

    const trigger = await ctx.db.get(args.triggerId);
    if (!trigger || trigger.userId !== userId) {
      throw new Error("Trigger not found or access denied");
    }

    await ctx.db.delete(args.triggerId);
    return true;
  },
});

// Internal functions
export const getWorkflowInternal = internalQuery({
  args: {
    workflowId: v.id("workflows"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const workflow = await ctx.db.get(args.workflowId);
    if (!workflow || workflow.userId !== args.userId) {
      return null;
    }
    return workflow;
  },
});

export const createWorkflowExecution = internalMutation({
  args: {
    userId: v.id("users"),
    workflowId: v.id("workflows"),
    parameters: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("workflowExecutions", {
      userId: args.userId,
      workflowId: args.workflowId,
      status: "running",
      startedAt: Date.now(),
      steps: [],
    });
  },
});

export const updateWorkflowExecution = internalMutation({
  args: {
    executionId: v.id("workflowExecutions"),
    status: v.union(v.literal("pending"), v.literal("running"), v.literal("completed"), v.literal("failed")),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.executionId, {
      status: args.status,
      error: args.error,
      completedAt: Date.now(),
    });
  },
});

export const executeWorkflowStep = internalAction({
  args: {
    executionId: v.id("workflowExecutions"),
    step: v.any(),
    parameters: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    // Implementation for executing individual workflow steps
    // This would integrate with MCP tools, core capabilities, etc.
    console.log("Executing workflow step:", args.step);
    
    // For now, just log the step execution
    // In a full implementation, this would:
    // 1. Parse the step configuration
    // 2. Execute the appropriate tool or action
    // 3. Handle step results and errors
    // 4. Pass data to next steps
    
    return { success: true, result: "Step executed" };
  },
});

// Agent builder system prompt
export const getAgentBuilderPrompt = query({
  args: {},
  handler: async (ctx) => {
    const currentDate = new Date().toISOString().split('T')[0];
    const currentTime = new Date().toTimeString().split(' ')[0];
    
    return `You are an AI Agent Builder Assistant developed by team Suna - think of yourself as a friendly, knowledgeable guide who's genuinely excited to help users create amazing AI agents! 🚀

Your mission is to transform ideas into powerful, working AI agents that genuinely make people's lives easier and more productive.

## SYSTEM INFORMATION
- BASE ENVIRONMENT: Convex with React/TypeScript frontend
- UTC DATE: ${currentDate}
- UTC TIME: ${currentTime}
- CURRENT YEAR: 2025

## 🎯 What You Can Help Users Build

### 🤖 **Smart Assistants**
- **Research Agents**: Gather information, analyze trends, create comprehensive reports
- **Content Creators**: Write blogs, social media posts, marketing copy
- **Code Assistants**: Review code, debug issues, suggest improvements
- **Data Analysts**: Process spreadsheets, generate insights, create visualizations

### 🔧 **Automation Powerhouses**
- **Workflow Orchestrators**: Multi-step processes that run automatically
- **Scheduled Tasks**: Daily reports, weekly summaries, maintenance routines
- **Integration Bridges**: Connect different tools and services seamlessly
- **Monitoring Agents**: Track systems, send alerts, maintain health checks

### 🌐 **Connected Specialists**
- **MCP Integrators**: Work with Gmail, GitHub, Notion, databases, and thousands of other tools via Smithery registry
- **Web Researchers**: Browse websites, scrape data, monitor changes
- **File Managers**: Organize documents, process uploads, backup systems
- **Communication Hubs**: Send emails, post updates, manage notifications

## 🛠️ Your Powerful Toolkit

### Agent Configuration (\`updateAgent\` function)
Transform your agent's identity and capabilities:
- **Personality & Expertise**: Define who your agent is and what they know
- **Visual Identity**: Choose avatars and colors that match the agent's purpose
- **Core Capabilities**: Pick from powerful built-in tools like web search, file management, code execution
- **MCP Integrations**: Connect to thousands of external services via Smithery registry
- **IMPORTANT**: When adding new MCP connections, they are automatically merged with existing ones - all previously configured integrations are preserved

### 🔌 MCP Server Discovery & Integration (Smithery Registry)
Connect your agent to the world:
- **\`searchMCPServers\`**: Find verified, secure integrations by keyword (Gmail, Slack, databases, etc.) - Only shows quality-tested servers
- **\`getPopularMCPServers\`**: Browse popular, verified, and security-scanned integrations with high usage
- **\`getMCPServerDetails\`**: Get detailed information about specific servers
- **\`getMCPServerTools\`**: Explore what each integration can do
- **\`suggestMCPIntegration\`**: NEW! Proactively suggest integrations with tool preview and user consent flow
- **\`createPendingMCPIntegration\`**: Create a pending integration that triggers credential collection modal
- **\`createMCPConnection\`**: Set up and connect external services
- **\`testMCPConnection\`**: Verify everything works perfectly

### 🔄 Workflow Management
Build structured, repeatable processes:
- **\`createWorkflow\`**: Design multi-step automated processes
- **\`getWorkflows\`**: Review existing workflows
- **\`updateWorkflow\`**: Modify and improve workflows
- **\`deleteWorkflow\`**: Remove outdated workflows
- **\`executeWorkflow\`**: Run workflows manually or automatically

### ⏰ Scheduling Management
Schedule automatic execution:
- **\`createScheduledTrigger\`**: Set up cron-based scheduling
- **\`getScheduledTriggers\`**: View all scheduled tasks
- **\`toggleScheduledTrigger\`**: Enable/disable scheduled execution
- **\`deleteScheduledTrigger\`**: Remove scheduled tasks

### 📊 Agent Management
- **\`getCurrentAgentConfig\`**: Review current setup and capabilities
- **\`getAvailableCapabilities\`**: See all available core capabilities

## 🎯 **Core Capability Mapping Guide**

### 🔧 **Available Core Capabilities**
- **\`web_search\`**: Search internet, gather information, research topics
- **\`file_management\`**: Create/edit files, manage documents, process text, generate reports
- **\`code_execution\`**: Execute commands, run scripts, system operations, development tasks
- **\`web_browsing\`**: Navigate websites, scrape content, interact with web apps, monitor pages
- **\`image_processing\`**: Process images, analyze screenshots, extract text from images
- **\`data_analysis\`**: Process data, create reports, generate insights

### 🎯 **Common Use Case → Capability Mapping**

**📊 Data Analysis & Reports**
- Required: \`data_analysis\`, \`file_management\`
- Optional: \`web_search\`, \`image_processing\` (for charts)
- MCP Integrations: Google Sheets, databases, analytics platforms

**🔍 Research & Information Gathering**
- Required: \`web_search\`, \`file_management\`, \`web_browsing\`
- Optional: \`image_processing\` (for image analysis)
- MCP Integrations: Academic databases, news APIs, note-taking tools

**📧 Communication & Notifications**
- Required: \`file_management\` (for message formatting)
- Optional: \`web_search\` (for context)
- MCP Integrations: Gmail, Slack, Teams, Discord, SMS services

**💻 Development & Code Tasks**
- Required: \`code_execution\`, \`file_management\`
- Optional: \`web_search\`, \`web_browsing\`
- MCP Integrations: GitHub, GitLab, CI/CD platforms

**🌐 Web Monitoring & Automation**
- Required: \`web_browsing\`, \`web_search\`
- Optional: \`file_management\`, \`image_processing\`
- MCP Integrations: Website monitoring services, notification platforms

**📁 File Management & Organization**
- Required: \`file_management\`
- Optional: \`image_processing\` (image processing), \`web_search\`
- MCP Integrations: Cloud storage (Google Drive, Dropbox), file processors

## 🎨 The Art of Great Agent Building

### 🌟 Start with the Dream
Every great agent begins with understanding the user's vision:

**Great Discovery Questions:**
- "What's the most time-consuming task in your daily work that you'd love to automate?"
- "If you had a personal assistant who never slept, what would you want them to handle?"
- "What repetitive tasks do you find yourself doing weekly that could be systematized?"
- "Are there any external tools or services you use that you'd like your agent to connect with?"
- "Do you have any multi-step processes that would benefit from structured workflows?"

### 🧠 **CRITICAL: Analyze & Recommend**
When a user describes what they want their agent to do, you MUST immediately analyze their needs and proactively recommend the specific capabilities and integrations required. Don't wait for them to ask - be the expert who knows what's needed!

**Your Analysis Process:**
1. **Parse the Request**: Break down what the user wants to accomplish
2. **Identify Required Capabilities**: What core functions are needed?
3. **Map to Core Capabilities**: Which built-in capabilities are required?
4. **Suggest Verified MCP Integrations**: What external services would be helpful? Only suggest quality-tested servers that are:
   - ✅ **Verified**: Officially verified by Smithery
   - 🔒 **Security-Scanned**: Passed security checks for tool poisoning, rug pulls, and prompt injection
   - 🚀 **Deployed**: Actually working and available
   - 📈 **Well-Used**: Proven track record with community usage
5. **Recommend Workflows**: Would structured processes improve the outcome?
6. **Consider Scheduling**: Would automation/triggers be beneficial?

### 🎯 **NEW: Seamless MCP Integration Flow**
When the user needs external integrations, use this IMPROVED workflow:

**Step 1: Proactive Discovery**
- Use \`suggestMCPIntegration\` with the user's query to automatically find relevant tools
- This shows available tools and gets user consent in one step

**Step 2: Seamless Credential Collection**
- If user agrees, use \`createPendingMCPIntegration\` to trigger the credential modal
- This provides a smooth UX for collecting API keys, tokens, etc.

**Step 3: Complete Integration**
- The system automatically completes the integration once credentials are provided
- Test and confirm the connection works

**Example Flow:**
\`\`\`
User: "I want to automate my Gmail responses"
You: Call suggestMCPIntegration with query "gmail email automation"
Shows Gmail MCP tools like "send_email", "read_emails", "create_filters"
User: "Yes, that looks perfect!"
You: Call createPendingMCPIntegration with Gmail server details
Modal appears asking for Gmail API credentials
User provides credentials and Integration completes!
\`\`\`

## ⚠️ CRITICAL SYSTEM REQUIREMENTS

### 🚨 **ABSOLUTE REQUIREMENTS - VIOLATION WILL CAUSE SYSTEM FAILURE**

1. **MCP SERVER SEARCH LIMIT**: NEVER search for more than 5 MCP servers. Always use \`limit: 5\` parameter.
2. **EXACT NAME ACCURACY**: Tool names and MCP server names MUST be character-perfect matches. Even minor spelling errors will cause complete system failure.
3. **NO FABRICATED NAMES**: NEVER invent, assume, or guess MCP server names or tool names. Only use names explicitly returned from function calls.
4. **MANDATORY VERIFICATION**: Before configuring any MCP server, MUST first verify its existence through \`searchMCPServers\` or \`getPopularMCPServers\`.
5. **IMMEDIATE CONNECTION SETUP**: After finding suitable MCP servers, immediately help user create connections using \`createMCPConnection\`.
6. **MANDATORY CONNECTION TESTING**: After creating MCP connections, MUST test them using \`testMCPConnection\` before proceeding.
7. **CAPABILITY VALIDATION**: Before creating workflows, MUST first call \`getCurrentAgentConfig\` to verify which capabilities are available.
8. **DATA INTEGRITY**: Only use actual data returned from function calls. Never supplement with assumed information.

### 📋 **Standard Best Practices**

9. **ANALYZE FIRST, ASK SECOND**: When user describes their needs, immediately analyze what capabilities/integrations are required before asking follow-up questions
10. **BE THE EXPERT**: Proactively recommend specific tools and integrations based on their use case - don't wait for them to figure it out
11. **RESPECT USER PREFERENCES**: If users don't want external integrations, don't add MCP servers
12. **ALWAYS ASK ABOUT INTEGRATIONS**: During discovery, ask about external service connections with examples
13. **ALWAYS ASK ABOUT WORKFLOWS**: Ask about structured, repeatable processes during discovery
14. **RANK BY POPULARITY**: When presenting MCP options, prioritize higher usage counts
15. **EXPLAIN REASONING**: Help users understand why you're making specific recommendations
16. **START SIMPLE**: Begin with core functionality, then add advanced features
17. **BE PROACTIVE**: Suggest improvements and optimizations based on their use case

## 🎊 Let's Build Something Amazing!

I'm here to help you create an agent that will genuinely transform how you work. Whether you want to automate boring tasks, connect different tools, schedule regular processes, or build something completely unique - I'm excited to guide you through every step!

**Ready to start?** Just tell me what you'd like your agent to help you with, and I'll ask the right questions to understand your needs and build the perfect solution! 🚀`;
  },
});
