import { v } from "convex/values";
import { action, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import OpenAI from "openai";

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
    const systemPrompt = `You are an expert report writer. Generate a comprehensive, well-structured report based on the user's request. 

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
      const completion = await openai.chat.completions.create({
        model: "openai/gpt-4o", // Updated to GPT-4o for better capabilities
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: args.prompt }
        ],
        temperature: 0.7,
        max_tokens: 4000,
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
    const systemPrompt = `You are an expert web designer and developer. When a user requests a landing page, use the generate_landing_page function to create a complete, self-contained HTML page.

Key requirements:
- Generate complete HTML with inline CSS (no external CDNs)
- Use modern, responsive design principles
- Include proper meta tags and structure
- Make it visually appealing and professional
- Ensure all styles are inline or in <style> tags
- No external dependencies whatsoever

Always use the generate_landing_page function when creating landing pages.`;

    try {
      const completion = await openai.chat.completions.create({
        model: "openai/gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: args.prompt }
        ],
        tools: tools,
        tool_choice: "auto",
        temperature: 0.7,
        max_tokens: 4000,
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
  const { title, description, content_sections, call_to_action, color_scheme = "modern" } = params;
  
  const colorSchemes = {
    modern: {
      primary: "#f9c313",
      secondary: "#1f2937",
      background: "#ffffff",
      text: "#374151",
      accent: "#eab308"
    },
    dark: {
      primary: "#f9c313",
      secondary: "#ffffff", 
      background: "#111827",
      text: "#f3f4f6",
      accent: "#eab308"
    },
    light: {
      primary: "#f9c313",
      secondary: "#6b7280",
      background: "#f9fafb",
      text: "#374151", 
      accent: "#eab308"
    },
    colorful: {
      primary: "#f9c313",
      secondary: "#3b82f6",
      background: "#ffffff",
      text: "#1f2937",
      accent: "#ef4444"
    },
    minimal: {
      primary: "#000000",
      secondary: "#6b7280",
      background: "#ffffff", 
      text: "#374151",
      accent: "#f9c313"
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
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: ${colors.text};
            background-color: ${colors.background};
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 0 20px;
        }
        
        header {
            background: ${colors.background};
            padding: 2rem 0;
            text-align: center;
            border-bottom: 1px solid ${colors.secondary}20;
        }
        
        h1 {
            font-size: 3rem;
            font-weight: 800;
            color: ${colors.secondary};
            margin-bottom: 1rem;
        }
        
        .subtitle {
            font-size: 1.25rem;
            color: ${colors.text};
            max-width: 600px;
            margin: 0 auto;
        }
        
        .hero {
            padding: 4rem 0;
            text-align: center;
            background: linear-gradient(135deg, ${colors.primary}10, ${colors.accent}10);
        }
        
        .cta-button {
            display: inline-block;
            background: ${colors.primary};
            color: ${colors.secondary};
            padding: 1rem 2rem;
            text-decoration: none;
            border-radius: 12px;
            font-weight: 600;
            font-size: 1.1rem;
            margin-top: 2rem;
            transition: all 0.3s ease;
            border: 2px solid ${colors.primary};
        }
        
        .cta-button:hover {
            background: ${colors.accent};
            transform: translateY(-2px);
            box-shadow: 0 8px 25px ${colors.primary}30;
        }
        
        .content-section {
            padding: 3rem 0;
            border-bottom: 1px solid ${colors.secondary}10;
        }
        
        .content-section:last-child {
            border-bottom: none;
        }
        
        .section-title {
            font-size: 2rem;
            font-weight: 700;
            color: ${colors.secondary};
            margin-bottom: 1.5rem;
            text-align: center;
        }
        
        .section-content {
            font-size: 1.1rem;
            max-width: 800px;
            margin: 0 auto;
            text-align: center;
        }
        
        .grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 2rem;
            margin-top: 3rem;
        }
        
        .card {
            background: ${colors.background};
            padding: 2rem;
            border-radius: 16px;
            border: 2px solid ${colors.secondary}10;
            transition: all 0.3s ease;
        }
        
        .card:hover {
            transform: translateY(-4px);
            box-shadow: 0 12px 30px ${colors.secondary}15;
            border-color: ${colors.primary};
        }
        
        footer {
            background: ${colors.secondary};
            color: ${colors.background};
            text-align: center;
            padding: 2rem 0;
            margin-top: 4rem;
        }
        
        @media (max-width: 768px) {
            h1 {
                font-size: 2rem;
            }
            
            .container {
                padding: 0 15px;
            }
            
            .hero {
                padding: 2rem 0;
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
            ${content_sections.map((section: any) => `
                <section class="content-section">
                    <h2 class="section-title">${section.heading}</h2>
                    <div class="section-content">
                        ${section.content}
                    </div>
                </section>
            `).join('')}
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
