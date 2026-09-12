import { PortfolioIntelligence } from "@/features/portfolio/PortfolioIntelligence";
import { AIAssistantChat } from "@/features/ai-assistant/AIAssistantChat";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export const metadata = {
    title: "Portfolio Intelligence | HyperStocks",
    description: "Personalized stock portfolio tracking, performance analytics, and automated AI risk audits.",
};

export default async function PortfolioPage() {
    const { userId } = await auth();

    if (!userId) {
        redirect('/sign-in');
    }

    return (
        <div className="min-h-screen bg-gray-900 py-8">
            <div className="container max-w-6xl space-y-8">
                <PortfolioIntelligence />
            </div>

            <AIAssistantChat collapsible />
        </div>
    );
}
