import { AlertEmailData } from '@/types/email';
import {
    renderEmailShell,
    renderEmailHeader,
    renderStockHeaderCard,
    renderAIInsightBox,
    renderMarketContextSection,
    renderNewsSection,
    renderWhyItMatters,
    renderRiskCard,
    renderCTAButton,
    renderRegulatoryDisclaimer,
    renderEmailFooter,
    escapeHtml,
} from '../components/emailBase';

export function buildAlertEmailHtml(data: AlertEmailData): string {
    const {
        userName,
        userEmail,
        alertType,
        ticker,
        companyName,
        currentPrice,
        priceChange,
        percentageChange,
        triggerValue,
        triggerCondition,
        volume,
        averageVolume,
        marketContext,
        relevantNews,
        earningsData,
        portfolioContext,
        aiSummary,
        aiAnalysis,
        riskLevel,
        whyItMatters,
        hyperstocksUrl,
        detectedSignal,
        actionLabel,
        actionUrl,
    } = data;

    const baseStockUrl = `${hyperstocksUrl}/stocks/${ticker}`;
    const targetActionUrl = actionUrl || baseStockUrl;
    const targetActionLabel = actionLabel || `Analyze ${ticker} on HyperStocks`;
    const preferencesUrl = `${hyperstocksUrl}/dashboard`;

    let categoryBadge = 'Market Alert';
    let headerTitle = `${ticker} Intelligence Alert`;
    const headerSubtitle = `Autonomous market detection triggered for ${userName}`;
    let triggerNote = '';

    // Specialized header and trigger note based on alert type
    switch (alertType) {
        case 'price':
            categoryBadge = 'Price Milestone';
            headerTitle = `${ticker} Crossed Target Price`;
            triggerNote = `${ticker} ${triggerCondition === 'above' ? 'rose above' : 'fell below'} your $${typeof triggerValue === 'number' ? triggerValue.toFixed(2) : triggerValue} target.`;
            break;

        case 'percentage_movement':
            categoryBadge = 'Intraday Movement';
            const isUp = (percentageChange ?? 0) >= 0;
            headerTitle = `${ticker} ${isUp ? 'Surged' : 'Sank'} ${Math.abs(percentageChange ?? 0).toFixed(2)}% Today`;
            triggerNote = `Significant movement detected relative to prior session close.`;
            break;

        case 'volume':
            categoryBadge = 'Volume Outlier';
            headerTitle = `Unusual Volume Inflow: ${ticker}`;
            triggerNote = volume && averageVolume
                ? `Trading volume reached ${(volume / averageVolume).toFixed(1)}× the 30-day baseline average.`
                : `Trading volume surged abnormally during today's active session.`;
            break;

        case 'technical_signal':
            categoryBadge = 'Technical Signal';
            headerTitle = `Technical Indicator Alert: ${ticker}`;
            triggerNote = triggerNote || `Dynamic indicator cross verified on key support/resistance timeframe.`;
            break;

        case 'news':
            categoryBadge = 'News Catalyst';
            headerTitle = `High-Impact Headline Detected for ${ticker}`;
            triggerNote = `Breaking financial media coverage matched your tracked symbol.`;
            break;

        case 'earnings':
            categoryBadge = 'Earnings Catalyst';
            headerTitle = `Quarterly Earnings Update: ${ticker}`;
            triggerNote = earningsData?.quarter
                ? `${earningsData.quarter} financial disclosures published.`
                : `Financial disclosures published.`;
            break;

        case 'portfolio_risk':
            categoryBadge = 'Portfolio Risk';
            headerTitle = `Portfolio Risk Warning: ${ticker}`;
            triggerNote = portfolioContext?.positionWeight
                ? `${ticker} constitutes ${portfolioContext.positionWeight.toFixed(1)}% of your portfolio.`
                : `Idiosyncratic portfolio concentration or drawdown threshold reached.`;
            break;

        case 'ai_insight':
            categoryBadge = 'AI Signal';
            headerTitle = `Algorithmic Pattern Detected for ${ticker}`;
            triggerNote = detectedSignal || `Unusual cross-market divergence or institutional order flow pattern.`;
            break;
    }

    // Build internal body rows
    let bodyRows = '';

    // 1. Header
    bodyRows += renderEmailHeader(categoryBadge, headerTitle, headerSubtitle);

    // 2. Stock Metric Card
    bodyRows += renderStockHeaderCard(
        ticker,
        companyName,
        currentPrice,
        priceChange,
        percentageChange,
        triggerNote
    );

    // 3. Earnings Section (if earnings alert)
    if (earningsData && alertType === 'earnings') {
        const hasSurprise = earningsData.surprisePercent !== undefined;
        bodyRows += `
        <tr>
          <td style="padding: 12px 28px;">
            <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: #94a3b8; margin-bottom: 8px;">
              Financial Disclosures &amp; Expectations
            </div>
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #0f172a; border: 1px solid #1e293b; border-radius: 12px; padding: 14px 16px;">
              <tr>
                ${earningsData.revenue !== undefined ? `
                <td valign="top" style="padding-right: 12px;">
                  <div style="font-size: 10px; color: #64748b; text-transform: uppercase;">Revenue</div>
                  <div style="font-size: 14px; font-weight: 700; color: #f8fafc; margin-top: 2px;">
                    ${typeof earningsData.revenue === 'number' ? `$${earningsData.revenue.toLocaleString()}` : escapeHtml(String(earningsData.revenue))}
                  </div>
                  ${earningsData.expectedRevenue ? `<div style="font-size: 10px; color: #94a3b8;">Est: ${escapeHtml(String(earningsData.expectedRevenue))}</div>` : ''}
                </td>` : ''}
                ${earningsData.eps !== undefined ? `
                <td valign="top" style="padding-right: 12px;">
                  <div style="font-size: 10px; color: #64748b; text-transform: uppercase;">Diluted EPS</div>
                  <div style="font-size: 14px; font-weight: 700; color: #f8fafc; margin-top: 2px;">
                    $${earningsData.eps.toFixed(2)}
                  </div>
                  ${earningsData.expectedEps !== undefined ? `<div style="font-size: 10px; color: #94a3b8;">Est: $${earningsData.expectedEps.toFixed(2)}</div>` : ''}
                </td>` : ''}
                ${hasSurprise ? `
                <td valign="top">
                  <div style="font-size: 10px; color: #64748b; text-transform: uppercase;">Surprise</div>
                  <div style="font-size: 14px; font-weight: 700; color: ${earningsData.surprisePercent! >= 0 ? '#34d399' : '#f87171'}; margin-top: 2px;">
                    ${earningsData.surprisePercent! >= 0 ? '+' : ''}${earningsData.surprisePercent!.toFixed(1)}%
                  </div>
                  <div style="font-size: 10px; color: #94a3b8;">vs Consensus</div>
                </td>` : ''}
              </tr>
              ${earningsData.guidance ? `
              <tr>
                <td colspan="3" style="padding-top: 10px; margin-top: 10px; border-top: 1px solid #1e293b; font-size: 11px; color: #cbd5e1;">
                  <strong>Guidance:</strong> ${escapeHtml(earningsData.guidance)}
                </td>
              </tr>` : ''}
            </table>
          </td>
        </tr>`;
    }

    // 4. Portfolio Risk Box (if portfolio_risk alert or risk level provided)
    if (riskLevel && (alertType === 'portfolio_risk' || riskLevel === 'critical' || riskLevel === 'elevated')) {
        const riskTitle = portfolioContext?.concentrationRisk || `Risk Exposure Assessment`;
        const riskExp = portfolioContext?.positionWeight
            ? `${ticker} represents ${portfolioContext.positionWeight.toFixed(1)}% of your portfolio. High single-holding concentration elevates vulnerability to adverse moves.`
            : `Elevated volatility or concentration parameters detected. Review holding allocations and stop-loss buffer thresholds.`;
        bodyRows += renderRiskCard(riskTitle, riskLevel, riskExp);
    }

    // 5. Market Context
    bodyRows += renderMarketContextSection(marketContext, volume, averageVolume);

    // 6. AI Insight Box (Distinguished from historical fact)
    const aiText = aiAnalysis || aiSummary || `Quantitative analysis indicates notable shift in order flow volume and momentum for ${ticker}. Monitor intraday price action against key benchmark averages.`;
    bodyRows += renderAIInsightBox(`HyperStocks AI Synthesis`, aiText, `Institutional Model`);

    // 7. Verified News
    if (relevantNews && relevantNews.length > 0) {
        bodyRows += renderNewsSection(relevantNews);
    }

    // 8. Why This Matters
    if (whyItMatters) {
        bodyRows += renderWhyItMatters(whyItMatters);
    }

    // 9. CTA Button
    bodyRows += renderCTAButton(targetActionLabel, targetActionUrl);

    // 10. Disclaimer
    bodyRows += renderRegulatoryDisclaimer();

    // 11. Footer
    bodyRows += renderEmailFooter(userName, userEmail, preferencesUrl);

    return renderEmailShell(bodyRows, `${headerTitle} - HyperStocks Market Intelligence`);
}

