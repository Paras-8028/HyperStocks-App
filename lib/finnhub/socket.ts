let socket: WebSocket | null = null;
let listeners = new Map<string, (price: number) => void>();

export function connectFinnhub() {
    if (socket) return;

    socket = new WebSocket(
        `wss://ws.finnhub.io?token=${process.env.NEXT_PUBLIC_FINNHUB_API_KEY}`
    );

    socket.onmessage = event => {
        const msg = JSON.parse(event.data);
        if (msg.type !== "trade") return;

        msg.data.forEach((trade: any) => {
            listeners.get(trade.s)?.(trade.p);
        });
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
