import { NewsIntelligenceView } from '@/features/news';
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Financial News Intelligence | HyperStocks',
    description:
        'AI-powered financial news intelligence, market event timelines, deterministic sentiment, and personalized stock impact analysis.',
};

export default function NewsPage() {
    return (
        <div className="space-y-6">
            <NewsIntelligenceView />
        </div>
    );
}
