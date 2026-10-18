import { WatchlistArticle, WatchlistNewsResult } from '@/services/news/WatchlistNewsService';

export interface WatchlistEmailTemplateOptions {
    recipientName?: string;
    recipientEmail?: string;
    dateStr: string;
    generationTimeStr?: string;
    result: WatchlistNewsResult;
    unsubscribeUrl?: string;
    appUrl?: string;
}

/**
 * Escapes HTML characters to prevent HTML injection attacks
 */
export function escapeHtml(str: string = ''): string {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

/**
 * Validates that an article URL is a safe HTTP/HTTPS URL
 */
function sanitizeUrl(url?: string): string {
    if (!url) return '#';
    const trimmed = url.trim();
    if (/^https?:\/\//i.test(trimmed)) {
        return trimmed;
    }
    return '#';
}

/**
 * Renders the full HTML email for the Personalized Watchlist News Digest
 */
export function renderWatchlistNewsEmail(options: WatchlistEmailTemplateOptions): {
    subject: string;
    html: string;
    text: string;
} {
    const {
        recipientName = 'Investor',
        recipientEmail = '',
        dateStr,
        generationTimeStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZoneName: 'short' }),
        result,
        unsubscribeUrl = `https://hyper-stocks-app.vercel.app/api/notifications/unsubscribe?email=${encodeURIComponent(recipientEmail)}`,
        appUrl = 'https://hyper-stocks-app.vercel.app',
    } = options;

    const hasArticles = result.status === 'success' && result.articles.length > 0;
    const isNoNews = result.status === 'no_news' || (!hasArticles && result.status !== 'empty_watchlist' && result.status !== 'api_error');
    const isEmptyWatchlist = result.status === 'empty_watchlist';
    const isApiError = result.status === 'api_error';

    // Subject line requirement:
    // If relevant news: 📈 Your Watchlist News — [Date] | HyperStocks
    // If no relevant news: 📈 Your Watchlist Update — [Date] | HyperStocks
    const subject = hasArticles
        ? `📈 Your Watchlist News — ${dateStr} | HyperStocks`
        : `📈 Your Watchlist Update — ${dateStr} | HyperStocks`;

    // Colors
    const BG_DEEP = '#050816';
    const CARD_BG = '#0D1224';
    const CARD_SUBTLE = '#13192F';
    const BORDER = '#26314A';
    const PURPLE = '#7C5CFF';
    const CYAN = '#35D6FF';
    const TEXT_PRIMARY = '#F1F5F9';
    const TEXT_SECONDARY = '#94A3B8';
    const GREEN = '#3DFFA0';
    const RED = '#FF5470';
    const AMBER = '#F59E0B';

    // Watchlist chips
    const allSymbols = result.allTrackedSymbols || [];
    const symbolsWithNews = result.symbolsWithNews || [];
    const symbolsWithoutNews = result.symbolsWithoutNews || [];

    const watchlistCoverageHtml = allSymbols.length > 0 ? `
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: ${CARD_SUBTLE}; border: 1px solid ${BORDER}; border-radius: 8px; margin: 0 0 24px 0;">
            <tr>
                <td style="padding: 16px 20px;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                        <tr>
                            <td style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: ${CYAN}; padding-bottom: 8px;">
                                Tracked Watchlist Coverage (${allSymbols.length} ${allSymbols.length === 1 ? 'Stock' : 'Stocks'})
                            </td>
                        </tr>
                        <tr>
                            <td style="font-size: 14px; line-height: 1.6; color: ${TEXT_PRIMARY};">
                                ${symbolsWithNews.length > 0 ? `
                                    <div style="margin-bottom: 6px;">
                                        <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background-color: ${GREEN}; margin-right: 6px;"></span>
                                        <strong style="color: ${GREEN};">With News:</strong> 
                                        <span style="color: ${TEXT_PRIMARY}; font-weight: 600;">${symbolsWithNews.map(s => escapeHtml(s)).join(' · ')}</span>
                                    </div>
                                ` : ''}
                                ${symbolsWithoutNews.length > 0 ? `
                                    <div style="color: ${TEXT_SECONDARY}; font-size: 13px;">
                                        <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background-color: ${TEXT_SECONDARY}; margin-right: 6px;"></span>
                                        <strong>No Major Updates:</strong> 
                                        <span>${symbolsWithoutNews.map(s => escapeHtml(s)).join(' · ')}</span>
                                    </div>
                                ` : ''}
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    ` : '';

    // Render cards
    let bodyContentHtml = '';

    if (hasArticles) {
        bodyContentHtml = result.articles.map((art, idx) => {
            const rawUrl = sanitizeUrl(art.url);
            const source = escapeHtml(art.source || 'Financial News Wire');
            const headline = escapeHtml(art.headline);
            const whatHappened = escapeHtml(art.whatHappened || art.summary);
            const whyItMatters = escapeHtml(art.whyItMatters || 'This development directly impacts company operations and market sentiment.');
            const bottomLine = escapeHtml(art.bottomLine || 'Investors will monitor subsequent disclosures for operational progress.');
            const impact = art.impact || 'uncertain';

            let impactColor = CYAN;
            let impactBg = 'rgba(53, 214, 255, 0.12)';
            let impactLabel = 'Uncertain';

            if (impact === 'positive') {
                impactColor = GREEN;
                impactBg = 'rgba(61, 255, 160, 0.12)';
                impactLabel = 'Positive Bias';
            } else if (impact === 'negative') {
                impactColor = RED;
                impactBg = 'rgba(255, 84, 112, 0.12)';
                impactLabel = 'Negative Pressure';
            } else if (impact === 'mixed') {
                impactColor = AMBER;
                impactBg = 'rgba(245, 158, 11, 0.12)';
                impactLabel = 'Mixed Factors';
            }

            const formattedTime = art.datetime
                ? new Date(art.datetime).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                : 'Recent';

            // Company & ticker badges
            const stockBadges = art.relatedSymbols.map((sym, sIdx) => {
                const comp = art.relatedCompanies[sIdx] || result.allTrackedCompanies[sym] || sym;
                return `<span style="display: inline-block; background-color: #1A223C; border: 1px solid ${PURPLE}; color: ${CYAN}; font-size: 12px; font-weight: 700; padding: 4px 10px; border-radius: 4px; margin-right: 6px; margin-bottom: 6px;">${escapeHtml(comp)} (${escapeHtml(sym)})</span>`;
            }).join('');

            return `
            <!-- Article Card ${idx + 1} -->
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: ${CARD_BG}; border: 1px solid ${BORDER}; border-radius: 10px; margin-bottom: 24px;">
                <tr>
                    <td style="padding: 24px;">
                        <!-- Stock Badges -->
                        <div style="margin-bottom: 12px;">
                            ${stockBadges}
                        </div>

                        <!-- Headline -->
                        <h2 style="margin: 0 0 10px 0; font-size: 18px; font-weight: 700; color: ${TEXT_PRIMARY}; line-height: 1.4;">
                            ${headline}
                        </h2>

                        <!-- Source & Time -->
                        <p style="margin: 0 0 16px 0; font-size: 12px; color: ${TEXT_SECONDARY}; line-height: 1.4;">
                            <span style="color: ${CYAN}; font-weight: 600;">${source}</span> &nbsp;•&nbsp; ${formattedTime}
                        </p>

                        <!-- What happened -->
                        <div style="margin-bottom: 14px;">
                            <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: ${PURPLE}; margin-bottom: 4px;">
                                What Happened?
                            </div>
                            <div style="font-size: 14px; line-height: 1.6; color: ${TEXT_PRIMARY};">
                                ${whatHappened}
                            </div>
                        </div>

                        <!-- Why it matters -->
                        <div style="margin-bottom: 16px;">
                            <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: ${CYAN}; margin-bottom: 4px;">
                                Why It Matters
                            </div>
                            <div style="font-size: 14px; line-height: 1.6; color: ${TEXT_SECONDARY};">
                                ${whyItMatters}
                            </div>
                        </div>

                        <!-- Bottom Line Box -->
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #080D1D; border-left: 3px solid ${impactColor}; border-top: 1px solid ${BORDER}; border-right: 1px solid ${BORDER}; border-bottom: 1px solid ${BORDER}; border-radius: 4px; margin: 0 0 18px 0;">
                            <tr>
                                <td style="padding: 12px 16px;">
                                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                        <tr>
                                            <td style="font-size: 12px; font-weight: 700; color: ${TEXT_PRIMARY}; padding-bottom: 4px;">
                                                💡 Bottom Line &nbsp;
                                                <span style="display: inline-block; background-color: ${impactBg}; color: ${impactColor}; font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 3px; vertical-align: middle;">
                                                    ${impactLabel}
                                                </span>
                                            </td>
                                        </tr>
                                        <tr>
                                            <td style="font-size: 13px; line-height: 1.5; color: ${TEXT_SECONDARY};">
                                                ${bottomLine}
                                            </td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>
                        </table>

                        <!-- CTA Button -->
                        <div>
                            <a href="${rawUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; background-color: #17213C; border: 1px solid ${CYAN}; color: ${CYAN}; font-size: 13px; font-weight: 600; padding: 8px 16px; border-radius: 6px; text-decoration: none;">
                                Read Full Story &rarr;
                            </a>
                        </div>
                    </td>
                </tr>
            </table>
            `;
        }).join('');
    } else if (isNoNews) {
        bodyContentHtml = `
            <!-- No News Box -->
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: ${CARD_BG}; border: 1px solid ${BORDER}; border-radius: 10px; margin-bottom: 24px;">
                <tr>
                    <td style="padding: 32px 24px; text-align: center;">
                        <div style="font-size: 32px; margin-bottom: 12px;">📊</div>
                        <h2 style="margin: 0 0 10px 0; font-size: 20px; font-weight: 700; color: ${TEXT_PRIMARY};">
                            No Significant Watchlist News Today
                        </h2>
                        <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: ${TEXT_SECONDARY}; max-width: 480px; margin-left: auto; margin-right: auto;">
                            We didn't find sufficiently relevant new stories for your tracked stocks in this digest. We'll continue checking for corporate developments, earnings, filings, and analyst updates related to your Watchlist.
                        </p>
                        ${allSymbols.length > 0 ? `
                            <p style="margin: 0 0 20px 0; font-size: 13px; color: ${CYAN};">
                                <strong>Tracked stocks checked:</strong> ${allSymbols.map(s => escapeHtml(s)).join(', ')}
                            </p>
                        ` : ''}
                        <a href="${appUrl}/watchlist" target="_blank" rel="noopener noreferrer" style="display: inline-block; background: linear-gradient(135deg, ${PURPLE}, #5B3FE6); color: #FFFFFF; font-size: 13px; font-weight: 600; padding: 10px 20px; border-radius: 6px; text-decoration: none;">
                            Manage Watchlist on HyperStocks &rarr;
                        </a>
                    </td>
                </tr>
            </table>
        `;
    } else if (isEmptyWatchlist) {
        bodyContentHtml = `
            <!-- Empty Watchlist Box -->
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: ${CARD_BG}; border: 1px solid ${BORDER}; border-radius: 10px; margin-bottom: 24px;">
                <tr>
                    <td style="padding: 32px 24px; text-align: center;">
                        <div style="font-size: 32px; margin-bottom: 12px;">⭐</div>
                        <h2 style="margin: 0 0 10px 0; font-size: 20px; font-weight: 700; color: ${TEXT_PRIMARY};">
                            Personalize Your Daily Stock News
                        </h2>
                        <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: ${TEXT_SECONDARY}; max-width: 480px; margin-left: auto; margin-right: auto;">
                            Your watchlist is currently empty. Add the companies and tickers you follow (such as AAPL, TSLA, NVDA, or MSFT) to receive custom, high-relevance intelligence digests directly in your inbox.
                        </p>
                        <a href="${appUrl}/watchlist" target="_blank" rel="noopener noreferrer" style="display: inline-block; background: linear-gradient(135deg, ${PURPLE}, #5B3FE6); color: #FFFFFF; font-size: 13px; font-weight: 600; padding: 10px 20px; border-radius: 6px; text-decoration: none;">
                            Add Stocks to Watchlist &rarr;
                        </a>
                    </td>
                </tr>
            </table>
        `;
    } else if (isApiError) {
        bodyContentHtml = `
            <!-- Service Notice Box -->
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: ${CARD_BG}; border: 1px solid ${BORDER}; border-radius: 10px; margin-bottom: 24px;">
                <tr>
                    <td style="padding: 32px 24px; text-align: center;">
                        <div style="font-size: 32px; margin-bottom: 12px;">⚠️</div>
                        <h2 style="margin: 0 0 10px 0; font-size: 20px; font-weight: 700; color: ${TEXT_PRIMARY};">
                            Digest Update
                        </h2>
                        <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: ${TEXT_SECONDARY}; max-width: 480px; margin-left: auto; margin-right: auto;">
                            Our market news feed experienced a temporary delay while retrieving updates for your tracked companies (${allSymbols.map(s => escapeHtml(s)).join(', ')}). Your watchlist remains active and our automated monitors are resuming normal polling.
                        </p>
                        <a href="${appUrl}/dashboard" target="_blank" rel="noopener noreferrer" style="display: inline-block; background-color: #17213C; border: 1px solid ${CYAN}; color: ${CYAN}; font-size: 13px; font-weight: 600; padding: 10px 20px; border-radius: 6px; text-decoration: none;">
                            View Live Market Overview &rarr;
                        </a>
                    </td>
                </tr>
            </table>
        `;
    }

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="format-detection" content="telephone=no">
    <meta name="x-apple-disable-message-reformatting">
    <title>${escapeHtml(subject)}</title>
    <!--[if mso]>
    <noscript>
        <xml>
            <o:OfficeDocumentSettings>
                <o:AllowPNG/>
                <o:PixelsPerInch>96</o:PixelsPerInch>
            </o:OfficeDocumentSettings>
        </xml>
    </noscript>
    <![endif]-->
    <style type="text/css">
        body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
        table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
        img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
        
        @media only screen and (max-width: 620px) {
            .email-container {
                width: 100% !important;
                margin: 0 !important;
            }
            .mobile-outer-padding {
                padding: 16px 8px !important;
            }
            .mobile-card-padding {
                padding: 18px 14px !important;
            }
            .mobile-title {
                font-size: 20px !important;
            }
            .mobile-brand {
                font-size: 18px !important;
            }
        }
    </style>
