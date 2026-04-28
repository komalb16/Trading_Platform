import { NextRequest, NextResponse } from "next/server";

const INTRADAY_INTERVALS = new Set(["1m", "2m", "5m", "15m", "30m", "60m", "1h", "4h"]);

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const symbol   = searchParams.get("symbol");
  const range    = searchParams.get("range")    ?? "1D";
  const interval = searchParams.get("interval") ?? "1d";
  // Use the period sent by the frontend — don't re-map it here
  const period   = searchParams.get("period")   ?? "1y";

  if (!symbol) return NextResponse.json([], { status: 400 });

  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=${interval}&range=${period}`;

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Accept: "application/json",
      },
      next: { revalidate: INTRADAY_INTERVALS.has(interval) ? 60 : 3600 },
    });

    if (!res.ok) return NextResponse.json([]);

    const json   = await res.json();
    const result = json?.chart?.result?.[0];
    if (!result)  return NextResponse.json([]);

    const timestamps: number[] = result.timestamp ?? [];
    const quote    = result.indicators?.quote?.[0] ?? {};
    const opens:   (number | null)[] = quote.open   ?? [];
    const highs:   (number | null)[] = quote.high   ?? [];
    const lows:    (number | null)[] = quote.low    ?? [];
    const closes:  (number | null)[] = quote.close  ?? [];
    const volumes: (number | null)[] = quote.volume ?? [];

    const isIntraday = INTRADAY_INTERVALS.has(interval);
    const isLong     = range === "1Y" || range === "5Y";

    const points = timestamps
      .map((ts, i) => {
        const c = closes[i];
        if (c == null || isNaN(c)) return null;

        const d = new Date(ts * 1000);
        let time: string;
        if (isIntraday) {
          time = d.toLocaleTimeString("en-US", {
            hour: "2-digit", minute: "2-digit", hour12: false,
          });
        } else if (isLong) {
          time = d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
        } else {
          time = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        }

        return {
          time,
          price:  parseFloat(c.toFixed(4)),
          open:   opens[i]   != null ? parseFloat((opens[i] as number).toFixed(4))  : c,
          high:   highs[i]   != null ? parseFloat((highs[i] as number).toFixed(4))  : c,
          low:    lows[i]    != null ? parseFloat((lows[i] as number).toFixed(4))   : c,
          close:  c,
          volume: volumes[i] ?? 0,
        };
      })
      .filter(Boolean);

    return NextResponse.json(points);
  } catch (err) {
    console.error("[api/chart]", err);
    return NextResponse.json([]);
  }
}
