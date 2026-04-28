import { NextRequest, NextResponse } from "next/server";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "llama-3.1-70b-versatile";

const SYSTEM_PROMPT = `You are ProChartAI, an expert quantitative trading analyst and Pine Script developer embedded inside the ProChart institutional terminal.

Your role:
- Give concise, actionable trading insights based on the real-time data provided.
- When the user asks for a strategy or to "generate a strategy", provide a complete, valid Pine Script (v5) script.
- Ensure Pine Scripts are institutional-grade, including proper risk management (Stop Loss, Take Profit).
- Always reference specific indicator values (RSI, MACD, etc.) when making recommendations.
- Mention risk factors and suggest stop-loss levels using ATR.
- Confidence levels: LOW / MEDIUM / HIGH.
- Keep responses professional and direct.

Pine Script Guidelines:
- Use // @version=5
- Use strategy() for backtesting logic.
- Include clear input() parameters for easy tuning.
- Wrap the code in triple backticks with "pinescript" language tag.`;


export async function POST(req: NextRequest) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
        return NextResponse.json({ error: "GROQ_API_KEY not configured" }, { status: 500 });
    }

    try {
        const body = await req.json();
        const { messages, context } = body as {
            messages: { role: "user" | "assistant"; content: string }[];
            context: string;
        };

        if (!messages?.length) {
            return NextResponse.json({ error: "messages required" }, { status: 400 });
        }

        // Inject market context into the first user message
        const enrichedMessages = messages.map((m, i) => {
            if (i === 0 && m.role === "user" && context) {
                return { ...m, content: `📊 LIVE MARKET CONTEXT:\n${context}\n\n❓ USER QUESTION: ${m.content}` };
            }
            return m;
        });

        const response = await fetch(GROQ_API_URL, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: MODEL,
                messages: [
                    { role: "system", content: SYSTEM_PROMPT },
                    ...enrichedMessages,
                ],
                max_tokens: 400,
                temperature: 0.25,
                stream: false,
            }),
        });

        if (!response.ok) {
            const err = await response.text();
            console.error("Groq error:", err);
            return NextResponse.json({ error: "AI service error" }, { status: 502 });
        }

        const data = await response.json();
        const reply = data.choices?.[0]?.message?.content ?? "I couldn't generate a response.";

        return NextResponse.json({ reply });
    } catch (e: unknown) {
        console.error("AI route error:", e);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}