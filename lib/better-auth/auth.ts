import { betterAuth } from "better-auth";
import { mongodbAdapter} from "better-auth/adapters/mongodb";
import { connectToDatabase} from "@/database/mongoose";
import { nextCookies} from "better-auth/next-js";

let authInstance: ReturnType<typeof betterAuth> | null = null;

export const getAuth = async () => {
    if (authInstance) return authInstance;

    try {
        const mongoose = await connectToDatabase();
        const db = mongoose.connection.db;

        if (!db) throw new Error('MongoDB connection not found');

        authInstance = betterAuth({
            database: mongodbAdapter(db as any),
            secret: process.env.BETTER_AUTH_SECRET,
            baseURL: process.env.BETTER_AUTH_URL,
            emailAndPassword: {
                enabled: true,
                disableSignUp: false,
                requireEmailVerification: false,
                minPasswordLength: 8,
                maxPasswordLength: 128,
                autoSignIn: true,
            },
            plugins: [nextCookies()],
        });

        return authInstance;
    } catch (e: any) {
        console.warn('Warning: DB not connected during auth init, providing fallback:', e?.message || e);
        return {
            api: {
                getSession: async () => null,
            },
            handler: () => new Response('Auth temporarily offline', { status: 503 }),
        } as unknown as ReturnType<typeof betterAuth>;
    }
};

export const auth = await getAuth();
