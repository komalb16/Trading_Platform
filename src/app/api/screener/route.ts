import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    const symbols = req.nextUrl.searchParams.get("symbols");
    if (!symbols) return NextResponse.json([]);

    const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbols)}&fields=regularMarketPrice,regularMarketChangePercent,regularMarketVolume,marketCap,trailingPE,longName,shortName`;

    try {
        const res = await fetch(url, {
            headers: {
                "User-Agent": "Mozilla/5.0",
                "Accept": "application/json",
            },
            cache: "no-store",
        });

        if (!res.ok) return NextResponse.json([]);

        const json = await res.json();
        const quotes = json?.quoteResponse?.result ?? [];

        const results = quotes.map((q: any) => ({
            symbol: q.symbol,
            name: q.longName ?? q.shortName ?? q.symbol,
            price: q.regularMarketPrice ?? 0,
            changePct: q.regularMarketChangePercent ?? 0,
            volume: fmtVol(q.regularMarketVolume ?? 0),
            mktCap: fmtVol(q.marketCap ?? 0),
            pe: q.trailingPE?.toFixed(1) ?? "N/A",
            rsi: Math.floor(Math.random() * 40) + 30, // Mock RSI since Yahoo doesn't provide it easily
            signal: q.regularMarketChangePercent > 1 ? "BUY" : q.regularMarketChangePercent < -1 ? "SELL" : "NEUTRAL",
        }));

        return NextResponse.json(results);
    } catch (e) {
        console.error("screener error", e);
        return NextResponse.json([]);
    }
}

function fmtVol(v: number): string {
    if (v >= 1e12) return (v / 1e12).toFixed(2) + "T";
    if (v >= 1e9) return (v / 1e9).toFixed(2) + "B";
    if (v >= 1e6) return (v / 1e6).toFixed(2) + "M";
    if (v >= 1e3) return (v / 1e3).toFixed(1) + "K";
    return v.toString();
}
