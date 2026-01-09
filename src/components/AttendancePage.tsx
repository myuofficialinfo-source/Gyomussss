"use client";

import { useState, useEffect } from "react";
import type { User, MoodType, AttendanceStatus, AttendanceRecord, Project } from "./Sidebar";

// 機嫌の設定
const moodConfig: Record<MoodType, { icon: string; label: string; color: string; message: string }> = {
  good: {
    icon: "😊",
    label: "元気",
    color: "bg-green-100 border-green-300 text-green-700",
    message: "おはようございます！今日も元気いっぱいですね。素敵な1日になりますように！",
  },
  normal: {
    icon: "😐",
    label: "普通",
    color: "bg-yellow-100 border-yellow-300 text-yellow-700",
    message: "おはようございます。今日も一日頑張りましょう！",
  },
  tired: {
    icon: "😴",
    label: "疲れ気味",
    color: "bg-blue-100 border-blue-300 text-blue-700",
    message: "おはようございます。無理せず、自分のペースでいきましょうね。",
  },
};

// サイドメニュー項目
const sideMenuItems = [
  { id: "attendance", icon: "📅", label: "出勤簿" },
  { id: "correction", icon: "🔄", label: "打刻修正" },
  { id: "manhour", icon: "⏱️", label: "工数管理", hasSubmenu: true },
  { id: "request", icon: "📝", label: "申請", hasSubmenu: true },
];

type Props = {
  user: User;
  projects: Project[];
  onComplete: (record: AttendanceRecord, mood: MoodType) => void;
  existingRecord?: AttendanceRecord;
  onBack: () => void;
  onOpenSettings: () => void;
};

