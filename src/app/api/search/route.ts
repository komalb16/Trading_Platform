import { NextRequest, NextResponse } from "next/server";

type Market = "US" | "INDIA" | "CRYPTO";

function classifyMarket(exchange: string, symbol: string): Market {
    const ex = (exchange ?? "").toUpperCase();
    if (["NSE", "BSE", "NSI"].includes(ex) || symbol.endsWith(".NS") || symbol.endsWith(".BO")) return "INDIA";
    if (ex === "CCC" || symbol.endsWith("-USD") || symbol.endsWith("USDT")) return "CRYPTO";
    return "US";
}

export async function GET(req: NextRequest) {
    const q = req.nextUrl.searchParams.get("q");
    const market = (req.nextUrl.searchParams.get("market") ?? "US") as Market;
    if (!q) return NextResponse.json([]);

    const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=20&newsCount=0&enableFuzzyQuery=true`;
    const res = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0" },
        next: { revalidate: 300 },
    });
    if (!res.ok) return NextResponse.json([]);

    const json = await res.json();
    const quotes = json?.quotes ?? [];

    return NextResponse.json(
        quotes
            .filter((item: { exchange: string; symbol: string }) =>
                classifyMarket(item.exchange ?? "", item.symbol ?? "") === market
            )
            .slice(0, 12)
            .map((item: { symbol: string; longname?: string; shortname?: string; exchange: string; quoteType?: string }) => ({
                symbol: item.symbol,
                name: item.longname ?? item.shortname ?? item.symbol,
                exchange: item.exchange,
                type: item.quoteType ?? "EQUITY",
                market: classifyMarket(item.exchange, item.symbol),
            }))
    );
}