import { PortfolioIntelligence } from "@/features/portfolio/PortfolioIntelligence";
import { AIAssistantChat } from "@/features/ai-assistant/AIAssistantChat";

export const metadata = {
    title: "Portfolio Intelligence | HyperStocks",
    description: "Personalized stock portfolio tracking, performance analytics, and automated AI risk audits.",
};

export default function PortfolioPage() {
    return (
        <div className="min-h-screen bg-gray-900 py-8">
            <div className="container max-w-6xl space-y-8">
                <PortfolioIntelligence />
            </div>

            <AIAssistantChat collapsible />
        </div>
    );
}
