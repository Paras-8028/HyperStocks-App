import { NextResponse } from 'next/server';
import { getMarketService } from '@/services/market';
import { getNewsService } from '@/services/news';
import {
    HeatmapStockItem,
    MajorQuoteItem,
    MarketIndexItem,
    MarketOverviewPayload,
    MarketStatusInfo,
    SectorIndexItem,
} from '@/features/overview/types';

export const revalidate = 60; // 1 minute server-side revalidation

// Baseline index configurations
const INDICES_CONFIG = [
    { name: 'S&P 500', symbol: 'SPY', displaySymbol: '^GSPC', basePrice: 585.4, baseChange: 2.85, basePercent: 0.49 },
    { name: 'Nasdaq 100', symbol: 'QQQ', displaySymbol: '^NDX', basePrice: 492.3, baseChange: 4.15, basePercent: 0.85 },
    { name: 'Dow Jones', symbol: 'DIA', displaySymbol: '^DJI', basePrice: 432.1, baseChange: -1.2, basePercent: -0.28 },
    { name: 'Russell 2000', symbol: 'IWM', displaySymbol: '^RUT', basePrice: 224.8, baseChange: 1.65, basePercent: 0.74 },
    { name: 'Volatility Index', symbol: 'VXX', displaySymbol: '^VIX', basePrice: 15.2, baseChange: -0.42, basePercent: -2.69 },
];

// Baseline Sector ETFs
const SECTOR_CONFIG = [
    { name: 'Technology', symbol: 'XLK', etfName: 'Tech Select Sector SPDR', basePrice: 228.4, baseChange: 1.85, basePercent: 0.82 },
    { name: 'Financials', symbol: 'XLF', etfName: 'Financial Select Sector SPDR', basePrice: 48.2, baseChange: 0.32, basePercent: 0.67 },
    { name: 'Healthcare', symbol: 'XLV', etfName: 'Health Care Select SPDR', basePrice: 146.5, baseChange: -0.45, basePercent: -0.31 },
    { name: 'Energy', symbol: 'XLE', etfName: 'Energy Select Sector SPDR', basePrice: 89.1, baseChange: 0.95, basePercent: 1.08 },
    { name: 'Consumer Goods', symbol: 'XLY', etfName: 'Consumer Discret Select SPDR', basePrice: 198.6, baseChange: 1.12, basePercent: 0.57 },
    { name: 'Industrials', symbol: 'XLI', etfName: 'Industrial Select Sector SPDR', basePrice: 134.8, baseChange: 0.44, basePercent: 0.33 },
    { name: 'Communication', symbol: 'XLC', etfName: 'Comm Services Select SPDR', basePrice: 88.5, baseChange: 0.65, basePercent: 0.74 },
    { name: 'Utilities', symbol: 'XLU', etfName: 'Utilities Select Sector SPDR', basePrice: 79.3, baseChange: -0.18, basePercent: -0.23 },
];

