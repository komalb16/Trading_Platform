let cachedCrumb: string | null = null;
let cachedCookie: string | null = null;
let crumbFetchedAt = 0;
const CRUMB_TTL_MS = 60 * 60 * 1000;

export async function getYahooCrumb(): Promise<{ crumb: string; cookie: string } | null> {
    const now = Date.now();

    if (cachedCrumb && cachedCookie && now - crumbFetchedAt < CRUMB_TTL_MS) {
        return { crumb: cachedCrumb, cookie: cachedCookie };
    }

    try {
        const cookieRes = await fetch("https://fc.yahoo.com", {
            headers: {
                "User-Agent": "Mozilla/5.0",
                "Accept": "text/html",
            },
            redirect: "follow",
        });

        const rawCookies = cookieRes.headers.get("set-cookie") ?? "";
        const cookie = rawCookies
            .split(",")
            .map(c => c.split(";")[0].trim())
            .filter(c => c.includes("="))
            .join("; ");

        const crumbRes = await fetch("https://query1.finance.yahoo.com/v1/test/getcrumb", {
            headers: {
                "User-Agent": "Mozilla/5.0",
                "Cookie": cookie,
            },
        });

        if (!crumbRes.ok) return null;

        const crumb = (await crumbRes.text()).trim();
        if (!crumb || crumb.includes("{")) return null;

        cachedCrumb = crumb;
        cachedCookie = cookie;
        crumbFetchedAt = now;

        return { crumb, cookie };
    } catch (e) {
        console.error("Crumb fetch failed:", e);
        return null;
    }
}