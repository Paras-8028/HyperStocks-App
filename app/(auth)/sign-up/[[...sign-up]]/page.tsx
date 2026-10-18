import { SignUp } from '@clerk/nextjs';
import { AuthLayout, clerkAuthAppearance } from '@/components/auth';

export const metadata = {
    title: 'Sign Up | HyperStocks Financial Intelligence',
    description: 'Create your HyperStocks account to get started with personalized AI stock insights and real-time market signals.',
};

export default function SignUpPage() {
    return (
        <AuthLayout mode="sign-up">
            <SignUp
                path="/sign-up"
                routing="path"
                fallbackRedirectUrl="/dashboard"
                appearance={clerkAuthAppearance}
            />
        </AuthLayout>
    );
}
