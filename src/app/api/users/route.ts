import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const usersFilePath = path.join(process.cwd(), "data", "users.json");

// ユーザー型定義（OAuth対応を見据えた設計）
export type StoredUser = {
  id: string;
  name: string;
  email?: string;
  avatar: string;
  provider: "email" | "google" | "twitter" | "discord";
  providerId?: string; // OAuth時のプロバイダー側ID
  createdAt: string;
  lastLoginAt: string;
};

function readUsers(): StoredUser[] {
  try {
    const data = fs.readFileSync(usersFilePath, "utf-8");
    return JSON.parse(data);
  } catch {
    return [];
  }
}

function writeUsers(users: StoredUser[]) {
  fs.writeFileSync(usersFilePath, JSON.stringify(users, null, 2));
}

// ユーザー登録 or ログイン
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, provider = "email", providerId } = body;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const users = readUsers();
    const now = new Date().toISOString();

    // 既存ユーザーを検索（OAuthの場合はproviderIdで、メールの場合は名前で）
    let existingUser: StoredUser | undefined;

    if (provider !== "email" && providerId) {
      existingUser = users.find(u => u.provider === provider && u.providerId === providerId);
    }

    // 名前での検索（同名ユーザーがいる場合は既存ユーザーとしてログイン）
    if (!existingUser) {
      existingUser = users.find(u => u.name.toLowerCase() === name.toLowerCase() && u.provider === provider);
    }

    if (existingUser) {
      // 既存ユーザー: 最終ログイン時刻を更新
      existingUser.lastLoginAt = now;
      writeUsers(users);
      return NextResponse.json({ user: existingUser, isNew: false });
    }

    // 新規ユーザー作成
    const newUser: StoredUser = {
      id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      email,
      avatar: name.charAt(0).toUpperCase(),
      provider,
      providerId,
      createdAt: now,
      lastLoginAt: now,
    };

    users.push(newUser);
    writeUsers(users);

    return NextResponse.json({ user: newUser, isNew: true });
  } catch (error) {
    console.error("User registration error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ユーザー検索
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");
    const userId = searchParams.get("id");

    const users = readUsers();

    // IDで検索
    if (userId) {
      const user = users.find(u => u.id === userId);
      if (user) {
        return NextResponse.json({ user });
      }
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // 名前で検索
    if (query) {
      const results = users.filter(u =>
        u.name.toLowerCase().includes(query.toLowerCase()) ||
        u.id.toLowerCase().includes(query.toLowerCase())
      ).map(u => ({
        id: u.id,
        name: u.name,
        avatar: u.avatar,
        provider: u.provider,
      }));
      return NextResponse.json({ users: results });
    }

    // 全ユーザー一覧（公開情報のみ）
    const publicUsers = users.map(u => ({
      id: u.id,
      name: u.name,
      avatar: u.avatar,
      provider: u.provider,
    }));
    return NextResponse.json({ users: publicUsers });
  } catch (error) {
    console.error("User search error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
