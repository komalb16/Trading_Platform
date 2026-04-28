import { NextRequest, NextResponse } from "next/server";
import { getYahooCrumb } from "@/lib/yahooCrumb";

// ── Copy the exact same getYahooCrumb function from FILE 5 here ──
// (or better: move it to src/lib/yahooCrumb.ts and import in both files)

interface YahooOption {
    strike: number;
    bid: number;
    ask: number;
    lastPrice: number;
    impliedVolatility: number;
    openInterest: number;
    volume: number;
    inTheMoney: boolean;
}

export async function GET(req: NextRequest) {
    const { searchParams } = req.nextUrl;
    const symbol = searchParams.get("symbol");
    const expiry = searchParams.get("expiry"); // ISO "2025-05-16"
    const market = searchParams.get("market") ?? "US";

    if (!symbol || !expiry || market === "CRYPTO") return NextResponse.json([]);

    const auth = await getYahooCrumb();
    if (!auth) return NextResponse.json([]);

    // Convert ISO expiry date → Unix timestamp for Yahoo query param
    const expiryTs = Math.floor(new Date(expiry + "T00:00:00Z").getTime() / 1000);

    const url = `https://query1.finance.yahoo.com/v7/finance/options/${encodeURIComponent(symbol)}?date=${expiryTs}&crumb=${encodeURIComponent(auth.crumb)}`;

    try {
        const res = await fetch(url, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Accept": "application/json",
                "Cookie": auth.cookie,
                "Referer": "https://finance.yahoo.com/quote/" + symbol + "/options",
            },
            cache: "no-store",
        });

        if (!res.ok) {
            return NextResponse.json([]);
        }

        const json = await res.json();
        const result = json?.optionChain?.result?.[0];
        if (!result) return NextResponse.json([]);

        const calls: YahooOption[] = result.options?.[0]?.calls ?? [];
        const puts: YahooOption[] = result.options?.[0]?.puts ?? [];
        if (!calls.length && !puts.length) return NextResponse.json([]);

        const underlyingPrice: number = result.quote?.regularMarketPrice ?? 0;

        // Collect all unique strikes
        const allStrikes = new Set<number>([
            ...calls.map((c) => c.strike),
            ...puts.map((p) => p.strike),
        ]);
        const sortedStrikes = Array.from(allStrikes).sort((a, b) => a - b);

        const callMap = new Map<number, YahooOption>();
        const putMap = new Map<number, YahooOption>();
        calls.forEach((c) => callMap.set(c.strike, c));
        puts.forEach((p) => putMap.set(p.strike, p));

        // ATM = closest strike to current price
        let atmStrike = sortedStrikes[0];
        let minDiff = Infinity;
        for (const s of sortedStrikes) {
            const d = Math.abs(s - underlyingPrice);
            if (d < minDiff) { minDiff = d; atmStrike = s; }
        }

        const makeLeg = (opt: YahooOption, isCall: boolean) => ({
            bid: opt.bid ?? 0,
            ask: opt.ask ?? 0,
            last: opt.lastPrice ?? 0,
            iv: opt.impliedVolatility ?? 0,
            // Yahoo doesn't return greeks — estimate delta from inTheMoney flag
            delta: isCall
                ? (opt.inTheMoney ? 0.65 : 0.35)
                : (opt.inTheMoney ? -0.65 : -0.35),
            gamma: 0,
            theta: 0,
            vega: 0,
            openInterest: opt.openInterest ?? 0,
            volume: opt.volume ?? 0,
        });

        return NextResponse.json(
            sortedStrikes.map((strike) => ({
                strike,
                call: callMap.has(strike) ? makeLeg(callMap.get(strike)!, true) : null,
                put: putMap.has(strike) ? makeLeg(putMap.get(strike)!, false) : null,
                isATM: strike === atmStrike,
            }))
        );
    } catch (e) {
        console.error("options chain error", e);
        return NextResponse.json([]);
    }
}