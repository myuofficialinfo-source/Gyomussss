import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

// データファイルのパス
const DATA_DIR = path.join(process.cwd(), "data");
const PROJECTS_FILE = path.join(DATA_DIR, "projects.json");
const MESSAGES_FILE = path.join(DATA_DIR, "messages.json");
const ATTENDANCE_FILE = path.join(DATA_DIR, "attendance.json");

// データディレクトリの初期化
function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

// ファイル読み込み
function readJsonFile(filePath: string, defaultValue: unknown = {}) {
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, "utf-8");
      return JSON.parse(data);
    }
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error);
  }
  return defaultValue;
}

// ファイル書き込み
function writeJsonFile(filePath: string, data: unknown) {
  ensureDataDir();
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
}

// GET: データ取得
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");

  ensureDataDir();

  try {
    switch (type) {
      case "projects":
        return NextResponse.json(readJsonFile(PROJECTS_FILE, []));
      case "messages":
        const chatId = searchParams.get("chatId");
        const allMessages = readJsonFile(MESSAGES_FILE, {});
        if (chatId) {
          return NextResponse.json(allMessages[chatId] || []);
        }
        return NextResponse.json(allMessages);
      case "attendance":
        const userId = searchParams.get("userId");
        const allAttendance = readJsonFile(ATTENDANCE_FILE, {});
        if (userId) {
          return NextResponse.json(allAttendance[userId] || []);
        }
        return NextResponse.json(allAttendance);
      default:
        return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }
  } catch (error) {
    console.error("GET error:", error);
    return NextResponse.json({ error: "Failed to read data" }, { status: 500 });
  }
}

// POST: データ保存
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { type, data, chatId, userId } = body;

    ensureDataDir();

    switch (type) {
      case "projects":
        writeJsonFile(PROJECTS_FILE, data);
        return NextResponse.json({ success: true });

      case "messages":
        if (!chatId) {
          return NextResponse.json({ error: "chatId required" }, { status: 400 });
        }
        const allMessages = readJsonFile(MESSAGES_FILE, {});
        allMessages[chatId] = data;
        writeJsonFile(MESSAGES_FILE, allMessages);
        return NextResponse.json({ success: true });

      case "attendance":
        if (!userId) {
          return NextResponse.json({ error: "userId required" }, { status: 400 });
        }
        const allAttendance = readJsonFile(ATTENDANCE_FILE, {});
        allAttendance[userId] = data;
        writeJsonFile(ATTENDANCE_FILE, allAttendance);
        return NextResponse.json({ success: true });

      default:
        return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }
  } catch (error) {
    console.error("POST error:", error);
    return NextResponse.json({ error: "Failed to save data" }, { status: 500 });
  }
}
