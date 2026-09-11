import TradingViewWidget from "@/components/TradingViewWidget";
import WatchlistButton from "@/components/WatchlistButton";
import { StockIntelligencePage } from "@/features/stock-analysis/StockIntelligencePage";
import { AIAssistantChat } from "@/features/ai-assistant/AIAssistantChat";
import { getMarketService } from "@/services/market";
import {
    SYMBOL_INFO_WIDGET_CONFIG,
    CANDLE_CHART_WIDGET_CONFIG,
    BASELINE_WIDGET_CONFIG,
    TECHNICAL_ANALYSIS_WIDGET_CONFIG,
    COMPANY_PROFILE_WIDGET_CONFIG,
    COMPANY_FINANCIALS_WIDGET_CONFIG,
} from "@/lib/constants";

export default async function StockDetails({ params }: StockDetailsPageProps) {
    const { symbol } = await params;
    const cleanSymbol = symbol.toUpperCase();
    const scriptUrl = `https://s3.tradingview.com/external-embedding/embed-widget-`;

    const marketService = getMarketService();
    const [quoteRes, metricsRes, profileRes] = await Promise.all([
        marketService.getQuote(cleanSymbol),
        marketService.getFinancialMetrics(cleanSymbol),
        marketService.getCompanyProfile(cleanSymbol),
    ]);

    const quote = quoteRes.success ? quoteRes.data : undefined;
    const metrics = metricsRes.success ? metricsRes.data : undefined;
    const profile = profileRes.success ? profileRes.data : undefined;

    const card =
        "rounded-xl border border-gray-800 bg-gray-800/60 backdrop-blur p-4";

    return (
        <div className="min-h-screen bg-gray-900">
            <div className="container py-6 lg:py-8 space-y-8">
                {/* Comprehensive 8-Pillar AI Stock Intelligence System */}
                <StockIntelligencePage
                    symbol={cleanSymbol}
                    companyName={profile?.name}
                    quote={quote}
                    metrics={metrics}
                />

                <section className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                    {/* ================= LEFT: CHARTS ================= */}
                    <div className="xl:col-span-2 flex flex-col gap-6">
                        {/* Symbol info */}
                        <div className={card}>
                            <TradingViewWidget
                                scriptUrl={`${scriptUrl}symbol-info.js`}
                                config={SYMBOL_INFO_WIDGET_CONFIG(symbol)}
                                height={170}
                            />
                        </div>

                        {/* Main candle chart */}
                        <div className={card}>
                            <TradingViewWidget
                                scriptUrl={`${scriptUrl}advanced-chart.js`}
                                config={CANDLE_CHART_WIDGET_CONFIG(symbol)}
                                className="custom-chart"
                                height={560}
                            />
                        </div>

                        {/* Baseline chart */}
                        <div className={card}>
                            <TradingViewWidget
                                scriptUrl={`${scriptUrl}advanced-chart.js`}
                                config={BASELINE_WIDGET_CONFIG(symbol)}
                                className="custom-chart"
                                height={420}
                            />
                        </div>
                    </div>

                    {/* ================= RIGHT: INFO ================= */}
                    <aside className="flex flex-col gap-6">
                        {/* Stock header + watchlist */}
                        <div className={card + " flex items-center justify-between"}>
                            <div>
                                <h2 className="text-lg font-semibold text-gray-100">
                                    {cleanSymbol}
                                </h2>
                                <p className="text-sm text-gray-400">
                                    Stock overview & tools
                                </p>
                            </div>

                            <WatchlistButton
                                symbol={cleanSymbol}
                                company={cleanSymbol}
                                isInWatchlist={false}
                                type="icon"
                            />
                        </div>

                        {/* Technical analysis */}
                        <div className={card}>
                            <TradingViewWidget
                                scriptUrl={`${scriptUrl}technical-analysis.js`}
                                config={TECHNICAL_ANALYSIS_WIDGET_CONFIG(symbol)}
                                height={360}
                            />
                        </div>

                        {/* Financials */}
                        <div className={card}>
                            <TradingViewWidget
                                scriptUrl={`${scriptUrl}financials.js`}
                                config={COMPANY_FINANCIALS_WIDGET_CONFIG(symbol)}
                                height={420}
                            />
                        </div>
                    </aside>
                </section>
            </div>

            {/* Floating AI Copilot for this stock */}
            <AIAssistantChat
                collapsible
                context={{
                    currentSymbol: cleanSymbol,
                    quote,
                    metrics,
                }}
            />
        </div>
    );
}
