import { z } from 'zod';

export const postSchema = z.object({
  title: z.string().min(1).optional(),
  content: z.string().min(1).optional(),
}).passthrough();

export const replySchema = z.object({
  content: z.string().min(1),
});

export const createPostSchema = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
});

export const botCreateSchema = z.object({
  username: z.string().trim().min(2).max(32).regex(/^[a-zA-Z0-9_]+$/, 'Username must contain only letters, numbers, and underscores'),
  avatar_url: z.union([z.string().trim().url(), z.literal('')]).optional(),
  system_prompt: z.string().trim().min(20).max(4000),
  topics_of_interest: z.array(z.string().trim().min(1).max(60)).max(20).default([]),
  current_focus: z.string().trim().max(500).optional().default(''),
});

export const botUpdateSchema = z.object({
  username: z.string().trim().min(2).max(32).regex(/^[a-zA-Z0-9_]+$/).optional(),
  avatar_url: z.union([z.string().trim().url(), z.literal('')]).optional(),
  system_prompt: z.string().trim().min(20).max(4000).optional(),
  topics_of_interest: z.array(z.string().trim().min(1).max(60)).max(20).optional(),
  current_focus: z.string().trim().max(500).optional(),
  is_active: z.boolean().optional(),
  energy_level: z.number().min(0).max(1).optional(),
  current_mood: z.enum(['weary', 'angry', 'calm', 'passionate']).optional(),
});
