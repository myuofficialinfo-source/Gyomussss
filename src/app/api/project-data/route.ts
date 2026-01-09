import { NextResponse } from "next/server";
import { sql } from "@vercel/postgres";

// GET: プロジェクトデータ取得
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId");

  if (!projectId) {
    return NextResponse.json({ error: "projectId required" }, { status: 400 });
  }

  try {
    const result = await sql`
      SELECT * FROM project_data WHERE project_id = ${projectId}
    `;

    if (result.rows.length > 0) {
      const data = result.rows[0];
      return NextResponse.json({
        ganttTasks: data.gantt_tasks || [],
        taskGroups: data.task_groups || [],
        milestones: data.milestones || [],
        todoItems: data.todo_items || [],
        spreadsheetLinks: data.spreadsheet_links || [],
        memoEntries: data.memo_entries || [],
        urlLinks: data.url_links || [],
        customEvents: data.custom_events || [],
        widgetOrder: data.widget_order || ["taskSummary", "gantt", "calendar", "todo", "spreadsheet", "url", "memo"],
        holidaySettings: data.holiday_settings || { excludeSaturday: true, excludeSunday: true, excludeHolidays: true },
      });
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
    return NextResponse.json({ error: "Internal server error", details: String(error) }, { status: 500 });
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

    const now = new Date().toISOString();

    // UPSERT (存在すれば更新、なければ挿入)
    await sql`
      INSERT INTO project_data (
        project_id, gantt_tasks, task_groups, milestones, todo_items,
        spreadsheet_links, memo_entries, url_links, custom_events,
        widget_order, holiday_settings, updated_at
      )
      VALUES (
        ${projectId},
        ${JSON.stringify(data.ganttTasks || [])},
        ${JSON.stringify(data.taskGroups || [])},
        ${JSON.stringify(data.milestones || [])},
        ${JSON.stringify(data.todoItems || [])},
        ${JSON.stringify(data.spreadsheetLinks || [])},
        ${JSON.stringify(data.memoEntries || [])},
        ${JSON.stringify(data.urlLinks || [])},
        ${JSON.stringify(data.customEvents || [])},
        ${JSON.stringify(data.widgetOrder || ["taskSummary", "gantt", "calendar", "todo", "spreadsheet", "url", "memo"])},
        ${JSON.stringify(data.holidaySettings || { excludeSaturday: true, excludeSunday: true, excludeHolidays: true })},
        ${now}
      )
      ON CONFLICT (project_id)
      DO UPDATE SET
        gantt_tasks = ${JSON.stringify(data.ganttTasks || [])},
        task_groups = ${JSON.stringify(data.taskGroups || [])},
        milestones = ${JSON.stringify(data.milestones || [])},
        todo_items = ${JSON.stringify(data.todoItems || [])},
        spreadsheet_links = ${JSON.stringify(data.spreadsheetLinks || [])},
        memo_entries = ${JSON.stringify(data.memoEntries || [])},
        url_links = ${JSON.stringify(data.urlLinks || [])},
        custom_events = ${JSON.stringify(data.customEvents || [])},
        widget_order = ${JSON.stringify(data.widgetOrder || ["taskSummary", "gantt", "calendar", "todo", "spreadsheet", "url", "memo"])},
        holiday_settings = ${JSON.stringify(data.holidaySettings || { excludeSaturday: true, excludeSunday: true, excludeHolidays: true })},
        updated_at = ${now}
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Save project data error:", error);
    return NextResponse.json({ error: "Internal server error", details: String(error) }, { status: 500 });
  }
}
