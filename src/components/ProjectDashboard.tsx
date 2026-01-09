"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type { Project, GameEvent } from "./Sidebar";
import GameDevTips from "./GameDevTips";

// 最終イベント更新日時を保存するためのキー
const EVENT_LAST_UPDATE_KEY = "gyomussss_event_last_update";

// 最新チャットメッセージ（空）
const dummyLatestMessages: {
  id: string;
  chatId: string;
  chatName: string;
  userName: string;
  userAvatar: string;
  content: string;
  timestamp: string;
}[] = [];

// Gitアカウント用の型
type GitAccount = {
  id: string;
  name: string;
  username: string;
  avatar: string;
};

// Gitアカウント（空）
const gitAccounts: GitAccount[] = [];

// 変更履歴用の型
type TaskHistory = {
  id: string;
  timestamp: string;
  type: "workDays" | "progress" | "assignee" | "comment";
  oldValue?: string | number;
  newValue?: string | number;
  comment?: string;
  userName: string;
};

// ガントチャート用の型
type GanttTask = {
  id: string;
  title: string;
  assignees: { gitAccountId: string; name: string; avatar: string }[];
  startDate: string;
  workDays: number; // 工数（営業日数）
  progress: number;
  color: string;
  groupId: string; // "" = グループ未割当
  history: TaskHistory[]; // 変更履歴
  status: "active" | "completed" | "deleted"; // タスクの状態
  isCollapsed?: boolean; // 折りたたみ状態
};

type TaskGroup = {
  id: string;
  name: string;
  color: string;
  isExpanded: boolean;
};

// マイルストーン用の型
type Milestone = {
  id: string;
  date: string;
  label: string;
  color: string;
};

// ウィジェット用の型
type WidgetType = "taskSummary" | "gantt" | "latestChat" | "activity" | "spreadsheet" | "todo";
type WidgetPosition = { x: number; y: number; w: number; h: number };
type Widget = {
  id: string;
  type: WidgetType;
  title: string;
  position: WidgetPosition;
};

// デフォルトのウィジェット配置
const defaultWidgets: Widget[] = [
  { id: "w1", type: "taskSummary", title: "タスク概要", position: { x: 0, y: 0, w: 2, h: 1 } },
  { id: "w2", type: "gantt", title: "ガントチャート", position: { x: 0, y: 1, w: 1, h: 2 } },
  { id: "w3", type: "latestChat", title: "最新のチャット", position: { x: 1, y: 1, w: 1, h: 1 } },
  { id: "w4", type: "activity", title: "最近のアクティビティ", position: { x: 1, y: 2, w: 1, h: 1 } },
  { id: "w5", type: "spreadsheet", title: "スプレッドシート", position: { x: 2, y: 0, w: 1, h: 1 } },
  { id: "w6", type: "todo", title: "TODOリスト", position: { x: 2, y: 1, w: 1, h: 2 } },
];

// TODOアイテムの型
type TodoItem = {
  id: string;
  text: string;
  completed: boolean;
};

// スプレッドシートリンクの型
type SpreadsheetLink = {
  id: string;
  name: string;
  url: string;
};

// グループ（空）
const initialGroups: TaskGroup[] = [];

// ガントタスク（空）
const initialGanttTasks: GanttTask[] = [];

// AIから追加するタスクデータの型
export type AITaskData = {
  title: string;
  assigneeId?: string;
  assigneeName?: string;
  startDate?: string;
  hours?: number;
  groupId?: string;
  groupName?: string;
};

type Props = {
  project: Project;
  onOpenChatSettings: () => void;
  onOpenGameSettings: () => void;
  pendingAITask?: AITaskData | null; // AIから追加されるタスク
  onAITaskAdded?: () => void; // タスク追加完了通知
  currentUserId?: string; // 現在のユーザーID
};

