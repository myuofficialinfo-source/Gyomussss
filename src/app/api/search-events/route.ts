import { NextRequest, NextResponse } from "next/server";

const GEMINI_API_KEY = "AIzaSyAKgHxAHFfo-v5fFaYOFgTO0Wlc_Og_qr0";

export async function POST(request: NextRequest) {
  try {
    const { tags, year } = await request.json();

    if (!tags || tags.length === 0) {
      return NextResponse.json({ events: [] });
    }

    const tagNames: Record<string, string> = {
      indie: "インディーゲーム",
      action: "アクション",
      rpg: "RPG",
      puzzle: "パズル",
      social: "ソーシャルゲーム",
      console: "コンシューマーゲーム",
      free: "フリーゲーム",
      mobile: "モバイルゲーム",
      vr: "VRゲーム",
      simulation: "シミュレーション",
      adventure: "アドベンチャー",
      horror: "ホラー",
    };

    const tagLabels = tags.map((t: string) => tagNames[t] || t).join("、");

    const currentYear = year || new Date().getFullYear();
    const prompt = `あなたはゲームイベント情報の専門家です。
Google検索を使って、以下のジャンルに関連する${currentYear}年の日本のゲームイベント・展示会・即売会を5つ調べてください。

ジャンル: ${tagLabels}

重要: 実在するイベントの正確な情報（公式URL、開催日、開催場所）をGoogle検索で確認してください。
架空のURLや推測の日付ではなく、検索結果で確認できた情報のみを返してください。
URLが見つからない場合はurlフィールドを空文字にしてください。

以下のJSON形式で回答してください。必ず有効なJSONのみを返してください。説明文は不要です。
[
  {
    "name": "イベント名",
    "startDate": "YYYY-MM-DD",
    "endDate": "YYYY-MM-DD",
    "location": "開催場所",
    "url": "公式URL（検索で確認できた場合のみ）",
    "type": "exhibition/conference/market/online のいずれか",
    "description": "簡単な説明"
  }
]`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],
          tools: [
            {
              googleSearch: {},
            },
          ],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 2048,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API Error:", errorText);
      return NextResponse.json(
        { error: "Gemini API request failed", details: errorText },
        { status: 500 }
      );
    }

    const data = await response.json();
    const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    // JSONを抽出（```json ... ``` や余分なテキストを除去）
    let jsonStr = textContent;
    const jsonMatch = textContent.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      jsonStr = jsonMatch[0];
    }

    try {
      const events = JSON.parse(jsonStr);
      // IDを付与
      const eventsWithIds = events.map((event: Record<string, unknown>, index: number) => ({
        ...event,
        id: `ai-ev-${Date.now()}-${index}`,
        tags: tags,
      }));
      return NextResponse.json({ events: eventsWithIds });
    } catch {
      console.error("JSON parse error:", jsonStr);
      return NextResponse.json(
        { error: "Failed to parse AI response", raw: textContent },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("API route error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