// Baseline Mega-Caps for Heatmap
const HEATMAP_STOCKS_CONFIG: {
    symbol: string;
    name: string;
    sector: string;
    marketCap: number;
    weight: number;
    basePrice: number;
    baseChange: number;
    basePercent: number;
}[] = [
    { symbol: 'AAPL', name: 'Apple Inc.', sector: 'Technology', marketCap: 3520000, weight: 3, basePrice: 231.4, baseChange: 1.8, basePercent: 0.78 },
    { symbol: 'MSFT', name: 'Microsoft Corp.', sector: 'Technology', marketCap: 3180000, weight: 3, basePrice: 428.5, baseChange: 2.1, basePercent: 0.49 },
    { symbol: 'NVDA', name: 'NVIDIA Corp.', sector: 'Technology', marketCap: 3390000, weight: 3, basePrice: 138.2, baseChange: 3.4, basePercent: 2.52 },
    { symbol: 'GOOGL', name: 'Alphabet Inc.', sector: 'Technology', marketCap: 2150000, weight: 2, basePrice: 168.9, baseChange: 0.85, basePercent: 0.51 },
    { symbol: 'AMZN', name: 'Amazon.com Inc.', sector: 'Consumer Goods', marketCap: 1980000, weight: 2, basePrice: 189.4, baseChange: 1.6, basePercent: 0.85 },
    { symbol: 'META', name: 'Meta Platforms', sector: 'Technology', marketCap: 1510000, weight: 2, basePrice: 592.3, baseChange: 4.8, basePercent: 0.82 },
    { symbol: 'TSLA', name: 'Tesla Inc.', sector: 'Consumer Goods', marketCap: 745000, weight: 2, basePrice: 220.7, baseChange: -3.2, basePercent: -1.43 },
    { symbol: 'AVGO', name: 'Broadcom Inc.', sector: 'Technology', marketCap: 810000, weight: 2, basePrice: 174.5, baseChange: 2.6, basePercent: 1.51 },
    { symbol: 'JPM', name: 'JPMorgan Chase', sector: 'Financials', marketCap: 625000, weight: 2, basePrice: 224.2, baseChange: 1.45, basePercent: 0.65 },
    { symbol: 'V', name: 'Visa Inc.', sector: 'Financials', marketCap: 540000, weight: 1, basePrice: 284.6, baseChange: 0.9, basePercent: 0.32 },
    { symbol: 'MA', name: 'Mastercard Inc.', sector: 'Financials', marketCap: 460000, weight: 1, basePrice: 495.2, baseChange: 1.7, basePercent: 0.34 },
    { symbol: 'BAC', name: 'Bank of America', sector: 'Financials', marketCap: 330000, weight: 1, basePrice: 42.8, baseChange: 0.25, basePercent: 0.59 },
    { symbol: 'LLY', name: 'Eli Lilly & Co.', sector: 'Healthcare', marketCap: 860000, weight: 2, basePrice: 915.2, baseChange: 5.4, basePercent: 0.59 },
    { symbol: 'UNH', name: 'UnitedHealth Group', sector: 'Healthcare', marketCap: 535000, weight: 1, basePrice: 582.4, baseChange: -2.1, basePercent: -0.36 },
    { symbol: 'JNJ', name: 'Johnson & Johnson', sector: 'Healthcare', marketCap: 395000, weight: 1, basePrice: 162.8, baseChange: -0.4, basePercent: -0.25 },
    { symbol: 'WMT', name: 'Walmart Inc.', sector: 'Consumer Goods', marketCap: 660000, weight: 2, basePrice: 82.5, baseChange: 0.65, basePercent: 0.79 },
    { symbol: 'COST', name: 'Costco Wholesale', sector: 'Consumer Goods', marketCap: 405000, weight: 1, basePrice: 912.4, baseChange: 4.2, basePercent: 0.46 },
    { symbol: 'XOM', name: 'Exxon Mobil Corp.', sector: 'Energy', marketCap: 490000, weight: 1, basePrice: 122.8, baseChange: 1.35, basePercent: 1.11 },
    { symbol: 'CVX', name: 'Chevron Corp.', sector: 'Energy', marketCap: 285000, weight: 1, basePrice: 154.6, baseChange: -0.7, basePercent: -0.45 },
    { symbol: 'CAT', name: 'Caterpillar Inc.', sector: 'Industrials', marketCap: 195000, weight: 1, basePrice: 398.5, baseChange: 1.9, basePercent: 0.48 },
    { symbol: 'GE', name: 'GE Aerospace', sector: 'Industrials', marketCap: 205000, weight: 1, basePrice: 190.2, baseChange: 0.8, basePercent: 0.42 },
];

