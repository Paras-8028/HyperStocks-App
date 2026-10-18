import { DailyDigestEmailData } from '@/types/email';
import {
    renderEmailShell,
    renderEmailHeader,
    renderAIInsightBox,
    renderCTAButton,
    renderRegulatoryDisclaimer,
    renderEmailFooter,
    escapeHtml,
} from '../components/emailBase';

export function buildDailyDigestEmailHtml(data: DailyDigestEmailData): string {
    const {
        userName,
        userEmail,
        date,
        marketOverview,
        aiMarketSummary,
        watchlistMovers,
        portfolioSummary,
        topNews,
        catalystsToWatch,
        hyperstocksUrl,
    } = data;

    const dashboardUrl = `${hyperstocksUrl}/dashboard`;
    const preferencesUrl = `${hyperstocksUrl}/dashboard`;

    let bodyRows = '';

    // 1. Header
    bodyRows += renderEmailHeader(
        'Daily Briefing',
        `Good morning, ${userName}`,
        `Your HyperStocks Daily Market Intelligence • ${date}`
    );

    // 2. AI Market Summary
    bodyRows += renderAIInsightBox(
        'AI Macro Synthesis',
        aiMarketSummary,
        'Daily Morning Edition'
    );

    // 3. Market Overview: Indices & Top Sectors
    bodyRows += `
    <tr>
      <td style="padding: 12px 28px;">
        <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: #94a3b8; margin-bottom: 8px;">
          Market Overview &amp; Key Benchmarks
        </div>
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #0f172a; border: 1px solid #1e293b; border-radius: 12px; padding: 14px 16px;">
          <tr>
            <td colspan="3" style="padding-bottom: 10px; font-size: 12px; color: #cbd5e1; border-bottom: 1px solid #1e293b;">
              <strong>Direction:</strong> ${escapeHtml(marketOverview.directionSummary)}
            </td>
          </tr>
          <tr>
            <td colspan="3" style="padding-top: 10px;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  ${marketOverview.indices.map((idx) => {
                      const isUp = idx.percentChange >= 0;
                      return `
                      <td valign="top" style="padding: 4px 6px;">
                        <div style="font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 600;">${escapeHtml(idx.name)}</div>
                        <div style="font-size: 13px; font-weight: 700; color: #f8fafc; font-family: ui-monospace, monospace; margin-top: 2px;">
                          ${idx.value.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 })}
                        </div>
                        <div style="font-size: 11px; font-weight: 600; color: ${isUp ? '#34d399' : '#f87171'}; font-family: ui-monospace, monospace;">
                          ${isUp ? '+' : ''}${idx.percentChange.toFixed(2)}%
                        </div>
                      </td>`;
                  }).join('')}
                </tr>
              </table>
            </td>
          </tr>
          ${marketOverview.topSectors && marketOverview.topSectors.length > 0 ? `
          <tr>
            <td colspan="3" style="padding-top: 10px; border-top: 1px solid #1e293b;">
              <div style="font-size: 10px; color: #64748b; text-transform: uppercase; margin-bottom: 4px;">Sector Momentum:</div>
              <div style="font-size: 11px; color: #94a3b8;">
                ${marketOverview.topSectors.map((s) => `
                  <span style="display: inline-block; margin-right: 10px;">
                    ${escapeHtml(s.name)}: <strong style="color: ${s.change >= 0 ? '#34d399' : '#f87171'}">${s.change >= 0 ? '+' : ''}${s.change.toFixed(1)}%</strong>
                  </span>
                `).join('')}
              </div>
            </td>
          </tr>` : ''}
        </table>
      </td>
    </tr>`;

    // 4. Portfolio Performance Section (if available)
    if (portfolioSummary) {
        const isGain = portfolioSummary.dailyGainLossPercent >= 0;
        bodyRows += `
        <tr>
          <td style="padding: 12px 28px;">
            <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: #94a3b8; margin-bottom: 8px;">
              Your Portfolio Snapshot
            </div>
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #0f172a; border: 1px solid #1e293b; border-radius: 12px; padding: 14px 16px;">
              <tr>
                <td valign="middle">
                  <div style="font-size: 10px; color: #64748b; text-transform: uppercase;">Total Valuation</div>
                  <div style="font-size: 18px; font-weight: 800; color: #f8fafc; font-family: ui-monospace, monospace; margin-top: 2px;">
                    $${portfolioSummary.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
                </td>
                <td align="right" valign="middle">
                  <div style="font-size: 10px; color: #64748b; text-transform: uppercase;">Session Change</div>
                  <div style="font-size: 15px; font-weight: 700; color: ${isGain ? '#34d399' : '#f87171'}; font-family: ui-monospace, monospace; margin-top: 2px;">
                    ${isGain ? '+' : ''}$${Math.abs(portfolioSummary.dailyGainLoss).toLocaleString(undefined, { minimumFractionDigits: 2 })} (${isGain ? '+' : ''}${portfolioSummary.dailyGainLossPercent.toFixed(2)}%)
                  </div>
                </td>
              </tr>
              ${portfolioSummary.topContributor || portfolioSummary.topDetractor ? `
              <tr>
                <td colspan="2" style="padding-top: 10px; border-top: 1px solid #1e293b; font-size: 11px; color: #94a3b8;">
                  ${portfolioSummary.topContributor ? `<span style="margin-right: 12px;">Top Contributor: <strong style="color: #34d399;">${escapeHtml(portfolioSummary.topContributor)}</strong></span>` : ''}
                  ${portfolioSummary.topDetractor ? `<span>Top Detractor: <strong style="color: #f87171;">${escapeHtml(portfolioSummary.topDetractor)}</strong></span>` : ''}
                </td>
              </tr>` : ''}
              ${portfolioSummary.keyRiskNotice ? `
              <tr>
                <td colspan="2" style="padding-top: 8px; font-size: 11px; color: #f59e0b;">
                  ⚠ ${escapeHtml(portfolioSummary.keyRiskNotice)}
                </td>
              </tr>` : ''}
            </table>
          </td>
        </tr>`;
    }

    // 5. Watchlist Movements
    if (watchlistMovers && watchlistMovers.length > 0) {
        bodyRows += `
        <tr>
          <td style="padding: 12px 28px;">
            <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: #94a3b8; margin-bottom: 8px;">
              Your Watchlist Top Movements
            </div>
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #0f172a; border: 1px solid #1e293b; border-radius: 12px;">
              ${watchlistMovers.slice(0, 5).map((stock, idx) => {
                  const isUp = stock.percentChange >= 0;
                  return `
                  <tr>
                    <td style="padding: 10px 16px; ${idx > 0 ? 'border-top: 1px solid #1e293b;' : ''}">
                      <strong style="color: #f8fafc; font-size: 13px;">${escapeHtml(stock.symbol)}</strong>
                      ${stock.companyName ? `<span style="color: #64748b; font-size: 11px; margin-left: 6px;">${escapeHtml(stock.companyName)}</span>` : ''}
                    </td>
                    <td align="right" style="padding: 10px 16px; ${idx > 0 ? 'border-top: 1px solid #1e293b;' : ''} font-family: ui-monospace, monospace; font-size: 12px;">
                      <span style="color: #e2e8f0; margin-right: 8px;">$${stock.price.toFixed(2)}</span>
                      <strong style="color: ${isUp ? '#34d399' : '#f87171'};">${isUp ? '+' : ''}${stock.percentChange.toFixed(2)}%</strong>
                    </td>
                  </tr>`;
              }).join('')}
            </table>
          </td>
        </tr>`;
    }

    // 6. Top News
    if (topNews && topNews.length > 0) {
        bodyRows += `
        <tr>
          <td style="padding: 12px 28px;">
            <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: #94a3b8; margin-bottom: 8px;">
              Top Market Headlines
            </div>
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #0f172a; border: 1px solid #1e293b; border-radius: 12px;">
              ${topNews.slice(0, 3).map((item, idx) => `
                <tr>
                  <td style="padding: 12px 16px; ${idx > 0 ? 'border-top: 1px solid #1e293b;' : ''}">
                    <div style="font-size: 10px; color: #34d399; font-weight: 600; text-transform: uppercase;">
                      ${escapeHtml(item.source)}
                    </div>
                    <div style="font-size: 13px; font-weight: 600; color: #f1f5f9; margin-top: 2px;">
                      <a href="${escapeHtml(item.url || dashboardUrl)}" target="_blank" style="color: #f1f5f9; text-decoration: none;">
                        ${escapeHtml(item.headline)}
                      </a>
                    </div>
                  </td>
                </tr>
              `).join('')}
            </table>
          </td>
        </tr>`;
    }

    // 7. What to Watch (Upcoming Catalysts)
    if (catalystsToWatch && catalystsToWatch.length > 0) {
        bodyRows += `
        <tr>
          <td style="padding: 12px 28px;">
            <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: #94a3b8; margin-bottom: 8px;">
              What To Watch Today
            </div>
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #0f172a; border: 1px solid #1e293b; border-radius: 12px; padding: 12px 16px;">
              ${catalystsToWatch.map((item) => `
                <tr>
                  <td style="padding: 6px 0;">
                    <div style="font-size: 12px; color: #e2e8f0; font-weight: 600;">
                      • ${escapeHtml(item.title)} <span style="color: #94a3b8; font-size: 11px; font-weight: 400;">(${escapeHtml(item.dateOrTime)})</span>
                    </div>
                    <div style="font-size: 11px; color: #64748b; padding-left: 10px; margin-top: 2px;">
                      ${escapeHtml(item.impact)}
                    </div>
                  </td>
                </tr>
              `).join('')}
            </table>
          </td>
        </tr>`;
    }

    // 8. CTA
    bodyRows += renderCTAButton('Open HyperStocks Terminal', dashboardUrl);

    // 9. Disclaimer & Footer
    bodyRows += renderRegulatoryDisclaimer();
    bodyRows += renderEmailFooter(userName, userEmail, preferencesUrl);

    return renderEmailShell(bodyRows, `HyperStocks Daily Financial Briefing • ${date}`);
}
