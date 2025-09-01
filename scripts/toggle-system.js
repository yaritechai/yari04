#!/usr/bin/env node

/**
 * Toggle between streaming systems
 * Usage: node scripts/toggle-system.js [agentic|simple|original]
 */

import fs from 'fs';
import path from 'path';

const mode = process.argv[2];

if (!mode) {
  console.log('🔄 System Toggle Options:');
  console.log('');
  console.log('node scripts/toggle-system.js agentic    # Use new agentic system (AI SDK 5 + tools)');
  console.log('node scripts/toggle-system.js simple     # Use simplified streaming (fast, no tools)');
  console.log('node scripts/toggle-system.js original   # Use original complex system (backup)');
  console.log('');
  process.exit(1);
}

const messagesPath = 'convex/messages.ts';

console.log(`🔄 Switching to ${mode} system...\n`);

try {
  const messagesContent = fs.readFileSync(messagesPath, 'utf8');

  if (mode === 'agentic') {
    // Switch to agentic system
    const updated = messagesContent.replace(
      /internal\.streaming\.generateStreamingResponse/g,
      'internal.agenticStreaming.generateAgenticResponse'
    );
    fs.writeFileSync(messagesPath, updated);
    console.log('✅ Switched to AGENTIC system');
    console.log('   - Uses AI SDK 5 with intelligent tool calling');
    console.log('   - Web search, image generation, data analysis');
    console.log('   - Multi-step reasoning and planning');
    console.log('   - ~200 lines vs 1,886 lines (90% simpler)');
    
  } else if (mode === 'simple') {
    // Switch to simple streaming
    const updated = messagesContent.replace(
      /internal\.agenticStreaming\.generateAgenticResponse/g,
      'internal.streaming.generateStreamingResponse'
    );
    fs.writeFileSync(messagesPath, updated);
    console.log('✅ Switched to SIMPLE streaming system');
    console.log('   - Fast, lightweight responses');
    console.log('   - No tool calling or complex features');
    console.log('   - ~150 lines (92% simpler than original)');
    
  } else if (mode === 'original') {
    // Restore original system
    if (fs.existsSync('convex/streaming-backup-original.ts')) {
      fs.copyFileSync('convex/streaming-backup-original.ts', 'convex/streaming.ts');
      const updated = messagesContent.replace(
        /internal\.agenticStreaming\.generateAgenticResponse/g,
        'internal.streaming.generateStreamingResponse'
      );
      fs.writeFileSync(messagesPath, updated);
      console.log('✅ Switched to ORIGINAL system');
      console.log('   - Full feature set (complex tool orchestration)');
      console.log('   - 1,886 lines of code');
      console.log('   - Slower but has all legacy features');
    } else {
      console.log('❌ Original backup not found. Cannot restore.');
      process.exit(1);
    }
    
  } else {
    console.log('❌ Invalid mode. Use: agentic, simple, or original');
    process.exit(1);
  }

  console.log('\n📋 Next steps:');
  console.log('1. npm run build  # Test the build');
  console.log('2. npm run dev    # Start development server');
  console.log('3. Test the chat system');
  console.log('');
  
} catch (error) {
  console.error('❌ Error switching systems:', error.message);
  process.exit(1);
}
