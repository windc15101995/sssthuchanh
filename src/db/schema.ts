import { pgTable, serial, text, timestamp, jsonb } from 'drizzle-orm/pg-core';

// Users table (Firebase Auth UID mapping)
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email'),
  displayName: text('display_name'),
  photoUrl: text('photo_url'),
  createdAt: timestamp('created_at').defaultNow(),
});

// App configuration (template styles, supporters, logos)
export const appConfigs = pgTable('app_configs', {
  id: serial('id').primaryKey(),
  configKey: text('config_key').notNull().unique(),
  data: jsonb('data').notNull(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Form entries / submissions
export const formEntries = pgTable('form_entries', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull(),
  writer: text('writer').notNull(),
  entryDate: text('entry_date').notNull(),
  data: jsonb('data').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Chat messages
export const chatMessages = pgTable('chat_messages', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull(),
  role: text('role').notNull(),
  content: text('content').notNull(),
  imageUrl: text('image_url'),
  createdAt: timestamp('created_at').defaultNow(),
});
