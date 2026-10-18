import { SignIn } from '@clerk/nextjs';
import { AuthLayout, clerkAuthAppearance } from '@/components/auth';

export const metadata = {
    title: 'Sign In | HyperStocks Financial Intelligence',
    description: 'Sign in to access your AI stock analysis, personalized portfolios, and live market intelligence.',
};

export default function SignInPage() {
    return (
        <AuthLayout mode="sign-in">
            <SignIn
                path="/sign-in"
                routing="path"
                fallbackRedirectUrl="/dashboard"
                appearance={clerkAuthAppearance}
            />
        </AuthLayout>
    );
}
