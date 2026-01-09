import { NextResponse } from "next/server";
import { sql } from "@vercel/postgres";

// GET: データ取得
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");

  try {
    switch (type) {
      case "projects": {
        const result = await sql`SELECT * FROM projects`;
        const projects = result.rows.map(p => ({
          id: p.id,
          name: p.name,
          icon: p.icon,
          description: p.description,
          creatorId: p.creator_id,
          linkedChats: p.linked_chats || [],
          projectMembers: p.project_members || [],
          gameSettings: p.game_settings,
        }));
        return NextResponse.json(projects);
      }

      case "messages": {
        const chatId = searchParams.get("chatId");
        if (chatId) {
          const result = await sql`
            SELECT * FROM messages WHERE chat_id = ${chatId} ORDER BY timestamp ASC
          `;
          const messages = result.rows.map(m => ({
            id: m.id,
            senderId: m.sender_id,
            senderName: m.sender_name,
            content: m.content,
            timestamp: m.timestamp,
            reactions: m.reactions || [],
            replyTo: m.reply_to,
            isEdited: m.is_edited,
          }));
          return NextResponse.json(messages);
        }
        // 全メッセージは返さない（chatIdが必須）
        return NextResponse.json([]);
      }

      case "attendance": {
        const userId = searchParams.get("userId");
        if (userId) {
          const result = await sql`
            SELECT * FROM attendance WHERE user_id = ${userId} ORDER BY date DESC
          `;
          const attendance = result.rows.map(a => ({
            id: a.id,
            userId: a.user_id,
            date: a.date,
            clockIn: a.clock_in,
            clockOut: a.clock_out,
            breakMinutes: a.break_minutes,
            status: a.status,
          }));
          return NextResponse.json(attendance);
        }
        return NextResponse.json([]);
      }

      default:
        return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }
  } catch (error) {
    console.error("GET error:", error);
    return NextResponse.json({ error: "Failed to read data", details: String(error) }, { status: 500 });
  }
}

// POST: データ保存
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { type, data, chatId, userId } = body;

    switch (type) {
      case "projects": {
        // プロジェクトの一括更新は/api/projectsを使用
        return NextResponse.json({ error: "Use /api/projects endpoint" }, { status: 400 });
      }

      case "messages": {
        if (!chatId) {
          return NextResponse.json({ error: "chatId required" }, { status: 400 });
        }

        // 既存メッセージを削除して新規追加
        await sql`DELETE FROM messages WHERE chat_id = ${chatId}`;

        for (const msg of data) {
          await sql`
            INSERT INTO messages (chat_id, sender_id, sender_name, content, timestamp, reactions, reply_to, is_edited)
            VALUES (
              ${chatId},
              ${msg.senderId || msg.sender?.id || "unknown"},
              ${msg.senderName || msg.sender?.name || "Unknown"},
              ${msg.content},
              ${msg.timestamp || new Date().toISOString()},
              ${JSON.stringify(msg.reactions || [])},
              ${msg.replyTo || null},
              ${msg.isEdited || false}
            )
          `;
        }

        return NextResponse.json({ success: true });
      }

      case "attendance": {
        if (!userId) {
          return NextResponse.json({ error: "userId required" }, { status: 400 });
        }

        for (const att of data) {
          await sql`
            INSERT INTO attendance (user_id, date, clock_in, clock_out, break_minutes, status)
            VALUES (
              ${userId},
              ${att.date},
              ${att.clockIn || null},
              ${att.clockOut || null},
              ${att.breakMinutes || 0},
              ${att.status || null}
            )
            ON CONFLICT (user_id, date)
            DO UPDATE SET
              clock_in = ${att.clockIn || null},
              clock_out = ${att.clockOut || null},
              break_minutes = ${att.breakMinutes || 0},
              status = ${att.status || null}
          `;
        }

        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }
  } catch (error) {
    console.error("POST error:", error);
    return NextResponse.json({ error: "Failed to save data", details: String(error) }, { status: 500 });
  }
}
