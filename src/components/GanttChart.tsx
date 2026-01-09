"use client";

import { useState, useRef, useEffect } from "react";
import type { Project } from "./Sidebar";

export type GanttTask = {
  id: string;
  title: string;
  assignee: string;
  assigneeAvatar: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  progress: number;  // 0-100
  color: string;
  source: "manual" | "chat" | "git";
  sourceDetail?: string; // チャット名やコミットハッシュなど
};

export type GitCommit = {
  id: string;
  hash: string;
  message: string;
  author: string;
  authorAvatar: string;
  date: string;
  branch: string;
};

// ガントタスク（空）
const dummyTasks: GanttTask[] = [];

// Gitコミット（空）
const dummyCommits: GitCommit[] = [];

type Props = {
  project: Project;
  onClose: () => void;
};

export default function GanttChart({ project, onClose }: Props) {
  const [tasks, setTasks] = useState<GanttTask[]>(dummyTasks);
  const [commits] = useState<GitCommit[]>(dummyCommits);
  const [viewMode, setViewMode] = useState<"week" | "month">("week");
  const [activeTab, setActiveTab] = useState<"gantt" | "git">("gantt");
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<GanttTask | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // 新規タスク用のstate
  const [newTask, setNewTask] = useState({
    title: "",
    assignee: "",
    startDate: "",
    endDate: "",
  });

  // 今日の日付
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];

  // 表示する日付の範囲を計算
  const getDateRange = () => {
    const start = new Date(today);
    start.setDate(start.getDate() - 7);
    const end = new Date(today);
    end.setDate(end.getDate() + (viewMode === "week" ? 14 : 30));

    const dates: Date[] = [];
    const current = new Date(start);
    while (current <= end) {
      dates.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    return dates;
  };

  const dates = getDateRange();

  // タスクの位置を計算
  const getTaskPosition = (task: GanttTask) => {
    const startDate = new Date(task.startDate);
    const endDate = new Date(task.endDate);
    const rangeStart = dates[0];

    const startOffset = Math.floor((startDate.getTime() - rangeStart.getTime()) / (1000 * 60 * 60 * 24));
    const duration = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    return {
      left: Math.max(0, startOffset) * 40,
      width: Math.max(1, duration) * 40,
    };
  };

  // タスク追加
  const handleAddTask = () => {
    if (!newTask.title || !newTask.startDate || !newTask.endDate) return;

    const task: GanttTask = {
      id: `t${Date.now()}`,
      title: newTask.title,
      assignee: newTask.assignee || "未割当",
      assigneeAvatar: newTask.assignee ? newTask.assignee.charAt(0) : "?",
      startDate: newTask.startDate,
      endDate: newTask.endDate,
      progress: 0,
      color: "bg-blue-500",
      source: "manual",
    };

    setTasks([...tasks, task]);
    setNewTask({ title: "", assignee: "", startDate: "", endDate: "" });
    setIsAddTaskOpen(false);
  };

  // タスク削除
  const handleDeleteTask = (taskId: string) => {
    setTasks(tasks.filter(t => t.id !== taskId));
    setSelectedTask(null);
  };

  // 進捗更新
  const handleUpdateProgress = (taskId: string, progress: number) => {
    setTasks(tasks.map(t => t.id === taskId ? { ...t, progress } : t));
  };

  // 今日の位置にスクロール
  useEffect(() => {
    if (scrollRef.current) {
      const todayIndex = dates.findIndex(d => d.toISOString().split("T")[0] === todayStr);
      if (todayIndex > 0) {
        scrollRef.current.scrollLeft = (todayIndex - 3) * 40;
      }
    }
  }, []);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-full max-w-6xl h-[80vh] overflow-hidden shadow-xl flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center text-xl">
              {project.icon}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-800">{project.name} - ガントチャート</h2>
              <p className="text-sm text-slate-500">タスクの進捗を管理</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-2xl"
          >
            ×
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 shrink-0">
          <button
            onClick={() => setActiveTab("gantt")}
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === "gantt"
                ? "text-purple-600 border-b-2 border-purple-600"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            ガントチャート
          </button>
          <button
            onClick={() => setActiveTab("git")}
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === "git"
                ? "text-purple-600 border-b-2 border-purple-600"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Git履歴
          </button>
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 py-2 bg-slate-50 border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsAddTaskOpen(true)}
              className="px-3 py-1.5 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 flex items-center gap-1"
            >
              + タスク追加
            </button>
            <span className="text-xs text-slate-500 ml-2">
              チャットで「TO:AI ガントチャートに追加」と送信すると自動追加
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode("week")}
              className={`px-3 py-1 text-sm rounded ${
                viewMode === "week" ? "bg-purple-100 text-purple-700" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              週表示
            </button>
            <button
              onClick={() => setViewMode("month")}
              className={`px-3 py-1 text-sm rounded ${
                viewMode === "month" ? "bg-purple-100 text-purple-700" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              月表示
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {activeTab === "gantt" ? (
            <div className="flex h-full">
              {/* Task List (Left) */}
              <div className="w-64 border-r border-slate-200 shrink-0 overflow-y-auto">
                <div className="h-10 bg-slate-100 border-b border-slate-200 flex items-center px-3">
                  <span className="text-xs font-medium text-slate-600">タスク名</span>
                </div>
                {tasks.map(task => (
                  <div
                    key={task.id}
                    onClick={() => setSelectedTask(task)}
                    className={`h-12 border-b border-slate-100 flex items-center px-3 gap-2 cursor-pointer hover:bg-slate-50 ${
                      selectedTask?.id === task.id ? "bg-purple-50" : ""
                    }`}
                  >
                    <div className="w-6 h-6 bg-slate-200 rounded-full flex items-center justify-center text-xs">
                      {task.assigneeAvatar}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-800 truncate">{task.title}</p>
                      <div className="flex items-center gap-1">
                        {task.source === "chat" && (
                          <span className="text-[10px] text-blue-600 bg-blue-50 px-1 rounded">💬</span>
                        )}
                        {task.source === "git" && (
                          <span className="text-[10px] text-green-600 bg-green-50 px-1 rounded">🔗</span>
                        )}
                        <span className="text-[10px] text-slate-400">{task.progress}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Gantt Grid (Right) */}
              <div className="flex-1 overflow-x-auto" ref={scrollRef}>
                {/* Date Header */}
                <div className="h-10 bg-slate-100 border-b border-slate-200 flex sticky top-0">
                  {dates.map((date, i) => {
                    const isToday = date.toISOString().split("T")[0] === todayStr;
                    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                    return (
                      <div
                        key={i}
                        className={`w-10 shrink-0 flex flex-col items-center justify-center text-[10px] border-r border-slate-200 ${
                          isToday ? "bg-purple-100" : isWeekend ? "bg-slate-50" : ""
                        }`}
                      >
                        <span className={isToday ? "text-purple-600 font-bold" : "text-slate-400"}>
                          {date.getDate()}
                        </span>
                        <span className={isToday ? "text-purple-600" : "text-slate-400"}>
                          {["日", "月", "火", "水", "木", "金", "土"][date.getDay()]}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Task Bars */}
                <div className="relative">
                  {tasks.map(task => {
                    const pos = getTaskPosition(task);
                    return (
                      <div key={task.id} className="h-12 border-b border-slate-100 relative">
                        {/* Background grid */}
                        <div className="absolute inset-0 flex">
                          {dates.map((date, i) => {
                            const isToday = date.toISOString().split("T")[0] === todayStr;
                            const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                            return (
                              <div
                                key={i}
                                className={`w-10 shrink-0 border-r border-slate-100 ${
                                  isToday ? "bg-purple-50" : isWeekend ? "bg-slate-50/50" : ""
                                }`}
                              />
                            );
                          })}
                        </div>
                        {/* Task bar */}
                        <div
                          className={`absolute top-2 h-8 ${task.color} rounded-md shadow-sm cursor-pointer hover:opacity-90 transition-opacity`}
                          style={{ left: pos.left, width: pos.width }}
                          onClick={() => setSelectedTask(task)}
                        >
                          <div
                            className="h-full bg-white/30 rounded-l-md"
                            style={{ width: `${task.progress}%` }}
                          />
                          <span className="absolute inset-0 flex items-center justify-center text-white text-xs font-medium truncate px-1">
                            {task.title}
                          </span>
                        </div>
                      </div>
                    );
                  })}

                  {/* Today line */}
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10"
                    style={{ left: dates.findIndex(d => d.toISOString().split("T")[0] === todayStr) * 40 + 20 }}
                  />
                </div>
              </div>
            </div>
          ) : (
            /* Git History Tab */
            <div className="p-4 overflow-y-auto h-full">
              <div className="space-y-3">
                {commits.map(commit => (
                  <div key={commit.id} className="bg-slate-50 rounded-lg p-3 flex items-start gap-3">
                    <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center text-sm shrink-0">
                      {commit.authorAvatar}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-xs text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded">
                          {commit.hash}
                        </span>
                        <span className="text-xs text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                          {commit.branch}
                        </span>
                      </div>
                      <p className="text-sm text-slate-800">{commit.message}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-slate-500">{commit.author}</span>
                        <span className="text-xs text-slate-400">{commit.date}</span>
                      </div>
                    </div>
                    <button
                      className="px-2 py-1 text-xs text-purple-600 hover:bg-purple-50 rounded"
                      title="このコミットをタスクに追加"
                    >
                      + タスク化
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Task Detail Panel */}
        {selectedTask && (
          <div className="border-t border-slate-200 bg-slate-50 p-4 shrink-0">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-medium text-slate-800">{selectedTask.title}</h3>
                <p className="text-sm text-slate-500">
                  {selectedTask.startDate} 〜 {selectedTask.endDate} | 担当: {selectedTask.assignee}
                </p>
                {selectedTask.source !== "manual" && (
                  <p className="text-xs text-slate-400 mt-1">
                    {selectedTask.source === "chat" ? "💬 チャットから追加" : "🔗 Gitから追加"}
                    {selectedTask.sourceDetail && ` (${selectedTask.sourceDetail})`}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDeleteTask(selectedTask.id)}
                  className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded"
                >
                  削除
                </button>
                <button
                  onClick={() => setSelectedTask(null)}
                  className="px-3 py-1 text-sm text-slate-600 hover:bg-slate-100 rounded"
                >
                  閉じる
                </button>
              </div>
            </div>
            <div className="mt-3">
              <label className="text-xs text-slate-500">進捗</label>
              <div className="flex items-center gap-3 mt-1">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={selectedTask.progress}
                  onChange={(e) => handleUpdateProgress(selectedTask.id, Number(e.target.value))}
                  className="flex-1"
                />
                <span className="text-sm font-medium text-slate-700 w-12">{selectedTask.progress}%</span>
              </div>
            </div>
          </div>
        )}

        {/* Add Task Modal */}
        {isAddTaskOpen && (
          <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
            <div className="bg-white rounded-lg p-4 w-96 shadow-xl">
              <h3 className="font-semibold text-slate-800 mb-4">新規タスク追加</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-slate-500">タスク名</label>
                  <input
                    type="text"
                    value={newTask.title}
                    onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="タスク名を入力"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500">担当者</label>
                  <input
                    type="text"
                    value={newTask.assignee}
                    onChange={(e) => setNewTask({ ...newTask, assignee: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="担当者名"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-500">開始日</label>
                    <input
                      type="date"
                      value={newTask.startDate}
                      onChange={(e) => setNewTask({ ...newTask, startDate: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500">終了日</label>
                    <input
                      type="date"
                      value={newTask.endDate}
                      onChange={(e) => setNewTask({ ...newTask, endDate: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button
                  onClick={() => setIsAddTaskOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleAddTask}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700"
                >
                  追加
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
