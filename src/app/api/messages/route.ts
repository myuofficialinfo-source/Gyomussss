import { NextResponse } from "next/server";
import { sql } from "@vercel/postgres";

// メッセージ取得
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const chatId = searchParams.get("chatId");
    const after = searchParams.get("after"); // このID以降のメッセージを取得（ポーリング用）

    if (!chatId) {
      return NextResponse.json({ error: "chatId required" }, { status: 400 });
    }

    let result;
    if (after) {
      // 指定IDより後のメッセージのみ取得
      result = await sql`
        SELECT * FROM messages
        WHERE chat_id = ${chatId} AND id > ${parseInt(after)}
        ORDER BY timestamp ASC
      `;
    } else {
      // 全メッセージ取得（最新100件）
      result = await sql`
        SELECT * FROM messages
        WHERE chat_id = ${chatId}
        ORDER BY timestamp DESC
        LIMIT 100
      `;
      // 古い順に並べ替え
      result.rows.reverse();
    }

    const messages = result.rows.map(m => ({
      id: m.id.toString(),
      userId: m.sender_id,
      userName: m.sender_name,
      avatar: m.sender_name.charAt(0),
      content: m.content,
      timestamp: new Date(m.timestamp).toLocaleTimeString("ja-JP", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      date: new Date(m.timestamp).toLocaleDateString("ja-JP", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
      isRead: true,
      isBookmarked: false,
      reactions: m.reactions || [],
      mentions: [], // メンション情報（デフォルト空配列）
      replyTo: m.reply_to ? { id: m.reply_to.toString() } : undefined,
      isEdited: m.is_edited,
    }));

    return NextResponse.json({ messages });
  } catch (error) {
    console.error("Get messages error:", error);
    return NextResponse.json({ error: "Internal server error", details: String(error) }, { status: 500 });
  }
}

// メッセージ送信
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { chatId, senderId, senderName, content, replyTo } = body;

    if (!chatId || !senderId || !senderName || !content) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const now = new Date().toISOString();

    const result = await sql`
      INSERT INTO messages (chat_id, sender_id, sender_name, content, timestamp, reply_to, reactions)
      VALUES (${chatId}, ${senderId}, ${senderName}, ${content}, ${now}, ${replyTo || null}, '[]')
      RETURNING *
    `;

    const m = result.rows[0];
    const message = {
      id: m.id.toString(),
      userId: m.sender_id,
      userName: m.sender_name,
      avatar: m.sender_name.charAt(0),
      content: m.content,
      timestamp: new Date(m.timestamp).toLocaleTimeString("ja-JP", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      date: new Date(m.timestamp).toLocaleDateString("ja-JP", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
      isRead: true,
      isBookmarked: false,
      reactions: [],
      mentions: [], // メンション情報（デフォルト空配列）
      replyTo: m.reply_to ? { id: m.reply_to.toString() } : undefined,
      isEdited: false,
    };

    return NextResponse.json({ message });
  } catch (error) {
    console.error("Send message error:", error);
    return NextResponse.json({ error: "Internal server error", details: String(error) }, { status: 500 });
  }
}
