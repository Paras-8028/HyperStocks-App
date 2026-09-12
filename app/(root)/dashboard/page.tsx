import DashboardPage from '@/app/(root)/page';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

export const metadata = {
    title: 'Dashboard | HyperStocks AI Financial Intelligence',
    description: 'Live personalized stock intelligence dashboard, portfolio analytics, and AI risk radar.',
};

export default async function AuthenticatedDashboardPage() {
    const { userId } = await auth();

    if (!userId) {
        redirect('/sign-in');
    }

    return <DashboardPage />;
}
