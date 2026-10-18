import { NextResponse } from 'next/server';
import { getMarketService } from '@/services/market';
import { MarketUniverseData, UniverseNode, UniverseSectorInfo } from '@/features/market-universe/types';

export const revalidate = 120; // 2 minutes server-side cache

const UNIVERSE_SECTORS: UniverseSectorInfo[] = [
    {
        name: 'Technology',
        color: '#7C5CFF',
        glowColor: 'rgba(124, 92, 255, 0.45)',
        centroid: { x: 50, y: 30 },
        description: 'Advanced Cloud, AI Compute & Enterprise Platforms',
    },
    {
        name: 'Financials',
        color: '#35D6FF',
        glowColor: 'rgba(53, 214, 255, 0.45)',
        centroid: { x: 80, y: 40 },
        description: 'Money Center Banks, Payments & Institutional Credit',
    },
    {
        name: 'Healthcare',
        color: '#3DFFA0',
        glowColor: 'rgba(61, 255, 160, 0.45)',
        centroid: { x: 75, y: 75 },
        description: 'Biotechnology, Pharmaceuticals & Managed Care',
    },
    {
        name: 'Consumer',
        color: '#F472B6',
        glowColor: 'rgba(244, 114, 182, 0.45)',
        centroid: { x: 25, y: 70 },
        description: 'Global E-Commerce, Autonomous Mobility & Streaming',
    },
    {
        name: 'Energy',
        color: '#FBBF24',
        glowColor: 'rgba(251, 191, 36, 0.45)',
        centroid: { x: 22, y: 32 },
        description: 'Integrated Energy, Global Exploration & Infrastructure',
    },
];

interface BaseStockConfig {
    symbol: string;
    name: string;
    sector: UniverseSectorInfo['name'];
    x: number;
    y: number;
    baseRadius: number;
    connections: string[];
    fallbackPrice: number;
    fallbackChangePercent: number;
    fallbackMarketCap: number;
}

const BASE_STOCKS: BaseStockConfig[] = [
    // Technology Constellation (Upper Center)
    {
        symbol: 'NVDA',
        name: 'NVIDIA Corp',
        sector: 'Technology',
        x: 48,
        y: 26,
        baseRadius: 18,
        connections: ['MSFT', 'AMD', 'AAPL', 'TSLA'],
        fallbackPrice: 128.45,
        fallbackChangePercent: 3.42,
        fallbackMarketCap: 3150000,
    },
    {
        symbol: 'MSFT',
        name: 'Microsoft Corp',
        sector: 'Technology',
        x: 38,
        y: 20,
        baseRadius: 17,
        connections: ['NVDA', 'AAPL', 'GOOGL'],
        fallbackPrice: 442.8,
        fallbackChangePercent: 0.85,
        fallbackMarketCap: 3280000,
    },
    {
        symbol: 'AAPL',
        name: 'Apple Inc',
        sector: 'Technology',
        x: 58,
        y: 18,
        baseRadius: 18,
        connections: ['MSFT', 'NVDA', 'GOOGL'],
        fallbackPrice: 228.15,
        fallbackChangePercent: 1.15,
        fallbackMarketCap: 3480000,
    },
    {
        symbol: 'GOOGL',
        name: 'Alphabet Inc',
        sector: 'Technology',
        x: 62,
        y: 32,
        baseRadius: 15,
        connections: ['AAPL', 'META', 'MSFT'],
        fallbackPrice: 184.2,
        fallbackChangePercent: -0.42,
        fallbackMarketCap: 2280000,
    },
    {
        symbol: 'META',
        name: 'Meta Platforms',
        sector: 'Technology',
        x: 52,
        y: 40,
        baseRadius: 14,
        connections: ['GOOGL', 'NVDA', 'NFLX'],
        fallbackPrice: 585.6,
        fallbackChangePercent: 2.18,
        fallbackMarketCap: 1480000,
    },
    {
        symbol: 'AMD',
        name: 'Advanced Micro Devices',
        sector: 'Technology',
        x: 40,
        y: 35,
        baseRadius: 12,
        connections: ['NVDA', 'MSFT'],
        fallbackPrice: 156.3,
        fallbackChangePercent: 1.84,
        fallbackMarketCap: 252000,
    },

    // Financials Constellation (Upper Right)
    {
        symbol: 'JPM',
        name: 'JPMorgan Chase',
        sector: 'Financials',
        x: 78,
        y: 34,
        baseRadius: 15,
        connections: ['V', 'BAC', 'AAPL'],
        fallbackPrice: 215.4,
        fallbackChangePercent: 1.05,
        fallbackMarketCap: 618000,
    },
    {
        symbol: 'V',
        name: 'Visa Inc',
        sector: 'Financials',
        x: 88,
        y: 38,
        baseRadius: 14,
        connections: ['JPM', 'MA'],
        fallbackPrice: 284.1,
        fallbackChangePercent: 0.62,
        fallbackMarketCap: 574000,
    },
    {
        symbol: 'MA',
        name: 'Mastercard Inc',
        sector: 'Financials',
        x: 85,
        y: 50,
        baseRadius: 13,
        connections: ['V', 'JPM'],
        fallbackPrice: 472.9,
        fallbackChangePercent: 0.48,
        fallbackMarketCap: 438000,
    },
    {
        symbol: 'BAC',
        name: 'Bank of America',
        sector: 'Financials',
        x: 74,
        y: 48,
        baseRadius: 12,
        connections: ['JPM'],
        fallbackPrice: 42.15,
        fallbackChangePercent: -0.72,
        fallbackMarketCap: 328000,
    },

    // Healthcare Constellation (Lower Right)
    {
        symbol: 'LLY',
        name: 'Eli Lilly & Co',
        sector: 'Healthcare',
        x: 72,
        y: 72,
        baseRadius: 16,
        connections: ['UNH', 'JNJ'],
        fallbackPrice: 894.2,
        fallbackChangePercent: 2.65,
        fallbackMarketCap: 848000,
    },
    {
        symbol: 'UNH',
        name: 'UnitedHealth Group',
        sector: 'Healthcare',
        x: 82,
        y: 78,
        baseRadius: 14,
        connections: ['LLY', 'JNJ'],
        fallbackPrice: 568.4,
        fallbackChangePercent: -0.35,
        fallbackMarketCap: 524000,
    },
    {
        symbol: 'JNJ',
        name: 'Johnson & Johnson',
        sector: 'Healthcare',
        x: 68,
        y: 84,
        baseRadius: 13,
        connections: ['LLY', 'UNH'],
        fallbackPrice: 162.8,
        fallbackChangePercent: 0.22,
        fallbackMarketCap: 392000,
    },

    // Consumer / EV / Entertainment (Lower Left)
    {
        symbol: 'AMZN',
        name: 'Amazon.com Inc',
        sector: 'Consumer',
        x: 28,
        y: 64,
        baseRadius: 17,
        connections: ['TSLA', 'WMT', 'NFLX', 'MSFT'],
        fallbackPrice: 194.5,
        fallbackChangePercent: 1.48,
        fallbackMarketCap: 2020000,
    },
    {
        symbol: 'TSLA',
        name: 'Tesla Inc',
        sector: 'Consumer',
        x: 22,
        y: 76,
        baseRadius: 16,
        connections: ['AMZN', 'NVDA'],
        fallbackPrice: 224.8,
        fallbackChangePercent: -1.82,
        fallbackMarketCap: 718000,
    },
    {
        symbol: 'NFLX',
        name: 'Netflix Inc',
        sector: 'Consumer',
        x: 36,
        y: 74,
        baseRadius: 13,
        connections: ['AMZN', 'META'],
        fallbackPrice: 698.4,
        fallbackChangePercent: 1.95,
        fallbackMarketCap: 302000,
    },
    {
        symbol: 'WMT',
        name: 'Walmart Inc',
        sector: 'Consumer',
        x: 18,
        y: 60,
        baseRadius: 13,
        connections: ['AMZN'],
        fallbackPrice: 78.6,
        fallbackChangePercent: 0.38,
        fallbackMarketCap: 632000,
    },

    // Energy Constellation (Upper Left)
    {
        symbol: 'XOM',
        name: 'Exxon Mobil Corp',
        sector: 'Energy',
        x: 20,
        y: 28,
        baseRadius: 14,
        connections: ['CVX', 'AMZN'],
        fallbackPrice: 118.2,
        fallbackChangePercent: -0.92,
        fallbackMarketCap: 468000,
    },
    {
        symbol: 'CVX',
        name: 'Chevron Corp',
        sector: 'Energy',
        x: 26,
        y: 38,
        baseRadius: 13,
        connections: ['XOM'],
        fallbackPrice: 154.6,
        fallbackChangePercent: -0.45,
        fallbackMarketCap: 284000,
    },
];

