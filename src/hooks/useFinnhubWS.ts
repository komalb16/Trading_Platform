import { useState, useEffect, useRef } from "react";

export function useFinnhubWS(symbol: string) {
  const [price, setPrice] = useState<number | null>(null);
  const [prevPrice, setPrevPrice] = useState<number | null>(null);
  const socket = useRef<WebSocket | null>(null);

  const apiKey = process.env.NEXT_PUBLIC_FINNHUB_KEY;

  useEffect(() => {
    if (!symbol || !apiKey || apiKey === "your_finnhub_key_here") return;

    // Finnhub WebSocket
    socket.current = new WebSocket(`wss://ws.finnhub.io?token=${apiKey}`);

    socket.current.onopen = () => {
      socket.current?.send(JSON.stringify({ type: "subscribe", symbol }));
    };

    socket.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "trade") {
        const lastTrade = data.data[data.data.length - 1];
        setPrice(prev => {
            if (prev !== null) setPrevPrice(prev);
            return lastTrade.p;
        });
      }
    };

    return () => {
      if (socket.current) {
        socket.current.send(JSON.stringify({ type: "unsubscribe", symbol }));
        socket.current.close();
      }
    };
  }, [symbol, apiKey]);

  return { price, prevPrice };
}
