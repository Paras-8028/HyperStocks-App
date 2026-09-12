import {
    AnalyzedNewsArticle,
    NewsSentiment,
    NewsSentimentLabel,
    RawNewsArticle,
    SectorImpact,
    StockImpact,
} from '@/types/news';

// Standard mapping of recognized market symbols to names and sectors
const KNOWN_ENTITIES: Record<
    string,
    { symbol: string; name: string; sector: string; aliases: string[] }
> = {
    NVDA: {
        symbol: 'NVDA',
        name: 'Nvidia',
        sector: 'Technology',
        aliases: ['nvidia', 'geforce', 'jensen huang', 'blackwell'],
    },
    AAPL: {
        symbol: 'AAPL',
        name: 'Apple',
        sector: 'Technology',
        aliases: ['apple', 'iphone', 'tim cook', 'ios', 'macbook'],
    },
    MSFT: {
        symbol: 'MSFT',
        name: 'Microsoft',
        sector: 'Technology',
        aliases: ['microsoft', 'azure', 'satya nadella', 'windows', 'copilot'],
    },
    TSLA: {
        symbol: 'TSLA',
        name: 'Tesla',
        sector: 'Consumer Discretionary',
        aliases: ['tesla', 'elon musk', 'cybertruck', 'gigafactory', 'model y', 'model 3'],
    },
    AMD: {
        symbol: 'AMD',
        name: 'AMD',
        sector: 'Technology',
        aliases: ['amd', 'advanced micro devices', 'lisa su', 'radeon'],
    },
    GOOGL: {
        symbol: 'GOOGL',
        name: 'Alphabet / Google',
        sector: 'Communication Services',
        aliases: ['google', 'alphabet', 'sundar pichai', 'youtube', 'gemini ai'],
    },
    META: {
        symbol: 'META',
        name: 'Meta Platforms',
        sector: 'Communication Services',
        aliases: ['meta', 'facebook', 'instagram', 'mark zuckerberg', 'whatsapp'],
    },
    AMZN: {
        symbol: 'AMZN',
        name: 'Amazon',
        sector: 'Consumer Discretionary',
        aliases: ['amazon', 'aws', 'andy jassy', 'prime video', 'e-commerce'],
    },
    AVGO: {
        symbol: 'AVGO',
        name: 'Broadcom',
        sector: 'Technology',
        aliases: ['broadcom', 'avgo', 'hock tan'],
    },
    JPM: {
        symbol: 'JPM',
        name: 'JPMorgan Chase',
        sector: 'Financials',
        aliases: ['jpmorgan', 'jp morgan', 'jamie dimon', 'chase bank'],
    },
    BAC: {
        symbol: 'BAC',
        name: 'Bank of America',
        sector: 'Financials',
        aliases: ['bank of america', 'bofa'],
    },
    LLY: {
        symbol: 'LLY',
        name: 'Eli Lilly',
        sector: 'Healthcare',
        aliases: ['eli lilly', 'lilly', 'mounjaro', 'zepbound'],
    },
    XOM: {
        symbol: 'XOM',
        name: 'Exxon Mobil',
        sector: 'Energy',
        aliases: ['exxon', 'exxonmobil'],
    },
    CVX: {
        symbol: 'CVX',
        name: 'Chevron',
        sector: 'Energy',
        aliases: ['chevron'],
    },
    SPY: {
        symbol: 'SPY',
        name: 'S&P 500 Index',
        sector: 'Broad Market',
        aliases: ['s&p 500', 'sp500', 's&p'],
    },
    QQQ: {
        symbol: 'QQQ',
        name: 'Nasdaq 100 Index',
        sector: 'Technology',
        aliases: ['nasdaq', 'nasdaq 100', 'tech stocks'],
    },
};

const SECTOR_KEYWORDS: Record<string, string[]> = {
    Technology: ['tech', 'semiconductor', 'chip', 'software', 'cloud', 'ai', 'cybersecurity', 'hardware'],
    Financials: ['bank', 'banking', 'interest rate', 'fed', 'federal reserve', 'yield', 'treasury', 'lending', 'wall street'],
    Healthcare: ['pharma', 'biotech', 'drug', 'fda', 'clinical trial', 'healthcare', 'vaccine', 'treatment'],
    'Consumer Discretionary': ['retail', 'ev', 'automaker', 'consumer spending', 'luxury', 'apparel', 'restaurant'],
    'Communication Services': ['streaming', 'advertising', 'social media', 'telecom', 'telecommunications', 'broadband'],
    Energy: ['oil', 'crude', 'opec', 'natural gas', 'petroleum', 'drilling', 'refinery'],
    Industrials: ['defense', 'aerospace', 'manufacturing', 'freight', 'airline', 'logistics', 'rail'],
};

const POSITIVE_LEXICON = [
    'surge', 'surges', 'surged', 'jump', 'jumps', 'jumped', 'rally', 'rallies', 'rallied',
    'soar', 'soars', 'soared', 'beat', 'beats', 'record', 'outperform', 'outperformed',
    'growth', 'bullish', 'upgrade', 'upgraded', 'profit', 'gain', 'gains', 'strong',
    'expansion', 'breakthrough', 'dividend hike', 'exceeds', 'positive', 'rebound', 'highs'
];

