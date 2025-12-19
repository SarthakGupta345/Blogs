import z from "zod"

export const emailSchema = z.object({
    email: z.string().email('Please enter a valid email address'),
})


export const verifyOTPSchema = z.object({
    email: z.string().email(),
    otp: z.string().length(6),
});


const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])(?=.{8,})/

export const SignupSchema = z.object({
    email: z.string().email('Please enter a valid email address'),
    Name: z.string().min(3, 'Name must be at least 3 characters long').max(50, 'Name must be at most 50 characters long'),
    Experience: z.number().min(0, 'Experience must be at least 0').max(100, 'Experience must be at most 100'),
    Field: z.string().min(3, 'Field must be at least 3 characters long').max(100, 'Field must be at most 100 characters long'),
    Age: z.number().min(0, 'Age must be at least 0').max(100, 'Age must be at most 100'),
    About: z.string().min(4, 'About must be at least 4 characters long').max(1000, 'About must be at most 1000 characters long'),
    Interest: z.array(z.string().min(3, 'Interest must be at least 3 characters long').max(100, 'Interest must be at most 100 characters long')),
    Password: z.string().regex(passwordRegex, 'Password must contain at least one lowercase letter, one uppercase letter, one digit, one special character, and be at least 8 characters long'),
})


export const idSchema = z.object({
    Id: z.string('Invalid Story ID').cuid('Invalid Story ID'),
})