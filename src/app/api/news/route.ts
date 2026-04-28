import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    const symbol = req.nextUrl.searchParams.get("symbol");
    if (!symbol) return NextResponse.json([]);

    const apiKey = process.env.FINNHUB_API_KEY;

    // If no Finnhub key, return mock news so the UI still works
    if (!apiKey) {
        return NextResponse.json(getMockNews(symbol));
    }

    try {
        const today = new Date();
        const from = new Date(today);
        from.setDate(today.getDate() - 7);
        const toStr = today.toISOString().split("T")[0];
        const fromStr = from.toISOString().split("T")[0];

        // Clean symbol for Finnhub (remove .NS, -USD suffixes)
        const cleanSym = symbol.replace(".NS", "").replace("-USD", "").replace("^", "");

        const res = await fetch(
            `https://finnhub.io/api/v1/company-news?symbol=${cleanSym}&from=${fromStr}&to=${toStr}&token=${apiKey}`,
            { next: { revalidate: 300 } }
        );

        if (!res.ok) return NextResponse.json(getMockNews(symbol));

        const articles = await res.json();
        const mapped = (Array.isArray(articles) ? articles : [])
            .slice(0, 6)
            .map((a: { headline: string; summary: string; source: string; datetime: number; url: string }) => ({
                headline: a.headline,
                summary: a.summary?.slice(0, 150),
                source: a.source,
                time: new Date(a.datetime * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
                url: a.url,
                // Simple sentiment: positive/negative/neutral based on keywords
                sentiment: getSentiment(a.headline + " " + (a.summary ?? "")),
            }));

        return NextResponse.json(mapped.length ? mapped : getMockNews(symbol));
    } catch (e: unknown) {
        console.error("news error:", e);
        return NextResponse.json(getMockNews(symbol));
    }
}

function getSentiment(text: string): "positive" | "negative" | "neutral" {
    const t = text.toLowerCase();
    const pos = ["beat", "surge", "gain", "rise", "record", "growth", "strong", "up", "buy", "bullish", "rally", "profit", "upgrade"];
    const neg = ["miss", "fall", "drop", "decline", "loss", "weak", "down", "sell", "bearish", "cut", "downgrade", "warn", "risk"];
    const posScore = pos.filter((w) => t.includes(w)).length;
    const negScore = neg.filter((w) => t.includes(w)).length;
    if (posScore > negScore) return "positive";
    if (negScore > posScore) return "negative";
    return "neutral";
}

function getMockNews(symbol: string) {
    const clean = symbol.replace(".NS", "").replace("-USD", "");
    return [
        { headline: `${clean} — Add FINNHUB_API_KEY to .env.local for live news`, summary: "Get a free API key at finnhub.io/register — 60 requests/minute on the free tier.", source: "QuantTrade", time: "Now", url: "https://finnhub.io", sentiment: "neutral" },
        { headline: "Market Update: Volatility remains elevated amid macro uncertainty", summary: "Traders watching Fed commentary and earnings season for directional clues.", source: "QuantTrade", time: "Today", url: "#", sentiment: "neutral" },
    ];
}