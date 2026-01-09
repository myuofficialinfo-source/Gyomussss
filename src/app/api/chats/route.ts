import { NextResponse } from "next/server";
import { sql } from "@vercel/postgres";

// DMチャット・グループチャット一覧取得
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const type = searchParams.get("type"); // "dm" | "group" | null(両方)

    if (!userId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 });
    }

    const result: { dms: unknown[]; groups: unknown[] } = { dms: [], groups: [] };

    // DMチャット取得
    if (!type || type === "dm") {
      const dmResult = await sql`
        SELECT dc.id, dc.user1_id, dc.user2_id, dc.created_at,
               u1.name as user1_name, u1.avatar as user1_avatar, u1.status as user1_status,
               u2.name as user2_name, u2.avatar as user2_avatar, u2.status as user2_status
        FROM dm_chats dc
        JOIN users u1 ON u1.id = dc.user1_id
        JOIN users u2 ON u2.id = dc.user2_id
        WHERE dc.user1_id = ${userId} OR dc.user2_id = ${userId}
        ORDER BY dc.created_at DESC
      `;

      result.dms = dmResult.rows.map(dm => {
        // 自分でない方のユーザー情報を取得
        const isUser1 = dm.user1_id === userId;
        const otherUser = {
          id: isUser1 ? dm.user2_id : dm.user1_id,
          name: isUser1 ? dm.user2_name : dm.user1_name,
          avatar: isUser1 ? dm.user2_avatar : dm.user1_avatar,
          status: isUser1 ? dm.user2_status : dm.user1_status,
        };

        return {
          id: dm.id,
          type: "dm",
          name: otherUser.name,
          otherUser,
          createdAt: dm.created_at,
        };
      });
    }

    // グループチャット取得
    if (!type || type === "group") {
      const groupResult = await sql`
        SELECT * FROM group_chats
        WHERE creator_id = ${userId}
           OR members::jsonb @> ${JSON.stringify([{ id: userId }])}::jsonb
        ORDER BY created_at DESC
      `;

      result.groups = groupResult.rows.map(g => ({
        id: g.id,
        type: "group",
        name: g.name,
        icon: g.icon,
        description: g.description,
        creatorId: g.creator_id,
        members: g.members || [],
        createdAt: g.created_at,
      }));
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Get chats error:", error);
    return NextResponse.json({ error: "Internal server error", details: String(error) }, { status: 500 });
  }
}

// DMチャット作成 or グループチャット作成
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, name, icon, description, creatorId, members, userId, friendId } = body;

    // DM作成
    if (action === "createDM") {
      if (!userId || !friendId) {
        return NextResponse.json({ error: "userId and friendId required" }, { status: 400 });
      }

      const [user1, user2] = [userId, friendId].sort();
      const dmChatId = `dm_${user1}_${user2}`;
      const now = new Date().toISOString();

      await sql`
        INSERT INTO dm_chats (id, user1_id, user2_id, created_at)
        VALUES (${dmChatId}, ${user1}, ${user2}, ${now})
        ON CONFLICT DO NOTHING
      `;

      const otherUserResult = await sql`
        SELECT id, name, avatar, status FROM users WHERE id = ${friendId}
      `;
      const otherUser = otherUserResult.rows[0];

      return NextResponse.json({
        dm: {
          id: dmChatId,
          type: "dm",
          name: otherUser?.name || "Unknown",
          otherUser: {
            id: friendId,
            name: otherUser?.name || "Unknown",
            avatar: otherUser?.avatar || "?",
            status: otherUser?.status || "offline",
          },
          createdAt: now,
        }
      });
    }

    // グループ作成
    if (!name) {
      return NextResponse.json({ error: "name required" }, { status: 400 });
    }

    const groupId = `group_${Date.now()}`;
    const now = new Date().toISOString();

    await sql`
      INSERT INTO group_chats (id, name, icon, description, creator_id, members, created_at)
      VALUES (
        ${groupId},
        ${name},
        ${icon || "🎮"},
        ${description || ""},
        ${creatorId || null},
        ${JSON.stringify(members || [])},
        ${now}
      )
    `;

    return NextResponse.json({
      group: {
        id: groupId,
        name,
        icon: icon || "🎮",
        description: description || "",
        creatorId,
        members: members || [],
        createdAt: now,
      }
    });
  } catch (error) {
    console.error("Create chat error:", error);
    return NextResponse.json({ error: "Internal server error", details: String(error) }, { status: 500 });
  }
}