export function generateAlertSubject(data: AlertEmailData): string {
    const { ticker, alertType, percentageChange, triggerValue, triggerCondition, detectedSignal } = data;

    switch (alertType) {
        case 'price':
            const direction = triggerCondition === 'below' ? 'below' : 'above';
            return `🔔 ${ticker} crossed ${direction} your $${typeof triggerValue === 'number' ? triggerValue.toFixed(2) : triggerValue} price alert`;

        case 'percentage_movement':
            const isUp = (percentageChange ?? 0) >= 0;
            const pct = Math.abs(percentageChange ?? 0).toFixed(1);
            return isUp ? `📈 ${ticker} moved +${pct}% today` : `🔴 ${ticker} dropped ${pct}% today`;

        case 'volume':
            return `⚡ Unusual volume spike detected for ${ticker}`;

        case 'technical_signal':
            return `📊 Technical signal triggered on ${ticker}`;

        case 'news':
            return `📰 Important news detected for ${ticker}`;

        case 'earnings':
            return `📑 Earnings announcement update for ${ticker}`;

        case 'portfolio_risk':
            return `⚠️ Alert: Your portfolio risk threshold reached on ${ticker}`;

        case 'ai_insight':
            return detectedSignal
                ? `🤖 AI Alert: ${detectedSignal} on ${ticker}`
                : `🤖 HyperStocks AI detected an unusual market signal for ${ticker}`;

        default:
            return `🔔 HyperStocks Alert: ${ticker} market intelligence`;
    }
}
