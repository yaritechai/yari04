import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required');
}

// Create the connection
const client = postgres(process.env.DATABASE_URL);
export const db = drizzle(client, { schema });

// Helper functions for chat operations
export async function saveChat(params: {
  chatId?: string;
  messages: any[];
  userId: string;
  metadata?: any;
}) {
  const { chatId, messages, userId, metadata } = params;
  
  if (chatId) {
    // Update existing chat
    await db.update(schema.chats)
      .set({ 
        updatedAt: new Date(),
        metadata: metadata || undefined,
      })
      .where(eq(schema.chats.id, chatId));
  } else {
    // Create new chat
    const title = extractTitleFromMessage(messages[0]?.content || 'New Chat');
    const newChat = await db.insert(schema.chats)
      .values({
        title,
        userId,
        metadata,
      })
      .returning();
    
    return newChat[0].id;
  }
}

export async function getChatMessages(chatId: string) {
  const messages = await db.select()
    .from(schema.messages)
    .where(eq(schema.messages.chatId, chatId))
    .orderBy(schema.messages.createdAt);
  
  return messages.map(msg => ({
    role: msg.role,
    content: msg.content,
    id: msg.id,
  }));
}

export async function getUserChats(userId: string) {
  return await db.select()
    .from(schema.chats)
    .where(eq(schema.chats.userId, userId))
    .orderBy(desc(schema.chats.updatedAt));
}

export async function getUserPreferences(userId: string) {
  const prefs = await db.select()
    .from(schema.userPreferences)
    .where(eq(schema.userPreferences.userId, userId))
    .limit(1);
  
  return prefs[0] || null;
}

// Helper to extract title from first message
function extractTitleFromMessage(content: string): string {
  if (typeof content === 'string') {
    return content.slice(0, 50) + (content.length > 50 ? '...' : '');
  }
  return 'New Chat';
}

// Import eq and desc
import { eq, desc } from 'drizzle-orm';
