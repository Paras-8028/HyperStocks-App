import Header from "@/components/Header";
import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { PersonalizationProvider } from "@/context/PersonalizationContext";
import { OnboardingModal } from "@/features/onboarding";
import { getPersonalizationService } from "@/services/personalization";
import { RootLayoutContent } from "@/components/layout/RootLayoutContent";

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
            <main className="min-h-screen text-gray-400 flex flex-col">
                <Header user={user} />

                <RootLayoutContent
                    footer={
                        <footer className="border-t border-[rgba(148,163,184,0.12)] bg-[#080D1B]/80 backdrop-blur-md py-10 mt-20 text-xs text-[#94A3B8]">
                            <div className="container flex flex-col md:flex-row items-center justify-between gap-6">
                                <div className="space-y-2 max-w-3xl">
                                    <div className="flex items-center gap-2.5 text-[#F4F7FF] font-semibold text-xs tracking-wide">
                                        <span className="flex h-2 w-2 rounded-full bg-[#35D6FF] shadow-[0_0_8px_#35D6FF]"></span>
                                        <span>HyperStocks</span>
                                        <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full border border-[#7C5CFF]/30 bg-[#7C5CFF]/10 text-[#7C5CFF]">
                                            Financial Intelligence
                                        </span>
                                    </div>
                                    <p className="text-[11px] leading-relaxed text-[#94A3B8]">
                                        <strong>Regulatory Disclaimer:</strong> HyperStocks provides deterministic algorithmic financial market data, celestial constellation topologies, probabilistic market summaries, and portfolio analysis for informational, research, and educational purposes only. HyperStocks does not provide personalized investment advice, broker-dealer services, or financial recommendations. Always perform your own independent due diligence before executing financial transactions.
                                    </p>
                                </div>
                                <div className="flex flex-col items-end gap-1.5 shrink-0 text-[11px] text-[#94A3B8]">
                                    <div className="font-medium text-[#F4F7FF]">&copy; {new Date().getFullYear()} HyperStocks. All rights reserved.</div>
                                    <div className="text-[10px] text-[#94A3B8]/70 flex items-center gap-1.5">
                                        <span className="h-1.5 w-1.5 rounded-full bg-[#3DFFA0]"></span>
                                        Observational Telemetry Engine • Powered by Google Gemini
                                    </div>
                                </div>
                            </div>
                        </footer>
                    }
                >
                    {children}
                </RootLayoutContent>

                {/* Interactive Onboarding and Preference Tuning Wizard */}
                {userId && <OnboardingModal />}
            </main>
        </PersonalizationProvider>
    );
};

export default Layout;