export async function GET() {
    const marketService = getMarketService();

    // Query live quotes for the top symbols concurrently
    let liveQuoteMap: Record<string, { price: number; changePercent: number; change: number }> = {};
    let isLiveSuccess = false;

    try {
        const quotePromises = BASE_STOCKS.map(async (stk) => {
            const res = await marketService.getQuote(stk.symbol);
            if (res.success && res.data && res.data.currentPrice > 0) {
                return {
                    symbol: stk.symbol,
                    price: res.data.currentPrice,
                    changePercent: res.data.percentChange,
                    change: res.data.change,
                };
            }
            return null;
        });

        const results = await Promise.all(quotePromises);
        for (const item of results) {
            if (item) {
                liveQuoteMap[item.symbol] = item;
                isLiveSuccess = true;
            }
        }
    } catch {
        // Fallback gracefully to verified baseline deterministic market figures
    }

    const nodes: UniverseNode[] = BASE_STOCKS.map((stk) => {
        const live = liveQuoteMap[stk.symbol];
        const price = live ? live.price : stk.fallbackPrice;
        const changePercent = live ? live.changePercent : stk.fallbackChangePercent;
        const change = live ? live.change : Number(((changePercent / 100) * price).toFixed(2));

        return {
            id: stk.symbol,
            symbol: stk.symbol,
            name: stk.name,
            sector: stk.sector,
            price: Number(price.toFixed(2)),
            changePercent: Number(changePercent.toFixed(2)),
            change: Number(change.toFixed(2)),
            marketCap: stk.fallbackMarketCap,
            x: stk.x,
            y: stk.y,
            radius: stk.baseRadius,
            connections: stk.connections,
        };
    });

    const responseData: MarketUniverseData = {
        nodes,
        sectors: UNIVERSE_SECTORS,
        lastUpdated: Date.now(),
        isDemoData: !isLiveSuccess,
    };

    return NextResponse.json({
        success: true,
        data: responseData,
    });
}
