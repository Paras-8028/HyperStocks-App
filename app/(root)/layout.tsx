import Header from "@/components/Header";
import { auth } from "@/lib/better-auth/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { PersonalizationProvider } from "@/context/PersonalizationContext";
import { OnboardingModal } from "@/features/onboarding";
import { getPersonalizationService } from "@/services/personalization";

const Layout = async ({ children }: { children: React.ReactNode }) => {
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session?.user) redirect('/sign-in');

    const user = {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
    };

    let initialPreferences = undefined;
    try {
        const prefRes = await getPersonalizationService().getUserProfile(session.user.email);
        if (prefRes.success) {
            initialPreferences = prefRes.data;
        }
    } catch {}

    return (
        <PersonalizationProvider initialPreferences={initialPreferences}>
            <main className="min-h-screen text-gray-400">
                <Header user={user} />

                <div className="container py-10">
                    {children}
                </div>

                {/* Interactive Onboarding and Preference Tuning Wizard */}
                <OnboardingModal />
            </main>
        </PersonalizationProvider>
    );
};

export default Layout;
