import crypto from 'crypto';

export interface SvixHeaders {
    'svix-id'?: string | null;
    'svix-timestamp'?: string | null;
    'svix-signature'?: string | null;
}

/**
 * Verifies Clerk Svix webhook signatures using standard crypto HMAC-SHA256.
 * Implements Svix signature specification with 5-minute replay attack protection.
 */
export function verifyClerkWebhookSignature({
    payload,
    headers,
    secret,
}: {
    payload: string;
    headers: SvixHeaders;
    secret: string;
}): boolean {
    const id = headers['svix-id'];
    const timestamp = headers['svix-timestamp'];
    const signature = headers['svix-signature'];

    if (!id || !timestamp || !signature || !secret) {
        return false;
    }

    // Verify timestamp tolerance (within 300 seconds / 5 minutes)
    const timestampSec = parseInt(timestamp, 10);
    const nowSec = Math.floor(Date.now() / 1000);
    if (isNaN(timestampSec) || Math.abs(nowSec - timestampSec) > 300) {
        return false;
    }

    try {
        const secretKey = secret.startsWith('whsec_') ? secret.slice(6) : secret;
        const secretBytes = Buffer.from(secretKey, 'base64');
        const signedContent = `${id}.${timestamp}.${payload}`;
        const computedSignature = crypto
            .createHmac('sha256', secretBytes)
            .update(signedContent)
            .digest('base64');

        const splitSignatures = signature.split(' ');
        for (const item of splitSignatures) {
            const [version, sig] = item.split(',');
            if (version === 'v1' && sig) {
                const expectedBuffer = Buffer.from(computedSignature, 'utf8');
                const actualBuffer = Buffer.from(sig, 'utf8');
                if (
                    expectedBuffer.length === actualBuffer.length &&
                    crypto.timingSafeEqual(expectedBuffer, actualBuffer)
                ) {
                    return true;
                }
            }
        }
    } catch {
        return false;
    }

    return false;
}