function calculateMarketStatus(): MarketStatusInfo {
    const now = new Date();
    // Convert to US Eastern Time
    const estString = now.toLocaleString('en-US', { timeZone: 'America/New_York' });
    const estDate = new Date(estString);

    const day = estDate.getDay(); // 0 is Sunday, 6 is Saturday
    const hours = estDate.getHours();
    const minutes = estDate.getMinutes();
    const timeInMinutes = hours * 60 + minutes;

    const formattedTime = estDate.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZoneName: 'short',
    });

    // Weekend
    if (day === 0 || day === 6) {
        return {
            isOpen: false,
            sessionName: 'Weekend / Closed',
            exchange: 'NYSE / NASDAQ',
            formattedTime,
            nextEvent: 'Opens Monday 9:30 AM EST',
        };
    }

    // Weekdays
    if (timeInMinutes >= 570 && timeInMinutes < 960) {
        // 9:30 AM to 4:00 PM EST
        return {
            isOpen: true,
            sessionName: 'Regular Trading',
            exchange: 'NYSE / NASDAQ',
            formattedTime,
            nextEvent: 'Closes today at 4:00 PM EST',
        };
    } else if (timeInMinutes >= 240 && timeInMinutes < 570) {
        // 4:00 AM to 9:30 AM EST
        return {
            isOpen: false,
            sessionName: 'Pre-Market',
            exchange: 'NYSE / NASDAQ',
            formattedTime,
            nextEvent: 'Regular trading opens 9:30 AM EST',
        };
    } else if (timeInMinutes >= 960 && timeInMinutes < 1200) {
        // 4:00 PM to 8:00 PM EST
        return {
            isOpen: false,
            sessionName: 'After-Hours',
            exchange: 'NYSE / NASDAQ',
            formattedTime,
            nextEvent: 'Pre-market opens tomorrow 4:00 AM EST',
        };
    } else {
        return {
            isOpen: false,
            sessionName: 'Weekend / Closed',
            exchange: 'NYSE / NASDAQ',
            formattedTime,
            nextEvent: 'Pre-market opens 4:00 AM EST',
        };
    }
}

// Generate deterministic micro-sparkline points based on price movement
function generateSparkline(current: number, changePercent: number): number[] {
    const isUp = changePercent >= 0;
    const points: number[] = [];
    const count = 12;
    const range = Math.abs(current * (changePercent / 100)) || current * 0.01;
    const start = isUp ? current - range : current + range;

    for (let i = 0; i < count; i++) {
        const progress = i / (count - 1);
        const baseline = start + (current - start) * progress;
        const noise = (Math.sin(i * 1.8 + current) * range * 0.25);
        points.push(Number((baseline + (i === count - 1 ? 0 : noise)).toFixed(2)));
    }
    return points;
}

