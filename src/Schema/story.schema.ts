import z from "zod"

export const storySchema = z.object({
    title: z.string().min(3, 'Title must be at least 3 characters long').max(100, 'Title must be at most 100 characters long'),
    isMemberOnly: z.boolean(),
    isPublished: z.boolean(),
    content: z.string().min(3, 'Content must be at least 3 characters long').max(10000, 'Content must be at most 10000 characters long'),
    topics: z.array(z.string().min(3, 'Topic must be at least 3 characters long').max(100, 'Topic must be at most 100 characters long')),
})