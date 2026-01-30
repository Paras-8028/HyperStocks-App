import TradingViewWidget from "@/components/TradingViewWidget";
import WatchlistButton from "@/components/WatchlistButton";
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
    const scriptUrl = `https://s3.tradingview.com/external-embedding/embed-widget-`;

    const card =
        "rounded-xl border border-gray-800 bg-gray-800/60 backdrop-blur p-4";

    return (
        <div className="min-h-screen bg-gray-900">
            <div className="container py-6 lg:py-8">
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
                                    {symbol.toUpperCase()}
                                </h2>
                                <p className="text-sm text-gray-400">
                                    Stock overview & tools
                                </p>
                            </div>

                            <WatchlistButton
                                symbol={symbol.toUpperCase()}
                                company={symbol.toUpperCase()}
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

                        {/* Company profile */}
                        {/*<div className={card}>*/}
                        {/*    <TradingViewWidget*/}
                        {/*        scriptUrl={`${scriptUrl}company-profile.js`}*/}
                        {/*        config={COMPANY_PROFILE_WIDGET_CONFIG(symbol)}*/}
                        {/*        height={420}*/}
                        {/*    />*/}
                        {/*</div>*/}

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
        </div>
    );
}
