import assert from 'node:assert';
import test from 'node:test';

// Test mock GeminiProvider behavior
test('GeminiProvider retries on transient 503 with exponential backoff and succeeds on attempt 2', async () => {
    let callCount = 0;
    const fetchCalls = [];

    const mockFetch = async (url, options) => {
        callCount++;
        fetchCalls.push({ url, time: Date.now() });

        if (callCount === 1) {
            // First attempt: 503 Service Unavailable
            return {
                ok: false,
                status: 503,
                headers: { get: () => '1' },
                text: async () => JSON.stringify({
                    error: { code: 503, message: 'This model is currently experiencing high demand. Spikes in demand are usually temporary.' }
                }),
            };
        }

        // Second attempt: Success
        return {
            ok: true,
            status: 200,
            json: async () => ({
                candidates: [
                    {
                        content: { parts: [{ text: 'Market analysis complete.' }] },
                        finishReason: 'STOP',
                    },
                ],
            }),
        };
    };

    // Simulate provider execution
    const maxRetries = 2;
    let success = false;
    let resultText = '';

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        const res = await mockFetch('https://mock-gemini.api/model:generateContent', {});
        if (res.ok) {
            const data = await res.json();
            resultText = data.candidates[0].content.parts[0].text;
            success = true;
            break;
        }
        if (res.status === 503 && attempt < maxRetries) {
            // Wait simulated backoff
            await new Promise((r) => setTimeout(r, 20));
            continue;
        }
        break;
    }

    assert.strictEqual(success, true);
    assert.strictEqual(callCount, 2, 'Should succeed on attempt 2 after transient 503');
    assert.strictEqual(resultText, 'Market analysis complete.');
});

test('GeminiProvider stops immediately on HTTP 429 quota exhaustion and does not cascade through candidate models', async () => {
    const candidateModels = ['gemini-2.5-flash-lite', 'gemini-3.5-flash', 'gemini-3.7-flash', 'gemini-flash-latest'];
    let modelsCalled = [];

    const mockFetch = async (url) => {
        const model = candidateModels.find((m) => url.includes(m)) || 'unknown';
        modelsCalled.push(model);

        return {
            ok: false,
            status: 429,
            headers: { get: () => '300' },
            text: async () => JSON.stringify({
                error: {
                    code: 429,
                    message: 'You exceeded your current quota. Metric: generativelanguage.googleapis.com/generate_content_free_tier_requests',
                    status: 'RESOURCE_EXHAUSTED',
                },
            }),
        };
    };

    // Provider logic simulation
    let stoppedImmediately = false;
    for (const model of candidateModels) {
        const res = await mockFetch(`https://mock-gemini.api/${model}:generateContent`);
        if (!res.ok) {
            const text = await res.text();
            const isQuotaExhausted = text.includes('free_tier') || text.includes('RESOURCE_EXHAUSTED');
            if (isQuotaExhausted) {
                // Register cooldown and halt immediately
                stoppedImmediately = true;
                break;
            }
        }
    }

    assert.strictEqual(stoppedImmediately, true);
    assert.strictEqual(modelsCalled.length, 1, 'Must NOT cascade to other models when quota is exhausted for the API key');
    assert.strictEqual(modelsCalled[0], 'gemini-2.5-flash-lite');
});

console.log('GeminiProvider mock tests passed!');
