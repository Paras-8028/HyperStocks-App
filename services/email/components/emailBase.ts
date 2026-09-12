import { EmailMarketContext, EmailNewsItem } from '@/types/email';

export function escapeHtml(str: string): string {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

export function renderEmailShell(content: string, preheader: string = 'HyperStocks Market Intelligence'): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="dark">
  <meta name="supported-color-schemes" content="dark">
  <title>HyperStocks Financial Intelligence</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    :root { color-scheme: dark; supported-color-schemes: dark; }
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
    body { height: 100% !important; margin: 0 !important; padding: 0 !important; width: 100% !important; background-color: #06090e; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; }
    @media only screen and (max-width: 620px) {
      .email-container { width: 100% !important; max-width: 100% !important; }
      .mobile-padding { padding-left: 16px !important; padding-right: 16px !important; }
      .stack-column { display: block !important; width: 100% !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #06090e; color: #f1f5f9;">
  <div style="display: none; font-size: 1px; color: #06090e; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden;">
    ${escapeHtml(preheader)}
  </div>

  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #06090e;">
    <tr>
      <td align="center" style="padding: 24px 12px;">
        <!-- Container -->
        <table border="0" cellpadding="0" cellspacing="0" width="100%" class="email-container" style="max-width: 580px; background-color: #0b111a; border: 1px solid #1e293b; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6);">
          ${content}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function renderEmailHeader(categoryBadge: string, title: string, subtitle?: string): string {
    return `
    <tr>
      <td style="padding: 28px 28px 20px 28px; border-bottom: 1px solid #162032; background: linear-gradient(180deg, rgba(16, 185, 129, 0.08) 0%, rgba(11, 17, 26, 0) 100%);">
        <table border="0" cellpadding="0" cellspacing="0" width="100%">
          <tr>
            <td align="left">
              <table border="0" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="font-size: 20px; font-weight: 800; letter-spacing: -0.5px; color: #ffffff;">
                    HYPER<span style="color: #10b981;">STOCKS</span>
                  </td>
                  <td style="padding-left: 12px;">
                    <span style="display: inline-block; background-color: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.35); color: #34d399; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; padding: 3px 8px; border-radius: 9999px;">
                      ${escapeHtml(categoryBadge)}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding-top: 16px;">
              <h1 style="margin: 0; font-size: 22px; font-weight: 700; color: #f8fafc; letter-spacing: -0.3px; line-height: 1.3;">
                ${escapeHtml(title)}
              </h1>
              ${subtitle ? `<p style="margin: 6px 0 0 0; font-size: 13px; color: #94a3b8; line-height: 1.5;">${escapeHtml(subtitle)}</p>` : ''}
            </td>
          </tr>
        </table>
      </td>
    </tr>`;
}

export function renderStockHeaderCard(
    ticker: string,
    companyName?: string,
    price?: number,
    change?: number,
    percentChange?: number,
    triggerNote?: string
): string {
    const isPositive = (change ?? 0) >= 0;
    const changeColor = isPositive ? '#34d399' : '#f87171';
    const changePrefix = isPositive ? '+' : '';
    const formattedPrice = price !== undefined ? `$${price.toFixed(2)}` : '--';
    const formattedChange = change !== undefined ? `${changePrefix}$${change.toFixed(2)}` : '';
    const formattedPct = percentChange !== undefined ? `(${changePrefix}${percentChange.toFixed(2)}%)` : '';

    return `
    <tr>
      <td style="padding: 24px 28px 12px 28px;">
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #0f172a; border: 1px solid #1e293b; border-radius: 12px; padding: 18px 20px;">
          <tr>
            <td valign="middle">
              <div style="font-size: 24px; font-weight: 800; color: #f8fafc; letter-spacing: -0.5px;">
                ${escapeHtml(ticker)}
              </div>
              ${companyName ? `<div style="font-size: 12px; color: #94a3b8; margin-top: 2px;">${escapeHtml(companyName)}</div>` : ''}
            </td>
            <td align="right" valign="middle">
              <div style="font-size: 22px; font-weight: 700; color: #f8fafc; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;">
                ${formattedPrice}
              </div>
              <div style="font-size: 13px; font-weight: 600; color: ${changeColor}; margin-top: 2px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;">
                ${formattedChange} ${formattedPct}
              </div>
            </td>
          </tr>
          ${triggerNote ? `
          <tr>
            <td colspan="2" style="padding-top: 14px; margin-top: 14px; border-top: 1px solid #1e293b;">
              <div style="font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: #10b981;">
                Alert Trigger
              </div>
              <div style="font-size: 13px; color: #cbd5e1; margin-top: 2px;">
                ${escapeHtml(triggerNote)}
              </div>
            </td>
          </tr>` : ''}
        </table>
      </td>
    </tr>`;
}

export function renderAIInsightBox(title: string, insight: string, conviction?: string): string {
    return `
    <tr>
      <td style="padding: 12px 28px;">
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background: linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(15, 23, 42, 0.6) 100%); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 12px; padding: 18px 20px;">
          <tr>
            <td>
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="left" style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: #34d399;">
                    ✦ ${escapeHtml(title)}
                  </td>
                  ${conviction ? `
                  <td align="right">
                    <span style="background-color: rgba(16, 185, 129, 0.2); color: #6ee7b7; font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 4px; font-family: ui-monospace, monospace;">
                      ${escapeHtml(conviction)}
                    </span>
                  </td>` : ''}
                </tr>
              </table>
              <div style="font-size: 13px; color: #e2e8f0; line-height: 1.6; margin-top: 8px;">
                ${escapeHtml(insight)}
              </div>
              <div style="font-size: 10px; color: #64748b; margin-top: 10px; font-style: italic;">
                Algorithmic synthesis powered by Google Gemini • Distinct from historical fact
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>`;
}

export function renderMarketContextSection(context?: EmailMarketContext, volume?: number, avgVolume?: number): string {
    if (!context && !volume) return '';

    const hasIndices = context?.sp500Change !== undefined || context?.nasdaqChange !== undefined;
    const hasSector = context?.sectorName && context?.sectorPerformance !== undefined;
    const hasVolume = volume !== undefined;

    return `
    <tr>
      <td style="padding: 12px 28px;">
        <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: #94a3b8; margin-bottom: 8px;">
          Market & Macro Context
        </div>
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #0f172a; border: 1px solid #1e293b; border-radius: 12px; padding: 14px 16px;">
          <tr>
            ${hasIndices ? `
            <td valign="top" style="padding-right: 12px;">
              <div style="font-size: 10px; color: #64748b; text-transform: uppercase;">Benchmark Indices</div>
              <div style="font-size: 12px; font-weight: 600; color: #e2e8f0; margin-top: 4px;">
                ${context?.sp500Change !== undefined ? `S&P 500: <span style="color: ${context.sp500Change >= 0 ? '#34d399' : '#f87171'}">${context.sp500Change >= 0 ? '+' : ''}${context.sp500Change.toFixed(2)}%</span>` : ''}
              </div>
              <div style="font-size: 12px; font-weight: 600; color: #e2e8f0; margin-top: 2px;">
                ${context?.nasdaqChange !== undefined ? `NASDAQ: <span style="color: ${context.nasdaqChange >= 0 ? '#34d399' : '#f87171'}">${context.nasdaqChange >= 0 ? '+' : ''}${context.nasdaqChange.toFixed(2)}%</span>` : ''}
              </div>
            </td>` : ''}
            ${hasSector ? `
            <td valign="top" style="padding-right: 12px;">
              <div style="font-size: 10px; color: #64748b; text-transform: uppercase;">Sector Trend</div>
              <div style="font-size: 12px; font-weight: 600; color: #e2e8f0; margin-top: 4px;">
                ${escapeHtml(context.sectorName!)}
              </div>
              <div style="font-size: 12px; font-weight: 600; color: ${context.sectorPerformance! >= 0 ? '#34d399' : '#f87171'}; margin-top: 2px;">
                ${context.sectorPerformance! >= 0 ? '+' : ''}${context.sectorPerformance!.toFixed(2)}%
              </div>
            </td>` : ''}
            ${hasVolume ? `
            <td valign="top">
              <div style="font-size: 10px; color: #64748b; text-transform: uppercase;">Trading Volume</div>
              <div style="font-size: 12px; font-weight: 600; color: #e2e8f0; margin-top: 4px; font-family: ui-monospace, monospace;">
                ${volume?.toLocaleString() || '--'}
              </div>
              ${avgVolume ? `
              <div style="font-size: 11px; color: #94a3b8; margin-top: 2px;">
                Avg: ${avgVolume.toLocaleString()}
              </div>` : ''}
            </td>` : ''}
          </tr>
        </table>
      </td>
    </tr>`;
}

export function renderNewsSection(news?: EmailNewsItem[]): string {
    if (!news || news.length === 0) return '';

    return `
    <tr>
      <td style="padding: 12px 28px;">
        <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: #94a3b8; margin-bottom: 8px;">
          Relevant Verified News
        </div>
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #0f172a; border: 1px solid #1e293b; border-radius: 12px;">
          ${news.slice(0, 3).map((item, idx) => `
            <tr>
              <td style="padding: 12px 16px; ${idx > 0 ? 'border-top: 1px solid #1e293b;' : ''}">
                <div style="font-size: 10px; color: #34d399; font-weight: 600; text-transform: uppercase;">
                  ${escapeHtml(item.source)}
                </div>
                <div style="font-size: 13px; font-weight: 600; color: #f1f5f9; margin-top: 2px; line-height: 1.4;">
                  ${item.url ? `<a href="${escapeHtml(item.url)}" target="_blank" style="color: #f1f5f9; text-decoration: none;">${escapeHtml(item.headline)}</a>` : escapeHtml(item.headline)}
                </div>
                ${item.summary ? `<div style="font-size: 11px; color: #94a3b8; margin-top: 4px; line-height: 1.4;">${escapeHtml(item.summary.slice(0, 140))}${item.summary.length > 140 ? '...' : ''}</div>` : ''}
              </td>
            </tr>
          `).join('')}
        </table>
      </td>
    </tr>`;
}

export function renderWhyItMatters(explanation: string): string {
    return `
    <tr>
      <td style="padding: 12px 28px;">
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: rgba(30, 41, 59, 0.4); border-left: 3px solid #10b981; border-radius: 4px 8px 8px 4px; padding: 14px 16px;">
          <tr>
            <td>
              <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: #34d399;">
                Why This Matters To You
              </div>
              <div style="font-size: 13px; color: #cbd5e1; line-height: 1.5; margin-top: 4px;">
                ${escapeHtml(explanation)}
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>`;
}

export function renderRiskCard(title: string, riskLevel: string, explanation: string): string {
    const isCritical = riskLevel.toLowerCase() === 'critical' || riskLevel.toLowerCase() === 'elevated';
    const borderColor = isCritical ? 'rgba(239, 68, 68, 0.4)' : 'rgba(245, 158, 11, 0.4)';
    const badgeBg = isCritical ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)';
    const badgeColor = isCritical ? '#f87171' : '#fbbf24';

    return `
    <tr>
      <td style="padding: 12px 28px;">
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #0f172a; border: 1px solid ${borderColor}; border-radius: 12px; padding: 16px 18px;">
          <tr>
            <td>
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="left" style="font-size: 13px; font-weight: 700; color: #f8fafc;">
                    ⚠ ${escapeHtml(title)}
                  </td>
                  <td align="right">
                    <span style="background-color: ${badgeBg}; color: ${badgeColor}; font-size: 10px; font-weight: 700; text-transform: uppercase; padding: 2px 7px; border-radius: 4px;">
                      ${escapeHtml(riskLevel)}
                    </span>
                  </td>
                </tr>
              </table>
              <div style="font-size: 12px; color: #94a3b8; line-height: 1.5; margin-top: 8px;">
                ${escapeHtml(explanation)}
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>`;
}

export function renderCTAButton(text: string, url: string): string {
    return `
    <tr>
      <td align="center" style="padding: 24px 28px 12px 28px;">
        <table border="0" cellpadding="0" cellspacing="0">
          <tr>
            <td align="center" style="border-radius: 10px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); box-shadow: 0 4px 14px rgba(16, 185, 129, 0.3);">
              <a href="${escapeHtml(url)}" target="_blank" style="font-size: 14px; font-weight: 700; color: #022c22; text-decoration: none; padding: 13px 32px; display: inline-block; letter-spacing: 0.2px;">
                ${escapeHtml(text)} &rarr;
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>`;
}

export function renderRegulatoryDisclaimer(): string {
    return `
    <tr>
      <td style="padding: 20px 28px 12px 28px; border-top: 1px solid #162032;">
        <div style="font-size: 11px; color: #475569; line-height: 1.5; background-color: #080d14; border: 1px solid #1e293b; border-radius: 8px; padding: 12px 14px;">
          <strong style="color: #64748b;">Regulatory Notice:</strong> This information is provided for informational and educational purposes only and does not constitute personalized investment advice, endorsements, or broker-dealer solicitations. Market conditions can change rapidly, and AI-generated models are probabilistic interpretations. Always perform independent due diligence before making investment decisions.
        </div>
      </td>
    </tr>`;
}

export function renderEmailFooter(userName: string, userEmail: string, preferencesUrl: string): string {
    return `
    <tr>
      <td style="padding: 16px 28px 24px 28px; text-align: center;">
        <div style="font-size: 11px; color: #64748b; line-height: 1.5;">
          This personalized briefing was dispatched to <strong>${escapeHtml(userEmail)}</strong> for <strong>${escapeHtml(userName)}</strong> via HyperStocks Intelligence.
        </div>
        <div style="font-size: 11px; color: #64748b; margin-top: 8px;">
          <a href="${escapeHtml(preferencesUrl)}" style="color: #10b981; text-decoration: none;">Manage Alert Preferences</a> • 
          <a href="${escapeHtml(preferencesUrl)}" style="color: #94a3b8; text-decoration: none;">Unsubscribe from Digests</a>
        </div>
        <div style="font-size: 10px; color: #334155; margin-top: 12px;">
          &copy; ${new Date().getFullYear()} HyperStocks Intelligence Systems Inc. All rights reserved.
        </div>
      </td>
    </tr>`;
}