export async function GET() {
    const marketService = getMarketService();
    const newsService = getNewsService();

    let isLiveSuccess = false;
    const liveQuotes: Record<string, { price: number; change: number; percentChange: number; high?: number; low?: number; open?: number; prevClose?: number }> = {};

    // 1. Gather all unique symbols we need quotes for
    const indexSymbols = INDICES_CONFIG.map((i) => i.symbol);
    const sectorSymbols = SECTOR_CONFIG.map((s) => s.symbol);
    const heatmapSymbols = HEATMAP_STOCKS_CONFIG.map((h) => h.symbol);
    const allSymbols = Array.from(new Set([...indexSymbols, ...sectorSymbols, ...heatmapSymbols]));

    try {
        const quotePromises = allSymbols.map(async (sym) => {
            const res = await marketService.getQuote(sym);
            if (res.success && res.data && res.data.currentPrice > 0) {
                return {
                    symbol: sym,
                    price: res.data.currentPrice,
                    change: res.data.change,
                    percentChange: res.data.percentChange,
                    high: res.data.highPrice,
                    low: res.data.lowPrice,
                    open: res.data.openPrice,
                    prevClose: res.data.previousClose,
                };
            }
            return null;
        });

        const quoteResults = await Promise.all(quotePromises);
        for (const item of quoteResults) {
            if (item) {
                liveQuotes[item.symbol] = item;
                isLiveSuccess = true;
            }
        }
    } catch {
        // If external API has momentary failure, gracefully fall back to baseline values
    }

    // 2. Build Market Indices Payload
    const indices: MarketIndexItem[] = INDICES_CONFIG.map((cfg) => {
        const live = liveQuotes[cfg.symbol];
        const price = live ? live.price : cfg.basePrice;
        const change = live ? live.change : cfg.baseChange;
        const percentChange = live ? live.percentChange : cfg.basePercent;

        return {
            name: cfg.name,
            symbol: cfg.symbol,
            displaySymbol: cfg.displaySymbol,
            price: Number(price.toFixed(2)),
            change: Number(change.toFixed(2)),
            percentChange: Number(percentChange.toFixed(2)),
            sparkline: generateSparkline(price, percentChange),
        };
    });

    // 3. Build Heatmap Payload
    const heatmap: HeatmapStockItem[] = HEATMAP_STOCKS_CONFIG.map((cfg) => {
        const live = liveQuotes[cfg.symbol];
        const price = live ? live.price : cfg.basePrice;
        const change = live ? live.change : cfg.baseChange;
        const percentChange = live ? live.percentChange : cfg.basePercent;

        return {
            symbol: cfg.symbol,
            name: cfg.name,
            sector: cfg.sector,
            marketCap: cfg.marketCap,
            weight: cfg.weight,
            price: Number(price.toFixed(2)),
            change: Number(change.toFixed(2)),
            percentChange: Number(percentChange.toFixed(2)),
        };
    });

    // 4. Build Major Market Quotes
    const majorSymbols = ['SPY', 'QQQ', 'DIA', 'AAPL', 'MSFT', 'NVDA', 'AMZN', 'GOOGL', 'JPM', 'LLY', 'TSLA', 'WMT'];
    const majorQuotes: MajorQuoteItem[] = majorSymbols.map((sym) => {
        const stockCfg = HEATMAP_STOCKS_CONFIG.find((h) => h.symbol === sym);
        const indexCfg = INDICES_CONFIG.find((i) => i.symbol === sym);
        const name = stockCfg?.name || indexCfg?.name || sym;

        const live = liveQuotes[sym];
        const basePrice = stockCfg?.basePrice || indexCfg?.basePrice || 100;
        const baseChange = stockCfg?.baseChange || indexCfg?.baseChange || 0.5;
        const basePercent = stockCfg?.basePercent || indexCfg?.basePercent || 0.5;

        const price = live ? live.price : basePrice;
        const change = live ? live.change : baseChange;
        const percentChange = live ? live.percentChange : basePercent;

        return {
            name,
            symbol: sym,
            price: Number(price.toFixed(2)),
            change: Number(change.toFixed(2)),
            percentChange: Number(percentChange.toFixed(2)),
            highPrice: live?.high ? Number(live.high.toFixed(2)) : Number((price * 1.01).toFixed(2)),
            lowPrice: live?.low ? Number(live.low.toFixed(2)) : Number((price * 0.99).toFixed(2)),
            openPrice: live?.open ? Number(live.open.toFixed(2)) : Number((price - change).toFixed(2)),
            previousClose: live?.prevClose ? Number(live.prevClose.toFixed(2)) : Number((price - change).toFixed(2)),
            marketStatus: 'Active',
        };
    });

    // 5. Build Sector Indices Payload
    const sectors: SectorIndexItem[] = SECTOR_CONFIG.map((cfg) => {
        const live = liveQuotes[cfg.symbol];
        const price = live ? live.price : cfg.basePrice;
        const change = live ? live.change : cfg.baseChange;
        const percentChange = live ? live.percentChange : cfg.basePercent;

        return {
            name: cfg.name,
            symbol: cfg.symbol,
            etfName: cfg.etfName,
            price: Number(price.toFixed(2)),
            change: Number(change.toFixed(2)),
            percentChange: Number(percentChange.toFixed(2)),
        };
    }).sort((a, b) => b.percentChange - a.percentChange); // Rank by relative performance

    // Add performance rank
    sectors.forEach((s, idx) => {
        s.performanceRank = idx + 1;
    });

    // 6. Fetch Real Top Stories
    let topStories: any[] = [];
    try {
        const newsRes = await newsService.getMarketNews('general');
        if (newsRes.success && newsRes.data && newsRes.data.length > 0) {
            topStories = newsRes.data.slice(0, 7);
        }
    } catch {
        topStories = [];
    }

    const payload: MarketOverviewPayload = {
        indices,
        heatmap,
        majorQuotes,
        sectors,
        topStories,
        marketStatus: calculateMarketStatus(),
        lastUpdated: Date.now(),
        isFallbackData: !isLiveSuccess,
    };

    return NextResponse.json({
        success: true,
        data: payload,
    });
}
