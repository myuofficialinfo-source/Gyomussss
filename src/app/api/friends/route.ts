import { NextResponse } from "next/server";
import { sql } from "@vercel/postgres";

// フレンドリクエスト送信 / 承認 / 拒否
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, fromUserId, toUserId, requestId } = body;

    if (action === "send") {
      // フレンドリクエスト送信
      if (!fromUserId || !toUserId) {
        return NextResponse.json({ error: "Both user IDs required" }, { status: 400 });
      }

      if (fromUserId === toUserId) {
        return NextResponse.json({ error: "Cannot send request to yourself" }, { status: 400 });
      }

      // 両方のユーザーが存在するか確認
      const fromUserCheck = await sql`SELECT id FROM users WHERE id = ${fromUserId}`;
      const toUserCheck = await sql`SELECT id FROM users WHERE id = ${toUserId}`;

      if (fromUserCheck.rows.length === 0) {
        return NextResponse.json({ error: `送信元ユーザーが見つかりません: ${fromUserId}` }, { status: 404 });
      }
      if (toUserCheck.rows.length === 0) {
        return NextResponse.json({ error: `送信先ユーザーが見つかりません: ${toUserId}` }, { status: 404 });
      }

      // 既にフレンドか確認
      const friendCheck = await sql`
        SELECT * FROM friends
        WHERE (user_id = ${fromUserId} AND friend_id = ${toUserId})
           OR (user_id = ${toUserId} AND friend_id = ${fromUserId})
      `;
      if (friendCheck.rows.length > 0) {
        return NextResponse.json({ error: "Already friends" }, { status: 400 });
      }

      // 既存のリクエストを確認
      const existingCheck = await sql`
        SELECT * FROM friend_requests
        WHERE status = 'pending'
          AND ((from_user_id = ${fromUserId} AND to_user_id = ${toUserId})
            OR (from_user_id = ${toUserId} AND to_user_id = ${fromUserId}))
      `;
      if (existingCheck.rows.length > 0) {
        return NextResponse.json({ error: "Request already exists" }, { status: 400 });
      }

      // 新規リクエスト作成
      const result = await sql`
        INSERT INTO friend_requests (from_user_id, to_user_id, status, created_at)
        VALUES (${fromUserId}, ${toUserId}, 'pending', ${new Date().toISOString()})
        RETURNING id, from_user_id, to_user_id, status, created_at
      `;

      const newRequest = result.rows[0];
      return NextResponse.json({
        request: {
          id: newRequest.id,
          fromUserId: newRequest.from_user_id,
          toUserId: newRequest.to_user_id,
          status: newRequest.status,
          createdAt: newRequest.created_at,
        }
      });
    }

    if (action === "accept" || action === "reject") {
      // リクエスト承認/拒否
      if (!requestId) {
        return NextResponse.json({ error: "Request ID required" }, { status: 400 });
      }

      // リクエストを取得
      const reqResult = await sql`
        SELECT * FROM friend_requests WHERE id = ${requestId}
      `;
      if (reqResult.rows.length === 0) {
        return NextResponse.json({ error: "Request not found" }, { status: 404 });
      }

      const friendRequest = reqResult.rows[0];

      if (action === "accept") {
        // ステータス更新
        await sql`
          UPDATE friend_requests SET status = 'accepted' WHERE id = ${requestId}
        `;

        // 双方向のフレンド関係を作成
        await sql`
          INSERT INTO friends (user_id, friend_id, created_at)
          VALUES (${friendRequest.from_user_id}, ${friendRequest.to_user_id}, ${new Date().toISOString()})
          ON CONFLICT DO NOTHING
        `;
        await sql`
          INSERT INTO friends (user_id, friend_id, created_at)
          VALUES (${friendRequest.to_user_id}, ${friendRequest.from_user_id}, ${new Date().toISOString()})
          ON CONFLICT DO NOTHING
        `;

        return NextResponse.json({
          request: {
            id: friendRequest.id,
            fromUserId: friendRequest.from_user_id,
            toUserId: friendRequest.to_user_id,
            status: "accepted",
            createdAt: friendRequest.created_at,
          }
        });
      } else {
        // 拒否
        await sql`
          UPDATE friend_requests SET status = 'rejected' WHERE id = ${requestId}
        `;

        return NextResponse.json({
          request: {
            id: friendRequest.id,
            fromUserId: friendRequest.from_user_id,
            toUserId: friendRequest.to_user_id,
            status: "rejected",
            createdAt: friendRequest.created_at,
          }
        });
      }
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Friend request error:", error);
    return NextResponse.json({ error: "Internal server error", details: String(error) }, { status: 500 });
  }
}

// フレンド一覧 / リクエスト一覧取得
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const type = searchParams.get("type"); // "friends" | "requests" | "pending"

    if (!userId) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 });
    }

    if (type === "requests") {
      // 受信したフレンドリクエスト（pending）
      const result = await sql`
        SELECT fr.id, fr.from_user_id, fr.to_user_id, fr.status, fr.created_at,
               u.id as user_id, u.name, u.avatar, u.status as user_status
        FROM friend_requests fr
        JOIN users u ON u.id = fr.from_user_id
        WHERE fr.to_user_id = ${userId} AND fr.status = 'pending'
      `;

      const requests = result.rows.map(r => ({
        id: r.id,
        fromUserId: r.from_user_id,
        toUserId: r.to_user_id,
        status: r.status,
        createdAt: r.created_at,
        fromUser: {
          id: r.user_id,
          name: r.name,
          avatar: r.avatar,
          status: r.user_status,
        },
      }));

      return NextResponse.json({ requests });
    }

    if (type === "pending") {
      // 送信済みで保留中のリクエスト
      const result = await sql`
        SELECT fr.id, fr.from_user_id, fr.to_user_id, fr.status, fr.created_at,
               u.id as user_id, u.name, u.avatar, u.status as user_status
        FROM friend_requests fr
        JOIN users u ON u.id = fr.to_user_id
        WHERE fr.from_user_id = ${userId} AND fr.status = 'pending'
      `;

      const requests = result.rows.map(r => ({
        id: r.id,
        fromUserId: r.from_user_id,
        toUserId: r.to_user_id,
        status: r.status,
        createdAt: r.created_at,
        toUser: {
          id: r.user_id,
          name: r.name,
          avatar: r.avatar,
          status: r.user_status,
        },
      }));

      return NextResponse.json({ requests });
    }

    // フレンド一覧
    const result = await sql`
      SELECT u.id, u.name, u.avatar, u.status
      FROM friends f
      JOIN users u ON u.id = f.friend_id
      WHERE f.user_id = ${userId}
    `;

    const friends = result.rows.map(u => ({
      id: u.id,
      name: u.name,
      avatar: u.avatar,
      status: u.status,
    }));

    return NextResponse.json({ friends });
  } catch (error) {
    console.error("Get friends error:", error);
    return NextResponse.json({ error: "Internal server error", details: String(error) }, { status: 500 });
  }
}
