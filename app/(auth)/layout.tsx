import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

export default async function AuthRootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { userId } = await auth();

    // Already authenticated users visiting /sign-in or /sign-up are redirected to the dashboard
    if (userId) {
        redirect('/dashboard');
    }

    return (
        <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col justify-center">
            {children}
        </div>
    );
}
