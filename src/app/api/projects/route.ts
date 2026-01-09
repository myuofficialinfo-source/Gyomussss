import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const projectsPath = path.join(process.cwd(), "data", "projects.json");

// Sidebar.tsxと同じProject型
type ProjectMember = {
  id: string;
  name: string;
  avatar?: string;
  sourceType: "dm" | "group";
  sourceId: string;
  sourceName: string;
  permission: "admin" | "member";
};

type LinkedChat = {
  id: string;
  name: string;
  type: "dm" | "group";
  icon?: string;
};

type MemberRole = {
  memberId: string;
  memberName: string;
  roles: string[];
};

type GameSettings = {
  title: string;
  description: string;
  platforms: string[];
  playTime: string;
  genre: string;
  releaseDate: string;
  tags: string[];
  memberRoles?: MemberRole[];
};

type Project = {
  id: string;
  name: string;
  icon: string;
  description: string;
  creatorId?: string;
  linkedChats?: LinkedChat[];
  projectMembers?: ProjectMember[];
  gameSettings?: GameSettings;
};

function readProjects(): Project[] {
  try {
    const data = fs.readFileSync(projectsPath, "utf-8");
    return JSON.parse(data);
  } catch {
    return [];
  }
}

function writeProjects(projects: Project[]) {
  fs.writeFileSync(projectsPath, JSON.stringify(projects, null, 2));
}

// プロジェクト一覧取得 / 特定ユーザーのプロジェクト取得
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    const projects = readProjects();

    if (userId) {
      // ユーザーが参加しているプロジェクトのみ返す
      const userProjects = projects.filter(p =>
        p.creatorId === userId ||
        p.projectMembers?.some(m => m.id === userId)
      );
      return NextResponse.json({ projects: userProjects });
    }

    return NextResponse.json({ projects });
  } catch (error) {
    console.error("Get projects error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// プロジェクト作成
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, icon, description, creatorId, linkedChats, projectMembers, gameSettings } = body;

    if (!name) {
      return NextResponse.json({ error: "Project name is required" }, { status: 400 });
    }

    const projects = readProjects();

    const newProject: Project = {
      id: `project_${Date.now()}`,
      name,
      icon: icon || "🎮",
      description: description || "",
      creatorId,
      linkedChats: linkedChats || [],
      projectMembers: projectMembers || [],
      gameSettings,
    };

    projects.push(newProject);
    writeProjects(projects);

    return NextResponse.json({ project: newProject });
  } catch (error) {
    console.error("Create project error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// プロジェクト更新
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: "Project ID is required" }, { status: 400 });
    }

    const projects = readProjects();
    const projectIndex = projects.findIndex(p => p.id === id);

    if (projectIndex === -1) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    projects[projectIndex] = { ...projects[projectIndex], ...updates };
    writeProjects(projects);

    return NextResponse.json({ project: projects[projectIndex] });
  } catch (error) {
    console.error("Update project error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
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

    const projects = readProjects();
    const filteredProjects = projects.filter(p => p.id !== id);

    if (filteredProjects.length === projects.length) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    writeProjects(filteredProjects);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete project error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
