type QuoteListener = (data: FinnhubQuote) => void;

class FinnhubWS {
    private socket: WebSocket | null = null;
    private listeners = new Map<string, Set<QuoteListener>>();
    private pendingSymbols = new Set<string>();
    private connected = false;
    private reconnectTimer?: NodeJS.Timeout;

    constructor() {
        this.connect();
    }

    /* ================= CONNECT ================= */
    private connect() {
        if (this.socket) return;

        this.socket = new WebSocket(
            `wss://ws.finnhub.io?token=${process.env.NEXT_PUBLIC_FINNHUB_API_KEY}`
        );

        this.socket.onopen = () => {
            this.connected = true;

            // 🔥 Flush pending subscriptions
            this.pendingSymbols.forEach(symbol => {
                this.sendSubscribe(symbol);
            });
            this.pendingSymbols.clear();
        };

        this.socket.onmessage = (event) => {
            const payload = JSON.parse(event.data);

            if (payload.type !== "trade") return;

            for (const trade of payload.data) {
                const symbol = trade.s;
                const price = trade.p;

                this.listeners.get(symbol)?.forEach(cb =>
                    cb({ symbol, price })
                );
            }
        };

        this.socket.onclose = () => {
            this.cleanup();
            this.reconnect();
        };

        this.socket.onerror = () => {
            this.socket?.close();
        };
    }

    /* ================= SUBSCRIBE ================= */
    subscribe(symbol: string, cb: QuoteListener) {
        const upper = symbol.toUpperCase();

        if (!this.listeners.has(upper)) {
            this.listeners.set(upper, new Set());
            this.queueSubscribe(upper);
        }

        this.listeners.get(upper)!.add(cb);

        return () => {
            this.listeners.get(upper)?.delete(cb);
            if (this.listeners.get(upper)?.size === 0) {
                this.listeners.delete(upper);
                this.sendUnsubscribe(upper);
            }
        };
    }

    /* ================= QUEUE ================= */
    private queueSubscribe(symbol: string) {
        if (!this.connected) {
            this.pendingSymbols.add(symbol);
            return;
        }
        this.sendSubscribe(symbol);
    }

    private sendSubscribe(symbol: string) {
        this.socket?.send(
            JSON.stringify({ type: "subscribe", symbol })
        );
    }

    private sendUnsubscribe(symbol: string) {
        if (!this.connected) return;
        this.socket?.send(
            JSON.stringify({ type: "unsubscribe", symbol })
        );
    }

    /* ================= RECONNECT ================= */
    private reconnect() {
        if (this.reconnectTimer) return;

        this.reconnectTimer = setTimeout(() => {
            this.socket = null;
            this.connected = false;
            this.connect();
            this.reconnectTimer = undefined;
        }, 1500);
    }

    private cleanup() {
        this.connected = false;
    }
}

export const finnhubWS = new FinnhubWS();