const NEGATIVE_LEXICON = [
    'plunge', 'plunges', 'plunged', 'drop', 'drops', 'dropped', 'slump', 'slumps', 'slumped',
    'fall', 'falls', 'fell', 'miss', 'misses', 'missed', 'loss', 'losses', 'bearish',
    'downgrade', 'downgraded', 'antitrust', 'probe', 'lawsuit', 'investigation', 'decline',
    'declines', 'deficit', 'recession', 'inflation', 'cut', 'warning', 'tumble', 'crash', 'sell-off'
];

export class NewsAnalyzerService {
    /**
     * Deterministically analyzes a raw financial news article.
     * Computes sentiment, extracts affected stocks, and classifies sector impacts.
     */
    public static analyzeArticle(raw: RawNewsArticle): AnalyzedNewsArticle {
        const text = `${raw.headline} ${raw.summary}`.toLowerCase();

        // 1. Sentiment Analysis
        const sentiment = this.computeSentiment(text, raw.headline.toLowerCase());

        // 2. Stock Impact Detection
        const affectedStocks = this.extractStockImpacts(text, raw.headline, raw.relatedSymbol, sentiment.label);

        // 3. Sector Impact Detection
        const affectedSectors = this.extractSectorImpacts(text, affectedStocks, sentiment.label);

        return {
            ...raw,
            sentiment,
            affectedStocks,
            affectedSectors,
        };
    }

    private static computeSentiment(text: string, headline: string): NewsSentiment {
        let score = 0;
        let posCount = 0;
        let negCount = 0;

        // Headline words carry 2.5x higher weight
        POSITIVE_LEXICON.forEach((word) => {
            if (headline.includes(word)) {
                score += 0.5;
                posCount += 2;
            } else if (text.includes(word)) {
                score += 0.2;
                posCount += 1;
            }
        });

        NEGATIVE_LEXICON.forEach((word) => {
            if (headline.includes(word)) {
                score -= 0.5;
                negCount += 2;
            } else if (text.includes(word)) {
                score -= 0.2;
                negCount += 1;
            }
        });

        // Normalize score between -1.0 and 1.0
        const normalized = Math.max(-1.0, Math.min(1.0, score));

        let label: NewsSentimentLabel = 'neutral';
        if (normalized >= 0.25) {
            label = 'positive';
        } else if (normalized <= -0.25) {
            label = 'negative';
        }

        const confidence = Math.min(
            0.98,
            Math.max(0.65, 0.5 + Math.abs(normalized) * 0.4 + (posCount + negCount) * 0.05)
        );

        return {
            label,
            score: Number(normalized.toFixed(2)),
            confidence: Number(confidence.toFixed(2)),
        };
    }

    private static extractStockImpacts(
        text: string,
        headline: string,
        relatedSymbol?: string,
        sentimentLabel: NewsSentimentLabel = 'neutral'
    ): StockImpact[] {
        const impacts: StockImpact[] = [];
        const seenSymbols = new Set<string>();

        // If Finnhub provides a relatedSymbol, prioritize it
        if (relatedSymbol) {
            const sym = relatedSymbol.toUpperCase();
            const entity = KNOWN_ENTITIES[sym];
            seenSymbols.add(sym);
            impacts.push({
                symbol: sym,
                companyName: entity?.name || sym,
                direction: sentimentLabel,
                magnitude: headline.toUpperCase().includes(sym) ? 'high' : 'medium',
                reason: `Direct ticker association in market news`,
            });
        }

        // Scan known entities in headline & summary
        for (const [sym, info] of Object.entries(KNOWN_ENTITIES)) {
            if (seenSymbols.has(sym)) continue;

            const inHeadline =
                headline.toUpperCase().includes(` ${sym} `) ||
                headline.toUpperCase().startsWith(`${sym} `) ||
                info.aliases.some((alias) => headline.toLowerCase().includes(alias));

            const inBody =
                inHeadline ||
                info.aliases.some((alias) => text.includes(alias));

            if (inBody) {
                seenSymbols.add(sym);
                impacts.push({
                    symbol: sym,
                    companyName: info.name,
                    direction: sentimentLabel,
                    magnitude: inHeadline ? 'high' : 'medium',
                    reason: inHeadline
                        ? `Featured prominently in news headline`
                        : `Mentioned in market development report`,
                });
            }
        }

        return impacts;
    }

    private static extractSectorImpacts(
        text: string,
        stocks: StockImpact[],
        sentimentLabel: NewsSentimentLabel
    ): SectorImpact[] {
        const sectorMap = new Map<string, number>();

        // 1. Sector inferred from affected stocks
        stocks.forEach((stock) => {
            const entity = KNOWN_ENTITIES[stock.symbol];
            if (entity && entity.sector && entity.sector !== 'Broad Market') {
                sectorMap.set(entity.sector, (sectorMap.get(entity.sector) || 0) + 0.6);
            }
        });

        // 2. Sector inferred from topical keywords
        for (const [sector, kws] of Object.entries(SECTOR_KEYWORDS)) {
            let matches = 0;
            kws.forEach((kw) => {
                if (text.includes(kw)) matches++;
            });
            if (matches > 0) {
                sectorMap.set(sector, (sectorMap.get(sector) || 0) + matches * 0.3);
            }
        }

        const results: SectorImpact[] = [];
        sectorMap.forEach((weight, sector) => {
            results.push({
                sector,
                direction: sentimentLabel,
                weight: Math.min(1.0, Number(weight.toFixed(2))),
            });
        });

        // Sort descending by weight
        return results.sort((a, b) => b.weight - a.weight).slice(0, 3);
    }
}
