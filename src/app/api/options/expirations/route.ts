import { NextRequest, NextResponse } from "next/server";

// Cache the crumb in module scope so we only fetch it once per server lifecycle
// (Next.js keeps the module alive between requests in dev and production)
let cachedCrumb: string | null = null;
let cachedCookie: string | null = null;
let crumbFetchedAt = 0;
const CRUMB_TTL_MS = 60 * 60 * 1000; // re-fetch crumb after 1 hour

async function getYahooCrumb(): Promise<{ crumb: string; cookie: string } | null> {
    const now = Date.now();
    // Return cached crumb if still fresh
    if (cachedCrumb && cachedCookie && now - crumbFetchedAt < CRUMB_TTL_MS) {
        return { crumb: cachedCrumb, cookie: cachedCookie };
    }

    try {
        // Step 1: Hit Yahoo Finance to get a session cookie
        const cookieRes = await fetch("https://fc.yahoo.com", {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Accept": "*/*",
            },
            redirect: "follow",
        });
        const rawCookies = cookieRes.headers.get("set-cookie") ?? "";
        // Extract cookie string (we need A3 and similar session cookies)
        const cookie = rawCookies
            .split(",")
            .map(c => c.split(";")[0].trim())
            .filter(c => c.includes("="))
            .join("; ");

        // Step 2: Fetch the crumb using that cookie
        const crumbRes = await fetch("https://query1.finance.yahoo.com/v1/test/getcrumb", {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Accept": "text/plain, */*",
                "Cookie": cookie,
                "Referer": "https://finance.yahoo.com",
            },
        });

        if (!crumbRes.ok) return null;
        const crumb = (await crumbRes.text()).trim();
        if (!crumb || crumb.includes("{")) return null; // got HTML/JSON error instead of crumb

        // Cache for reuse
        cachedCrumb = crumb;
        cachedCookie = cookie;
        crumbFetchedAt = now;

        return { crumb, cookie };
    } catch (e) {
        console.error("Yahoo crumb fetch failed:", e);
        return null;
    }
}

export async function GET(req: NextRequest) {
    const symbol = req.nextUrl.searchParams.get("symbol");
    const market = req.nextUrl.searchParams.get("market") ?? "US";
    if (!symbol || market === "CRYPTO") return NextResponse.json([]);

    const auth = await getYahooCrumb();
    if (!auth) {
        console.error("Could not get Yahoo crumb");
        return NextResponse.json([]);
    }

    const url = `https://query1.finance.yahoo.com/v7/finance/options/${encodeURIComponent(symbol)}?crumb=${encodeURIComponent(auth.crumb)}`;

    try {
        const res = await fetch(url, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Accept": "application/json",
                "Cookie": auth.cookie,
                "Referer": "https://finance.yahoo.com/quote/" + symbol + "/options",
            },
            next: { revalidate: 3600 },
        });

        if (!res.ok) {
            // Crumb may have expired — clear cache and return empty so next request retries
            cachedCrumb = null;
            cachedCookie = null;
            return NextResponse.json([]);
        }

        const json = await res.json();
        const result = json?.optionChain?.result?.[0];
        const timestamps: number[] = result?.expirationDates ?? [];

        // Convert Unix timestamps → ISO date strings "2025-05-16"
        const isoDates = timestamps.map((ts) => {
            const d = new Date(ts * 1000);
            const y = d.getUTCFullYear();
            const m = String(d.getUTCMonth() + 1).padStart(2, "0");
            const day = String(d.getUTCDate()).padStart(2, "0");
            return `${y}-${m}-${day}`;
        });

        return NextResponse.json(isoDates);
    } catch (e) {
        console.error("expirations error", e);
        return NextResponse.json([]);
    }
}