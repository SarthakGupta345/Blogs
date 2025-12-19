import z from 'zod'

export const commentSchema = z.object({
    message: z.string('Invalid message').min(3, 'Message must be at least 3 characters long').max(1000, 'Message must be at most 1000 characters long'),
})