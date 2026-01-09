import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function getProjectDataPath(projectId: string) {
  return path.join(DATA_DIR, `project_${projectId}.json`);
}

// プロジェクト内データの型
type ProjectData = {
  ganttTasks: unknown[];
  taskGroups: unknown[];
  milestones: unknown[];
  todoItems: unknown[];
  spreadsheetLinks: unknown[];
  memoEntries: unknown[];
  urlLinks: unknown[];
  customEvents: unknown[];
  widgetOrder: string[];
  holidaySettings: unknown;
};

// GET: プロジェクトデータ取得
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId");

  if (!projectId) {
    return NextResponse.json({ error: "projectId required" }, { status: 400 });
  }

  ensureDataDir();

  try {
    const filePath = getProjectDataPath(projectId);
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, "utf-8");
      return NextResponse.json(JSON.parse(data));
    }
    // デフォルトの空データを返す
    return NextResponse.json({
      ganttTasks: [],
      taskGroups: [],
      milestones: [],
      todoItems: [],
      spreadsheetLinks: [],
      memoEntries: [],
      urlLinks: [],
      customEvents: [],
      widgetOrder: ["taskSummary", "gantt", "calendar", "todo", "spreadsheet", "url", "memo"],
      holidaySettings: { excludeSaturday: true, excludeSunday: true, excludeHolidays: true },
    });
  } catch (error) {
    console.error("Get project data error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST: プロジェクトデータ保存
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { projectId, data } = body;

    if (!projectId) {
      return NextResponse.json({ error: "projectId required" }, { status: 400 });
    }

    ensureDataDir();

    const filePath = getProjectDataPath(projectId);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Save project data error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
