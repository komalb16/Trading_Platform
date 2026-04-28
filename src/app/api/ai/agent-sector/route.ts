import { NextRequest, NextResponse } from "next/server";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "llama-3.1-70b-versatile";

const SYSTEM_PROMPT = `You are the SECTOR ANALYSIS AGENT for an institutional trading desk.
Your ONLY job is to evaluate sector-specific trends, macro headwinds/tailwinds, and news sentiment for a given ticker.
You do NOT care about technical charts or individual position risk.

Input format: A JSON object containing ticker, sector, and recent news headlines (if any).

Output format: You MUST return a valid JSON object strictly matching this schema:
{
  "signal": "BULLISH" | "BEARISH" | "NEUTRAL",
  "confidence": <number between 0 and 100>,
  "reasoning": "<concise explanation of sector outlook, max 50 words>"
}`;

export async function POST(req: NextRequest) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "GROQ_API_KEY not configured" }, { status: 500 });
    try {
        const body = await req.json();
        const response = await fetch(GROQ_API_URL, {
            method: "POST",
            headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
                model: MODEL,
                messages: [
                    { role: "system", content: SYSTEM_PROMPT },
                    { role: "user", content: JSON.stringify(body) }
                ],
                response_format: { type: "json_object" },
                max_tokens: 200,
                temperature: 0.1,
            }),
        });
        if (!response.ok) throw new Error("Groq API error");
        const data = await response.json();
        return NextResponse.json(JSON.parse(data.choices?.[0]?.message?.content || "{}"));
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
