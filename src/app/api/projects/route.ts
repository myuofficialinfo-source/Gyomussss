import { NextResponse } from "next/server";
import { sql } from "@vercel/postgres";

// プロジェクト一覧取得 / 特定ユーザーのプロジェクト取得
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (userId) {
      // ユーザーが参加しているプロジェクトのみ返す
      // JSONBの配列内にidが含まれるかをチェック（より確実な方法）
      const result = await sql`
        SELECT * FROM projects
        WHERE creator_id = ${userId}
           OR EXISTS (
             SELECT 1 FROM jsonb_array_elements(project_members::jsonb) AS member
             WHERE member->>'id' = ${userId}
           )
      `;

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

      return NextResponse.json({ projects });
    }

    // 全プロジェクト
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

    return NextResponse.json({ projects });
  } catch (error) {
    console.error("Get projects error:", error);
    return NextResponse.json({ error: "Internal server error", details: String(error) }, { status: 500 });
  }
}

// プロジェクト作成
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id, name, icon, description, creatorId, linkedChats, projectMembers, gameSettings } = body;

    if (!name) {
      return NextResponse.json({ error: "Project name is required" }, { status: 400 });
    }

    // IDが渡された場合はそれを使用、なければ新規生成
    const projectId = id || `project_${Date.now()}`;
    const now = new Date().toISOString();

    await sql`
      INSERT INTO projects (id, name, icon, description, creator_id, linked_chats, project_members, game_settings, created_at)
      VALUES (
        ${projectId},
        ${name},
        ${icon || "🎮"},
        ${description || ""},
        ${creatorId || null},
        ${JSON.stringify(linkedChats || [])},
        ${JSON.stringify(projectMembers || [])},
        ${gameSettings ? JSON.stringify(gameSettings) : null},
        ${now}
      )
    `;

    const newProject = {
      id: projectId,
      name,
      icon: icon || "🎮",
      description: description || "",
      creatorId,
      linkedChats: linkedChats || [],
      projectMembers: projectMembers || [],
      gameSettings,
    };

    return NextResponse.json({ project: newProject });
  } catch (error) {
    console.error("Create project error:", error);
    return NextResponse.json({ error: "Internal server error", details: String(error) }, { status: 500 });
  }
}

// プロジェクト更新
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, name, icon, description, linkedChats, projectMembers, gameSettings } = body;

    if (!id) {
      return NextResponse.json({ error: "Project ID is required" }, { status: 400 });
    }

    // 既存プロジェクトを確認
    const existing = await sql`SELECT * FROM projects WHERE id = ${id}`;
    if (existing.rows.length === 0) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const current = existing.rows[0];

    await sql`
      UPDATE projects SET
        name = ${name !== undefined ? name : current.name},
        icon = ${icon !== undefined ? icon : current.icon},
        description = ${description !== undefined ? description : current.description},
        linked_chats = ${linkedChats !== undefined ? JSON.stringify(linkedChats) : current.linked_chats},
        project_members = ${projectMembers !== undefined ? JSON.stringify(projectMembers) : current.project_members},
        game_settings = ${gameSettings !== undefined ? JSON.stringify(gameSettings) : current.game_settings}
      WHERE id = ${id}
    `;

    const updatedProject = {
      id,
      name: name !== undefined ? name : current.name,
      icon: icon !== undefined ? icon : current.icon,
      description: description !== undefined ? description : current.description,
      creatorId: current.creator_id,
      linkedChats: linkedChats !== undefined ? linkedChats : current.linked_chats,
      projectMembers: projectMembers !== undefined ? projectMembers : current.project_members,
      gameSettings: gameSettings !== undefined ? gameSettings : current.game_settings,
    };

    return NextResponse.json({ project: updatedProject });
  } catch (error) {
    console.error("Update project error:", error);
    return NextResponse.json({ error: "Internal server error", details: String(error) }, { status: 500 });
  }
}

// プロジェクト削除
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Project ID is required" }, { status: 400 });
    }

    const result = await sql`DELETE FROM projects WHERE id = ${id} RETURNING id`;

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // プロジェクトデータも削除
    await sql`DELETE FROM project_data WHERE project_id = ${id}`;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete project error:", error);
    return NextResponse.json({ error: "Internal server error", details: String(error) }, { status: 500 });
  }
}
