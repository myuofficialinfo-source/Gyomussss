"use client";

import { useState } from "react";
import AccountSettingsModal from "./AccountSettingsModal";

// 機嫌（ムード）の型
export type MoodType = "good" | "normal" | "tired";

// ログインユーザーの型
export type User = {
  id: string;
  name: string;
  email: string;
  avatar: string;
  provider: "google" | "twitter" | "discord" | "email";
  mood?: MoodType;
  lastMoodUpdate?: string; // ISO日付文字列
};

// 勤怠ステータスの型
export type AttendanceStatus = "not_entered" | "working" | "left";

// 勤怠記録の型
export type AttendanceRecord = {
  date: string; // YYYY-MM-DD
  enterTime?: string; // HH:mm
  leaveTime?: string; // HH:mm
  projectId?: string;
  mood?: MoodType;
  memo?: string;
};


type ToMeMessage = {
  id: string;
  chatId: string;
  chatName: string;
  chatType: "dm" | "group";
  senderName: string;
  senderAvatar: string;
  preview: string;
  timestamp: string;
};

export type BookmarkedMessage = {
  id: string;
  chatId: string;
  chatName: string;
  chatType: "dm" | "group";
  senderName: string;
  senderAvatar: string;
  preview: string;
  timestamp: string;
};

export type LinkedChat = {
  id: string;
  name: string;
  type: "dm" | "group";
  icon?: string;
  avatar?: string;
};

// ゲームタグの型
export type GameTag =
  | "indie"      // インディーゲーム
  | "action"     // アクション
  | "rpg"        // RPG
  | "puzzle"     // パズル
  | "social"     // ソーシャルゲーム
  | "console"    // コンシューマーゲーム
  | "free"       // フリーゲーム
  | "mobile"     // モバイルゲーム
  | "vr"         // VRゲーム
  | "simulation" // シミュレーション
  | "adventure"  // アドベンチャー
  | "horror";    // ホラー

// リリースプラットフォームの型
export type Platform =
  | "steam"
  | "switch"
  | "ps5"
  | "ps4"
  | "xbox"
  | "pc"
  | "windows"
  | "mac"
  | "linux"
  | "ios"
  | "android"
  | "web";

// 役職の型（階層構造）
export type RoleType =
  | "producer"       // プロデューサー
  | "director"       // ディレクター
  | "lead_engineer"  // リードエンジニア
  | "lead_designer"  // リードデザイナー
  | "lead_planner"   // リードプランナー
  | "engineer"       // エンジニア
  | "designer"       // デザイナー
  | "planner"        // プランナー
  | "qa"             // QA
  | "other";         // その他

// プロジェクトメンバー（個人）の型
// プロジェクトメンバーの権限
export type ProjectPermission = "admin" | "member";

export type ProjectMember = {
  id: string;          // 一意のID
  name: string;        // メンバー名
  avatar?: string;     // アバター（1文字）
  sourceType: "dm" | "group"; // DMから追加かグループから追加か
  sourceId: string;    // 元のDMまたはグループのID
  sourceName: string;  // 元のDMまたはグループ名
  permission: ProjectPermission; // 権限（admin: 管理者, member: メンバー）
};

// メンバーの役職情報
export type MemberRole = {
  memberId: string;    // ProjectMemberのidと対応
  memberName: string;  // 表示名
  roles: RoleType[];   // 複数役職可能
};

// ゲーム設定の型
export type GameSettings = {
  title: string;
  description: string;
  platforms: Platform[];
  playTime: string;       // "10-20時間" などの文字列
  genre: string;          // メインジャンル
  releaseDate: string;    // YYYY-MM-DD形式
  tags: GameTag[];
  memberRoles?: MemberRole[]; // メンバーの役職情報
};

// ゲームイベントの型
export type GameEvent = {
  id: string;
  name: string;
  startDate: string;      // YYYY-MM-DD形式
  endDate: string;        // YYYY-MM-DD形式
  location: string;       // 開催地
  url?: string;           // 公式サイト
  tags: GameTag[];        // 対象タグ
  type: "exhibition" | "conference" | "market" | "online"; // イベント種別
  description?: string;
};

