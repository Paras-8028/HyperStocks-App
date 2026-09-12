let socket: WebSocket | null = null;
interface FinnhubTrade {
    s: string; // Symbol
    p: number; // Last price
    t: number; // UNIX ms
    v: number; // Volume
}

const listeners = new Map<string, (price: number) => void>();

export function connectFinnhub() {
    if (socket) return;

    socket = new WebSocket(
        `wss://ws.finnhub.io?token=${process.env.NEXT_PUBLIC_FINNHUB_API_KEY}`
    );

    socket.onmessage = event => {
        try {
            const msg = JSON.parse(event.data);
            if (msg.type !== "trade" || !Array.isArray(msg.data)) return;

            msg.data.forEach((trade: FinnhubTrade) => {
                listeners.get(trade.s)?.(trade.p);
            });
        } catch {
            // Ignore malformed socket frames
        }
    };
}

export function subscribe(symbol: string, cb: (price: number) => void) {
    connectFinnhub();
    listeners.set(symbol, cb);
    socket?.send(JSON.stringify({ type: "subscribe", symbol }));
}

export function unsubscribe(symbol: string) {
    listeners.delete(symbol);
    socket?.send(JSON.stringify({ type: "unsubscribe", symbol }));
}
