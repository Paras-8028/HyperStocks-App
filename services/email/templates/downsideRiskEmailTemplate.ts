import { AlertEmailData } from '@/types/email';
import { escapeHtml } from '@/services/email/templates/watchlistNewsEmailTemplate';
import { DownsideRiskAssessment } from '@/types/risk';

export function buildDownsideRiskEmailHtml(data: AlertEmailData): string {
    const {
        userName,
        userEmail,
        ticker,
        companyName = ticker,
        currentPrice,
        priceChange,
        percentageChange,
        hyperstocksUrl = 'https://hyper-stocks-app.vercel.app',
        riskAssessment,
    } = data;

    const baseStockUrl = `${hyperstocksUrl}/stocks/${ticker}`;
    const settingsUrl = `${hyperstocksUrl}/settings`;
    const unsubscribeUrl = `${hyperstocksUrl}/api/notifications/unsubscribe?email=${encodeURIComponent(userEmail)}`;
    const formattedDate = new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });

    const isNegative = (percentageChange ?? 0) < 0;
    const changeSign = (priceChange ?? 0) >= 0 ? '+' : '';
    const percentChangeSign = (percentageChange ?? 0) >= 0 ? '+' : '';

    const conditions = riskAssessment?.triggeredConditions || [];
    const overallSeverity = (riskAssessment?.overallRiskSeverity || 'warning').toUpperCase();

    const severityColor =
        overallSeverity === 'CRITICAL' ? '#FF5470' : overallSeverity === 'WARNING' ? '#FFB800' : '#7C5CFF';

    // Render triggered conditions rows
    const conditionsHtml =
        conditions.length > 0
            ? conditions
                  .map(
                      (c) => `
        <div style="background-color: #0d1226; border: 1px solid rgba(124, 92, 255, 0.25); border-left: 4px solid ${
            c.severity === 'critical' ? '#FF5470' : '#FFB800'
        }; border-radius: 10px; padding: 14px 16px; margin-bottom: 10px;">
          <table border="0" cellpadding="0" cellspacing="0" width="100%">
            <tr>
              <td style="font-size: 13px; font-weight: 700; color: #ffffff;">
                ${escapeHtml(c.title)}
              </td>
              <td align="right" style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: ${
                  c.severity === 'critical' ? '#FF5470' : '#FFB800'
              }; letter-spacing: 0.5px;">
                ${escapeHtml(c.severity)}
              </td>
            </tr>
            <tr>
              <td colspan="2" style="font-size: 12px; color: #cbd5e1; padding-top: 6px; line-height: 1.5;">
                ${escapeHtml(c.evidence)}
              </td>
            </tr>
            <tr>
              <td colspan="2" style="font-size: 11px; color: #94a3b8; padding-top: 6px;">
                <span style="color: #35D6FF;">Window:</span> ${escapeHtml(c.observationWindow)} &nbsp;|&nbsp;
                <span style="color: #35D6FF;">Threshold:</span> ${escapeHtml(c.thresholdApplied)}
              </td>
            </tr>
          </table>
        </div>`
                  )
                  .join('')
            : `<div style="background-color: #0d1226; border: 1px solid rgba(124, 92, 255, 0.2); border-radius: 10px; padding: 14px; font-size: 12px; color: #94a3b8;">
          General technical downside volatility alert triggered for ${escapeHtml(ticker)}.
        </div>`;

    // Indicators table
    const var95 = riskAssessment?.historicalVaR95?.displayValue || 'N/A';
    const cvar95 = riskAssessment?.historicalCVaR95?.displayValue || 'N/A';
    const mdd = riskAssessment?.maximumDrawdown?.displayValue || 'N/A';
    const vol21 = riskAssessment?.historicalVolatility21d?.displayValue || 'N/A';
    const volRatio = riskAssessment?.volatilityExpansion?.displayValue || 'N/A';
    const maStatus = riskAssessment?.movingAverageBreakdown?.displayValue || 'N/A';

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>HyperStocks Downside Risk Alert - ${escapeHtml(ticker)}</title>
  <style>
    body { margin: 0; padding: 0; background-color: #050816; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f8fafc; }
    table { border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    a { color: #35D6FF; text-decoration: none; }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #050816; color: #f8fafc;">
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #050816;">
    <tr>
      <td align="center" style="padding: 24px 12px;">
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #090D22; border: 1px solid rgba(124, 92, 255, 0.3); border-radius: 16px; overflow: hidden; box-shadow: 0 20px 40px rgba(0, 0, 0, 0.8);">
          
          <!-- Header -->
          <tr>
            <td style="padding: 28px 28px 20px 28px; background: linear-gradient(180deg, rgba(124, 92, 255, 0.15) 0%, rgba(9, 13, 34, 0) 100%); border-bottom: 1px solid rgba(124, 92, 255, 0.2);">
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td>
                    <span style="font-size: 20px; font-weight: 900; letter-spacing: -0.5px; color: #ffffff;">
                      HYPER<span style="color: #7C5CFF;">STOCKS</span>
                    </span>
                    <span style="display: inline-block; margin-left: 10px; background-color: rgba(255, 84, 112, 0.15); border: 1px solid rgba(255, 84, 112, 0.4); color: ${severityColor}; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.8px; padding: 3px 8px; border-radius: 9999px;">
                      DOWNSIDE RISK • ${escapeHtml(overallSeverity)}
                    </span>
                  </td>
                </tr>
                <tr>
                  <td style="padding-top: 14px;">
                    <h1 style="margin: 0; font-size: 22px; font-weight: 800; color: #ffffff; letter-spacing: -0.3px;">
                      ${escapeHtml(ticker)} Downside Risk Alert
                    </h1>
                    <p style="margin: 4px 0 0 0; font-size: 12px; color: #94a3b8;">
                      Quantitative monitoring detection for ${escapeHtml(userName)} &bull; ${escapeHtml(formattedDate)}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Stock Price Bar -->
          <tr>
            <td style="padding: 20px 28px 10px 28px;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #0d1226; border: 1px solid rgba(124, 92, 255, 0.2); border-radius: 12px; padding: 14px 18px;">
                <tr>
                  <td>
                    <div style="font-size: 16px; font-weight: 800; color: #ffffff;">${escapeHtml(ticker)}</div>
                    <div style="font-size: 12px; color: #94a3b8;">${escapeHtml(companyName)}</div>
                  </td>
                  <td align="right">
                    <div style="font-size: 18px; font-weight: 800; color: #ffffff;">$${currentPrice.toFixed(2)}</div>
                    <div style="font-size: 12px; font-weight: 700; color: ${isNegative ? '#FF5470' : '#3DFFA0'};">
                      ${changeSign}${priceChange?.toFixed(2) || '0.00'} (${percentChangeSign}${percentageChange?.toFixed(2) || '0.00'}%)
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Triggered Risk Conditions -->
          <tr>
            <td style="padding: 10px 28px 10px 28px;">
              <h2 style="font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.8px; color: #35D6FF; margin: 0 0 10px 0;">
                Triggered Quantitative Conditions
              </h2>
              ${conditionsHtml}
            </td>
          </tr>

          <!-- Key Metrics Grid -->
          <tr>
            <td style="padding: 10px 28px 20px 28px;">
              <h2 style="font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.8px; color: #7C5CFF; margin: 0 0 10px 0;">
                Quantitative Risk Indicator Summary
              </h2>
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #0d1226; border: 1px solid rgba(124, 92, 255, 0.2); border-radius: 12px;">
                <tr>
                  <td style="padding: 12px 16px; border-bottom: 1px solid rgba(124, 92, 255, 0.12); font-size: 12px; color: #94a3b8;">
                    95% Daily Historical VaR
                  </td>
                  <td align="right" style="padding: 12px 16px; border-bottom: 1px solid rgba(124, 92, 255, 0.12); font-size: 13px; font-weight: 700; color: #ffffff;">
                    ${escapeHtml(var95)}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 16px; border-bottom: 1px solid rgba(124, 92, 255, 0.12); font-size: 12px; color: #94a3b8;">
                    95% Expected Shortfall (CVaR)
                  </td>
                  <td align="right" style="padding: 12px 16px; border-bottom: 1px solid rgba(124, 92, 255, 0.12); font-size: 13px; font-weight: 700; color: #ffffff;">
                    ${escapeHtml(cvar95)}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 16px; border-bottom: 1px solid rgba(124, 92, 255, 0.12); font-size: 12px; color: #94a3b8;">
                    Historical Maximum Drawdown
                  </td>
                  <td align="right" style="padding: 12px 16px; border-bottom: 1px solid rgba(124, 92, 255, 0.12); font-size: 13px; font-weight: 700; color: #FF5470;">
                    ${escapeHtml(mdd)}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 16px; border-bottom: 1px solid rgba(124, 92, 255, 0.12); font-size: 12px; color: #94a3b8;">
                    21-Day Annualized Volatility
                  </td>
                  <td align="right" style="padding: 12px 16px; border-bottom: 1px solid rgba(124, 92, 255, 0.12); font-size: 13px; font-weight: 700; color: #ffffff;">
                    ${escapeHtml(vol21)}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 16px; border-bottom: 1px solid rgba(124, 92, 255, 0.12); font-size: 12px; color: #94a3b8;">
                    Moving Average Status
                  </td>
                  <td align="right" style="padding: 12px 16px; border-bottom: 1px solid rgba(124, 92, 255, 0.12); font-size: 12px; font-weight: 700; color: #cbd5e1;">
                    ${escapeHtml(maStatus)}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 16px; font-size: 12px; color: #94a3b8;">
                    Volatility Expansion Ratio
                  </td>
                  <td align="right" style="padding: 12px 16px; font-size: 12px; font-weight: 700; color: #cbd5e1;">
                    ${escapeHtml(volRatio)}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Primary CTA Button -->
          <tr>
            <td align="center" style="padding: 0 28px 24px 28px;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center">
                    <a href="${escapeHtml(baseStockUrl)}" target="_blank" style="display: block; background: linear-gradient(135deg, #7C5CFF 0%, #35D6FF 100%); color: #ffffff; font-size: 13px; font-weight: 800; text-align: center; padding: 14px 24px; border-radius: 12px; box-shadow: 0 4px 15px rgba(124, 92, 255, 0.4); text-transform: uppercase; letter-spacing: 0.5px;">
                      Analyze ${escapeHtml(ticker)} on HyperStocks &rarr;
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Transparent Methodology Disclaimer -->
          <tr>
            <td style="padding: 20px 28px; background-color: #060918; border-top: 1px solid rgba(124, 92, 255, 0.15);">
              <p style="margin: 0 0 8px 0; font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px;">
                Quantitative Methodology & Limitations
              </p>
              <p style="margin: 0 0 10px 0; font-size: 10px; color: #64748b; line-height: 1.5;">
                These indicators are backward-looking mathematical observations derived from historical market prices. They do not constitute an 80% or calibrated downside forecast, investment advice, or trading recommendations. Historical Value at Risk (VaR) is a 95% threshold quantile, NOT the maximum possible loss.
              </p>
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td style="font-size: 11px; color: #64748b;">
                    <a href="${escapeHtml(settingsUrl)}" style="color: #7C5CFF; text-decoration: underline;">Manage Alert Preferences</a>
                    &bull;
                    <a href="${escapeHtml(unsubscribeUrl)}" style="color: #64748b; text-decoration: underline;">Unsubscribe</a>
                  </td>
                  <td align="right" style="font-size: 10px; color: #475569;">
                    HyperStocks v3 &bull; Engine ${escapeHtml(riskAssessment?.calculationVersion || '1.0.0')}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