export type Project = {
  id: string;
  name: string;
  icon: string;
  description: string;
  creatorId?: string;  // プロジェクト作成者のID（自動的に管理者になる）
  linkedChats?: LinkedChat[];
  projectMembers?: ProjectMember[];  // プロジェクトに参加している個人メンバー
  gameSettings?: GameSettings;
};

// データ（実際のデータはサーバーから取得）
const dummyToMeMessages: ToMeMessage[] = [];

// 初期ブックマークデータ（エクスポート用）
export const initialBookmarkedMessages: BookmarkedMessage[] = [];

// 機嫌アイコンの設定
const moodIcons: Record<MoodType, string> = {
  good: "😊",
  normal: "😐",
  tired: "😴",
};

// DMチャットの型
type DMChatItem = {
  id: string;
  type: "dm";
  name: string;
  otherUser: {
    id: string;
    name: string;
    avatar: string;
    status: string;
  };
};

// グループチャットの型
type GroupChatItem = {
  id: string;
  type: "group";
  name: string;
  icon: string;
  members: unknown[];
};

type Props = {
  onSelectChat: (type: "dm" | "group", id: string, name: string, messageId?: string) => void;
  selectedChat: { type: "dm" | "group"; id: string } | null;
  onCreateProject: () => void;
  bookmarkedMessages: BookmarkedMessage[];
  // プロジェクト関連
  projects: Project[];
  selectedProject: Project | null;
  onSelectProject: (project: Project) => void;
  onCreateNewProject: () => void;
  // 認証関連
  currentUser?: User;
  onLogout?: () => void;
  onOpenAttendance?: () => void;
  onUpdateUser?: (user: User) => void;
  // チャット一覧
  dmChats?: DMChatItem[];
  groupChats?: GroupChatItem[];
  onRefreshChats?: () => void;
};

