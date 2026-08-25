import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const postSchema = z.object({
  title: z.string(),
  date: z.coerce.date(),
  description: z.string().optional().default(''),
  thumbnail: z.string().optional(),
  draft: z.boolean().optional().default(false),
});

const postsKo = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/ko/posts' }),
  schema: postSchema,
});

const postsEn = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/en/posts' }),
  schema: postSchema,
});

export const collections = { postsKo, postsEn };
