import { NextRequest, NextResponse } from "next/server";

type Market = "US" | "INDIA" | "CRYPTO";

function detectMarket(symbol: string, exchange: string): Market {
  if (symbol.endsWith("-USD") || symbol.endsWith("USDT") || exchange === "CCC") return "CRYPTO";
  if (symbol.endsWith(".NS") || symbol.endsWith(".BO") || ["NSE", "BSE", "NSI"].includes(exchange)) return "INDIA";
  return "US";
}

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get("symbol");
  if (!symbol) return NextResponse.json({ error: "symbol required" }, { status: 400 });

  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`;
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0" },
    cache: "no-store",
  });
  if (!res.ok) return NextResponse.json({ error: "Yahoo error" }, { status: 502 });

  const json = await res.json();
  const meta = json?.chart?.result?.[0]?.meta;
  if (!meta) return NextResponse.json({ error: "No data" }, { status: 404 });

  const price = meta.regularMarketPrice ?? 0;
  const prevClose = meta.chartPreviousClose ?? price;

  return NextResponse.json({
    symbol: meta.symbol,
    name: meta.longName ?? meta.shortName ?? symbol,
    price,
    change: price - prevClose,
    changePct: ((price - prevClose) / prevClose) * 100,
    open: meta.regularMarketOpen ?? price,
    high: meta.regularMarketDayHigh ?? price,
    low: meta.regularMarketDayLow ?? price,
    prevClose,
    volume: meta.regularMarketVolume ?? 0,
    avgVolume: meta.averageDailyVolume3Month ?? 0,
    mktCap: meta.marketCap ?? 0,
    pe: meta.trailingPE ?? null,
    high52w: meta.fiftyTwoWeekHigh ?? price,
    low52w: meta.fiftyTwoWeekLow ?? price,
    currency: meta.currency ?? "USD",
    exchange: meta.exchangeName ?? meta.fullExchangeName ?? "",
    market: detectMarket(symbol, meta.exchangeName ?? ""),
  });
}