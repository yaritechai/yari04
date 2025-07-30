import { v } from "convex/values";
import { action, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import OpenAI from "openai";
import { getModelForTask, getModelParameters } from "./modelRouter";

// Using OpenRouter with OpenAI SDK compatibility
const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
  defaultHeaders: {
    "HTTP-Referer": process.env.CONVEX_SITE_URL || "http://localhost:3000",
    "X-Title": "Yari AI Assistant",
  },
});

// Tool definitions for function calling
const tools = [
  {
    type: "function" as const,
    function: {
      name: "generate_landing_page",
      description: "Generate a complete HTML landing page with inline CSS and no external dependencies",
      parameters: {
        type: "object",
        properties: {
          title: {
            type: "string",
            description: "The title of the landing page"
          },
          description: {
            type: "string", 
            description: "Brief description of what the landing page is for"
          },
          content_sections: {
            type: "array",
            items: {
              type: "object",
              properties: {
                heading: { type: "string" },
                content: { type: "string" }
              }
            },
            description: "Array of content sections with headings and content"
          },
          call_to_action: {
            type: "string",
            description: "The main call to action text"
          },
          color_scheme: {
            type: "string",
            enum: ["modern", "dark", "light", "colorful", "minimal"],
            description: "The color scheme for the landing page"
          }
        },
        required: ["title", "description", "content_sections", "call_to_action"]
      }
    }
  }
];

export const generateReport = action({
  args: {
    prompt: v.string(),
    reportType: v.optional(v.string()),
    conversationId: v.optional(v.id("conversations")),
  },
  handler: async (ctx, args) => {
    // Get current date and time for system prompt
    const currentDateTime = new Date().toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short'
    });

    const systemPrompt = `📅 **CURRENT DATE & TIME**: ${currentDateTime}

You are an expert report writer. Generate a comprehensive, well-structured report based on the user's request. 

Format the report as HTML with proper structure:
- Use <h1> for the main title
- Use <h2> for major sections
- Use <h3> for subsections
- Use <p> for paragraphs
- Use <ul> and <li> for bullet points
- Use <ol> and <li> for numbered lists
- Use <strong> for emphasis
- Use <em> for italics

The report should be professional, detailed, and well-organized. Include:
1. Executive Summary (if appropriate)
2. Main content sections
3. Key findings or recommendations
4. Conclusion

Make sure the HTML is clean and properly formatted for display in a document editor.`;

    try {
      // Use research model for report generation
      const selectedModel = getModelForTask(args.prompt, {
        isReport: true,
        isResearchTask: true,
      });
      const modelParams = getModelParameters(selectedModel);

      const completion = await openai.chat.completions.create({
        model: selectedModel,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: args.prompt }
        ],
        temperature: modelParams.temperature,
        max_tokens: modelParams.max_tokens,
        top_p: modelParams.top_p,
      });

      const reportContent = completion.choices[0]?.message?.content;
      if (!reportContent) {
        throw new Error("No report content generated");
      }

      // Extract title from the first h1 tag or create a default title
      const titleMatch = reportContent.match(/<h1[^>]*>([^<]+)<\/h1>/i);
      const title = titleMatch ? titleMatch[1].trim() : `${args.reportType || 'Report'} - ${new Date().toLocaleDateString()}`;

      return {
        title,
        content: reportContent,
        type: args.reportType || 'report'
      };
    } catch (error) {
      console.error("Error generating report:", error);
      throw new Error("Failed to generate report");
    }
  },
});

export const generateLandingPage = action({
  args: {
    prompt: v.string(),
    conversationId: v.optional(v.id("conversations")),
  },
  handler: async (ctx, args) => {
    // Get current date and time for system prompt
    const currentDateTime = new Date().toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short'
    });

    const systemPrompt = `📅 **CURRENT DATE & TIME**: ${currentDateTime}

You are an expert web designer and developer. When a user requests a landing page, use the generate_landing_page function to create a complete, self-contained HTML page.

Key requirements:
- Generate complete HTML with inline CSS (no external CDNs)
- Use modern, responsive design principles
- Include proper meta tags and structure
- Make it visually appealing and professional
- Ensure all styles are inline or in <style> tags
- No external dependencies whatsoever

Always use the generate_landing_page function when creating landing pages.`;

    try {
      // Use coding/landing page model for web development tasks
      const selectedModel = getModelForTask(args.prompt, {
        isLandingPage: true,
        isCodeGeneration: true,
      });
      const modelParams = getModelParameters(selectedModel);

      const completion = await openai.chat.completions.create({
        model: selectedModel,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: args.prompt }
        ],
        tools: tools,
        tool_choice: "auto",
        temperature: modelParams.temperature,
        max_tokens: modelParams.max_tokens,
        top_p: modelParams.top_p,
      });

      const message = completion.choices[0]?.message;
      
      if (message?.tool_calls && message.tool_calls.length > 0) {
        const toolCall = message.tool_calls[0];
        if (toolCall.function.name === "generate_landing_page") {
          const params = JSON.parse(toolCall.function.arguments);
          
          // Generate the complete HTML
          const html = generateCompleteHTML(params);
          
          return {
            type: "landing_page",
            title: params.title,
            htmlContent: html,
            shouldOpenRightPanel: true // Flag to trigger right panel
          };
        }
      }

      // Fallback if no tool was called
      const content = message?.content || "No landing page generated";
      return {
        type: "text",
        content: content,
        shouldOpenRightPanel: false
      };
    } catch (error) {
      console.error("Error generating landing page:", error);
      throw new Error("Failed to generate landing page");
    }
  },
});

