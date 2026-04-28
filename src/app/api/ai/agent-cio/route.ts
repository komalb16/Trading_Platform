import { NextRequest, NextResponse } from "next/server";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "llama-3.1-70b-versatile";

const SYSTEM_PROMPT = `You are the CHIEF INVESTMENT OFFICER (CIO) for a top-tier quantitative hedge fund.
Your job is to synthesize reports from your Technical Analyst, Sector Analyst, and Risk Manager into a final high-conviction decision.

Input format: A JSON object containing ticker, price, and the three agent reports (Technical, Sector, Risk).

Output format: You MUST return a valid JSON object strictly matching this schema:
{
  "finalSignal": "BUY" | "SELL" | "HOLD",
  "entryPrice": <number or null>,
  "takeProfit": <number or null>,
  "stopLoss": <number or null>,
  "executiveSummary": "<A 1-2 sentence final verdict summarizing why you made this decision based on the internal consensus.>"
}

Rules:
1. If the Risk Manager REJECTS (approved: false), you MUST return HOLD.
2. If Technical and Sector agents conflict, favor HOLD unless one has very high confidence.
3. Suggest clear TP/SL levels if the signal is BUY or SELL.`;

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
                max_tokens: 300,
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
