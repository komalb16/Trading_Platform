import { NextResponse } from "next/server";

export async function GET() {
    const url = "https://production.dataviz.cnn.io/index/fearandgreed/graphdata";

    try {
        const res = await fetch(url, {
            headers: {
                "User-Agent": "Mozilla/5.0",
                "Accept": "application/json",
            },
            cache: "no-store",
        });

        if (!res.ok) throw new Error("CNN error");

        const data = await res.json();
        // The structure usually has fear_and_greed: { score: number, rating: string }
        const score = data?.fear_and_greed?.score ?? 50;
        
        return NextResponse.json({ value: Math.round(score) });
    } catch (e) {
        // Fallback to crypto fear & greed if CNN fails
        try {
            const res = await fetch("https://api.alternative.me/fng/");
            const data = await res.json();
            return NextResponse.json({ value: parseInt(data?.data?.[0]?.value ?? "50") });
        } catch {
            return NextResponse.json({ value: 50 });
        }
    }
}
