import { NextRequest, NextResponse } from "next/server";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "llama-3.1-70b-versatile";

const SYSTEM_PROMPT = `You are the RISK MANAGEMENT AGENT for an institutional trading desk.
Your ONLY job is to evaluate capital risk, position sizing, and stop-loss placement based on volatility.
You do NOT care about technical patterns or macro trends.

Input format: A JSON object containing ticker, price, ATR (Average True Range), account balance, and current open position count.

Output format: You MUST return a valid JSON object strictly matching this schema:
{
  "approved": boolean,
  "suggestedPositionSizeUSD": <number>,
  "suggestedStopLoss": <number>,
  "reasoning": "<concise risk assessment, max 50 words>"
}

Note: If ATR is high, widen stops and reduce size. If account exposure is too high (e.g. >5 positions), be more conservative.`;

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