</head>
<body style="margin: 0; padding: 0; background-color: ${BG_DEEP}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: ${TEXT_PRIMARY};">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: ${BG_DEEP};">
        <tr>
            <td align="center" class="mobile-outer-padding" style="padding: 32px 16px;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" class="email-container" style="max-width: 620px; margin: 0 auto;">
                    
                    <!-- BRAND HEADER -->
                    <tr>
                        <td style="padding: 0 0 20px 0;">
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                <tr>
                                    <td align="left" style="vertical-align: middle;">
                                        <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                                            <tr>
                                                <td style="vertical-align: middle; padding-right: 10px;">
                                                    <span style="display: inline-block; width: 32px; height: 32px; line-height: 32px; background: linear-gradient(135deg, ${PURPLE}, ${CYAN}); border-radius: 8px; text-align: center; font-size: 18px; font-weight: 800; color: #FFFFFF;">
                                                        ⚡
                                                    </span>
                                                </td>
                                                <td style="vertical-align: middle;">
                                                    <span class="mobile-brand" style="font-size: 22px; font-weight: 800; letter-spacing: -0.02em; color: ${TEXT_PRIMARY};">
                                                        Hyper<span style="color: ${CYAN};">Stocks</span>
                                                    </span>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                    <td align="right" style="vertical-align: middle; font-size: 12px; color: ${TEXT_SECONDARY};">
                                        ${escapeHtml(dateStr)}
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- HERO BANNER -->
                    <tr>
                        <td style="padding: 0 0 24px 0;">
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: linear-gradient(135deg, rgba(124, 92, 255, 0.15), rgba(53, 214, 255, 0.08)); border: 1px solid ${BORDER}; border-radius: 12px;">
                                <tr>
                                    <td class="mobile-card-padding" style="padding: 24px;">
                                        <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: ${PURPLE}; margin-bottom: 6px;">
                                            HyperStocks Intelligence Digest
                                        </div>
                                        <h1 class="mobile-title" style="margin: 0 0 8px 0; font-size: 24px; font-weight: 800; color: ${TEXT_PRIMARY}; line-height: 1.25;">
                                            Your Personalized Stock News
                                        </h1>
                                        <p style="margin: 0; font-size: 14px; line-height: 1.5; color: ${TEXT_SECONDARY};">
                                            News that matters to the stocks you're tracking. Verified corporate updates, earnings developments, and objective catalysts.
                                        </p>
                                        <div style="margin-top: 12px; font-size: 11px; color: ${TEXT_SECONDARY};">
                                            Prepared for <strong style="color: ${TEXT_PRIMARY};">${escapeHtml(recipientName)}</strong> &bull; Generated at ${escapeHtml(generationTimeStr)}
                                        </div>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- WATCHLIST COVERAGE HEADER -->
                    <tr>
                        <td>
                            ${watchlistCoverageHtml}
                        </td>
                    </tr>

                    <!-- ARTICLES OR NO-NEWS STATE -->
                    <tr>
                        <td>
                            ${bodyContentHtml}
                        </td>
                    </tr>

                    <!-- FOOTER -->
                    <tr>
                        <td style="padding: 16px 0 32px 0;">
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-top: 1px solid ${BORDER};">
                                <tr>
                                    <td style="padding-top: 24px; text-align: center; font-size: 12px; line-height: 1.6; color: ${TEXT_SECONDARY};">
                                        <p style="margin: 0 0 10px 0;">
                                            You are receiving this personalized email because you are tracking stocks on <strong style="color: ${TEXT_PRIMARY};">HyperStocks</strong>.
                                        </p>
                                        <p style="margin: 0 0 14px 0;">
                                            <a href="${unsubscribeUrl}" target="_blank" rel="noopener noreferrer" style="color: ${TEXT_SECONDARY}; text-decoration: underline; margin: 0 8px;">Unsubscribe</a> &bull;
                                            <a href="${appUrl}/watchlist" target="_blank" rel="noopener noreferrer" style="color: ${CYAN}; text-decoration: none; margin: 0 8px;">Manage Watchlist</a> &bull;
                                            <a href="${appUrl}/overview" target="_blank" rel="noopener noreferrer" style="color: ${CYAN}; text-decoration: none; margin: 0 8px;">Market Overview</a> &bull;
                                            <a href="${appUrl}" target="_blank" rel="noopener noreferrer" style="color: ${CYAN}; text-decoration: none; margin: 0 8px;">Visit HyperStocks</a>
                                        </p>
                                        <p style="margin: 0; font-size: 11px; color: #64748B;">
                                            © 2026 HyperStocks Intelligence Inc. All rights reserved.<br />
                                            Financial news summaries are factual syntheses for educational and tracking purposes only. Not investment advice.
                                        </p>
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

    // Plain text alternative
    let text = `HyperStocks — Your Personalized Stock News (${dateStr})\n\n`;
    text += `Tracked Watchlist: ${allSymbols.join(', ')}\n\n`;

    if (hasArticles) {
        result.articles.forEach((art, i) => {
            text += `[${i + 1}] ${art.relatedSymbols.join('/')}: ${art.headline}\n`;
            text += `Source: ${art.source} | Date: ${art.datetime ? new Date(art.datetime).toISOString().split('T')[0] : 'Recent'}\n`;
            text += `What happened: ${art.whatHappened || art.summary}\n`;
            text += `Why it matters: ${art.whyItMatters || 'Direct operational impact.'}\n`;
            text += `Bottom Line: ${art.bottomLine || 'Investors will track subsequent disclosures.'}\n`;
            text += `Read full story: ${art.url}\n\n`;
        });
    } else if (isNoNews) {
        text += `No Significant Watchlist News Today\nWe didn't find sufficiently relevant new stories for your tracked stocks in this digest.\n`;
    }

    text += `\nManage watchlist: ${appUrl}/watchlist\nUnsubscribe: ${unsubscribeUrl}\n© 2026 HyperStocks`;

    return {
        subject,
        html,
        text,
    };
}