// Helper function to generate complete HTML
function generateCompleteHTML(params: any) {
  const { 
    title = "Landing Page", 
    description = "Welcome to our landing page", 
    content_sections = [], 
    call_to_action = "Get Started", 
    color_scheme = "modern" 
  } = params;
  
  const colorSchemes = {
    modern: {
      primary: "#6366f1", // Indigo
      secondary: "#1f2937", // Gray 800
      background: "#ffffff",
      text: "#374151", // Gray 700
      accent: "#f59e0b", // Amber 500
      surface: "#f8fafc", // Slate 50
      border: "#e2e8f0" // Slate 200
    },
    dark: {
      primary: "#8b5cf6", // Violet 500
      secondary: "#f8fafc", // Slate 50
      background: "#0f172a", // Slate 900
      text: "#e2e8f0", // Slate 200
      accent: "#06b6d4", // Cyan 500
      surface: "#1e293b", // Slate 800
      border: "#334155" // Slate 700
    },
    light: {
      primary: "#0ea5e9", // Sky 500
      secondary: "#475569", // Slate 600
      background: "#f8fafc", // Slate 50
      text: "#334155", // Slate 700
      accent: "#f97316", // Orange 500
      surface: "#ffffff",
      border: "#cbd5e1" // Slate 300
    },
    colorful: {
      primary: "#ec4899", // Pink 500
      secondary: "#1e40af", // Blue 800
      background: "#ffffff",
      text: "#1f2937", // Gray 800
      accent: "#10b981", // Emerald 500
      surface: "#fef3f2", // Rose 50
      border: "#fde2e4" // Rose 200
    },
    minimal: {
      primary: "#18181b", // Zinc 900
      secondary: "#71717a", // Zinc 500
      background: "#ffffff",
      text: "#27272a", // Zinc 800
      accent: "#3b82f6", // Blue 500
      surface: "#fafafa", // Neutral 50
      border: "#e4e4e7" // Zinc 200
    },
    elegant: {
      primary: "#7c3aed", // Violet 600
      secondary: "#1f2937", // Gray 800
      background: "#fefefe",
      text: "#374151", // Gray 700
      accent: "#d946ef", // Fuchsia 500
      surface: "#f9fafb", // Gray 50
      border: "#e5e7eb" // Gray 200
    }
  };

  const colors = colorSchemes[color_scheme as keyof typeof colorSchemes] || colorSchemes.modern;

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        :root {
            --primary: ${colors.primary};
            --secondary: ${colors.secondary};
            --background: ${colors.background};
            --text: ${colors.text};
            --accent: ${colors.accent};
            --surface: ${colors.surface};
            --border: ${colors.border};
        }
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.7;
            color: var(--text);
            background: var(--background);
            scroll-behavior: smooth;
            overflow-x: hidden;
        }
        
        .container {
            max-width: min(1200px, 90vw);
            margin: 0 auto;
            padding: 0 24px;
        }
        
        /* Glassmorphism effect */
        .glass {
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.2);
        }
        
        header {
            background: linear-gradient(135deg, var(--surface) 0%, var(--background) 100%);
            padding: 4rem 0;
            text-align: center;
            position: relative;
            overflow: hidden;
        }
        
        header::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: radial-gradient(circle at 30% 20%, var(--primary)15 0%, transparent 50%),
                        radial-gradient(circle at 70% 80%, var(--accent)15 0%, transparent 50%);
            z-index: -1;
        }
        
        h1 {
            font-size: clamp(2.5rem, 5vw, 4rem);
            font-weight: 800;
            background: linear-gradient(135deg, var(--secondary), var(--primary));
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            margin-bottom: 1.5rem;
            letter-spacing: -0.02em;
            line-height: 1.1;
        }
        
        .subtitle {
            font-size: clamp(1.1rem, 2vw, 1.3rem);
            color: var(--text);
            max-width: 650px;
            margin: 0 auto;
            font-weight: 400;
            opacity: 0.9;
        }
        
        .hero {
            padding: 6rem 0;
            text-align: center;
            position: relative;
            background: linear-gradient(135deg, var(--surface) 0%, var(--background) 100%);
        }
        
        .cta-button {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            background: var(--primary);
            color: white;
            padding: 16px 32px;
            text-decoration: none;
            border-radius: 50px;
            font-weight: 600;
            font-size: 1.1rem;
            margin-top: 2rem;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            border: none;
            box-shadow: 0 4px 14px 0 rgba(0, 0, 0, 0.1);
            position: relative;
            overflow: hidden;
        }
        
        .cta-button::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
            transition: left 0.5s;
        }
        
        .cta-button:hover::before {
            left: 100%;
        }
        
        .cta-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
            filter: brightness(1.1);
        }
        
        .content-section {
            padding: 5rem 0;
            position: relative;
        }
        
        .content-section:nth-child(even) {
            background: var(--surface);
        }
        
        .section-title {
            font-size: clamp(1.8rem, 4vw, 2.5rem);
            font-weight: 700;
            color: var(--secondary);
            margin-bottom: 2rem;
            text-align: center;
            letter-spacing: -0.01em;
        }
        
        .section-content {
            font-size: 1.125rem;
            max-width: 800px;
            margin: 0 auto;
            text-align: center;
            line-height: 1.8;
            opacity: 0.9;
        }
        
        .grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
            gap: 2rem;
            margin-top: 3rem;
        }
        
        .card {
            background: var(--background);
            padding: 2.5rem;
            border-radius: 20px;
            border: 1px solid var(--border);
            transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
            position: relative;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
        }
        
        .card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 4px;
            background: linear-gradient(90deg, var(--primary), var(--accent));
            transform: translateX(-100%);
            transition: transform 0.3s ease;
        }
        
        .card:hover::before {
            transform: translateX(0);
        }
        
        .card:hover {
            transform: translateY(-8px);
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
            border-color: var(--primary);
        }
        
        footer {
            background: var(--secondary);
            color: var(--background);
            text-align: center;
            padding: 3rem 0;
            margin-top: 4rem;
            position: relative;
        }
        
        footer::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 1px;
            background: linear-gradient(90deg, transparent, var(--primary), transparent);
        }
        
        /* Animations */
        @keyframes fadeInUp {
            from {
                opacity: 0;
                transform: translateY(30px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
        
        .animate-in {
            animation: fadeInUp 0.6s ease-out forwards;
        }
        
        /* Responsive Design */
        @media (max-width: 768px) {
            .container {
                padding: 0 16px;
            }
            
            .hero, .content-section {
                padding: 3rem 0;
            }
            
            .card {
                padding: 2rem;
            }
            
            .grid {
                grid-template-columns: 1fr;
                gap: 1.5rem;
            }
        }
        
        @media (max-width: 480px) {
            .cta-button {
                padding: 14px 24px;
                font-size: 1rem;
            }
        }
    </style>
</head>
<body>
    <header>
        <div class="container">
            <h1>${title}</h1>
            <p class="subtitle">${description}</p>
        </div>
    </header>
    
    <section class="hero">
        <div class="container">
            <a href="#" class="cta-button">${call_to_action}</a>
        </div>
    </section>
    
    <main>
        <div class="container">
            ${Array.isArray(content_sections) ? content_sections.map((section: any) => `
                <section class="content-section">
                    <h2 class="section-title">${section?.heading || 'Section Title'}</h2>
                    <div class="section-content">
                        ${section?.content || 'Section content goes here.'}
                    </div>
                </section>
            `).join('') : '<section class="content-section"><h2 class="section-title">Welcome</h2><div class="section-content">Content will be added here.</div></section>'}
        </div>
    </main>
    
    <footer>
        <div class="container">
            <p>&copy; 2024 ${title}. Built with Yari AI.</p>
        </div>
    </footer>
</body>
</html>`;
}

export const detectReportRequest = action({
  args: {
    message: v.string(),
  },
  handler: async (ctx, args) => {
    const reportKeywords = [
      'generate report',
      'create report',
      'write report',
      'make report',
      'prepare report',
      'draft report',
      'compile report',
      'produce report',
      'generate a report',
      'create a report',
      'write a report',
      'make a report'
    ];

    const landingPageKeywords = [
      'landing page',
      'create landing page',
      'generate landing page',
      'build landing page',
      'make landing page',
      'design landing page',
      'create webpage',
      'generate webpage',
      'build webpage',
      'create website',
      'generate website'
    ];

    const message = args.message.toLowerCase();
    const isReportRequest = reportKeywords.some(keyword => message.includes(keyword));
    const isLandingPageRequest = landingPageKeywords.some(keyword => message.includes(keyword));

    if (isLandingPageRequest) {
      return {
        isLandingPageRequest: true,
        isReportRequest: false,
        requestType: 'landing_page',
        extractedPrompt: args.message
      };
    }

    if (isReportRequest) {
      // Extract report type if mentioned
      const reportTypes = ['financial', 'marketing', 'sales', 'technical', 'research', 'analysis', 'summary', 'business', 'project', 'status', 'progress', 'quarterly', 'monthly', 'weekly', 'annual'];
      const mentionedType = reportTypes.find(type => message.includes(type));

      return {
        isReportRequest: true,
        isLandingPageRequest: false,
        requestType: 'report',
        reportType: mentionedType || 'general',
        extractedPrompt: args.message
      };
    }

    return {
      isReportRequest: false,
      isLandingPageRequest: false,
      requestType: null,
      reportType: null,
      extractedPrompt: null
    };
  },
});
