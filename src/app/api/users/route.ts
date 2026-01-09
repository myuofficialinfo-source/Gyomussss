import { NextResponse } from "next/server";
import { sql } from "@vercel/postgres";

// ユーザー型定義
export type StoredUser = {
  id: string;
  name: string;
  email?: string;
  avatar: string;
  provider: "email" | "google" | "twitter" | "discord";
  providerId?: string;
  createdAt: string;
  lastLoginAt: string;
};

// ユーザー登録 or ログイン
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, provider = "email", providerId } = body;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const now = new Date().toISOString();

    // 既存ユーザーを検索
    let existingUser = null;

    if (provider !== "email" && providerId) {
      const result = await sql`
        SELECT * FROM users WHERE id = ${providerId}
      `;
      if (result.rows.length > 0) {
        existingUser = result.rows[0];
      }
    }

    // 名前での検索
    if (!existingUser) {
      const result = await sql`
        SELECT * FROM users WHERE LOWER(name) = LOWER(${name})
      `;
      if (result.rows.length > 0) {
        existingUser = result.rows[0];
      }
    }

    if (existingUser) {
      // 既存ユーザー: 最終ログイン時刻を更新（ステータスもオンラインに）
      await sql`
        UPDATE users SET status = 'online' WHERE id = ${existingUser.id}
      `;
      const user: StoredUser = {
        id: existingUser.id,
        name: existingUser.name,
        email: existingUser.email || undefined,
        avatar: existingUser.avatar || existingUser.name.charAt(0).toUpperCase(),
        provider: provider,
        providerId: providerId,
        createdAt: existingUser.created_at,
        lastLoginAt: now,
      };
      return NextResponse.json({ user, isNew: false });
    }

    // 新規ユーザー作成
    const userId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    const avatar = name.charAt(0).toUpperCase();

    await sql`
      INSERT INTO users (id, name, avatar, status, created_at)
      VALUES (${userId}, ${name}, ${avatar}, 'online', ${now})
    `;

    const newUser: StoredUser = {
      id: userId,
      name,
      email,
      avatar,
      provider,
      providerId,
      createdAt: now,
      lastLoginAt: now,
    };

    return NextResponse.json({ user: newUser, isNew: true });
  } catch (error) {
    console.error("User registration error:", error);
    return NextResponse.json({ error: "Internal server error", details: String(error) }, { status: 500 });
  }
}

// ユーザー検索
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");
    const userId = searchParams.get("id");

    // IDで検索
    if (userId) {
      const result = await sql`
        SELECT * FROM users WHERE id = ${userId}
      `;
      if (result.rows.length > 0) {
        const u = result.rows[0];
        return NextResponse.json({
          user: {
            id: u.id,
            name: u.name,
            avatar: u.avatar,
            status: u.status,
          }
        });
      }
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // 名前で検索
    if (query) {
      const searchPattern = `%${query.toLowerCase()}%`;
      const result = await sql`
        SELECT id, name, avatar, status FROM users
        WHERE LOWER(name) LIKE ${searchPattern} OR LOWER(id) LIKE ${searchPattern}
      `;
      const users = result.rows.map(u => ({
        id: u.id,
        name: u.name,
        avatar: u.avatar,
        status: u.status,
      }));
      return NextResponse.json({ users });
    }

    // 全ユーザー一覧
    const result = await sql`
      SELECT id, name, avatar, status FROM users
    `;
    const users = result.rows.map(u => ({
      id: u.id,
      name: u.name,
      avatar: u.avatar,
      status: u.status,
    }));
    return NextResponse.json({ users });
  } catch (error) {
    console.error("User search error:", error);
    return NextResponse.json({ error: "Internal server error", details: String(error) }, { status: 500 });
  }
}
