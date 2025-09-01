// Script to verify Groq integration
const { execSync } = require('child_process');

console.log('🔍 Verifying Groq API integration...');

// Check if GROQ_API_KEY is set
try {
  const envCheckOutput = execSync('npx convex env get GROQ_API_KEY').toString();
  if (envCheckOutput.includes('not found') || envCheckOutput.includes('not set')) {
    console.error('❌ GROQ_API_KEY is not set in the Convex environment');
    console.log('Please set it with: npx convex env set GROQ_API_KEY=your_api_key_here');
    process.exit(1);
  } else {
    console.log('✅ GROQ_API_KEY is set in the Convex environment');
  }
} catch (error) {
  console.error('❌ Error checking GROQ_API_KEY:', error.message);
  process.exit(1);
}

// Check model router configuration
try {
  const modelRouterContent = require('fs').readFileSync('./convex/modelRouter.ts', 'utf8');
  if (
    modelRouterContent.includes('GENERAL_THINKING: "groq/') &&
    modelRouterContent.includes('RESEARCH: "groq/')
  ) {
    console.log('✅ Model router is configured to use Groq models');
  } else {
    console.error('❌ Model router is not properly configured for Groq');
    process.exit(1);
  }
} catch (error) {
  console.error('❌ Error checking model router configuration:', error.message);
  process.exit(1);
}

// Check streaming implementation
try {
  const streamingContent = require('fs').readFileSync('./convex/streaming.ts', 'utf8');
  if (
    streamingContent.includes('shouldUseGroq(') &&
    streamingContent.includes('streamGroqCompletion(')
  ) {
    console.log('✅ Streaming implementation is configured for Groq');
  } else {
    console.error('❌ Streaming implementation is not properly configured for Groq');
    process.exit(1);
  }
} catch (error) {
  console.error('❌ Error checking streaming implementation:', error.message);
  process.exit(1);
}

// Check system prompt for tools
try {
  const streamingContent = require('fs').readFileSync('./convex/streaming.ts', 'utf8');
  const toolsAvailable = [
    'generate_image',
    'edit_image',
    'generate_csv',
    'generate_table',
    'plan_task',
    'gather_research',
    'complete_task'
  ];
  
  let allToolsFound = true;
  const missingTools = [];
  
  for (const tool of toolsAvailable) {
    if (!streamingContent.includes(tool)) {
      allToolsFound = false;
      missingTools.push(tool);
    }
  }
  
  if (allToolsFound) {
    console.log('✅ System prompt includes all required tools');
  } else {
    console.error(`❌ System prompt is missing tools: ${missingTools.join(', ')}`);
    process.exit(1);
  }
} catch (error) {
  console.error('❌ Error checking system prompt for tools:', error.message);
  process.exit(1);
}

console.log('✅ Groq integration verification complete');
console.log('');
console.log('To test the integration with a real API call, run:');
console.log('npx convex run groqToolsTest:testGroqWithTools');
console.log('');