export default function Sidebar({ onSelectChat, selectedChat, onCreateProject, bookmarkedMessages, projects, selectedProject, onSelectProject, onCreateNewProject, currentUser, onLogout, onOpenAttendance, onUpdateUser, dmChats = [], groupChats = [] }: Props) {
  const [activeTab, setActiveTab] = useState<"dm" | "group">("group");
  const [activeSubTab, setActiveSubTab] = useState<"message" | "tome" | "bookmark">("message");
  const [isChatExpanded, setIsChatExpanded] = useState(true);
  const [isProjectExpanded, setIsProjectExpanded] = useState(true);
  const [isAccountSettingsOpen, setIsAccountSettingsOpen] = useState(false);

  // ピン留め状態（初期値: g1とdm1をピン留め）
  const [pinnedDMs, setPinnedDMs] = useState<string[]>(["dm1"]);
  const [pinnedGroups, setPinnedGroups] = useState<string[]>(["g1", "g4"]);

  // 右クリックメニュー用
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    type: "dm" | "group";
    id: string;
  } | null>(null);

  // ピン留めトグル
  const handleTogglePin = (type: "dm" | "group", id: string) => {
    if (type === "dm") {
      if (pinnedDMs.includes(id)) {
        setPinnedDMs(pinnedDMs.filter(pid => pid !== id));
      } else {
        setPinnedDMs([...pinnedDMs, id]);
      }
    } else {
      if (pinnedGroups.includes(id)) {
        setPinnedGroups(pinnedGroups.filter(pid => pid !== id));
      } else {
        setPinnedGroups([...pinnedGroups, id]);
      }
    }
    setContextMenu(null);
  };

  // 右クリックメニュー表示
  const handleContextMenu = (e: React.MouseEvent, type: "dm" | "group", id: string) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      type,
      id,
    });
  };

  // メニュー外クリックで閉じる
  const handleCloseContextMenu = () => {
    setContextMenu(null);
  };

  // DMリストをソート（ピン留め優先）
  const sortedDmChats = [...dmChats].sort((a, b) => {
    const aPinned = pinnedDMs.includes(a.id);
    const bPinned = pinnedDMs.includes(b.id);
    if (aPinned && !bPinned) return -1;
    if (!aPinned && bPinned) return 1;
    return 0;
  });

  // グループリストをソート（ピン留め優先）
  const sortedGroupChats = [...groupChats].sort((a, b) => {
    const aPinned = pinnedGroups.includes(a.id);
    const bPinned = pinnedGroups.includes(b.id);
    if (aPinned && !bPinned) return -1;
    if (!aPinned && bPinned) return 1;
    return 0;
  });

  return (
    <aside className="w-64 bg-slate-900 text-white h-screen fixed left-0 top-0 flex flex-col" onClick={handleCloseContextMenu}>
      {/* Logo */}
      <div className="h-14 flex items-center px-4 border-b border-slate-700 shrink-0">
        <h1 className="text-lg font-bold text-purple-400">Gyomussss!</h1>
      </div>

      {/* チャット見出し */}
      <div className="flex items-center justify-between px-4 py-2 shrink-0">
        <span className="text-sm text-slate-300">チャット</span>
        <div className="flex items-center gap-2">
          <button
            onClick={onCreateProject}
            className="text-slate-400 hover:text-white text-lg leading-none"
            title="新規作成"
          >
            +
          </button>
          <button
            onClick={() => setIsChatExpanded(!isChatExpanded)}
            className="text-slate-400 hover:text-white text-xs leading-none"
            title={isChatExpanded ? "折りたたむ" : "展開する"}
          >
            {isChatExpanded ? "▼" : "▶"}
          </button>
        </div>
      </div>

      {isChatExpanded && (
        <>
          {/* DM / グループ タブ */}
          <div className="px-3 pb-2 shrink-0">
            <div className="flex bg-slate-800 rounded-lg p-0.5">
              <button
                onClick={() => setActiveTab("dm")}
                className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  activeTab === "dm"
                    ? "bg-slate-700 text-white"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                DM
              </button>
              <button
                onClick={() => setActiveTab("group")}
                className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  activeTab === "group"
                    ? "bg-slate-700 text-white"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                グループ
              </button>
            </div>
          </div>

          {/* チャット / 自分宛て / ブックマーク タブ */}
          <div className="flex shrink-0 border-b border-slate-700">
            <button
              onClick={() => setActiveSubTab("message")}
              className={`flex-1 py-2 flex flex-col items-center justify-center gap-0.5 transition-colors ${
                activeSubTab === "message"
                  ? "text-blue-400 border-b-2 border-blue-400"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <span className="text-base">💬</span>
              <span className="text-[10px]">メッセージ</span>
            </button>
            <button
              onClick={() => setActiveSubTab("tome")}
              className={`flex-1 py-2 flex flex-col items-center justify-center gap-0.5 transition-colors relative ${
                activeSubTab === "tome"
                  ? "text-blue-400 border-b-2 border-blue-400"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <span className="text-base">📩</span>
              <span className="text-[10px]">自分宛て</span>
              {dummyToMeMessages.length > 0 && (
                <span className="absolute top-1 right-3 bg-red-500 text-white text-[10px] px-1 py-0.5 rounded-full min-w-[16px] text-center">
                  {dummyToMeMessages.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveSubTab("bookmark")}
              className={`flex-1 py-2 flex flex-col items-center justify-center gap-0.5 transition-colors ${
                activeSubTab === "bookmark"
                  ? "text-blue-400 border-b-2 border-blue-400"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <span className="text-base">🔖</span>
              <span className="text-[10px]">ブックマーク</span>
            </button>
          </div>

          {/* コンテンツエリア */}
          <div className="flex-1 overflow-y-auto p-3">
        {activeSubTab === "message" ? (
          /* メッセージ（チャットリスト） */
          activeTab === "dm" ? (
            /* DM List */
            <div className="space-y-1">
              {sortedDmChats.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <p className="text-sm">DMがありません</p>
                  <p className="text-xs mt-1">フレンドを追加するとここに表示されます</p>
                </div>
              ) : (
                sortedDmChats.map((dm) => {
                  const isPinned = pinnedDMs.includes(dm.id);
                  const statusColor = dm.otherUser.status === "online" ? "bg-green-500" : dm.otherUser.status === "busy" ? "bg-red-500" : "bg-gray-400";
                  return (
                    <button
                      key={dm.id}
                      onClick={() => onSelectChat("dm", dm.id, dm.name)}
                      onContextMenu={(e) => handleContextMenu(e, "dm", dm.id)}
                      className={`w-full flex items-center gap-3 px-2 py-2 rounded-md transition-colors ${
                        selectedChat?.type === "dm" && selectedChat.id === dm.id
                          ? "bg-slate-700"
                          : "hover:bg-slate-800"
                      }`}
                    >
                      <div className="relative">
                        <div className="w-9 h-9 bg-slate-600 rounded flex items-center justify-center text-sm">
                          {dm.otherUser.avatar}
                        </div>
                        <div
                          className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-slate-900 ${statusColor}`}
                        />
                      </div>
                      <div className="flex-1 min-w-0 text-left">
                        <div className="flex items-center gap-1">
                          {isPinned && <span className="text-[10px] text-yellow-400">📌</span>}
                          <span className="text-sm text-slate-200 block truncate">{dm.name}</span>
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          ) : (
            /* Group List */
            <div className="space-y-1">
              {sortedGroupChats.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <p className="text-sm">グループがありません</p>
                  <p className="text-xs mt-1">グループを作成するとここに表示されます</p>
                </div>
              ) : (
                sortedGroupChats.map((group) => {
                  const isPinned = pinnedGroups.includes(group.id);
                  return (
                    <button
                      key={group.id}
                      onClick={() => onSelectChat("group", group.id, group.name)}
                      onContextMenu={(e) => handleContextMenu(e, "group", group.id)}
                      className={`w-full flex items-center gap-3 px-2 py-2 rounded-md transition-colors ${
                        selectedChat?.type === "group" && selectedChat.id === group.id
                          ? "bg-slate-700"
                          : "hover:bg-slate-800"
                      }`}
                    >
                      <div className="w-9 h-9 bg-green-700 rounded flex items-center justify-center text-lg">
                        {group.icon}
                      </div>
                      <div className="flex-1 min-w-0 text-left">
                        <div className="flex items-center gap-1">
                          {isPinned && <span className="text-[10px] text-yellow-400">📌</span>}
                          <span className="text-sm text-slate-200 block truncate">{group.name}</span>
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          )
        ) : activeSubTab === "tome" ? (
          /* 自分宛て（activeTabでフィルタリング） */
          (() => {
            const filteredToMe = dummyToMeMessages.filter((msg) => msg.chatType === activeTab);
            return (
              <div className="space-y-2">
                {filteredToMe.length > 0 ? (
                  filteredToMe.map((msg) => (
                    <button
                      key={msg.id}
                      onClick={() => onSelectChat(msg.chatType, msg.chatId, msg.chatName, msg.id)}
                      className="w-full text-left p-3 bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-6 h-6 bg-slate-600 rounded flex items-center justify-center text-xs">
                          {msg.senderAvatar}
                        </div>
                        <span className="text-sm font-medium text-slate-200">{msg.senderName}</span>
                        <span className="text-xs text-slate-500 ml-auto">{msg.timestamp}</span>
                      </div>
                      <div className="flex items-center gap-1 mb-1">
                        <span className="text-[10px] bg-green-600 text-white px-1.5 py-0.5 rounded">TO</span>
                        <span className="text-xs text-slate-400">{msg.chatName}</span>
                      </div>
                      <p className="text-xs text-slate-300 truncate">{msg.preview}</p>
                    </button>
                  ))
                ) : (
                  <div className="text-center py-8 text-slate-500 text-sm">
                    {activeTab === "dm" ? "DMの" : "グループの"}自分宛てメッセージはありません
                  </div>
                )}
              </div>
            );
          })()
        ) : (
          /* ブックマーク（activeTabでフィルタリング） */
          (() => {
            const filteredBookmarks = bookmarkedMessages.filter((msg) => msg.chatType === activeTab);
            return (
              <div className="space-y-2">
                {filteredBookmarks.length > 0 ? (
                  filteredBookmarks.map((msg) => (
                    <button
                      key={msg.id}
                      onClick={() => onSelectChat(msg.chatType, msg.chatId, msg.chatName, msg.id)}
                      className="w-full text-left p-3 bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-6 h-6 bg-slate-600 rounded flex items-center justify-center text-xs">
                          {msg.senderAvatar}
                        </div>
                        <span className="text-sm font-medium text-slate-200">{msg.senderName}</span>
                        <span className="text-xs text-slate-500 ml-auto">{msg.timestamp}</span>
                      </div>
                      <div className="text-xs text-slate-400 mb-1">{msg.chatName}</div>
                      <p className="text-xs text-slate-300 truncate">{msg.preview}</p>
                    </button>
                  ))
                ) : (
                  <div className="text-center py-8 text-slate-500 text-sm">
                    {activeTab === "dm" ? "DMの" : "グループの"}ブックマークはありません
                  </div>
                )}
              </div>
            );
          })()
        )}
          </div>
        </>
      )}

      {/* プロジェクト見出し */}
      <div className="flex items-center justify-between px-4 py-2 shrink-0 border-t border-slate-700">
        <span className="text-sm text-slate-300">プロジェクト</span>
        <div className="flex items-center gap-2">
          <button
            onClick={onCreateNewProject}
            className="text-slate-400 hover:text-white text-lg leading-none"
            title="新規プロジェクト作成"
          >
            +
          </button>
          <button
            onClick={() => setIsProjectExpanded(!isProjectExpanded)}
            className="text-slate-400 hover:text-white text-xs leading-none"
            title={isProjectExpanded ? "折りたたむ" : "展開する"}
          >
            {isProjectExpanded ? "▼" : "▶"}
          </button>
        </div>
      </div>

      {isProjectExpanded && (
        <div className="px-3 pb-3 overflow-y-auto max-h-40">
          {projects.length > 0 ? (
            <div className="space-y-1">
              {projects.map((project) => (
                <button
                  key={project.id}
                  onClick={() => onSelectProject(project)}
                  className={`w-full flex items-center gap-3 px-2 py-2 rounded-md transition-colors ${
                    selectedProject?.id === project.id
                      ? "bg-purple-700"
                      : "hover:bg-slate-800"
                  }`}
                >
                  <div className="w-9 h-9 bg-purple-900 rounded flex items-center justify-center text-lg">
                    {project.icon}
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <span className="text-sm text-slate-200 block truncate">{project.name}</span>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 text-slate-500 text-xs">
              プロジェクトがありません
            </div>
          )}
        </div>
      )}

      {/* スペーサー */}
      {!isChatExpanded && !isProjectExpanded && <div className="flex-1" />}

      {/* User Section */}
      <div className="p-3 border-t border-slate-700 shrink-0 mt-auto">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-9 h-9 bg-purple-600 rounded flex items-center justify-center text-sm font-medium">
              {currentUser?.avatar || "U"}
            </div>
            {/* 機嫌マーク */}
            {currentUser?.mood && (
              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-slate-800 rounded-full flex items-center justify-center text-xs border border-slate-600">
                {moodIcons[currentUser.mood]}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{currentUser?.name || "ユーザー名"}</p>
            <p className="text-xs text-slate-400">
              {currentUser?.mood ? (
                currentUser.mood === "good" ? "元気" : currentUser.mood === "normal" ? "普通" : "疲れ気味"
              ) : "オンライン"}
            </p>
          </div>
          {/* 設定メニュー */}
          <div className="flex items-center gap-1">
            {onOpenAttendance && (
              <button
                onClick={onOpenAttendance}
                className="text-slate-400 hover:text-white p-1"
                title="勤怠"
              >
                🕐
              </button>
            )}
            <button
              onClick={() => setIsAccountSettingsOpen(true)}
              className="text-slate-400 hover:text-white p-1"
              title="設定"
            >
              ⚙️
            </button>
          </div>
        </div>
      </div>

      {/* アカウント設定モーダル */}
      {isAccountSettingsOpen && currentUser && (
        <AccountSettingsModal
          isOpen={isAccountSettingsOpen}
          onClose={() => setIsAccountSettingsOpen(false)}
          user={currentUser}
          onLogout={() => {
            setIsAccountSettingsOpen(false);
            onLogout?.();
          }}
          onUpdateUser={(user) => onUpdateUser?.(user)}
        />
      )}

      {/* 右クリックコンテキストメニュー */}
      {contextMenu && (
        <div
          className="fixed bg-slate-800 border border-slate-600 rounded-lg shadow-xl py-1 z-50"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => handleTogglePin(contextMenu.type, contextMenu.id)}
            className="w-full px-4 py-2 text-left text-sm text-slate-200 hover:bg-slate-700 flex items-center gap-2"
          >
            {(contextMenu.type === "dm" ? pinnedDMs : pinnedGroups).includes(contextMenu.id) ? (
              <>
                <span>📌</span>
                <span>ピン留めを解除</span>
              </>
            ) : (
              <>
                <span>📌</span>
                <span>ピン留め</span>
              </>
            )}
          </button>
        </div>
      )}
    </aside>
  );
}