export default function ProjectDashboard({ project, onOpenChatSettings, onOpenGameSettings, pendingAITask, onAITaskAdded, currentUserId = "me" }: Props) {
  const linkedChats = project.linkedChats || [];
  const hasLinkedChats = linkedChats.length > 0;

  // 現在のユーザーが管理者かどうかチェック
  // デバッグモード: 常に管理者として扱う
  const isAdmin = true;

  // Tips画面表示
  const [showTips, setShowTips] = useState(false);

  // ガントチャート
  const [isGanttFullScreen, setIsGanttFullScreen] = useState(false);
  const [ganttTasks, setGanttTasks] = useState<GanttTask[]>(initialGanttTasks);
  const [taskGroups, setTaskGroups] = useState<TaskGroup[]>(initialGroups);
  const [selectedTask, setSelectedTask] = useState<GanttTask | null>(null);
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  const [newTask, setNewTask] = useState({ title: "", assigneeIds: [] as string[], startDate: "", workDays: 1 });
  const [newCategory, setNewCategory] = useState({ name: "", color: "bg-blue-500" });
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverTaskId, setDragOverTaskId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // タスクバーの水平ドラッグ用
  const [barDragTaskId, setBarDragTaskId] = useState<string | null>(null);
  const [barDragStartX, setBarDragStartX] = useState<number>(0);
  const [barDragOriginalDate, setBarDragOriginalDate] = useState<string>("");

  // マイルストーン
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [isMilestoneModalOpen, setIsMilestoneModalOpen] = useState(false);
  const [newMilestoneDate, setNewMilestoneDate] = useState<string>("");
  const [newMilestoneLabel, setNewMilestoneLabel] = useState<string>("");
  const [newMilestoneColor, setNewMilestoneColor] = useState<string>("bg-purple-500");
  const [editingMilestoneId, setEditingMilestoneId] = useState<string | null>(null);

  // 削除確認ダイアログ
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);

  // 工数変更ダイアログ
  const [isWorkDaysModalOpen, setIsWorkDaysModalOpen] = useState(false);
  const [newWorkDays, setNewWorkDays] = useState<number>(1);
  const [workDaysComment, setWorkDaysComment] = useState<string>("");

  // タスク完了演出
  const [showConfetti, setShowConfetti] = useState(false);
  const [completedTaskName, setCompletedTaskName] = useState<string>("");

  // コメント入力
  const [newComment, setNewComment] = useState<string>("");

  // イベント管理
  const [customEvents, setCustomEvents] = useState<GameEvent[]>([]);
  const [aiEvents, setAiEvents] = useState<GameEvent[]>([]);

  // AIからのタスク追加を処理（処理済みタスクのIDを追跡して重複防止）
  // useRefを使って再レンダリングを引き起こさずに追跡
  const processedTaskKeysRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (pendingAITask && pendingAITask.title) {
      // タスクの一意なキーを生成（タイトル+開始日+担当者で識別）
      const taskKey = `${pendingAITask.title}-${pendingAITask.startDate}-${pendingAITask.assigneeName || ""}`;

      // 既に処理済みの場合はスキップ
      if (processedTaskKeysRef.current.has(taskKey)) {
        console.log("[ProjectDashboard] Task already processed, skipping:", taskKey);
        return;
      }

      // 先に処理済みとしてマーク（重複実行を防ぐ）
      processedTaskKeysRef.current.add(taskKey);

      console.log("[ProjectDashboard] Received pendingAITask:", pendingAITask);

      // AIから受け取ったデータでタスクを作成
      const today = new Date().toISOString().split("T")[0];
      const colors = ["bg-blue-500", "bg-green-500", "bg-purple-500", "bg-orange-500", "bg-pink-500"];
      const randomColor = colors[Math.floor(Math.random() * colors.length)];

      // 担当者を検索
      const assignees: { gitAccountId: string; name: string; avatar: string }[] = [];
      if (pendingAITask.assigneeName) {
        const account = gitAccounts.find(a =>
          a.name === pendingAITask.assigneeName ||
          a.name.includes(pendingAITask.assigneeName || "")
        );
        if (account) {
          assignees.push({ gitAccountId: account.id, name: account.name, avatar: account.avatar });
        } else {
          // マッチしない場合は名前だけ保持
          assignees.push({ gitAccountId: "", name: pendingAITask.assigneeName, avatar: pendingAITask.assigneeName.charAt(0) });
        }
      }

      // workDaysを数値として確実に設定（最低1日）
      const workDays = (typeof pendingAITask.hours === "number" && pendingAITask.hours > 0)
        ? pendingAITask.hours
        : 1;

      console.log("[ProjectDashboard] Creating task with workDays:", workDays);

      const newGanttTask: GanttTask = {
        id: `ai-task-${Date.now()}`,
        title: pendingAITask.title,
        assignees,
        startDate: pendingAITask.startDate || today,
        workDays,
        progress: 0,
        color: randomColor,
        groupId: pendingAITask.groupId || "",
        history: [{
          id: `h-${Date.now()}`,
          timestamp: new Date().toLocaleString("ja-JP"),
          type: "comment",
          comment: `AIアシスタントによりタスクが作成されました（工数: ${workDays}日）`,
          userName: "AI",
        }],
        status: "active",
      };

      console.log("[ProjectDashboard] New GanttTask:", newGanttTask);
      setGanttTasks(prev => [...prev, newGanttTask]);

      // 追加完了を通知
      if (onAITaskAdded) {
        onAITaskAdded();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingAITask]);
  const [selectedEvent, setSelectedEvent] = useState<GameEvent | null>(null);
  const [isAddEventOpen, setIsAddEventOpen] = useState(false);
  const [isSearchingEvents, setIsSearchingEvents] = useState(false);
  const [newEvent, setNewEvent] = useState({
    name: "",
    startDate: "",
    endDate: "",
    location: "",
    url: "",
    description: "",
    type: "exhibition" as "exhibition" | "conference" | "market" | "online",
  });

  // ウィジェット管理（順序で配置を管理）
  const [widgetOrder, setWidgetOrder] = useState<string[]>([
    "gantt", "latestChat", "activity", "spreadsheet", "todo"
  ]);
  const [draggedWidgetId, setDraggedWidgetId] = useState<string | null>(null);
  const [dragOverWidgetId, setDragOverWidgetId] = useState<string | null>(null);
  const [isSettingsMenuOpen, setIsSettingsMenuOpen] = useState(false);

  // 全ウィジェット定義（追加可能なもの含む）
  const allWidgets = [
    { id: "gantt", icon: "📊", label: "ガントチャート" },
    { id: "latestChat", icon: "💬", label: "最新のチャット" },
    { id: "activity", icon: "📝", label: "最近のアクティビティ" },
    { id: "spreadsheet", icon: "📄", label: "スプレッドシート" },
    { id: "todo", icon: "✅", label: "TODOリスト" },
    { id: "memo", icon: "🗒️", label: "メモ" },
    { id: "urlLinks", icon: "🔗", label: "URLリンク" },
    { id: "timer", icon: "⏱️", label: "タイマー" },
    { id: "calendar", icon: "📅", label: "カレンダー" },
  ];

  // ツールボックスに格納されているウィジェット（表示されていないもの）
  const toolboxWidgets = allWidgets.filter(w => !widgetOrder.includes(w.id));

  // ウィジェットをツールボックスに格納（削除）
  const removeWidgetToToolbox = (widgetId: string) => {
    setWidgetOrder(widgetOrder.filter(id => id !== widgetId));
  };

  // ウィジェットをツールボックスから追加
  const addWidgetFromToolbox = (widgetId: string) => {
    if (!widgetOrder.includes(widgetId)) {
      setWidgetOrder([...widgetOrder, widgetId]);
    }
  };

  // ウィジェットのドラッグ＆ドロップ
  const handleWidgetDragStart = (widgetId: string) => {
    setDraggedWidgetId(widgetId);
  };

  const handleWidgetDragOver = (e: React.DragEvent, widgetId: string) => {
    e.preventDefault();
    if (draggedWidgetId && draggedWidgetId !== widgetId) {
      setDragOverWidgetId(widgetId);
    }
  };

  const handleWidgetDragLeave = () => {
    setDragOverWidgetId(null);
  };

  const handleWidgetDrop = (targetWidgetId: string) => {
    if (!draggedWidgetId || draggedWidgetId === targetWidgetId) {
      setDraggedWidgetId(null);
      setDragOverWidgetId(null);
      return;
    }

    const newOrder = [...widgetOrder];
    const draggedIndex = newOrder.indexOf(draggedWidgetId);
    const targetIndex = newOrder.indexOf(targetWidgetId);

    // ドラッグ元を削除
    newOrder.splice(draggedIndex, 1);
    // ターゲット位置に挿入
    newOrder.splice(targetIndex, 0, draggedWidgetId);

    setWidgetOrder(newOrder);
    setDraggedWidgetId(null);
    setDragOverWidgetId(null);
  };

  const handleWidgetDragEnd = () => {
    setDraggedWidgetId(null);
    setDragOverWidgetId(null);
  };

  // TODOリスト
  const [todoItems, setTodoItems] = useState<TodoItem[]>([]);
  const [newTodoText, setNewTodoText] = useState("");

  // スプレッドシートリンク
  const [spreadsheetLinks, setSpreadsheetLinks] = useState<SpreadsheetLink[]>([]);
  const [isAddSpreadsheetOpen, setIsAddSpreadsheetOpen] = useState(false);
  const [newSpreadsheet, setNewSpreadsheet] = useState({ name: "", url: "" });

  // メモウィジェット（履歴形式）
  type MemoEntry = {
    id: string;
    authorId: string;
    authorName: string;
    authorAvatar: string;
    content: string;
    timestamp: string; // ISO形式
  };
  const [memoEntries, setMemoEntries] = useState<MemoEntry[]>([]);
  const [newMemoContent, setNewMemoContent] = useState("");

  // URLリンクウィジェット
  type UrlLink = { id: string; title: string; url: string };
  const [urlLinks, setUrlLinks] = useState<UrlLink[]>([]);
  const [newUrlLink, setNewUrlLink] = useState({ title: "", url: "" });
  const [isAddUrlLinkOpen, setIsAddUrlLinkOpen] = useState(false);

  // タイマーウィジェット
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // タイマーのeffect
  useEffect(() => {
    if (isTimerRunning) {
      timerIntervalRef.current = setInterval(() => {
        setTimerSeconds(prev => prev + 1);
      }, 1000);
    } else {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    }
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [isTimerRunning]);

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // ガントチャート設定
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [holidaySettings, setHolidaySettings] = useState({
    sunday: true,
    monday: false,
    tuesday: false,
    wednesday: false,
    thursday: false,
    friday: false,
    saturday: true,
    holidays: true, // 祝日
  });

  // 日本の祝日（2026年の例）
  const japaneseHolidays = [
    "2026-01-01", // 元日
    "2026-01-12", // 成人の日
    "2026-02-11", // 建国記念の日
    "2026-02-23", // 天皇誕生日
    "2026-03-20", // 春分の日
    "2026-04-29", // 昭和の日
    "2026-05-03", // 憲法記念日
    "2026-05-04", // みどりの日
    "2026-05-05", // こどもの日
    "2026-05-06", // 振替休日
    "2026-07-20", // 海の日
    "2026-08-11", // 山の日
    "2026-09-21", // 敬老の日
    "2026-09-22", // 秋分の日
    "2026-09-23", // 国民の休日
    "2026-10-12", // スポーツの日
    "2026-11-03", // 文化の日
    "2026-11-23", // 勤労感謝の日
  ];

  // 休日かどうか判定
  const isHoliday = (date: Date) => {
    const dayOfWeek = date.getDay();
    const dateStr = formatDateJST(date);

    // 曜日による休日
    if (dayOfWeek === 0 && holidaySettings.sunday) return true;
    if (dayOfWeek === 1 && holidaySettings.monday) return true;
    if (dayOfWeek === 2 && holidaySettings.tuesday) return true;
    if (dayOfWeek === 3 && holidaySettings.wednesday) return true;
    if (dayOfWeek === 4 && holidaySettings.thursday) return true;
    if (dayOfWeek === 5 && holidaySettings.friday) return true;
    if (dayOfWeek === 6 && holidaySettings.saturday) return true;

    // 祝日
    if (holidaySettings.holidays && japaneseHolidays.includes(dateStr)) return true;

    return false;
  };

  // 工数から終了日を計算（休日を除く）
  const calculateEndDate = (startDate: string, workDays: number) => {
    const start = new Date(startDate);
    let remaining = workDays;
    const current = new Date(start);

    while (remaining > 0) {
      if (!isHoliday(current)) {
        remaining--;
      }
      if (remaining > 0) {
        current.setDate(current.getDate() + 1);
      }
    }

    return formatDateJST(current);
  };

  // 開始日と終了日から工数を計算（休日を除く）
  const calculateWorkDays = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    let workDays = 0;
    const current = new Date(start);

    while (current <= end) {
      if (!isHoliday(current)) {
        workDays++;
      }
      current.setDate(current.getDate() + 1);
    }

    return workDays;
  };

  // 日本時間でのフォーマット用ヘルパー
  const formatDateJST = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const today = new Date();
  const todayStr = formatDateJST(today);
  const currentYear = today.getFullYear();

  // 表示する年のリスト（初期は今年と来年の2年分）
  const [displayYears, setDisplayYears] = useState<number[]>([currentYear, currentYear + 1]);

  // 月の色（交互に色分け）
  const monthColors = [
    "bg-blue-50", "bg-green-50", "bg-yellow-50", "bg-pink-50",
    "bg-purple-50", "bg-cyan-50", "bg-orange-50", "bg-indigo-50",
    "bg-rose-50", "bg-teal-50", "bg-amber-50", "bg-lime-50"
  ];

  const getDateRange = (extended: boolean = false) => {
    if (!extended) {
      // プレビュー用：今日の前後
      const start = new Date(today);
      start.setDate(start.getDate() - 7);
      const end = new Date(today);
      end.setDate(end.getDate() + 14);

      const dates: Date[] = [];
      const current = new Date(start);
      while (current <= end) {
        dates.push(new Date(current));
        current.setDate(current.getDate() + 1);
      }
      return dates;
    }

    // フルスクリーン用：表示年の全日付
    const dates: Date[] = [];
    displayYears.forEach(year => {
      const start = new Date(year, 0, 1);
      const end = new Date(year, 11, 31);
      const current = new Date(start);
      while (current <= end) {
        dates.push(new Date(current));
        current.setDate(current.getDate() + 1);
      }
    });
    return dates;
  };

  const dates = getDateRange(isGanttFullScreen);

  // 年を追加
  const addYear = () => {
    const maxYear = Math.max(...displayYears);
    setDisplayYears([...displayYears, maxYear + 1]);
  };

  // 年を削除（タスクがない場合のみ）
  const canRemoveYear = (year: number) => {
    // その年にタスクがあるかチェック
    return !ganttTasks.some(task => {
      const startYear = new Date(task.startDate).getFullYear();
      const endDate = calculateEndDate(task.startDate, task.workDays);
      const endYear = new Date(endDate).getFullYear();
      return startYear === year || endYear === year || (startYear < year && endYear > year);
    });
  };

  const removeYear = (year: number) => {
    if (displayYears.length <= 1) return;
    if (!canRemoveYear(year)) return;
    setDisplayYears(displayYears.filter(y => y !== year));
  };

  // タスクバーを休日で分割してセグメントを取得
  type TaskBarSegment = {
    left: number;
    width: number;
    isFirst: boolean;
    isLast: boolean;
  };

  const getTaskBarSegments = (task: GanttTask): TaskBarSegment[] => {
    const startDate = new Date(task.startDate);
    const endDateStr = calculateEndDate(task.startDate, task.workDays);
    const endDate = new Date(endDateStr);
    const rangeStart = dates[0];

    const segments: TaskBarSegment[] = [];
    let currentSegmentStart: Date | null = null;
    let segmentStartIndex = 0;

    const current = new Date(startDate);
    while (current <= endDate) {
      const dayIndex = Math.floor((current.getTime() - rangeStart.getTime()) / (1000 * 60 * 60 * 24));
      const isHolidayDay = isHoliday(current);

      if (!isHolidayDay) {
        // 営業日
        if (currentSegmentStart === null) {
          currentSegmentStart = new Date(current);
          segmentStartIndex = dayIndex;
        }
      } else {
        // 休日 - セグメントを閉じる
        if (currentSegmentStart !== null) {
          const segmentEndIndex = dayIndex - 1;
          segments.push({
            left: segmentStartIndex * 40,
            width: (segmentEndIndex - segmentStartIndex + 1) * 40,
            isFirst: segments.length === 0,
            isLast: false,
          });
          currentSegmentStart = null;
        }
      }

      current.setDate(current.getDate() + 1);
    }

    // 最後のセグメントを閉じる
    if (currentSegmentStart !== null) {
      const endDayIndex = Math.floor((endDate.getTime() - rangeStart.getTime()) / (1000 * 60 * 60 * 24));
      segments.push({
        left: segmentStartIndex * 40,
        width: (endDayIndex - segmentStartIndex + 1) * 40,
        isFirst: segments.length === 0,
        isLast: true,
      });
    }

    // 最後のセグメントにisLastをつける
    if (segments.length > 0) {
      segments[segments.length - 1].isLast = true;
    }

    return segments;
  };

  // カテゴリー用の色オプション
  const categoryColors = [
    { name: "青", value: "bg-blue-500" },
    { name: "緑", value: "bg-green-500" },
    { name: "ピンク", value: "bg-pink-500" },
    { name: "オレンジ", value: "bg-orange-500" },
    { name: "紫", value: "bg-purple-500" },
    { name: "シアン", value: "bg-cyan-500" },
    { name: "赤", value: "bg-red-500" },
    { name: "黄", value: "bg-yellow-500" },
  ];

  // タスク追加モーダルを開く（グループ外に追加）
  const openAddTaskModal = () => {
    setNewTask({ title: "", assigneeIds: [], startDate: "", workDays: 1 });
    setIsAddTaskOpen(true);
    setIsAddMenuOpen(false);
  };

  // カテゴリー追加モーダルを開く
  const openAddCategoryModal = () => {
    setNewCategory({ name: "", color: "bg-blue-500" });
    setIsAddCategoryOpen(true);
    setIsAddMenuOpen(false);
  };

  // カテゴリー追加
  const handleAddCategory = () => {
    if (!newCategory.name) return;

    const category: TaskGroup = {
      id: `g${Date.now()}`,
      name: newCategory.name,
      color: newCategory.color,
      isExpanded: true,
    };

    setTaskGroups([...taskGroups, category]);
    setNewCategory({ name: "", color: "bg-blue-500" });
    setIsAddCategoryOpen(false);
  };

  // タスク追加（グループ外＝一番上に追加）
  const handleAddTask = () => {
    if (!newTask.title || !newTask.startDate || newTask.workDays < 1) return;

    const selectedAssignees = newTask.assigneeIds
      .map(id => gitAccounts.find(a => a.id === id))
      .filter((a): a is GitAccount => a !== undefined);

    const task: GanttTask = {
      id: `t${Date.now()}`,
      title: newTask.title,
      assignees: selectedAssignees.length > 0
        ? selectedAssignees.map(a => ({ gitAccountId: a.id, name: a.name, avatar: a.avatar }))
        : [{ gitAccountId: "", name: "未割当", avatar: "?" }],
      startDate: newTask.startDate,
      workDays: newTask.workDays,
      progress: 0,
      color: "bg-slate-400", // グループ未割当は灰色
      groupId: "", // グループ外
      history: [],
      status: "active",
    };

    // 一番上に追加
    setGanttTasks([task, ...ganttTasks]);
    setNewTask({ title: "", assigneeIds: [], startDate: "", workDays: 1 });
    setIsAddTaskOpen(false);
  };

  // グループ展開/折りたたみ
  const toggleGroup = (groupId: string) => {
    setTaskGroups(taskGroups.map(g =>
      g.id === groupId ? { ...g, isExpanded: !g.isExpanded } : g
    ));
  };

  // タスク削除確認を開く
  const openDeleteConfirm = (taskId: string) => {
    setTaskToDelete(taskId);
    setIsDeleteConfirmOpen(true);
  };

  // タスク削除を実行（実際には削除せず、ステータスを変更して折りたたむ）
  const handleDeleteTask = () => {
    if (!taskToDelete) return;
    setGanttTasks(ganttTasks.map(t =>
      t.id === taskToDelete
        ? { ...t, status: "deleted" as const, isCollapsed: true }
        : t
    ));
    setSelectedTask(null);
    setIsDeleteConfirmOpen(false);
    setTaskToDelete(null);
  };

  // タスク完了処理
  const handleCompleteTask = (task: GanttTask) => {
    setCompletedTaskName(task.title);
    setShowConfetti(true);
    // タスクを完了状態にして折りたたむ
    setGanttTasks(ganttTasks.map(t =>
      t.id === task.id
        ? { ...t, status: "completed" as const, isCollapsed: true }
        : t
    ));
    setSelectedTask(null);
    // 4秒後に紙吹雪を閉じる
    setTimeout(() => {
      setShowConfetti(false);
      setCompletedTaskName("");
    }, 4000);
  };

  // タスクの折りたたみトグル
  const toggleTaskCollapse = (taskId: string) => {
    setGanttTasks(ganttTasks.map(t =>
      t.id === taskId ? { ...t, isCollapsed: !t.isCollapsed } : t
    ));
  };

  // タスク復活（削除状態から元に戻す）
  const handleRestoreTask = (task: GanttTask) => {
    const updatedTask = { ...task, status: "active" as const, isCollapsed: false };
    setGanttTasks(ganttTasks.map(t => t.id === task.id ? updatedTask : t));
    setSelectedTask(updatedTask);
  };

  // 進捗更新（履歴なし）
  const handleUpdateProgress = (taskId: string, progress: number) => {
    const task = ganttTasks.find(t => t.id === taskId);
    if (!task) return;

    const updatedTask = { ...task, progress };

    setGanttTasks(ganttTasks.map(t => t.id === taskId ? updatedTask : t));
    if (selectedTask?.id === taskId) {
      setSelectedTask(updatedTask);
    }
  };

  // コメント追加
  const handleAddComment = (taskId: string, comment: string) => {
    const task = ganttTasks.find(t => t.id === taskId);
    if (!task || !comment.trim()) return;

    const historyEntry: TaskHistory = {
      id: `h${Date.now()}`,
      timestamp: new Date().toLocaleString("ja-JP"),
      type: "comment",
      comment,
      userName: "松村優樹",
    };

    const updatedTask = {
      ...task,
      history: [...task.history, historyEntry],
    };

    setGanttTasks(ganttTasks.map(t => t.id === taskId ? updatedTask : t));
    if (selectedTask?.id === taskId) {
      setSelectedTask(updatedTask);
    }
  };

  // 工数変更モーダルを開く
  const openWorkDaysModal = () => {
    if (!selectedTask) return;
    setNewWorkDays(selectedTask.workDays);
    setWorkDaysComment("");
    setIsWorkDaysModalOpen(true);
  };

  // 工数更新（コメント付き）
  const handleUpdateWorkDaysWithComment = () => {
    if (!selectedTask) return;

    const historyEntry: TaskHistory = {
      id: `h${Date.now()}`,
      timestamp: new Date().toLocaleString("ja-JP"),
      type: "workDays",
      oldValue: selectedTask.workDays,
      newValue: newWorkDays,
      comment: workDaysComment || undefined,
      userName: "松村優樹",
    };

    const updatedTask = {
      ...selectedTask,
      workDays: newWorkDays,
      history: [...selectedTask.history, historyEntry],
    };

    setGanttTasks(ganttTasks.map(t => t.id === selectedTask.id ? updatedTask : t));
    setSelectedTask(updatedTask);
    setIsWorkDaysModalOpen(false);
    setWorkDaysComment("");
  };

  // ドラッグ&ドロップ
  const [dragOverGroupId, setDragOverGroupId] = useState<string | null>(null);
  const [dragOverPosition, setDragOverPosition] = useState<"above" | "below" | null>(null);
  const [draggedGroupId, setDraggedGroupId] = useState<string | null>(null);
  const [dragOverGroupTargetId, setDragOverGroupTargetId] = useState<string | null>(null);
  const [dragOverGroupPosition, setDragOverGroupPosition] = useState<"above" | "below" | null>(null);

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", taskId);
    // ドラッグ画像を小さくする
    const dragImage = e.currentTarget.cloneNode(true) as HTMLElement;
    dragImage.style.width = "200px";
    dragImage.style.opacity = "0.8";
    document.body.appendChild(dragImage);
    e.dataTransfer.setDragImage(dragImage, 100, 20);
    setTimeout(() => document.body.removeChild(dragImage), 0);
    setDraggedTaskId(taskId);
  };

  const handleDragOver = (e: React.DragEvent, taskId: string) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "move";
    if (draggedTaskId && draggedTaskId !== taskId) {
      // マウス位置から上半分か下半分かを判定
      const rect = e.currentTarget.getBoundingClientRect();
      const midY = rect.top + rect.height / 2;
      const position = e.clientY < midY ? "above" : "below";
      setDragOverTaskId(taskId);
      setDragOverPosition(position);
      setDragOverGroupId(null);
    }
  };

  const handleDragOverGroup = (e: React.DragEvent, groupId: string) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "move";
    if (draggedTaskId) {
      setDragOverGroupId(groupId);
      setDragOverTaskId(null);
      setDragOverPosition(null);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.stopPropagation();
    // 子要素への移動時はリセットしない
    const relatedTarget = e.relatedTarget as HTMLElement;
    if (relatedTarget && e.currentTarget.contains(relatedTarget)) return;
    setDragOverTaskId(null);
    setDragOverPosition(null);
  };

  const handleDragLeaveGroup = (e: React.DragEvent) => {
    e.stopPropagation();
    const relatedTarget = e.relatedTarget as HTMLElement;
    if (relatedTarget && e.currentTarget.contains(relatedTarget)) return;
    setDragOverGroupId(null);
  };

  // グループのドラッグ開始
  const handleGroupDragStart = (e: React.DragEvent, groupId: string) => {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", groupId);
    setDraggedGroupId(groupId);
  };

  // グループへのドラッグオーバー（グループ並び替え用）
  const handleGroupDragOver = (e: React.DragEvent, groupId: string) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "move";
    if (draggedGroupId && draggedGroupId !== groupId) {
      const rect = e.currentTarget.getBoundingClientRect();
      const midY = rect.top + rect.height / 2;
      const position = e.clientY < midY ? "above" : "below";
      setDragOverGroupTargetId(groupId);
      setDragOverGroupPosition(position);
    }
  };

  // グループのドロップ（並び替え）
  const handleGroupDrop = (e: React.DragEvent, targetGroupId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!draggedGroupId || draggedGroupId === targetGroupId) {
      resetGroupDragState();
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    const insertBelow = e.clientY >= midY;

    const draggedIndex = taskGroups.findIndex(g => g.id === draggedGroupId);
    const targetIndex = taskGroups.findIndex(g => g.id === targetGroupId);

    const newGroups = taskGroups.filter(g => g.id !== draggedGroupId);
    let insertIndex = targetIndex;
    if (draggedIndex < targetIndex) {
      insertIndex = targetIndex - 1;
    }
    if (insertBelow) {
      insertIndex += 1;
    }
    newGroups.splice(insertIndex, 0, taskGroups[draggedIndex]);
    setTaskGroups(newGroups);
    resetGroupDragState();
  };

  const handleGroupDragEnd = () => {
    resetGroupDragState();
  };

  const resetGroupDragState = () => {
    setDraggedGroupId(null);
    setDragOverGroupTargetId(null);
    setDragOverGroupPosition(null);
  };

  const handleDrop = (e: React.DragEvent, targetTaskId: string) => {
    e.preventDefault();
    if (!draggedTaskId || draggedTaskId === targetTaskId) {
      setDraggedTaskId(null);
      setDragOverTaskId(null);
      setDragOverGroupId(null);
      setDragOverPosition(null);
      return;
    }

    const draggedTask = ganttTasks.find(t => t.id === draggedTaskId);
    const targetTask = ganttTasks.find(t => t.id === targetTaskId);

    if (!draggedTask || !targetTask) {
      setDraggedTaskId(null);
      setDragOverTaskId(null);
      setDragOverGroupId(null);
      setDragOverPosition(null);
      return;
    }

    // 挿入位置を計算
    const rect = e.currentTarget.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    const insertBelow = e.clientY >= midY;

    // グループが異なる場合
    if (draggedTask.groupId !== targetTask.groupId) {
      const targetGroup = taskGroups.find(g => g.id === targetTask.groupId);
      const updatedTask = {
        ...draggedTask,
        groupId: targetTask.groupId,
        color: targetGroup?.color || draggedTask.color,
      };
      const tasksWithoutDragged = ganttTasks.filter(t => t.id !== draggedTaskId);
      const targetGroupTasks = tasksWithoutDragged.filter(t => t.groupId === targetTask.groupId);
      const otherTasks = tasksWithoutDragged.filter(t => t.groupId !== targetTask.groupId);
      const targetIndex = targetGroupTasks.findIndex(t => t.id === targetTaskId);
      const insertIndex = insertBelow ? targetIndex + 1 : targetIndex;
      targetGroupTasks.splice(insertIndex, 0, updatedTask);
      setGanttTasks([...otherTasks, ...targetGroupTasks]);
    } else {
      // 同じグループ内での並び替え
      const groupTasks = ganttTasks.filter(t => t.groupId === draggedTask.groupId);
      const otherTasks = ganttTasks.filter(t => t.groupId !== draggedTask.groupId);

      const draggedIndex = groupTasks.findIndex(t => t.id === draggedTaskId);
      const targetIndex = groupTasks.findIndex(t => t.id === targetTaskId);

      // 新しい配列を作成
      const newGroupTasks = groupTasks.filter(t => t.id !== draggedTaskId);

      // 挿入位置を計算（ドラッグ元を除いた後のインデックス）
      let insertIndex = targetIndex;
      if (draggedIndex < targetIndex) {
        insertIndex = targetIndex - 1; // ドラッグ元を除いた分調整
      }
      if (insertBelow) {
        insertIndex += 1;
      }

      newGroupTasks.splice(insertIndex, 0, draggedTask);
      setGanttTasks([...otherTasks, ...newGroupTasks]);
    }

    setDraggedTaskId(null);
    setDragOverTaskId(null);
    setDragOverGroupId(null);
    setDragOverPosition(null);
  };

  // グループヘッダーへのドロップ（グループの末尾に追加）
  const handleDropOnGroup = (e: React.DragEvent, targetGroupId: string) => {
    e.preventDefault();
    if (!draggedTaskId) {
      setDraggedTaskId(null);
      setDragOverTaskId(null);
      setDragOverGroupId(null);
      setDragOverPosition(null);
      return;
    }

    const draggedTask = ganttTasks.find(t => t.id === draggedTaskId);
    if (!draggedTask) {
      setDraggedTaskId(null);
      setDragOverTaskId(null);
      setDragOverGroupId(null);
      setDragOverPosition(null);
      return;
    }

    // 同じグループの場合は末尾に移動
    if (draggedTask.groupId === targetGroupId) {
      const groupTasks = ganttTasks.filter(t => t.groupId === targetGroupId && t.id !== draggedTaskId);
      const otherTasks = ganttTasks.filter(t => t.groupId !== targetGroupId);
      setGanttTasks([...otherTasks, ...groupTasks, draggedTask]);
    } else {
      // 異なるグループの場合
      const targetGroup = taskGroups.find(g => g.id === targetGroupId);
      const updatedTask = {
        ...draggedTask,
        groupId: targetGroupId,
        color: targetGroup?.color || draggedTask.color,
      };
      const tasksWithoutDragged = ganttTasks.filter(t => t.id !== draggedTaskId);
      setGanttTasks([...tasksWithoutDragged, updatedTask]);
    }

    setDraggedTaskId(null);
    setDragOverTaskId(null);
    setDragOverGroupId(null);
    setDragOverPosition(null);
  };

  const handleDragEnd = () => {
    setDraggedTaskId(null);
    setDragOverTaskId(null);
    setDragOverGroupId(null);
    setDragOverPosition(null);
  };

  // タスクバーの水平ドラッグ開始
  const handleBarDragStart = (e: React.MouseEvent, task: GanttTask) => {
    e.stopPropagation();
    setBarDragTaskId(task.id);
    setBarDragStartX(e.clientX);
    setBarDragOriginalDate(task.startDate);
  };

  // タスクバーの水平ドラッグ中（windowレベルで処理）
  const handleBarDragMove = useCallback((e: MouseEvent) => {
    if (!barDragTaskId || !barDragOriginalDate) return;

    const deltaX = e.clientX - barDragStartX;
    const daysDelta = Math.round(deltaX / 40); // 40px = 1日

    if (daysDelta === 0) return;

    const originalDate = new Date(barDragOriginalDate);
    const newDate = new Date(originalDate);
    newDate.setDate(originalDate.getDate() + daysDelta);
    const newDateStr = formatDateJST(newDate);

    setGanttTasks(prev => prev.map(t =>
      t.id === barDragTaskId ? { ...t, startDate: newDateStr } : t
    ));

    // 更新した分だけ基準点を調整
    setBarDragStartX(barDragStartX + daysDelta * 40);
    setBarDragOriginalDate(newDateStr);
  }, [barDragTaskId, barDragOriginalDate, barDragStartX]);

  // タスクバーの水平ドラッグ終了（windowレベルで処理）
  const handleBarDragEnd = useCallback(() => {
    if (barDragTaskId) {
      setGanttTasks(prev => {
        const task = prev.find(t => t.id === barDragTaskId);
        if (task) {
          // 履歴に追加
          const historyEntry: TaskHistory = {
            id: `h${Date.now()}`,
            timestamp: new Date().toLocaleString("ja-JP"),
            type: "comment",
            comment: `開始日を ${task.startDate} に変更`,
            userName: "松村優樹",
          };
          return prev.map(t =>
            t.id === barDragTaskId ? { ...t, history: [...t.history, historyEntry] } : t
          );
        }
        return prev;
      });
    }
    setBarDragTaskId(null);
    setBarDragStartX(0);
    setBarDragOriginalDate("");
  }, [barDragTaskId]);

  // windowレベルでドラッグイベントをキャプチャ
  useEffect(() => {
    if (barDragTaskId) {
      window.addEventListener("mousemove", handleBarDragMove);
      window.addEventListener("mouseup", handleBarDragEnd);
      return () => {
        window.removeEventListener("mousemove", handleBarDragMove);
        window.removeEventListener("mouseup", handleBarDragEnd);
      };
    }
  }, [barDragTaskId, handleBarDragMove, handleBarDragEnd]);

  useEffect(() => {
    if (scrollRef.current) {
      const todayIndex = dates.findIndex(d => formatDateJST(d) === todayStr);
      if (todayIndex > 0) {
        scrollRef.current.scrollLeft = (todayIndex - 3) * 40;
      }
    }
  }, [isGanttFullScreen]);

  // マイルストーン追加モーダルを開く
  const openMilestoneModal = (date: string, existingMilestone?: Milestone) => {
    if (existingMilestone) {
      setEditingMilestoneId(existingMilestone.id);
      setNewMilestoneLabel(existingMilestone.label);
      setNewMilestoneColor(existingMilestone.color);
    } else {
      setEditingMilestoneId(null);
      setNewMilestoneLabel("");
      setNewMilestoneColor("bg-purple-500");
    }
    setNewMilestoneDate(date);
    setIsMilestoneModalOpen(true);
  };

  // マイルストーン保存
  const handleSaveMilestone = () => {
    if (!newMilestoneLabel.trim()) return;

    if (editingMilestoneId) {
      // 編集
      setMilestones(milestones.map(m =>
        m.id === editingMilestoneId
          ? { ...m, label: newMilestoneLabel.trim(), color: newMilestoneColor }
          : m
      ));
    } else {
      // 新規追加
      const newMilestone: Milestone = {
        id: `ms${Date.now()}`,
        date: newMilestoneDate,
        label: newMilestoneLabel.trim(),
        color: newMilestoneColor,
      };
      setMilestones([...milestones, newMilestone]);
    }

    setIsMilestoneModalOpen(false);
    setNewMilestoneDate("");
    setNewMilestoneLabel("");
    setNewMilestoneColor("bg-purple-500");
    setEditingMilestoneId(null);
  };

  // マイルストーン削除
  const handleDeleteMilestone = (id: string) => {
    setMilestones(milestones.filter(m => m.id !== id));
    setIsMilestoneModalOpen(false);
  };

  // カレンダーセルのダブルクリック
  const handleCalendarDoubleClick = (date: Date) => {
    const dateStr = formatDateJST(date);
    const existingMilestone = milestones.find(m => m.date === dateStr);
    openMilestoneModal(dateStr, existingMilestone);
  };

  // グループごとのタスクを取得
  const getTasksByGroup = (groupId: string) => {
    return ganttTasks.filter(t => t.groupId === groupId);
  };

  // プロジェクトのタグに基づいてイベントをフィルタリング
  const projectTags = project.gameSettings?.tags || [];
  // カスタムイベントとAIイベントを合わせる（ダミーデータは削除済み）
  const filteredEvents = [...customEvents, ...aiEvents];

  // AIでイベント検索（silent=trueで通知なし）
  const searchEventsWithAI = async (silent = false) => {
    if (projectTags.length === 0) {
      if (!silent) alert("ゲーム設定でタグを設定してください");
      return;
    }
    setIsSearchingEvents(true);
    try {
      const response = await fetch("/api/search-events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tags: projectTags, year: new Date().getFullYear() }),
      });
      const data = await response.json();
      if (data.events && Array.isArray(data.events)) {
        setAiEvents(data.events);
        // 最終更新日時を保存
        localStorage.setItem(EVENT_LAST_UPDATE_KEY, new Date().toISOString());
      } else if (data.error) {
        console.error("AI search error:", data.error);
        if (!silent) alert("イベント検索に失敗しました: " + data.error);
      }
    } catch (error) {
      console.error("AI search error:", error);
      if (!silent) alert("イベント検索に失敗しました");
    } finally {
      setIsSearchingEvents(false);
    }
  };

  // 毎日朝9時の自動更新
  useEffect(() => {
    // タグが設定されていない場合はスキップ
    if (projectTags.length === 0) return;

    // 初回マウント時に最終更新日をチェックして必要なら更新
    const checkAndUpdate = () => {
      const lastUpdate = localStorage.getItem(EVENT_LAST_UPDATE_KEY);
      const now = new Date();
      const today9am = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 0, 0);

      // 最終更新がない、または今日の9時以前に更新されていて、現在9時以降の場合
      if (!lastUpdate) {
        // 初回は即座に更新
        searchEventsWithAI(true);
      } else {
        const lastUpdateDate = new Date(lastUpdate);
        // 最終更新が今日の9時より前で、現在が9時以降なら更新
        if (lastUpdateDate < today9am && now >= today9am) {
          searchEventsWithAI(true);
        }
      }
    };

    checkAndUpdate();

    // 毎日9時に更新をスケジュール
    const scheduleNextUpdate = () => {
      const now = new Date();
      const next9am = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 0, 0);

      // 今日の9時を過ぎていたら明日の9時
      if (now >= next9am) {
        next9am.setDate(next9am.getDate() + 1);
      }

      const msUntil9am = next9am.getTime() - now.getTime();

      return setTimeout(() => {
        searchEventsWithAI(true);
        // 次の日の9時をスケジュール
        scheduleNextUpdate();
      }, msUntil9am);
    };

    const timeoutId = scheduleNextUpdate();

    return () => clearTimeout(timeoutId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.id, projectTags.length]);

  // イベント追加
  const handleAddEvent = () => {
    if (!newEvent.name || !newEvent.startDate || !newEvent.endDate) return;
    const event: GameEvent = {
      id: `custom-ev-${Date.now()}`,
      name: newEvent.name,
      startDate: newEvent.startDate,
      endDate: newEvent.endDate,
      location: newEvent.location,
      url: newEvent.url || undefined,
      tags: [],
      type: newEvent.type,
      description: newEvent.description,
    };
    setCustomEvents([...customEvents, event]);
    setNewEvent({
      name: "",
      startDate: "",
      endDate: "",
      location: "",
      url: "",
      description: "",
      type: "exhibition",
    });
    setIsAddEventOpen(false);
  };

  // イベント削除
  const handleDeleteEvent = (eventId: string) => {
    // カスタムイベントまたはAIイベントを削除
    if (eventId.startsWith("custom-ev-")) {
      setCustomEvents(customEvents.filter(e => e.id !== eventId));
    } else if (eventId.startsWith("ai-ev-")) {
      setAiEvents(aiEvents.filter(e => e.id !== eventId));
    }
    setSelectedEvent(null);
  };

  // イベントの色（種別ごと）
  const eventTypeColors: Record<GameEvent["type"], string> = {
    exhibition: "bg-orange-500",
    conference: "bg-blue-500",
    market: "bg-green-500",
    online: "bg-purple-500",
  };

  // ガントチャート全画面表示
  if (isGanttFullScreen) {
    return (
      <div className="h-screen bg-slate-50 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-slate-200 shrink-0">
          <div className="h-12 flex items-center px-4 gap-3 border-b border-slate-100">
            <div className="w-8 h-8 bg-purple-600 rounded flex items-center justify-center text-white text-sm">
              {project.icon}
            </div>
            <h3 className="font-medium text-slate-700 text-sm">{project.name}</h3>
          </div>
          <div className="h-14 flex items-center justify-between px-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsGanttFullScreen(false)}
                className="text-slate-500 hover:text-slate-700"
              >
                ← 戻る
              </button>
              <h2 className="font-semibold text-slate-800">ガントチャート</h2>
            </div>
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              title="設定"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Full Gantt Chart */}
        <div className="flex-1 flex overflow-hidden">
          {/* Task List */}
          <div className="w-72 border-r border-slate-200 shrink-0 bg-white flex flex-col">
            {/* 月ヘッダーと同じ高さのスペーサー */}
            <div className="h-6 bg-slate-50 border-b border-slate-200 shrink-0" />
            {/* 日付ヘッダーと同じ高さのタスク名ヘッダー */}
            <div className="h-10 bg-slate-100 border-b border-slate-200 flex items-center justify-between px-3 shrink-0">
              <span className="text-xs font-medium text-slate-600">タスク名</span>
              <div className="relative">
                <button
                  onClick={() => setIsAddMenuOpen(!isAddMenuOpen)}
                  className="text-purple-500 hover:text-purple-700 text-lg leading-none font-bold"
                  title="追加"
                >
                  +
                </button>
                {isAddMenuOpen && (
                  <div className="absolute right-0 top-6 bg-white border border-slate-200 rounded-lg shadow-lg z-50 w-40">
                    <button
                      onClick={openAddTaskModal}
                      className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                    >
                      📝 新規タスク
                    </button>
                    <button
                      onClick={openAddCategoryModal}
                      className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2 border-t border-slate-100"
                    >
                      📁 新規カテゴリー
                    </button>
                  </div>
                )}
              </div>
            </div>
            {/* マイルストーン行がある場合のスペーサー */}
            {milestones.length > 0 && (
              <div className="h-8 bg-slate-50 border-b border-slate-200 flex items-center px-3 shrink-0">
                <span className="text-xs text-slate-500">マイルストーン</span>
              </div>
            )}
            {/* イベント行のスペーサー（常に表示） */}
            <div className="h-10 bg-amber-50/50 border-b border-slate-200 flex items-center justify-between px-3 shrink-0">
              <span className="text-xs text-amber-700">📅 イベント</span>
              {isSearchingEvents && (
                <span className="text-xs text-amber-600 flex items-center gap-1">
                  <span className="animate-spin">⏳</span>
                  更新中...
                </span>
              )}
            </div>
            <div className="flex-1 overflow-y-auto">
              {/* 未割当タスク（グループ外） */}
              {getTasksByGroup("").length > 0 && (
                <div>
                  <div className="h-8 bg-slate-200 border-b border-slate-300 flex items-center px-3 gap-2">
                    <div className="w-3 h-3 rounded bg-slate-400" />
                    <span className="text-xs font-medium text-slate-600">未割当</span>
                  </div>
                  {getTasksByGroup("").map(task => (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, task.id)}
                      onDragOver={(e) => handleDragOver(e, task.id)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, task.id)}
                      onDragEnd={handleDragEnd}
                      onClick={() => task.isCollapsed ? toggleTaskCollapse(task.id) : setSelectedTask(task)}
                      className={`${task.isCollapsed ? "h-6" : "h-12"} border-b border-slate-100 flex items-center px-3 gap-2 cursor-grab relative ${
                        task.isCollapsed
                          ? task.status === "completed"
                            ? "bg-green-100/50 hover:bg-green-100"
                            : task.status === "deleted"
                            ? "bg-slate-200/50 hover:bg-slate-200"
                            : "bg-slate-50 hover:bg-slate-50"
                          : "bg-slate-50 hover:bg-slate-50"
                      } ${
                        selectedTask?.id === task.id ? "bg-purple-50" : ""
                      } ${dragOverTaskId === task.id && dragOverPosition === "above" ? "border-t-2 border-t-purple-500" : ""} ${
                        dragOverTaskId === task.id && dragOverPosition === "below" ? "border-b-2 border-b-purple-500" : ""
                      } ${
                        draggedTaskId === task.id ? "opacity-50" : ""
                      } transition-all duration-200`}
                    >
                      {task.isCollapsed ? (
                        <>
                          <div className="w-4 text-slate-300 text-xs">⋮⋮</div>
                          <span className="text-xs text-slate-400">
                            {task.status === "completed" ? "✓" : "×"}
                          </span>
                          <p className={`text-xs truncate flex-1 ${
                            task.status === "completed" ? "text-green-600 line-through" : "text-slate-400 line-through"
                          }`}>{task.title}</p>
                        </>
                      ) : (
                        <>
                          <div className="w-4 text-slate-300 text-xs">⋮⋮</div>
                          <div className="flex -space-x-1">
                            {task.assignees.slice(0, 3).map((a, i) => (
                              <div key={i} className="w-6 h-6 bg-slate-200 rounded-full flex items-center justify-center text-xs border-2 border-white">
                                {a.avatar}
                              </div>
                            ))}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm truncate ${
                              task.status === "active" ? "text-slate-800" :
                              task.status === "completed" ? "text-green-600" : "text-slate-400"
                            }`}>{task.title}</p>
                            <span className="text-[10px] text-slate-400">{task.progress}%</span>
                          </div>
                          {task.status !== "active" && (
                            <button
                              onClick={(e) => { e.stopPropagation(); toggleTaskCollapse(task.id); }}
                              className="text-xs text-slate-400 hover:text-slate-600"
                            >
                              折りたたむ
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {/* グループ */}
              {taskGroups.map((group, groupIndex) => (
                <div
                  key={group.id}
                  className={`${draggedGroupId === group.id ? "opacity-50" : ""}`}
                >
                  {/* グループの上にドロップするためのゾーン（グループドラッグ時のみ） */}
                  {draggedGroupId && draggedGroupId !== group.id && groupIndex === 0 && (
                    <div
                      className={`h-1 ${
                        dragOverGroupTargetId === group.id && dragOverGroupPosition === "above" ? "bg-purple-500" : "bg-transparent"
                      }`}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setDragOverGroupTargetId(group.id);
                        setDragOverGroupPosition("above");
                      }}
                      onDragLeave={() => {
                        setDragOverGroupTargetId(null);
                        setDragOverGroupPosition(null);
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        // 先頭に挿入
                        const draggedIndex = taskGroups.findIndex(g => g.id === draggedGroupId);
                        const newGroups = taskGroups.filter(g => g.id !== draggedGroupId);
                        newGroups.splice(0, 0, taskGroups[draggedIndex]);
                        setTaskGroups(newGroups);
                        resetGroupDragState();
                      }}
                    />
                  )}
                  {/* グループヘッダー */}
                  <div
                    draggable
                    onDragStart={(e) => handleGroupDragStart(e, group.id)}
                    onDragOver={(e) => {
                      if (draggedGroupId && draggedGroupId !== group.id) {
                        e.preventDefault();
                        e.stopPropagation();
                        // グループヘッダー上では常に「above」として扱う
                        setDragOverGroupTargetId(group.id);
                        setDragOverGroupPosition("above");
                      } else if (draggedTaskId) {
                        handleDragOverGroup(e, group.id);
                      }
                    }}
                    onDragLeave={(e) => {
                      if (draggedGroupId) {
                        const relatedTarget = e.relatedTarget as HTMLElement;
                        if (relatedTarget && e.currentTarget.contains(relatedTarget)) return;
                        setDragOverGroupTargetId(null);
                        setDragOverGroupPosition(null);
                      } else {
                        handleDragLeaveGroup(e);
                      }
                    }}
                    onDrop={(e) => {
                      if (draggedGroupId) {
                        handleGroupDrop(e, group.id);
                      } else if (draggedTaskId) {
                        handleDropOnGroup(e, group.id);
                      }
                    }}
                    onDragEnd={handleGroupDragEnd}
                    onClick={() => toggleGroup(group.id)}
                    className={`h-8 bg-slate-50 border-b border-slate-200 flex items-center px-3 gap-2 cursor-grab hover:bg-slate-100 ${
                      dragOverGroupId === group.id ? "bg-purple-100" : ""
                    } ${dragOverGroupTargetId === group.id && dragOverGroupPosition === "above" ? "border-t-2 border-t-purple-500" : ""}`}
                  >
                    <div className="w-4 text-slate-300 text-xs cursor-grab">⋮⋮</div>
                    <span className="text-xs text-slate-400">{group.isExpanded ? "▼" : "▶"}</span>
                    <div className={`w-3 h-3 rounded ${group.color}`} />
                    <span className="text-sm font-medium text-slate-700 flex-1">{group.name}</span>
                  </div>
                  {/* グループ内タスク */}
                  {group.isExpanded && getTasksByGroup(group.id).map(task => (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, task.id)}
                      onDragOver={(e) => handleDragOver(e, task.id)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, task.id)}
                      onDragEnd={handleDragEnd}
                      onClick={() => task.isCollapsed ? toggleTaskCollapse(task.id) : setSelectedTask(task)}
                      className={`${task.isCollapsed ? "h-6" : "h-12"} border-b border-slate-100 flex items-center px-3 gap-2 cursor-grab relative ${
                        task.isCollapsed
                          ? task.status === "completed"
                            ? "bg-green-100/50 hover:bg-green-100"
                            : task.status === "deleted"
                            ? "bg-slate-200/50 hover:bg-slate-200"
                            : "hover:bg-slate-50"
                          : "hover:bg-slate-50"
                      } ${
                        selectedTask?.id === task.id ? "bg-purple-50" : ""
                      } ${dragOverTaskId === task.id && dragOverPosition === "above" ? "border-t-2 border-t-purple-500" : ""} ${
                        dragOverTaskId === task.id && dragOverPosition === "below" ? "border-b-2 border-b-purple-500" : ""
                      } ${
                        draggedTaskId === task.id ? "opacity-50" : ""
                      } transition-all duration-200`}
                    >
                      {task.isCollapsed ? (
                        <>
                          <div className="w-4 text-slate-300 text-xs">⋮⋮</div>
                          <span className="text-xs text-slate-400">
                            {task.status === "completed" ? "✓" : "×"}
                          </span>
                          <p className={`text-xs truncate flex-1 ${
                            task.status === "completed" ? "text-green-600 line-through" : "text-slate-400 line-through"
                          }`}>{task.title}</p>
                        </>
                      ) : (
                        <>
                          <div className="w-4 text-slate-300 text-xs">⋮⋮</div>
                          <div className="flex -space-x-1">
                            {task.assignees.slice(0, 3).map((a, i) => (
                              <div key={i} className="w-6 h-6 bg-slate-200 rounded-full flex items-center justify-center text-xs border-2 border-white">
                                {a.avatar}
                              </div>
                            ))}
                            {task.assignees.length > 3 && (
                              <div className="w-6 h-6 bg-slate-300 rounded-full flex items-center justify-center text-xs border-2 border-white">
                                +{task.assignees.length - 3}
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm truncate ${
                              task.status === "active" ? "text-slate-800" :
                              task.status === "completed" ? "text-green-600" : "text-slate-400"
                            }`}>{task.title}</p>
                            <span className="text-[10px] text-slate-400">{task.progress}%</span>
                          </div>
                          {task.status !== "active" && (
                            <button
                              onClick={(e) => { e.stopPropagation(); toggleTaskCollapse(task.id); }}
                              className="text-xs text-slate-400 hover:text-slate-600"
                            >
                              折りたたむ
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  ))}
                  {/* タスク末尾のドロップゾーン（タスクドラッグ中のみ表示） */}
                  {group.isExpanded && draggedTaskId && (
                    <div
                      className={`h-2 ${
                        dragOverGroupId === group.id ? "bg-purple-500" : "bg-transparent"
                      }`}
                      onDragOver={(e) => handleDragOverGroup(e, group.id)}
                      onDragLeave={handleDragLeaveGroup}
                      onDrop={(e) => handleDropOnGroup(e, group.id)}
                    />
                  )}
                  {/* グループ末尾のドロップゾーン（グループドラッグ中のみ表示） */}
                  {draggedGroupId && draggedGroupId !== group.id && (
                    <div
                      className={`h-2 ${
                        dragOverGroupTargetId === group.id && dragOverGroupPosition === "below" ? "bg-purple-500" : "bg-transparent"
                      }`}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setDragOverGroupTargetId(group.id);
                        setDragOverGroupPosition("below");
                      }}
                      onDragLeave={() => {
                        setDragOverGroupTargetId(null);
                        setDragOverGroupPosition(null);
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        // このグループの下に挿入
                        const draggedIndex = taskGroups.findIndex(g => g.id === draggedGroupId);
                        const targetIndex = taskGroups.findIndex(g => g.id === group.id);
                        const newGroups = taskGroups.filter(g => g.id !== draggedGroupId);
                        let insertIndex = targetIndex;
                        if (draggedIndex < targetIndex) {
                          insertIndex = targetIndex - 1;
                        }
                        insertIndex += 1; // below
                        newGroups.splice(insertIndex, 0, taskGroups[draggedIndex]);
                        setTaskGroups(newGroups);
                        resetGroupDragState();
                      }}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Gantt Grid */}
          <div
            className="flex-1 overflow-x-auto bg-white"
            ref={scrollRef}
          >
            <div className="min-w-max">
              {/* Month Header */}
              <div className="h-6 bg-slate-50 border-b border-slate-200 flex sticky top-0 z-20">
                {(() => {
                  const monthGroups: { year: number; month: number; count: number; startIndex: number }[] = [];
                  let currentMonth = -1;
                  let currentYear = -1;
                  dates.forEach((date, i) => {
                    const month = date.getMonth();
                    const year = date.getFullYear();
                    if (month !== currentMonth || year !== currentYear) {
                      monthGroups.push({ year, month, count: 1, startIndex: i });
                      currentMonth = month;
                      currentYear = year;
                    } else {
                      monthGroups[monthGroups.length - 1].count++;
                    }
                  });
                  return monthGroups.map((mg, i) => (
                    <div
                      key={i}
                      className={`shrink-0 flex items-center justify-center text-xs font-medium border-r border-slate-300 ${monthColors[mg.month]}`}
                      style={{ width: mg.count * 40 }}
                    >
                      {mg.year}年{mg.month + 1}月
                    </div>
                  ));
                })()}
                {/* 年追加・削除ボタン */}
                <div className="w-16 shrink-0 flex items-center justify-center gap-1 bg-slate-100 border-r border-slate-200">
                  <button
                    onClick={addYear}
                    className="w-6 h-6 flex items-center justify-center text-purple-500 hover:text-purple-700 hover:bg-purple-100 rounded text-lg font-bold"
                    title="年を追加"
                  >
                    +
                  </button>
                  <button
                    onClick={() => {
                      const maxYear = Math.max(...displayYears);
                      if (canRemoveYear(maxYear)) {
                        removeYear(maxYear);
                      }
                    }}
                    disabled={displayYears.length <= 1 || !canRemoveYear(Math.max(...displayYears))}
                    className={`w-6 h-6 flex items-center justify-center rounded text-lg font-bold ${
                      displayYears.length <= 1 || !canRemoveYear(Math.max(...displayYears))
                        ? "text-slate-300 cursor-not-allowed"
                        : "text-red-500 hover:text-red-700 hover:bg-red-100"
                    }`}
                    title="年を削除"
                  >
                    −
                  </button>
                </div>
              </div>
              {/* Date Header */}
              <div className="h-10 bg-slate-100 border-b border-slate-200 flex sticky top-6 z-10">
                {dates.map((date, i) => {
                  const isToday = formatDateJST(date) === todayStr;
                  const isHolidayDate = isHoliday(date);
                  const monthColor = monthColors[date.getMonth()];
                  return (
                    <div
                      key={i}
                      className={`w-10 shrink-0 flex flex-col items-center justify-center text-[10px] border-r border-slate-200 cursor-pointer hover:opacity-80 ${
                        isToday ? "bg-purple-100" : isHolidayDate ? "bg-red-50" : monthColor
                      }`}
                      onDoubleClick={() => handleCalendarDoubleClick(date)}
                    >
                      <span className={isToday ? "text-purple-600 font-bold" : isHolidayDate ? "text-red-500" : "text-slate-500"}>
                        {date.getDate()}
                      </span>
                      <span className={isToday ? "text-purple-600" : isHolidayDate ? "text-red-400" : "text-slate-400"}>
                        {["日", "月", "火", "水", "木", "金", "土"][date.getDay()]}
                      </span>
                    </div>
                  );
                })}
                {/* 年追加・削除ボタン用スペーサー */}
                <div className="w-16 shrink-0 bg-slate-100 border-r border-slate-200" />
              </div>

              {/* Milestone Row */}
              {milestones.length > 0 && (
                <div className="h-8 border-b border-slate-200 bg-slate-50 relative flex">
                  {dates.map((date, i) => {
                    const dateStr = formatDateJST(date);
                    const milestone = milestones.find(m => m.date === dateStr);
                    return (
                      <div
                        key={i}
                        className="w-10 shrink-0 border-r border-slate-100 relative"
                        onDoubleClick={() => handleCalendarDoubleClick(date)}
                      >
                        {milestone && (
                          <div
                            className={`absolute inset-x-0 top-1 bottom-1 ${milestone.color} rounded flex items-center justify-center cursor-pointer hover:opacity-80`}
                            onClick={() => openMilestoneModal(dateStr, milestone)}
                            title={milestone.label}
                          >
                            <span className="text-white text-[9px] font-medium truncate px-0.5">
                              {milestone.label}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  <div className="w-16 shrink-0" />
                </div>
              )}

              {/* Event Row - タグに基づくイベント表示 */}
              <div className="h-10 border-b border-slate-200 bg-amber-50/50 relative flex">
                {dates.map((date, i) => {
                  const dateStr = formatDateJST(date);
                  // この日に開始するイベントを探す
                  const startingEvent = filteredEvents.find(ev => ev.startDate === dateStr);
                  // この日が期間内のイベントを探す
                  const ongoingEvent = filteredEvents.find(ev =>
                    ev.startDate <= dateStr && ev.endDate >= dateStr
                  );
                  return (
                    <div
                      key={i}
                      className="w-10 shrink-0 border-r border-amber-100 relative cursor-pointer hover:bg-amber-100/50"
                      onDoubleClick={() => {
                        setNewEvent({ ...newEvent, startDate: dateStr, endDate: dateStr });
                        setIsAddEventOpen(true);
                      }}
                    >
                      {startingEvent && (() => {
                        const startIdx = dates.findIndex(d => formatDateJST(d) === startingEvent.startDate);
                        const endIdx = dates.findIndex(d => formatDateJST(d) === startingEvent.endDate);
                        const width = (endIdx - startIdx + 1) * 40;
                        return (
                          <div
                            className={`absolute top-1 bottom-1 ${eventTypeColors[startingEvent.type]} rounded flex items-center px-2 cursor-pointer hover:opacity-80 z-10`}
                            style={{ width: `${width}px` }}
                            onClick={(e) => { e.stopPropagation(); setSelectedEvent(startingEvent); setSelectedTask(null); }}
                            title={`${startingEvent.name}\n${startingEvent.location}\n${startingEvent.startDate} ~ ${startingEvent.endDate}`}
                          >
                            <span className="text-white text-[10px] font-medium truncate">
                              {startingEvent.name}
                            </span>
                          </div>
                        );
                      })()}
                      {!startingEvent && ongoingEvent && (
                        <div className="absolute inset-0 bg-amber-100/30" />
                      )}
                    </div>
                  );
                })}
                <div className="w-16 shrink-0 flex items-center justify-center">
                  <button
                    onClick={() => setIsAddEventOpen(true)}
                    className="text-amber-600 hover:text-amber-800 text-xs"
                    title="イベント追加"
                  >
                    +追加
                  </button>
                </div>
              </div>

              {/* Task Bars */}
              <div className="relative">
                {/* 未割当タスク */}
                {getTasksByGroup("").length > 0 && (
                  <div>
                    {/* 未割当ヘッダー行 */}
                    <div className="h-8 border-b border-slate-300 bg-slate-200 relative">
                      <div className="absolute inset-0 flex">
                        {dates.map((_, i) => (
                          <div key={i} className="w-10 shrink-0 border-r border-slate-200" />
                        ))}
                      </div>
                    </div>
                    {/* 未割当タスク行 */}
                    {getTasksByGroup("").map(task => {
                      return (
                        <div
                          key={task.id}
                          className={`${task.isCollapsed ? "h-6" : "h-12"} border-b border-slate-100 relative ${
                            task.isCollapsed
                              ? task.status === "completed"
                                ? "bg-green-100/50"
                                : "bg-slate-200/50"
                              : "bg-slate-50"
                          } transition-all duration-200`}
                          onClick={() => task.isCollapsed && toggleTaskCollapse(task.id)}
                        >
                          <div className="absolute inset-0 flex">
                            {dates.map((date, i) => {
                              const isToday = formatDateJST(date) === todayStr;
                              const isHolidayDate = isHoliday(date);
                              return (
                                <div
                                  key={i}
                                  className={`w-10 shrink-0 border-r border-slate-100 ${
                                    isToday ? "bg-purple-50/50" : isHolidayDate ? "bg-red-50/30" : ""
                                  }`}
                                />
                              );
                            })}
                          </div>
                          {/* 分割されたタスクバー（折りたたみ時は非表示） */}
                          {!task.isCollapsed && getTaskBarSegments(task).map((segment, segIndex) => (
                            <div
                              key={segIndex}
                              className={`absolute top-2 h-8 ${task.status === "active" ? task.color : task.status === "completed" ? "bg-green-400" : "bg-slate-400"} shadow-sm cursor-grab hover:opacity-90 select-none ${barDragTaskId === task.id ? "cursor-grabbing opacity-80" : ""} ${
                                segment.isFirst ? "rounded-l-md" : ""
                              } ${segment.isLast ? "rounded-r-md" : ""}`}
                              style={{ left: segment.left, width: segment.width }}
                              onClick={() => !barDragTaskId && setSelectedTask(task)}
                              onMouseDown={(e) => handleBarDragStart(e, task)}
                            >
                              <div
                                className={`h-full bg-white/30 pointer-events-none ${segment.isFirst ? "rounded-l-md" : ""}`}
                                style={{ width: `${segment.isFirst ? task.progress : 0}%` }}
                              />
                              {segment.isFirst && (
                                <span className="absolute inset-0 flex items-center justify-center text-white text-xs font-medium truncate px-1 pointer-events-none">
                                  {task.title}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                )}
                {/* グループ */}
                {taskGroups.map(group => (
                  <div key={group.id}>
                    {/* グループヘッダー行 */}
                    <div className="h-8 border-b border-slate-200 bg-slate-50 relative">
                      <div className="absolute inset-0 flex">
                        {dates.map((_, i) => (
                          <div key={i} className="w-10 shrink-0 border-r border-slate-100" />
                        ))}
                      </div>
                    </div>
                    {/* タスク行 */}
                    {group.isExpanded && getTasksByGroup(group.id).map(task => {
                      return (
                        <div
                          key={task.id}
                          className={`${task.isCollapsed ? "h-6" : "h-12"} border-b border-slate-100 relative ${
                            task.isCollapsed
                              ? task.status === "completed"
                                ? "bg-green-100/50"
                                : "bg-slate-200/50"
                              : ""
                          } transition-all duration-200`}
                          onClick={() => task.isCollapsed && toggleTaskCollapse(task.id)}
                        >
                          <div className="absolute inset-0 flex">
                            {dates.map((date, i) => {
                              const isToday = formatDateJST(date) === todayStr;
                              const isHolidayDate = isHoliday(date);
                              return (
                                <div
                                  key={i}
                                  className={`w-10 shrink-0 border-r border-slate-100 ${
                                    isToday ? "bg-purple-50/50" : isHolidayDate ? "bg-red-50/30" : ""
                                  }`}
                                />
                              );
                            })}
                          </div>
                          {/* 分割されたタスクバー（折りたたみ時は非表示） */}
                          {!task.isCollapsed && getTaskBarSegments(task).map((segment, segIndex) => (
                            <div
                              key={segIndex}
                              className={`absolute top-2 h-8 ${task.status === "active" ? task.color : task.status === "completed" ? "bg-green-400" : "bg-slate-400"} shadow-sm cursor-grab hover:opacity-90 select-none ${barDragTaskId === task.id ? "cursor-grabbing opacity-80" : ""} ${
                                segment.isFirst ? "rounded-l-md" : ""
                              } ${segment.isLast ? "rounded-r-md" : ""}`}
                              style={{ left: segment.left, width: segment.width }}
                              onClick={() => !barDragTaskId && setSelectedTask(task)}
                              onMouseDown={(e) => handleBarDragStart(e, task)}
                            >
                              <div
                                className={`h-full bg-white/30 pointer-events-none ${segment.isFirst ? "rounded-l-md" : ""}`}
                                style={{ width: `${segment.isFirst ? task.progress : 0}%` }}
                              />
                              {segment.isFirst && (
                                <span className="absolute inset-0 flex items-center justify-center text-white text-xs font-medium truncate px-1 pointer-events-none">
                                  {task.title}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                ))}

                {/* Today line */}
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10"
                  style={{ left: dates.findIndex(d => formatDateJST(d) === todayStr) * 40 + 20 }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Task Detail Panel */}
        {selectedTask && (
          <div className="border-t border-slate-200 bg-slate-50 h-56 shrink-0 flex flex-col">
            {/* ヘッダー（固定） */}
            <div className="px-4 py-2 border-b border-slate-200 shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h3 className="font-medium text-slate-800">{selectedTask.title}</h3>
                  <span className="text-xs text-slate-500">
                    {selectedTask.startDate} 〜 {calculateEndDate(selectedTask.startDate, selectedTask.workDays)}（{selectedTask.workDays}日）
                  </span>
                  <div className="flex items-center gap-1">
                    {selectedTask.assignees.map((a, i) => (
                      <span key={i} className="text-xs bg-slate-200 px-1.5 py-0.5 rounded">{a.name}</span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {/* 完了ボタン: アクティブで進捗100%のときのみ表示 */}
                  {selectedTask.status === "active" && selectedTask.progress === 100 && (
                    <button
                      onClick={() => handleCompleteTask(selectedTask)}
                      className="px-3 py-1 text-sm bg-green-500 text-white hover:bg-green-600 rounded font-medium"
                    >
                      完了
                    </button>
                  )}
                  {/* 削除ボタン: アクティブ・完了時のみ */}
                  {selectedTask.status !== "deleted" && (
                    <button
                      onClick={() => openDeleteConfirm(selectedTask.id)}
                      className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded"
                    >
                      削除
                    </button>
                  )}
                  {/* 復活ボタン: 削除済みのときのみ */}
                  {selectedTask.status === "deleted" && (
                    <button
                      onClick={() => handleRestoreTask(selectedTask)}
                      className="px-3 py-1 text-sm bg-blue-500 text-white hover:bg-blue-600 rounded"
                    >
                      復活
                    </button>
                  )}
                  <button
                    onClick={() => setSelectedTask(null)}
                    className="px-3 py-1 text-sm text-slate-600 hover:bg-slate-100 rounded"
                  >
                    閉じる
                  </button>
                </div>
              </div>
            </div>

            {/* スクロール可能なコンテンツ */}
            <div className="flex-1 overflow-hidden px-4 py-2 flex flex-col">
              <div className="flex items-center gap-6 mb-2 shrink-0">
                <div className="flex items-center gap-2 flex-1">
                  <span className="text-xs text-slate-500">進捗</span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={selectedTask.progress}
                    onChange={(e) => handleUpdateProgress(selectedTask.id, Number(e.target.value))}
                    className="flex-1 h-1"
                  />
                  <span className="text-sm font-medium text-slate-700 w-10">{selectedTask.progress}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">工数</span>
                  <span className="text-sm font-medium text-slate-700">{selectedTask.workDays}日</span>
                  <button
                    onClick={openWorkDaysModal}
                    className="px-2 py-0.5 text-xs bg-slate-200 hover:bg-slate-300 rounded text-slate-700"
                  >
                    変更
                  </button>
                </div>
              </div>

              {/* 履歴とコメント（左右分割） */}
              <div className="border-t border-slate-200 pt-2 flex-1 overflow-hidden flex gap-4">
                {/* 左: 変更履歴 */}
                <div className="flex-1 flex flex-col overflow-hidden">
                  <label className="text-xs text-slate-500 mb-1 shrink-0">変更履歴</label>
                  <div className="flex-1 overflow-y-auto space-y-1">
                    {selectedTask.history.length > 0 ? (
                      selectedTask.history.slice().reverse().map(h => (
                        <div key={h.id} className="text-xs bg-slate-100 rounded px-2 py-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-slate-700">{h.userName}</span>
                            <span className="text-slate-400">{h.timestamp}</span>
                          </div>
                          <p className="text-slate-600 mt-0.5">
                            {h.type === "comment" ? (
                              h.comment
                            ) : h.type === "workDays" ? (
                              <>工数 {h.oldValue}日→{h.newValue}日{h.comment && ` (${h.comment})`}</>
                            ) : null}
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-slate-400 text-center py-1">履歴がありません</p>
                    )}
                  </div>
                </div>

                {/* 右: コメント追加 */}
                <div className="flex-1 flex flex-col">
                  <label className="text-xs text-slate-500 mb-1 shrink-0">コメント追加</label>
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="コメントを入力..."
                    className="flex-1 px-2 py-1.5 border border-slate-300 rounded text-sm resize-none focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                  <button
                    onClick={() => {
                      if (newComment.trim()) {
                        handleAddComment(selectedTask.id, newComment);
                        setNewComment("");
                      }
                    }}
                    disabled={!newComment.trim()}
                    className="mt-1 px-3 py-1 text-xs bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                  >
                    コメントを追加
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Add Task Modal */}
        {isAddTaskOpen && (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
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
                  <label className="text-xs text-slate-500">担当者（Gitアカウント）</label>
                  <div className="border border-slate-300 rounded-lg p-2 max-h-32 overflow-y-auto">
                    {gitAccounts.map(account => (
                      <label key={account.id} className="flex items-center gap-2 p-1.5 hover:bg-slate-50 rounded cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newTask.assigneeIds.includes(account.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setNewTask({ ...newTask, assigneeIds: [...newTask.assigneeIds, account.id] });
                            } else {
                              setNewTask({ ...newTask, assigneeIds: newTask.assigneeIds.filter(id => id !== account.id) });
                            }
                          }}
                          className="rounded text-purple-600 focus:ring-purple-500"
                        />
                        <div className="w-6 h-6 bg-slate-200 rounded-full flex items-center justify-center text-xs">
                          {account.avatar}
                        </div>
                        <div className="flex-1">
                          <span className="text-sm text-slate-800">{account.name}</span>
                          <span className="text-xs text-slate-400 ml-2">@{account.username}</span>
                        </div>
                      </label>
                    ))}
                  </div>
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
                    <label className="text-xs text-slate-500">工数（営業日）</label>
                    <input
                      type="number"
                      min="1"
                      value={newTask.workDays}
                      onChange={(e) => setNewTask({ ...newTask, workDays: Math.max(1, Number(e.target.value)) })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    {newTask.startDate && newTask.workDays > 0 && (
                      <p className="text-xs text-slate-400 mt-1">
                        終了日: {calculateEndDate(newTask.startDate, newTask.workDays)}
                      </p>
                    )}
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

        {/* Add Category Modal */}
        {isAddCategoryOpen && (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-4 w-80 shadow-xl">
              <h3 className="font-semibold text-slate-800 mb-4">新規カテゴリー作成</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-slate-500">カテゴリー名</label>
                  <input
                    type="text"
                    value={newCategory.name}
                    onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="例: エンジニア, デザイン"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500">色</label>
                  <div className="grid grid-cols-4 gap-2 mt-1">
                    {categoryColors.map(color => (
                      <button
                        key={color.value}
                        onClick={() => setNewCategory({ ...newCategory, color: color.value })}
                        className={`h-8 rounded-lg ${color.value} ${
                          newCategory.color === color.value ? "ring-2 ring-offset-2 ring-purple-500" : ""
                        }`}
                        title={color.name}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button
                  onClick={() => setIsAddCategoryOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleAddCategory}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700"
                >
                  作成
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Click outside to close add menu */}
        {isAddMenuOpen && (
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsAddMenuOpen(false)}
          />
        )}

        {/* Settings Modal */}
        {isSettingsOpen && (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-4 w-96 shadow-xl">
              <h3 className="font-semibold text-slate-800 mb-4">ガントチャート設定</h3>

              {/* 休日設定 */}
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">休日設定</label>
                  <p className="text-xs text-slate-500 mb-3">チェックした曜日は休日として扱われ、工数計算から除外されます</p>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { key: "sunday", label: "日" },
                      { key: "monday", label: "月" },
                      { key: "tuesday", label: "火" },
                      { key: "wednesday", label: "水" },
                      { key: "thursday", label: "木" },
                      { key: "friday", label: "金" },
                      { key: "saturday", label: "土" },
                    ].map(day => (
                      <label
                        key={day.key}
                        className={`flex items-center justify-center p-2 rounded-lg border cursor-pointer transition-colors ${
                          holidaySettings[day.key as keyof typeof holidaySettings]
                            ? "bg-red-50 border-red-300 text-red-700"
                            : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={holidaySettings[day.key as keyof typeof holidaySettings] as boolean}
                          onChange={(e) => setHolidaySettings({
                            ...holidaySettings,
                            [day.key]: e.target.checked
                          })}
                          className="sr-only"
                        />
                        <span className="text-sm font-medium">{day.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="border-t border-slate-200 pt-4">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={holidaySettings.holidays}
                      onChange={(e) => setHolidaySettings({
                        ...holidaySettings,
                        holidays: e.target.checked
                      })}
                      className="rounded text-purple-600 focus:ring-purple-500"
                    />
                    <div>
                      <span className="text-sm font-medium text-slate-700">祝日を休日として扱う</span>
                      <p className="text-xs text-slate-500">日本の祝日を自動で休日に設定します</p>
                    </div>
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <button
                  onClick={() => setIsSettingsOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm"
                >
                  閉じる
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Milestone Modal */}
        {isMilestoneModalOpen && (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-4 w-80 shadow-xl">
              <h3 className="font-semibold text-slate-800 mb-4">
                {editingMilestoneId ? "マイルストーン編集" : "マイルストーン追加"}
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1 block">日付</label>
                  <div className="text-sm text-slate-600 bg-slate-100 px-3 py-2 rounded">
                    {newMilestoneDate}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1 block">ラベル</label>
                  <input
                    type="text"
                    value={newMilestoneLabel}
                    onChange={(e) => setNewMilestoneLabel(e.target.value)}
                    placeholder="α版、β版、マスター等"
                    className="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">色</label>
                  <div className="flex gap-2">
                    {[
                      { color: "bg-purple-500", name: "紫" },
                      { color: "bg-blue-500", name: "青" },
                      { color: "bg-green-500", name: "緑" },
                      { color: "bg-orange-500", name: "橙" },
                      { color: "bg-red-500", name: "赤" },
                      { color: "bg-pink-500", name: "桃" },
                    ].map(({ color }) => (
                      <button
                        key={color}
                        onClick={() => setNewMilestoneColor(color)}
                        className={`w-8 h-8 rounded-full ${color} ${
                          newMilestoneColor === color
                            ? "ring-2 ring-offset-2 ring-slate-400"
                            : ""
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-between gap-2 mt-6">
                <div>
                  {editingMilestoneId && (
                    <button
                      onClick={() => handleDeleteMilestone(editingMilestoneId)}
                      className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg text-sm"
                    >
                      削除
                    </button>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setIsMilestoneModalOpen(false);
                      setEditingMilestoneId(null);
                    }}
                    className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm"
                  >
                    キャンセル
                  </button>
                  <button
                    onClick={handleSaveMilestone}
                    disabled={!newMilestoneLabel.trim()}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {editingMilestoneId ? "更新" : "追加"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirm Modal */}
        {isDeleteConfirmOpen && (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-4 w-80 shadow-xl">
              <h3 className="font-semibold text-slate-800 mb-2">タスクの削除</h3>
              <p className="text-sm text-slate-600 mb-4">本当にこのタスクを削除しますか？</p>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => {
                    setIsDeleteConfirmOpen(false);
                    setTaskToDelete(null);
                  }}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm"
                >
                  いいえ
                </button>
                <button
                  onClick={handleDeleteTask}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700"
                >
                  はい
                </button>
              </div>
            </div>
          </div>
        )}

        {/* WorkDays Change Modal */}
        {isWorkDaysModalOpen && selectedTask && (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-4 w-96 shadow-xl">
              <h3 className="font-semibold text-slate-800 mb-4">工数の変更</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-slate-600 mb-1 block">現在の工数</label>
                  <p className="text-lg font-medium text-slate-800">{selectedTask.workDays}日</p>
                </div>
                <div>
                  <label className="text-sm text-slate-600 mb-1 block">変更後の工数</label>
                  <input
                    type="number"
                    min="1"
                    value={newWorkDays}
                    onChange={(e) => setNewWorkDays(Math.max(1, Number(e.target.value)))}
                    className="w-24 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <span className="text-sm text-slate-500 ml-2">日</span>
                </div>
                <div>
                  <label className="text-sm text-slate-600 mb-1 block">変更理由（任意）</label>
                  <textarea
                    value={workDaysComment}
                    onChange={(e) => setWorkDaysComment(e.target.value)}
                    placeholder="例: クライアント要望により期間延長"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                    rows={2}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button
                  onClick={() => setIsWorkDaysModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleUpdateWorkDaysWithComment}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700"
                >
                  変更する
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Confetti Celebration */}
        {showConfetti && (
          <div className="fixed inset-0 z-[100] pointer-events-none overflow-hidden">
            {/* 紙吹雪 */}
            {Array.from({ length: 100 }).map((_, i) => (
              <div
                key={i}
                className="absolute animate-confetti"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `-20px`,
                  width: `${Math.random() * 10 + 5}px`,
                  height: `${Math.random() * 10 + 5}px`,
                  backgroundColor: ["#FF6B6B", "#4ECDC4", "#FFE66D", "#95E1D3", "#F38181", "#AA96DA", "#FCBAD3", "#A8D8EA"][Math.floor(Math.random() * 8)],
                  borderRadius: Math.random() > 0.5 ? "50%" : "0",
                  animationDelay: `${Math.random() * 2}s`,
                  animationDuration: `${Math.random() * 2 + 2}s`,
                }}
              />
            ))}
            {/* お祝いメッセージ */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="bg-white/95 px-12 py-8 rounded-2xl shadow-2xl text-center animate-bounce-in">
                <div className="text-6xl mb-4">🎉</div>
                <h2 className="text-3xl font-bold text-slate-800 mb-2">タスク完了おめでとうございます！</h2>
                <p className="text-lg text-slate-600">「{completedTaskName}」が完了しました</p>
              </div>
            </div>
          </div>
        )}

        {/* Event Detail Panel */}
        {selectedEvent && (
          <div className="border-t border-slate-200 bg-amber-50 h-48 shrink-0 flex flex-col">
            {/* ヘッダー */}
            <div className="px-4 py-2 border-b border-amber-200 shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded ${eventTypeColors[selectedEvent.type]}`} />
                  <h3 className="font-medium text-slate-800">{selectedEvent.name}</h3>
                  <span className="text-xs text-slate-500">
                    {selectedEvent.startDate} 〜 {selectedEvent.endDate}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {(selectedEvent.id.startsWith("custom-ev-") || selectedEvent.id.startsWith("ai-ev-")) && (
                    <button
                      onClick={() => handleDeleteEvent(selectedEvent.id)}
                      className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded"
                    >
                      削除
                    </button>
                  )}
                  <button
                    onClick={() => setSelectedEvent(null)}
                    className="px-3 py-1 text-sm text-slate-600 hover:bg-slate-100 rounded"
                  >
                    閉じる
                  </button>
                </div>
              </div>
            </div>

            {/* コンテンツ */}
            <div className="flex-1 overflow-y-auto px-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-500">場所</label>
                  <p className="text-sm text-slate-700">{selectedEvent.location || "-"}</p>
                </div>
                <div>
                  <label className="text-xs text-slate-500">種別</label>
                  <p className="text-sm text-slate-700">
                    {{ exhibition: "展示会", conference: "カンファレンス", market: "即売会", online: "オンライン" }[selectedEvent.type]}
                  </p>
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-slate-500">説明</label>
                  <p className="text-sm text-slate-700">{selectedEvent.description || "-"}</p>
                </div>
                {selectedEvent.url && (
                  <div className="col-span-2">
                    <label className="text-xs text-slate-500">URL</label>
                    <a
                      href={selectedEvent.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline block"
                    >
                      {selectedEvent.url}
                    </a>
                  </div>
                )}
                {selectedEvent.tags.length > 0 && (
                  <div className="col-span-2">
                    <label className="text-xs text-slate-500">タグ</label>
                    <div className="flex gap-1 flex-wrap mt-1">
                      {selectedEvent.tags.map(tag => (
                        <span key={tag} className="text-xs bg-amber-200 text-amber-800 px-2 py-0.5 rounded">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Add Event Modal */}
        {isAddEventOpen && (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-4 w-96 shadow-xl">
              <h3 className="font-semibold text-slate-800 mb-4">イベント追加</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-slate-500">イベント名 *</label>
                  <input
                    type="text"
                    value={newEvent.name}
                    onChange={(e) => setNewEvent({ ...newEvent, name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                    placeholder="イベント名を入力"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-500">開始日 *</label>
                    <input
                      type="date"
                      value={newEvent.startDate}
                      onChange={(e) => setNewEvent({ ...newEvent, startDate: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500">終了日 *</label>
                    <input
                      type="date"
                      value={newEvent.endDate}
                      onChange={(e) => setNewEvent({ ...newEvent, endDate: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-slate-500">場所</label>
                  <input
                    type="text"
                    value={newEvent.location}
                    onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                    placeholder="開催場所"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500">種別</label>
                  <select
                    value={newEvent.type}
                    onChange={(e) => setNewEvent({ ...newEvent, type: e.target.value as "exhibition" | "conference" | "market" | "online" })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="exhibition">展示会</option>
                    <option value="conference">カンファレンス</option>
                    <option value="market">即売会</option>
                    <option value="online">オンライン</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-500">URL</label>
                  <input
                    type="url"
                    value={newEvent.url}
                    onChange={(e) => setNewEvent({ ...newEvent, url: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                    placeholder="https://..."
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500">説明</label>
                  <textarea
                    value={newEvent.description}
                    onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
                    rows={2}
                    placeholder="イベントの説明"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button
                  onClick={() => {
                    setIsAddEventOpen(false);
                    setNewEvent({ name: "", startDate: "", endDate: "", location: "", url: "", description: "", type: "exhibition" });
                  }}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleAddEvent}
                  disabled={!newEvent.name || !newEvent.startDate || !newEvent.endDate}
                  className="px-4 py-2 bg-amber-500 text-white rounded-lg text-sm hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  追加
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Tips画面表示
  if (showTips) {
    return <GameDevTips onBack={() => setShowTips(false)} />;
  }

  // 通常のダッシュボード表示
  return (
    <div className="h-screen bg-slate-50 overflow-y-auto">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 shrink-0">
        <div className="h-14 flex items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-purple-600 rounded flex items-center justify-center text-white text-sm">
              {project.icon}
            </div>
            <h2 className="font-semibold text-slate-800">{project.name}</h2>
          </div>
          {/* 設定ボタン（管理者のみ表示） */}
          {isAdmin && (
            <div className="relative">
              <button
                onClick={() => setIsSettingsMenuOpen(!isSettingsMenuOpen)}
                className="w-8 h-8 flex items-center justify-center text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              >
                ⚙️
              </button>
              {isSettingsMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setIsSettingsMenuOpen(false)}
                  />
                  <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-slate-200 rounded-lg shadow-lg z-20 py-1">
                    <button
                      onClick={() => {
                        onOpenChatSettings();
                        setIsSettingsMenuOpen(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                    >
                      👥 メンバー設定
                    </button>
                    <button
                      onClick={() => {
                        onOpenGameSettings();
                        setIsSettingsMenuOpen(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                    >
                      📋 プロジェクト設定
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Dashboard Content - 2カラムレイアウト（左:メイン、右:プロジェクト概要固定） */}
      <div className="flex gap-4 p-4 h-[calc(100vh-64px)]">
        {/* 左: メインコンテンツエリア */}
        <div className="flex-1 overflow-y-auto">
          {/* タスク概要 */}
          <div className="mb-4 bg-white rounded-lg border border-slate-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-slate-800">タスク概要</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {/* 進行中タスク */}
              <div
                className="bg-slate-50 rounded-lg p-3 cursor-pointer hover:bg-slate-100 transition-all"
                onClick={() => setIsGanttFullScreen(true)}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-xs text-slate-500 mb-1">進行中タスク</div>
                    <div className="text-2xl font-bold text-slate-800">
                      {ganttTasks.filter(t => t.status === "active").length}
                    </div>
                    {/* 週次の変化は動的に計算可能 */}
                  </div>
                  <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                    <span className="text-base">📋</span>
                  </div>
                </div>
              </div>
              {/* 今週の締切 */}
              <div
                className="bg-slate-50 rounded-lg p-3 cursor-pointer hover:bg-slate-100 transition-all"
                onClick={() => setIsGanttFullScreen(true)}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-xs text-slate-500 mb-1">今週の締切</div>
                    <div className="text-2xl font-bold text-slate-800">
                      {(() => {
                        const today = new Date();
                        const weekEnd = new Date(today);
                        weekEnd.setDate(today.getDate() + (7 - today.getDay()));
                        return ganttTasks.filter(t => {
                          if (t.status !== "active") return false;
                          const endDate = new Date(calculateEndDate(t.startDate, t.workDays));
                          return endDate <= weekEnd;
                        }).length;
                      })()}
                    </div>
                    {/* 週次の変化は動的に計算可能 */}
                  </div>
                  <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                    <span className="text-base">⏰</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ウィジェットグリッド */}
          <div className="grid grid-cols-2 gap-4">
          {widgetOrder.map((widgetId) => {
            const isDragging = draggedWidgetId === widgetId;
            const isDragOver = dragOverWidgetId === widgetId;
            const baseClass = `bg-white rounded-lg border cursor-move transition-all ${
              isDragging ? "opacity-50 scale-95" : ""
            } ${isDragOver ? "border-purple-500 shadow-lg" : "border-slate-200 hover:border-purple-300"}`;

            // ガントチャートウィジェット
            if (widgetId === "gantt") {
              return (
                <div
                  key={widgetId}
                  draggable
                  onDragStart={() => handleWidgetDragStart(widgetId)}
                  onDragOver={(e) => handleWidgetDragOver(e, widgetId)}
                  onDragLeave={handleWidgetDragLeave}
                  onDrop={() => handleWidgetDrop(widgetId)}
                  onDragEnd={handleWidgetDragEnd}
                  className={baseClass}
                >
                  <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400 cursor-grab">⋮⋮</span>
                      <h3 className="font-semibold text-slate-800">ガントチャート</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setIsGanttFullScreen(true)}
                        className="text-sm text-purple-600 hover:text-purple-700"
                      >
                        詳細 →
                      </button>
                      <button
                        onClick={() => removeWidgetToToolbox("gantt")}
                        className="text-slate-400 hover:text-red-500 p-1"
                        title="ツールボックスに戻す"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                  <div className="p-4 max-h-64 overflow-y-auto">
                    <div className="space-y-3">
                      {taskGroups.map(group => (
                        <div key={group.id}>
                          <div className="flex items-center gap-2 mb-2">
                            <div className={`w-2 h-2 rounded ${group.color}`} />
                            <span className="text-xs font-medium text-slate-600">{group.name}</span>
                          </div>
                          <div className="space-y-2 ml-4">
                            {getTasksByGroup(group.id).filter(t => t.status === "active").slice(0, 2).map(task => (
                              <div key={task.id} className="flex items-center gap-3">
                                <div className="flex -space-x-1">
                                  {task.assignees.slice(0, 2).map((a, i) => (
                                    <div key={i} className="w-5 h-5 bg-slate-200 rounded-full flex items-center justify-center text-[10px] border border-white">
                                      {a.avatar}
                                    </div>
                                  ))}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-sm text-slate-800 truncate">{task.title}</span>
                                    <span className="text-xs text-slate-400">{task.progress}%</span>
                                  </div>
                                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                    <div
                                      className={`h-full ${task.color} rounded-full`}
                                      style={{ width: `${task.progress}%` }}
                                    />
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            }

            // 最新のチャットウィジェット
            if (widgetId === "latestChat") {
              return (
                <div
                  key={widgetId}
                  draggable
                  onDragStart={() => handleWidgetDragStart(widgetId)}
                  onDragOver={(e) => handleWidgetDragOver(e, widgetId)}
                  onDragLeave={handleWidgetDragLeave}
                  onDrop={() => handleWidgetDrop(widgetId)}
                  onDragEnd={handleWidgetDragEnd}
                  className={baseClass}
                >
                  <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400 cursor-grab">⋮⋮</span>
                      <h3 className="font-semibold text-slate-800">最新のチャット</h3>
                    </div>
                    <button
                      onClick={() => removeWidgetToToolbox("latestChat")}
                      className="text-slate-400 hover:text-red-500 p-1"
                      title="ツールボックスに戻す"
                    >
                      ×
                    </button>
                  </div>
                  <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
                    {dummyLatestMessages.map((msg) => (
                      <div key={msg.id} className="px-4 py-3 hover:bg-slate-50">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 bg-slate-200 rounded flex items-center justify-center text-sm shrink-0">
                            {msg.userAvatar}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-xs text-slate-800">{msg.userName}</span>
                              <span className="text-xs text-slate-400 ml-auto">{msg.timestamp}</span>
                            </div>
                            <p className="text-xs text-slate-600 line-clamp-2">{msg.content}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            }

            // 最近のアクティビティウィジェット
            if (widgetId === "activity") {
              return (
                <div
                  key={widgetId}
                  draggable
                  onDragStart={() => handleWidgetDragStart(widgetId)}
                  onDragOver={(e) => handleWidgetDragOver(e, widgetId)}
                  onDragLeave={handleWidgetDragLeave}
                  onDrop={() => handleWidgetDrop(widgetId)}
                  onDragEnd={handleWidgetDragEnd}
                  className={baseClass}
                >
                  <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400 cursor-grab">⋮⋮</span>
                      <h3 className="font-semibold text-slate-800">最近のアクティビティ</h3>
                    </div>
                    <button
                      onClick={() => removeWidgetToToolbox("activity")}
                      className="text-slate-400 hover:text-red-500 p-1"
                      title="ツールボックスに戻す"
                    >
                      ×
                    </button>
                  </div>
                  <div className="p-4 max-h-64 overflow-y-auto">
                    <div className="space-y-3">
                      {ganttTasks.flatMap(task =>
                        task.history.slice(-3).map(h => ({
                          ...h,
                          taskTitle: task.title,
                        }))
                      ).slice(0, 5).map((activity, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-xs">
                          <div className="w-6 h-6 bg-slate-200 rounded-full flex items-center justify-center shrink-0">
                            {activity.userName[0]}
                          </div>
                          <div>
                            <span className="font-medium text-slate-700">{activity.userName}</span>
                            <span className="text-slate-500">
                              {activity.type === "progress" && ` が「${activity.taskTitle}」の進捗を ${activity.newValue}% に更新`}
                              {activity.type === "comment" && ` が「${activity.taskTitle}」にコメント`}
                              {activity.type === "workDays" && ` が「${activity.taskTitle}」の工数を変更`}
                            </span>
                            <div className="text-slate-400 mt-0.5">{activity.timestamp}</div>
                          </div>
                        </div>
                      ))}
                      {ganttTasks.flatMap(t => t.history).length === 0 && (
                        <p className="text-sm text-slate-400 text-center py-4">アクティビティがありません</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            }

            // スプレッドシートウィジェット
            if (widgetId === "spreadsheet") {
              return (
                <div
                  key={widgetId}
                  draggable
                  onDragStart={() => handleWidgetDragStart(widgetId)}
                  onDragOver={(e) => handleWidgetDragOver(e, widgetId)}
                  onDragLeave={handleWidgetDragLeave}
                  onDrop={() => handleWidgetDrop(widgetId)}
                  onDragEnd={handleWidgetDragEnd}
                  className={baseClass}
                >
                  <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400 cursor-grab">⋮⋮</span>
                      <h3 className="font-semibold text-slate-800">スプレッドシート</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setIsAddSpreadsheetOpen(true)}
                        className="text-sm text-purple-600 hover:text-purple-700"
                      >
                        + 追加
                      </button>
                      <button
                        onClick={() => removeWidgetToToolbox("spreadsheet")}
                        className="text-slate-400 hover:text-red-500 p-1"
                        title="ツールボックスに戻す"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                  <div className="p-4 space-y-2">
                    {spreadsheetLinks.map((link) => (
                      <div
                        key={link.id}
                        className="flex items-center gap-2 p-2 hover:bg-slate-50 rounded-lg group"
                      >
                        <span className="text-lg">📄</span>
                        {link.url ? (
                          <a
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:underline flex-1 truncate"
                          >
                            {link.name}
                          </a>
                        ) : (
                          <span className="text-sm text-slate-600 flex-1 truncate">{link.name}</span>
                        )}
                        <button
                          onClick={() => setSpreadsheetLinks(spreadsheetLinks.filter(l => l.id !== link.id))}
                          className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    {spreadsheetLinks.length === 0 && (
                      <p className="text-sm text-slate-400 text-center py-2">リンクがありません</p>
                    )}
                  </div>
                </div>
              );
            }

            // TODOリストウィジェット
            if (widgetId === "todo") {
              return (
                <div
                  key={widgetId}
                  draggable
                  onDragStart={() => handleWidgetDragStart(widgetId)}
                  onDragOver={(e) => handleWidgetDragOver(e, widgetId)}
                  onDragLeave={handleWidgetDragLeave}
                  onDrop={() => handleWidgetDrop(widgetId)}
                  onDragEnd={handleWidgetDragEnd}
                  className={baseClass}
                >
                  <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400 cursor-grab">⋮⋮</span>
                      <h3 className="font-semibold text-slate-800">TODOリスト</h3>
                    </div>
                    <button
                      onClick={() => removeWidgetToToolbox("todo")}
                      className="text-slate-400 hover:text-red-500 p-1"
                      title="ツールボックスに戻す"
                    >
                      ×
                    </button>
                  </div>
                  <div className="p-4">
                    <div className="space-y-2 mb-3 max-h-48 overflow-y-auto">
                      {todoItems.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center gap-2 group"
                        >
                          <button
                            onClick={() => setTodoItems(todoItems.map(t =>
                              t.id === item.id ? { ...t, completed: !t.completed } : t
                            ))}
                            className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                              item.completed
                                ? "bg-purple-500 border-purple-500 text-white"
                                : "border-slate-300 hover:border-purple-400"
                            }`}
                          >
                            {item.completed && "✓"}
                          </button>
                          <span className={`text-sm flex-1 ${item.completed ? "text-slate-400 line-through" : "text-slate-700"}`}>
                            {item.text}
                          </span>
                          <button
                            onClick={() => setTodoItems(todoItems.filter(t => t.id !== item.id))}
                            className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newTodoText}
                        onChange={(e) => setNewTodoText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && newTodoText.trim()) {
                            setTodoItems([...todoItems, { id: `todo-${Date.now()}`, text: newTodoText.trim(), completed: false }]);
                            setNewTodoText("");
                          }
                        }}
                        placeholder="新しいTODOを追加..."
                        className="flex-1 px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                      <button
                        onClick={() => {
                          if (newTodoText.trim()) {
                            setTodoItems([...todoItems, { id: `todo-${Date.now()}`, text: newTodoText.trim(), completed: false }]);
                            setNewTodoText("");
                          }
                        }}
                        className="px-3 py-1.5 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700"
                      >
                        追加
                      </button>
                    </div>
                  </div>
                </div>
              );
            }

            // メモウィジェット
            if (widgetId === "memo") {
              // 現在のユーザー情報（仮）
              const currentUser = { id: "me", name: "松村優樹", avatar: "松" };

              const addMemoEntry = () => {
                if (!newMemoContent.trim()) return;
                const newEntry: MemoEntry = {
                  id: `memo-${Date.now()}`,
                  authorId: currentUser.id,
                  authorName: currentUser.name,
                  authorAvatar: currentUser.avatar,
                  content: newMemoContent.trim(),
                  timestamp: new Date().toISOString(),
                };
                setMemoEntries([newEntry, ...memoEntries]);
                setNewMemoContent("");
              };

              const formatMemoTime = (isoString: string) => {
                const date = new Date(isoString);
                const now = new Date();
                const diffMs = now.getTime() - date.getTime();
                const diffMins = Math.floor(diffMs / 60000);
                const diffHours = Math.floor(diffMs / 3600000);
                const diffDays = Math.floor(diffMs / 86400000);

                if (diffMins < 1) return "たった今";
                if (diffMins < 60) return `${diffMins}分前`;
                if (diffHours < 24) return `${diffHours}時間前`;
                if (diffDays < 7) return `${diffDays}日前`;
                return date.toLocaleDateString("ja-JP", { month: "short", day: "numeric" });
              };

              return (
                <div
                  key={widgetId}
                  draggable
                  onDragStart={() => handleWidgetDragStart(widgetId)}
                  onDragOver={(e) => handleWidgetDragOver(e, widgetId)}
                  onDragLeave={handleWidgetDragLeave}
                  onDrop={() => handleWidgetDrop(widgetId)}
                  onDragEnd={handleWidgetDragEnd}
                  className={baseClass}
                >
                  <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400 cursor-grab">⋮⋮</span>
                      <h3 className="font-semibold text-slate-800">🗒️ メモ</h3>
                      <span className="text-xs text-slate-400">({memoEntries.length}件)</span>
                    </div>
                    <button
                      onClick={() => removeWidgetToToolbox("memo")}
                      className="text-slate-400 hover:text-red-500 p-1"
                      title="ツールボックスに戻す"
                    >
                      ×
                    </button>
                  </div>
                  <div className="p-4">
                    {/* メモ入力 */}
                    <div className="mb-3">
                      <div className="flex gap-2">
                        <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-white text-xs shrink-0">
                          {currentUser.avatar}
                        </div>
                        <div className="flex-1">
                          <textarea
                            value={newMemoContent}
                            onChange={(e) => setNewMemoContent(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                addMemoEntry();
                              }
                            }}
                            placeholder="メモを追加... (Enter で投稿)"
                            className="w-full p-2 border border-slate-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-500"
                            rows={2}
                          />
                        </div>
                      </div>
                      {newMemoContent.trim() && (
                        <div className="flex justify-end mt-2">
                          <button
                            onClick={addMemoEntry}
                            className="px-3 py-1 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700"
                          >
                            投稿
                          </button>
                        </div>
                      )}
                    </div>

                    {/* メモ履歴 */}
                    <div className="max-h-48 overflow-y-auto space-y-3">
                      {memoEntries.length === 0 ? (
                        <p className="text-sm text-slate-400 text-center py-4">
                          まだメモがありません。<br />チーム全員でメモを共有できます。
                        </p>
                      ) : (
                        memoEntries.map((entry) => (
                          <div key={entry.id} className="flex gap-2 group">
                            <div className="w-7 h-7 bg-slate-200 rounded-full flex items-center justify-center text-xs shrink-0">
                              {entry.authorAvatar}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-slate-700">{entry.authorName}</span>
                                <span className="text-xs text-slate-400">{formatMemoTime(entry.timestamp)}</span>
                              </div>
                              <p className="text-sm text-slate-600 whitespace-pre-wrap break-words">{entry.content}</p>
                            </div>
                            <button
                              onClick={() => setMemoEntries(memoEntries.filter(m => m.id !== entry.id))}
                              className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                            >
                              ×
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              );
            }

            // URLリンクウィジェット
            if (widgetId === "urlLinks") {
              return (
                <div
                  key={widgetId}
                  draggable
                  onDragStart={() => handleWidgetDragStart(widgetId)}
                  onDragOver={(e) => handleWidgetDragOver(e, widgetId)}
                  onDragLeave={handleWidgetDragLeave}
                  onDrop={() => handleWidgetDrop(widgetId)}
                  onDragEnd={handleWidgetDragEnd}
                  className={baseClass}
                >
                  <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400 cursor-grab">⋮⋮</span>
                      <h3 className="font-semibold text-slate-800">🔗 URLリンク</h3>
                    </div>
                    <button
                      onClick={() => removeWidgetToToolbox("urlLinks")}
                      className="text-slate-400 hover:text-red-500 p-1"
                      title="ツールボックスに戻す"
                    >
                      ×
                    </button>
                  </div>
                  <div className="p-4 max-h-48 overflow-y-auto">
                    <div className="space-y-2 mb-3">
                      {urlLinks.map((link) => (
                        <div key={link.id} className="flex items-center gap-2 group">
                          <a
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 text-sm text-purple-600 hover:text-purple-700 hover:underline truncate"
                          >
                            {link.title || link.url}
                          </a>
                          <button
                            onClick={() => setUrlLinks(urlLinks.filter(l => l.id !== link.id))}
                            className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                      {urlLinks.length === 0 && (
                        <p className="text-sm text-slate-400 text-center py-2">リンクがありません</p>
                      )}
                    </div>
                    {isAddUrlLinkOpen ? (
                      <div className="space-y-2 border-t border-slate-100 pt-3">
                        <input
                          type="text"
                          value={newUrlLink.title}
                          onChange={(e) => setNewUrlLink({ ...newUrlLink, title: e.target.value })}
                          placeholder="タイトル（任意）"
                          className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                        <input
                          type="url"
                          value={newUrlLink.url}
                          onChange={(e) => setNewUrlLink({ ...newUrlLink, url: e.target.value })}
                          placeholder="URL"
                          className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setIsAddUrlLinkOpen(false);
                              setNewUrlLink({ title: "", url: "" });
                            }}
                            className="flex-1 px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg text-sm"
                          >
                            キャンセル
                          </button>
                          <button
                            onClick={() => {
                              if (newUrlLink.url.trim()) {
                                setUrlLinks([...urlLinks, { id: `url-${Date.now()}`, ...newUrlLink }]);
                                setNewUrlLink({ title: "", url: "" });
                                setIsAddUrlLinkOpen(false);
                              }
                            }}
                            className="flex-1 px-3 py-1.5 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700"
                          >
                            追加
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setIsAddUrlLinkOpen(true)}
                        className="w-full px-3 py-1.5 text-purple-600 hover:bg-purple-50 rounded-lg text-sm border border-dashed border-purple-300"
                      >
                        + リンクを追加
                      </button>
                    )}
                  </div>
                </div>
              );
            }

            // タイマーウィジェット
            if (widgetId === "timer") {
              return (
                <div
                  key={widgetId}
                  draggable
                  onDragStart={() => handleWidgetDragStart(widgetId)}
                  onDragOver={(e) => handleWidgetDragOver(e, widgetId)}
                  onDragLeave={handleWidgetDragLeave}
                  onDrop={() => handleWidgetDrop(widgetId)}
                  onDragEnd={handleWidgetDragEnd}
                  className={baseClass}
                >
                  <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400 cursor-grab">⋮⋮</span>
                      <h3 className="font-semibold text-slate-800">⏱️ タイマー</h3>
                    </div>
                    <button
                      onClick={() => removeWidgetToToolbox("timer")}
                      className="text-slate-400 hover:text-red-500 p-1"
                      title="ツールボックスに戻す"
                    >
                      ×
                    </button>
                  </div>
                  <div className="p-4 text-center">
                    <div className="text-4xl font-mono font-bold text-slate-800 mb-4">
                      {formatTime(timerSeconds)}
                    </div>
                    <div className="flex justify-center gap-2">
                      <button
                        onClick={() => setIsTimerRunning(!isTimerRunning)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          isTimerRunning
                            ? "bg-red-100 text-red-600 hover:bg-red-200"
                            : "bg-green-100 text-green-600 hover:bg-green-200"
                        }`}
                      >
                        {isTimerRunning ? "停止" : "開始"}
                      </button>
                      <button
                        onClick={() => {
                          setIsTimerRunning(false);
                          setTimerSeconds(0);
                        }}
                        className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-200"
                      >
                        リセット
                      </button>
                    </div>
                  </div>
                </div>
              );
            }

            // カレンダーウィジェット
            if (widgetId === "calendar") {
              const today = new Date();
              const currentMonth = today.getMonth();
              const currentYear = today.getFullYear();
              const firstDay = new Date(currentYear, currentMonth, 1).getDay();
              const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
              const monthNames = ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"];

              return (
                <div
                  key={widgetId}
                  draggable
                  onDragStart={() => handleWidgetDragStart(widgetId)}
                  onDragOver={(e) => handleWidgetDragOver(e, widgetId)}
                  onDragLeave={handleWidgetDragLeave}
                  onDrop={() => handleWidgetDrop(widgetId)}
                  onDragEnd={handleWidgetDragEnd}
                  className={baseClass}
                >
                  <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400 cursor-grab">⋮⋮</span>
                      <h3 className="font-semibold text-slate-800">📅 カレンダー</h3>
                    </div>
                    <button
                      onClick={() => removeWidgetToToolbox("calendar")}
                      className="text-slate-400 hover:text-red-500 p-1"
                      title="ツールボックスに戻す"
                    >
                      ×
                    </button>
                  </div>
                  <div className="p-4">
                    <div className="text-center mb-3">
                      <span className="font-semibold text-slate-800">{currentYear}年 {monthNames[currentMonth]}</span>
                    </div>
                    <div className="grid grid-cols-7 gap-1 text-center text-xs">
                      {["日", "月", "火", "水", "木", "金", "土"].map((day, i) => (
                        <div key={day} className={`py-1 font-medium ${i === 0 ? "text-red-500" : i === 6 ? "text-blue-500" : "text-slate-500"}`}>
                          {day}
                        </div>
                      ))}
                      {Array.from({ length: firstDay }).map((_, i) => (
                        <div key={`empty-${i}`} />
                      ))}
                      {Array.from({ length: daysInMonth }).map((_, i) => {
                        const day = i + 1;
                        const isToday = day === today.getDate();
                        const dayOfWeek = (firstDay + i) % 7;
                        return (
                          <div
                            key={day}
                            className={`py-1 rounded ${
                              isToday
                                ? "bg-purple-600 text-white font-bold"
                                : dayOfWeek === 0
                                ? "text-red-500"
                                : dayOfWeek === 6
                                ? "text-blue-500"
                                : "text-slate-700"
                            }`}
                          >
                            {day}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            }

            return null;
          })}
          </div>

          {/* ツールボックス - 常に表示 */}
          <div className="mt-4 bg-white rounded-lg border border-slate-200 p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">🧰</span>
              <h3 className="font-semibold text-slate-800">ツールボックス</h3>
              <span className="text-xs text-slate-400">
                {toolboxWidgets.length > 0 ? "クリックでダッシュボードに追加" : "ウィジェットの×ボタンでここに戻せます"}
              </span>
            </div>
            {toolboxWidgets.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {toolboxWidgets.map((widget) => (
                  <button
                    key={widget.id}
                    onClick={() => addWidgetFromToolbox(widget.id)}
                    className="flex items-center gap-2 px-3 py-2 bg-slate-50 hover:bg-purple-50 border border-slate-200 hover:border-purple-300 rounded-lg transition-all hover:shadow-sm"
                  >
                    <span className="text-lg">{widget.icon}</span>
                    <span className="text-sm text-slate-700">{widget.label}</span>
                    <span className="text-purple-500 text-xs">+</span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400 text-center py-2">すべてのウィジェットが表示中です</p>
            )}
          </div>
        </div>

        {/* 右: プロジェクト概要（固定サイドバー） */}
        <div className="w-80 shrink-0 bg-white rounded-lg border border-slate-200 p-4 overflow-y-auto">
          <h3 className="font-semibold text-slate-800 mb-3">プロジェクト概要</h3>

          {/* ゲームタイトル */}
          <div className="mb-2">
            <div className="text-lg font-bold text-slate-800">
              {project.gameSettings?.title || project.name}
            </div>
          </div>

          {/* 説明 */}
          {(project.gameSettings?.description || project.description) && (
            <div className="mb-3">
              <p className="text-xs text-slate-600 line-clamp-3">
                {project.gameSettings?.description || project.description}
              </p>
            </div>
          )}

          {/* 全体の完成度 */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-slate-600">全体の完成度</span>
              <span className="text-sm font-bold text-purple-600">
                {(() => {
                  const activeTasks = ganttTasks.filter(t => t.status !== "deleted");
                  if (activeTasks.length === 0) return 0;
                  const totalProgress = activeTasks.reduce((sum, t) => sum + t.progress, 0);
                  return Math.round(totalProgress / activeTasks.length);
                })()}%
              </span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-purple-600 rounded-full transition-all"
                style={{
                  width: `${(() => {
                    const activeTasks = ganttTasks.filter(t => t.status !== "deleted");
                    if (activeTasks.length === 0) return 0;
                    const totalProgress = activeTasks.reduce((sum, t) => sum + t.progress, 0);
                    return Math.round(totalProgress / activeTasks.length);
                  })()}%`
                }}
              />
            </div>
          </div>

          {/* 統計 */}
          <div className="grid grid-cols-2 gap-2 text-center mb-4">
            <div className="bg-green-50 rounded-lg p-2">
              <div className="text-lg font-bold text-green-600">
                {ganttTasks.filter(t => t.status === "completed").length}
              </div>
              <div className="text-xs text-green-700">完了</div>
            </div>
            <div className="bg-slate-50 rounded-lg p-2">
              <div className="text-lg font-bold text-slate-600">
                {ganttTasks.filter(t => t.status !== "deleted").length}
              </div>
              <div className="text-xs text-slate-500">全タスク</div>
            </div>
          </div>

          {/* 区切り線 */}
          <div className="border-t border-slate-200 my-4" />

          {/* プロジェクト詳細情報 */}
          <div className="space-y-2 mb-4 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-400 w-4">🎮</span>
              <span className="text-slate-500 w-16">ジャンル</span>
              <span className="text-slate-700">{project.gameSettings?.genre || "未設定"}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-400 w-4">⏱️</span>
              <span className="text-slate-500 w-16">プレイ時間</span>
              <span className="text-slate-700">{project.gameSettings?.playTime || "未設定"}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-400 w-4">📅</span>
              <span className="text-slate-500 w-16">リリース日</span>
              <span className="text-slate-700">{project.gameSettings?.releaseDate || "未設定"}</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-slate-400 w-4">💻</span>
              <span className="text-slate-500 w-16 shrink-0">対応機種</span>
              <div className="flex flex-wrap gap-1">
                {project.gameSettings?.platforms && project.gameSettings.platforms.length > 0 ? (
                  project.gameSettings.platforms.map((p) => (
                    <span key={p} className="bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded text-xs">
                      {p === "windows" ? "Win" : p === "mac" ? "Mac" : p === "linux" ? "Linux" : p === "ios" ? "iOS" : p === "android" ? "Android" : p === "switch" ? "Switch" : p === "ps5" ? "PS5" : p === "xbox" ? "Xbox" : p}
                    </span>
                  ))
                ) : (
                  <span className="text-slate-400">未設定</span>
                )}
              </div>
            </div>
          </div>

          {/* タグ */}
          <div className="mb-4">
            <div className="text-xs text-slate-500 mb-1">タグ</div>
            <div className="flex flex-wrap gap-1">
              {project.gameSettings?.tags && project.gameSettings.tags.length > 0 ? (
                project.gameSettings.tags.map((tag) => {
                  const tagLabels: Record<string, string> = {
                    indie: "インディー",
                    action: "アクション",
                    rpg: "RPG",
                    puzzle: "パズル",
                    social: "ソーシャル",
                    console: "コンシューマー",
                    free: "フリーゲーム",
                    mobile: "モバイル",
                    vr: "VR",
                    simulation: "シミュレーション",
                    adventure: "アドベンチャー",
                    horror: "ホラー",
                  };
                  return (
                    <span key={tag} className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-xs">
                      {tagLabels[tag] || tag}
                    </span>
                  );
                })
              ) : (
                <span className="text-xs text-slate-400">未設定</span>
              )}
            </div>
          </div>

          {/* 区切り線 */}
          <div className="border-t border-slate-200 my-4" />

          {/* メンバー */}
          <div className="mb-4">
            <div className="text-xs text-slate-500 mb-2">
              メンバー ({project.projectMembers?.length || 0})
            </div>
            <div className="space-y-2">
              {project.projectMembers && project.projectMembers.length > 0 ? (
                project.projectMembers.map((member) => (
                  <div
                    key={`${member.id}-${member.sourceId}`}
                    className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-lg"
                  >
                    <span className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center text-xs text-purple-700">
                      {member.avatar || member.name.charAt(0)}
                    </span>
                    <span className="text-sm text-slate-700">{member.name}</span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400">メンバー設定から追加してください</p>
              )}
            </div>
          </div>

          {/* 設定未完了の場合のガイド */}
          {!project.gameSettings && (
            <div className="p-2 bg-purple-50 rounded-lg">
              <p className="text-xs text-purple-700">
                歯車アイコンの「プロジェクト設定」から詳細を入力できます
              </p>
            </div>
          )}

          {/* 区切り線 */}
          <div className="border-t border-slate-200 my-4" />

          {/* ゲーム開発Tips */}
          <div
            onClick={() => setShowTips(true)}
            className="p-3 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200 cursor-pointer hover:shadow-md transition-all group"
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">💡</span>
              <h4 className="text-sm font-semibold text-slate-800">ゲーム開発Tips</h4>
              <span className="ml-auto text-purple-500 group-hover:translate-x-1 transition-transform">→</span>
            </div>
            <p className="text-xs text-slate-600 mb-3">
              企画・プログラミング・デザインなど、カテゴリー別の開発ノウハウ
            </p>
            <div className="flex gap-1 flex-wrap">
              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">📋 企画</span>
              <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs">💻 プログラミング</span>
              <span className="px-2 py-0.5 bg-pink-100 text-pink-700 rounded text-xs">🎨 デザイン</span>
            </div>
          </div>
        </div>
      </div>

      {/* スプレッドシート追加モーダル */}
      {isAddSpreadsheetOpen && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-4 w-96 shadow-xl">
            <h3 className="font-semibold text-slate-800 mb-4">スプレッドシートを追加</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-500">名前</label>
                <input
                  type="text"
                  value={newSpreadsheet.name}
                  onChange={(e) => setNewSpreadsheet({ ...newSpreadsheet, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="例: 仕様書"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500">URL</label>
                <input
                  type="url"
                  value={newSpreadsheet.url}
                  onChange={(e) => setNewSpreadsheet({ ...newSpreadsheet, url: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="https://docs.google.com/..."
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => {
                  setIsAddSpreadsheetOpen(false);
                  setNewSpreadsheet({ name: "", url: "" });
                }}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm"
              >
                キャンセル
              </button>
              <button
                onClick={() => {
                  if (newSpreadsheet.name) {
                    setSpreadsheetLinks([...spreadsheetLinks, { id: `ss-${Date.now()}`, ...newSpreadsheet }]);
                    setIsAddSpreadsheetOpen(false);
                    setNewSpreadsheet({ name: "", url: "" });
                  }
                }}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700"
              >
                追加
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