export default function AttendancePage({ user, projects, onComplete, existingRecord, onBack, onOpenSettings }: Props) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [memo, setMemo] = useState("");
  const [selectedMood, setSelectedMood] = useState<MoodType | null>(null);
  const [attendanceStatus, setAttendanceStatus] = useState<AttendanceStatus>("not_entered");
  const [enterTime, setEnterTime] = useState<string | null>(null);
  const [showGreeting, setShowGreeting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeMenu, setActiveMenu] = useState("attendance");
  const [workMode, setWorkMode] = useState<"normal" | "night">("normal");

  // 時刻更新
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // 既存の記録があれば復元
  useEffect(() => {
    if (existingRecord) {
      if (existingRecord.enterTime && !existingRecord.leaveTime) {
        setAttendanceStatus("working");
        setEnterTime(existingRecord.enterTime);
        setSelectedProject(existingRecord.projectId || "");
        setMemo(existingRecord.memo || "");
        if (existingRecord.mood) {
          setSelectedMood(existingRecord.mood);
        }
      } else if (existingRecord.leaveTime) {
        setAttendanceStatus("left");
      }
    }
  }, [existingRecord]);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("ja-JP", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  };

  const handlePush = () => {
    // 未入室 or 退勤済みから入室
    if (attendanceStatus === "not_entered" || attendanceStatus === "left") {
      if (!selectedMood) return;

      setIsSubmitting(true);
      const now = new Date();
      const timeStr = now.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit", hour12: false });
      const dateStr = now.toISOString().split("T")[0];

      // 入室処理後、グリーティングを表示してから業務画面に遷移
      setShowGreeting(true);

      setTimeout(() => {
        const record: AttendanceRecord = {
          date: dateStr,
          enterTime: timeStr,
          projectId: selectedProject || undefined,
          mood: selectedMood,
          memo: memo || undefined,
        };
        onComplete(record, selectedMood);
        setIsSubmitting(false);
      }, 2000); // グリーティング表示後に遷移
    } else if (attendanceStatus === "working") {
      // 退室処理
      setIsSubmitting(true);
      const now = new Date();
      const leaveTimeStr = now.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit", hour12: false });
      const dateStr = now.toISOString().split("T")[0];

      setTimeout(() => {
        const record: AttendanceRecord = {
          date: dateStr,
          enterTime: enterTime || undefined,
          leaveTime: leaveTimeStr,
          projectId: selectedProject || undefined,
          mood: selectedMood || undefined,
          memo: memo || undefined,
        };
        onComplete(record, selectedMood || "normal");
        setAttendanceStatus("left");
        setIsSubmitting(false);
      }, 500);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex">
        {/* Left Sidebar - 業務画面と同じUI */}
        <div className="w-64 bg-slate-900 text-white shrink-0 flex flex-col">
          {/* Header */}
          <div className="h-14 flex items-center px-4 border-b border-slate-700">
            <span className="text-lg font-bold text-purple-400">Gyomussss!</span>
          </div>

          {/* 勤怠メニュー */}
          <div className="p-3">
            <div className="text-xs text-slate-400 font-semibold mb-2 px-2">勤怠管理</div>
            <nav className="space-y-0.5">
              {sideMenuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveMenu(item.id)}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors ${
                    activeMenu === item.id
                      ? "bg-slate-700 text-white"
                      : "text-slate-300 hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                  {item.hasSubmenu && (
                    <span className="ml-auto text-slate-500 text-xs">▶</span>
                  )}
                </button>
              ))}
            </nav>
          </div>

          {/* スペーサー */}
          <div className="flex-1" />

          {/* User Section - 業務画面と同じ */}
          <div className="p-3 border-t border-slate-700">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-9 h-9 bg-purple-600 rounded flex items-center justify-center text-sm font-medium">
                  {user.avatar}
                </div>
                {user.mood && (
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-slate-800 rounded-full flex items-center justify-center text-xs border border-slate-600">
                    {moodConfig[user.mood].icon}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user.name}</p>
                <p className="text-xs text-slate-400">
                  {user.mood ? moodConfig[user.mood].label : "オンライン"}
                </p>
              </div>
              {/* 時計・歯車アイコン */}
              <div className="flex items-center gap-1">
                <button
                  onClick={onBack}
                  className="text-purple-400 hover:text-purple-300 p-1"
                  title="業務画面に戻る"
                >
                  🕐
                </button>
                <button
                  onClick={onOpenSettings}
                  className="text-slate-400 hover:text-white p-1"
                  title="設定"
                >
                  ⚙️
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Area - ジョブカン風 */}
        <div className="flex-1 p-6">
          {/* ステータスヘッダー */}
          <div className="bg-slate-700 text-white px-6 py-3 mb-0">
            <span className="text-lg font-medium">
              {attendanceStatus === "not_entered" ? "未入室" : attendanceStatus === "working" ? "勤務中" : "退勤済"}
            </span>
          </div>

          {/* メインカード */}
          <div className="bg-white shadow-sm">
            <div className="p-8">
              {/* 時計 - 大きく中央 */}
              <div className="text-center mb-8">
                <div className="text-8xl font-light text-slate-800 tracking-wider font-mono">
                  {formatTime(currentTime)}
                </div>
                {enterTime && attendanceStatus === "working" && (
                  <p className="text-sm text-green-600 mt-2">入室時刻: {enterTime}</p>
                )}
              </div>

              {/* 入力エリア - 常に表示 */}
              <div className="max-w-lg mx-auto space-y-4">
                {/* プロジェクト選択 */}
                <div>
                  <label className="block text-sm text-slate-600 mb-1">打刻場所を選択してください。</label>
                  <select
                    value={selectedProject}
                    onChange={(e) => setSelectedProject(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded bg-white text-slate-700 focus:outline-none focus:border-purple-500 text-sm"
                  >
                    <option value="">ゲーム事業部＞プロジェクト＞選択...</option>
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        ゲーム事業部＞プロジェクト＞{project.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 備考 */}
                <div>
                  <label className="block text-sm text-slate-600 mb-1">備考</label>
                  <textarea
                    value={memo}
                    onChange={(e) => setMemo(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded bg-white text-slate-700 focus:outline-none focus:border-purple-500 text-sm resize-none"
                    rows={2}
                    placeholder=""
                  />
                </div>

                {/* 機嫌選択（入室前または退勤済み） */}
                {(attendanceStatus === "not_entered" || attendanceStatus === "left") && (
                  <div>
                    <label className="block text-sm text-slate-600 mb-2">今日の調子を教えてください</label>
                    <div className="flex gap-2 justify-center">
                      {(Object.keys(moodConfig) as MoodType[]).map((mood) => {
                        const config = moodConfig[mood];
                        return (
                          <button
                            key={mood}
                            onClick={() => setSelectedMood(mood)}
                            className={`flex flex-col items-center gap-1 px-4 py-2 rounded border-2 transition-all ${
                              selectedMood === mood
                                ? config.color + " border-current"
                                : "bg-white border-slate-200 hover:border-slate-300"
                            }`}
                          >
                            <span className="text-2xl">{config.icon}</span>
                            <span className="text-xs">{config.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 入室/退室ボタン */}
                <button
                  onClick={handlePush}
                  disabled={(!selectedMood && (attendanceStatus === "not_entered" || attendanceStatus === "left")) || isSubmitting}
                  className={`w-full py-4 rounded font-bold text-white text-lg tracking-widest transition-all ${
                    (selectedMood || attendanceStatus === "working") && !isSubmitting
                      ? "bg-purple-600 hover:bg-purple-700"
                      : "bg-slate-300 cursor-not-allowed"
                  }`}
                >
                  {isSubmitting ? "処理中..." : attendanceStatus === "working" ? "退室" : "入室"}
                </button>

                {/* モード切り替え */}
                <div className="flex items-center justify-center gap-4 text-sm">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="workMode"
                      checked={workMode === "normal"}
                      onChange={() => setWorkMode("normal")}
                      className="text-purple-500"
                    />
                    <span className="text-slate-600">通常モード</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="workMode"
                      checked={workMode === "night"}
                      onChange={() => setWorkMode("night")}
                      className="text-purple-500"
                    />
                    <span className="text-slate-600">夜勤モード</span>
                  </label>
                </div>
              </div>
            </div>

            {/* 下部情報エリア */}
            <div className="border-t border-slate-200 grid grid-cols-2">
              {/* 確認事項 */}
              <div className="p-4 border-r border-slate-200">
                <h3 className="text-sm font-medium text-slate-700 mb-3">以下の項目の確認をお願いいたします。</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">打刻漏れ・打刻間違い</span>
                    <span className="text-slate-400">0件</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">打刻エラー</span>
                    <span className="text-slate-400">0件</span>
                  </div>
                </div>
              </div>

              {/* 管理者からのお知らせ */}
              <div className="p-4">
                <h3 className="text-sm font-medium text-slate-700 mb-3">管理者からのお知らせ</h3>
                <p className="text-sm text-slate-400">管理者からのお知らせはありません。</p>
              </div>
            </div>
          </div>
        </div>

      {/* グリーティングメッセージ */}
      {showGreeting && selectedMood && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md mx-4 text-center animate-bounce-in shadow-2xl">
            <div className="text-6xl mb-4">{moodConfig[selectedMood].icon}</div>
            <p className="text-lg text-slate-700 leading-relaxed">
              {moodConfig[selectedMood].message}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
