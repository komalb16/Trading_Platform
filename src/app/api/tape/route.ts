import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    const symbols = req.nextUrl.searchParams.get("symbols") ?? "";
    if (!symbols) return NextResponse.json({});

    const symList = symbols.split(",").filter(Boolean);

    // Yahoo Finance v7 supports batch quotes — much faster than individual calls
    const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbols)}&fields=regularMarketPrice,regularMarketChangePercent`;

    try {
        const res = await fetch(url, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                "Accept": "application/json",
            },
            // No caching — always fresh data for the tape
            cache: "no-store",
        });

        if (!res.ok) {
            // Fallback: fetch individually if batch fails
            const results: Record<string, { price: number; changePct: number }> = {};
            await Promise.all(symList.map(async (sym) => {
                try {
                    const r = await fetch(
                        `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?interval=1d&range=1d`,
                        { headers: { "User-Agent": "Mozilla/5.0" }, cache: "no-store" }
                    );
                    if (!r.ok) return;
                    const j = await r.json();
                    const meta = j?.chart?.result?.[0]?.meta;
                    if (meta) {
                        const price = meta.regularMarketPrice ?? 0;
                        const prev = meta.chartPreviousClose ?? price;
                        results[sym] = {
                            price,
                            changePct: prev ? ((price - prev) / prev) * 100 : 0,
                        };
                    }
                } catch { /* skip */ }
            }));
            return NextResponse.json(results);
        }

        const json = await res.json();
        const quotes = json?.quoteResponse?.result ?? [];

        const results: Record<string, { price: number; changePct: number }> = {};
        for (const q of quotes) {
            results[q.symbol] = {
                price: q.regularMarketPrice ?? 0,
                changePct: q.regularMarketChangePercent ?? 0,
            };
        }

        return NextResponse.json(results);
    } catch (e) {
        console.error("tape error", e);
        return NextResponse.json({});
    }
}