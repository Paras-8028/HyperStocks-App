import Header from "@/components/Header";
import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { PersonalizationProvider } from "@/context/PersonalizationContext";
import { OnboardingModal } from "@/features/onboarding";
import { getPersonalizationService } from "@/services/personalization";

const Layout = async ({ children }: { children: React.ReactNode }) => {
    const { userId } = await auth();

    let user: any = undefined;
    let initialPreferences = undefined;

    if (userId) {
        const clerkUser = await currentUser();
        user = {
            id: userId,
            name: clerkUser?.fullName || clerkUser?.firstName || 'Investor',
            email: clerkUser?.primaryEmailAddress?.emailAddress || '',
        };

        try {
            const prefRes = await getPersonalizationService().getUserProfile(userId);
            if (prefRes.success) {
                initialPreferences = prefRes.data;
            }
        } catch {}
    }

    return (
        <PersonalizationProvider initialPreferences={initialPreferences}>
            <main className="min-h-screen text-gray-400">
                <Header user={user} />

                <div className="container py-10">
                    {children}
                </div>

                {/* Institutional Financial Disclaimer & Footer */}
                <footer className="border-t border-gray-800/80 bg-gray-950/60 py-8 mt-16 text-xs text-gray-500">
                    <div className="container flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="space-y-1.5 max-w-3xl">
                            <div className="flex items-center gap-2 text-gray-400 font-semibold text-xs">
                                <span className="flex h-2 w-2 rounded-full bg-emerald-400"></span>
                                HyperStocks AI Financial Intelligence Platform
                            </div>
                            <p className="text-[11px] leading-relaxed text-gray-500">
                                <strong>Regulatory Disclaimer:</strong> HyperStocks provides algorithmic data aggregation, probabilistic market summaries, and portfolio analysis for informational, research, and educational purposes only. HyperStocks does not provide personalized investment advice, broker-dealer services, or financial recommendations. Deterministic financial calculations (P&amp;L, allocations, beta, and concentration) are computed programmatically from third-party market data feeds. AI interpretations are probabilistic synthesis models. Always perform your own independent due diligence before executing financial transactions.
                            </p>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0 text-[11px] text-gray-500">
                            <div>&copy; {new Date().getFullYear()} HyperStocks Intelligence Systems.</div>
                            <div className="text-[10px] text-gray-600">All rights reserved. Powered by Google Gemini.</div>
                        </div>
                    </div>
                </footer>

                {/* Interactive Onboarding and Preference Tuning Wizard */}
                {userId && <OnboardingModal />}
            </main>
        </PersonalizationProvider>
    );
};

export default Layout;
