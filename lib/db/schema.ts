import { pgTable, text, timestamp, uuid, jsonb, integer, boolean } from 'drizzle-orm/pg-core';
import type { InferSelectModel } from 'drizzle-orm';

// Simplified chat schema - much cleaner than the current 25+ tables
export const chats = pgTable('chats', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: text('title').notNull(),
  userId: text('user_id').notNull(),
  metadata: jsonb('metadata').$type<{
    agenticSteps?: number;
    toolsUsed?: string[];
    completedAt?: string;
    totalTokens?: number;
  }>(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const messages = pgTable('messages', {
  id: uuid('id').defaultRandom().primaryKey(),
  chatId: uuid('chat_id').references(() => chats.id, { onDelete: 'cascade' }).notNull(),
  role: text('role').$type<'user' | 'assistant' | 'system'>().notNull(),
  content: jsonb('content').notNull(), // Store full UIMessage content
  agentSteps: integer('agent_steps'), // Track how many agentic steps this message took
  toolsUsed: text('tools_used').array(), // Track which tools were used
  metadata: jsonb('metadata').$type<{
    confidence?: number;
    sources?: string[];
    processingTime?: number;
  }>(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// User preferences - simplified
export const userPreferences = pgTable('user_preferences', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').notNull().unique(),
  theme: text('theme').$type<'light' | 'dark' | 'system'>().default('system'),
  defaultModel: text('default_model').default('openai/gpt-5'),
  agenticMode: boolean('agentic_mode').default(true), // Enable agentic loops
  maxSteps: integer('max_steps').default(10), // Max agentic steps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Type exports
export type Chat = InferSelectModel<typeof chats>;
export type Message = InferSelectModel<typeof messages>;
export type UserPreferences = InferSelectModel<typeof userPreferences>;
