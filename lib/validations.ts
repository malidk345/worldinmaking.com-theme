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
