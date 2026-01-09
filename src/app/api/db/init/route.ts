import { sql } from "@vercel/postgres";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    // ユーザーテーブル
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        avatar VARCHAR(255),
        status VARCHAR(50) DEFAULT 'offline',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // フレンドリクエストテーブル
    await sql`
      CREATE TABLE IF NOT EXISTS friend_requests (
        id SERIAL PRIMARY KEY,
        from_user_id VARCHAR(255) NOT NULL REFERENCES users(id),
        to_user_id VARCHAR(255) NOT NULL REFERENCES users(id),
        status VARCHAR(50) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(from_user_id, to_user_id)
      )
    `;

    // フレンドテーブル
    await sql`
      CREATE TABLE IF NOT EXISTS friends (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL REFERENCES users(id),
        friend_id VARCHAR(255) NOT NULL REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, friend_id)
      )
    `;

    // プロジェクトテーブル
    await sql`
      CREATE TABLE IF NOT EXISTS projects (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        icon VARCHAR(50),
        description TEXT,
        creator_id VARCHAR(255) REFERENCES users(id),
        linked_chats JSONB DEFAULT '[]',
        project_members JSONB DEFAULT '[]',
        game_settings JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // プロジェクトデータテーブル
    await sql`
      CREATE TABLE IF NOT EXISTS project_data (
        id SERIAL PRIMARY KEY,
        project_id VARCHAR(255) NOT NULL UNIQUE,
        gantt_tasks JSONB DEFAULT '[]',
        task_groups JSONB DEFAULT '[]',
        milestones JSONB DEFAULT '[]',
        todo_items JSONB DEFAULT '[]',
        spreadsheet_links JSONB DEFAULT '[]',
        memo_entries JSONB DEFAULT '[]',
        url_links JSONB DEFAULT '[]',
        custom_events JSONB DEFAULT '[]',
        widget_order JSONB DEFAULT '["taskSummary", "gantt", "calendar", "todo", "spreadsheet", "url", "memo"]',
        holiday_settings JSONB DEFAULT '{"excludeSaturday": true, "excludeSunday": true, "excludeHolidays": true}',
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // メッセージテーブル
    await sql`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        chat_id VARCHAR(255) NOT NULL,
        sender_id VARCHAR(255) NOT NULL,
        sender_name VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        reactions JSONB DEFAULT '[]',
        reply_to INTEGER REFERENCES messages(id),
        is_edited BOOLEAN DEFAULT FALSE
      )
    `;

    // 勤怠テーブル
    await sql`
      CREATE TABLE IF NOT EXISTS attendance (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL REFERENCES users(id),
        date DATE NOT NULL,
        clock_in TIMESTAMP,
        clock_out TIMESTAMP,
        break_minutes INTEGER DEFAULT 0,
        status VARCHAR(50),
        UNIQUE(user_id, date)
      )
    `;

    return NextResponse.json({ success: true, message: "Database tables created successfully" });
  } catch (error) {
    console.error("Database init error:", error);
    return NextResponse.json({ error: "Failed to initialize database", details: String(error) }, { status: 500 });
  }
}
