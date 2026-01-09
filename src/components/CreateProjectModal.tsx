"use client";

import { useState } from "react";

// ダミーのユーザーデータ（検索用）
const dummyUsers = [
  { id: "u1", name: "大原正（Tadashi Ohara）", company: "DANK HEARTS", avatar: "大" },
  { id: "u2", name: "中原", company: "", avatar: "中" },
  { id: "u3", name: "鵜川耕次（Koji Ugawa）", company: "DANK HEARTS", avatar: "鵜" },
  { id: "u4", name: "横井大幸（Hiroyuki Yokoi）@DH", company: "DANK HEARTS", avatar: "横" },
  { id: "u5", name: "尾崎将之(Masayuki Ozaki) H!P", company: "DANK HEARTS", avatar: "尾" },
  { id: "u6", name: "森岡大遊※", company: "DANK HEARTS", avatar: "森" },
  { id: "u7", name: "田中太郎", company: "株式会社ゲームスタジオ", avatar: "田" },
  { id: "u8", name: "佐藤花子", company: "株式会社ゲームスタジオ", avatar: "佐" },
];

// ダミーのフレンドリスト（既存のDM相手）
const existingFriends = [
  { id: "dm1", name: "田中太郎", avatar: "田", status: "online" as const },
  { id: "dm2", name: "佐藤花子", avatar: "佐", status: "busy" as const },
  { id: "dm3", name: "山田一郎", avatar: "山", status: "offline" as const },
  { id: "dm4", name: "鈴木次郎", avatar: "鈴", status: "online" as const },
];

// ダミーのグループリスト（メンバー情報付き）
const existingGroups = [
  {
    id: "g1",
    name: "【ノイズ】PPMD",
    icon: "🎮",
    members: [
      { id: "gm1", name: "大原正（Tadashi Ohara）", avatar: "大", company: "DANK HEARTS" },
      { id: "gm2", name: "中原", avatar: "中", company: "" },
      { id: "gm3", name: "鵜川耕次（Koji Ugawa）", avatar: "鵜", company: "DANK HEARTS" },
    ]
  },
  {
    id: "g2",
    name: "【ノイズ】勤務報告",
    icon: "📋",
    members: [
      { id: "gm4", name: "横井大幸（Hiroyuki Yokoi）@DH", avatar: "横", company: "DANK HEARTS" },
      { id: "gm5", name: "尾崎将之(Masayuki Ozaki) H!P", avatar: "尾", company: "DANK HEARTS" },
    ]
  },
  {
    id: "g3",
    name: "【ベリー】DH_グラフィック",
    icon: "🎨",
    members: [
      { id: "gm6", name: "森岡大遊※", avatar: "森", company: "DANK HEARTS" },
    ]
  },
];

type MemberRole = "admin" | "member" | "readonly";

type SelectedMember = {
  id: string;
  role: MemberRole;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (project: { name: string; icon: string; type: "dm" | "group"; members?: SelectedMember[] }) => void;
};

export default function CreateProjectModal({ isOpen, onClose, onCreate }: Props) {
  const [activeTab, setActiveTab] = useState<"dm" | "group">("group");

  // DM用のstate
  const [searchQuery, setSearchQuery] = useState("");
  const [pendingRequests, setPendingRequests] = useState<string[]>([]);

  // グループ用のstate
  const [groupName, setGroupName] = useState("");
  const [groupIcon, setGroupIcon] = useState("🎮");
  const [groupDescription, setGroupDescription] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<SelectedMember[]>([]);
  const [memberSearchQuery, setMemberSearchQuery] = useState("");
  const [memberSourceTab, setMemberSourceTab] = useState<"dm" | "group">("dm");
  const [requireApproval, setRequireApproval] = useState(true);
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
  const [openRoleDropdown, setOpenRoleDropdown] = useState<string | null>(null);

  // 招待リンク生成用
  const inviteLink = `https://www.gyomussss.com/g/${Math.random().toString(36).substring(2, 14)}`;

  if (!isOpen) return null;

  const handleClose = () => {
    setActiveTab("group");
    setSearchQuery("");
    setPendingRequests([]);
    setGroupName("");
    setGroupIcon("🎮");
    setGroupDescription("");
    setSelectedMembers([]);
    setMemberSearchQuery("");
    setExpandedGroups([]);
    setOpenRoleDropdown(null);
    onClose();
  };

  const handleSendFriendRequest = (userId: string) => {
    setPendingRequests([...pendingRequests, userId]);
  };

  const handleCreateGroup = () => {
    if (!groupName.trim()) return;
    onCreate({
      name: groupName,
      icon: groupIcon,
      type: "group",
      members: selectedMembers
    });
    handleClose();
  };

  const isSelected = (memberId: string) => {
    return selectedMembers.some(m => m.id === memberId);
  };

  const getMemberRole = (memberId: string): MemberRole => {
    const member = selectedMembers.find(m => m.id === memberId);
    return member?.role || "member";
  };

  const handleToggleMember = (memberId: string) => {
    if (isSelected(memberId)) {
      setSelectedMembers(selectedMembers.filter(m => m.id !== memberId));
    } else {
      setSelectedMembers([...selectedMembers, { id: memberId, role: "member" }]);
    }
  };

  const handleSetRole = (memberId: string, role: MemberRole) => {
    setSelectedMembers(selectedMembers.map(m =>
      m.id === memberId ? { ...m, role } : m
    ));
    setOpenRoleDropdown(null);
  };

  const handleToggleGroupExpand = (groupId: string) => {
    if (expandedGroups.includes(groupId)) {
      setExpandedGroups(expandedGroups.filter(id => id !== groupId));
    } else {
      setExpandedGroups([...expandedGroups, groupId]);
    }
  };

  const handleSelectAllGroupMembers = (_groupId: string, members: { id: string }[]) => {
    const memberIds = members.map(m => m.id);
    const allSelected = memberIds.every(id => isSelected(id));

    if (allSelected) {
      // 全部選択されていたら解除
      setSelectedMembers(selectedMembers.filter(m => !memberIds.includes(m.id)));
    } else {
      // 未選択のメンバーを追加
      const newMembers = memberIds
        .filter(id => !isSelected(id))
        .map(id => ({ id, role: "member" as MemberRole }));
      setSelectedMembers([...selectedMembers, ...newMembers]);
    }
  };

  const handleCopyInviteLink = () => {
    navigator.clipboard.writeText(inviteLink);
  };

  const icons = ["🎮", "🎪", "🎬", "🎨", "🎵", "📱", "💻", "🌐", "🚀", "⚔️", "🏰", "🌲", "📋", "🔧", "📧", "📝"];

  const filteredUsers = dummyUsers.filter(user =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.company.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredFriends = existingFriends.filter(friend =>
    friend.name.toLowerCase().includes(memberSearchQuery.toLowerCase())
  );

  const filteredGroups = existingGroups.filter(group =>
    group.name.toLowerCase().includes(memberSearchQuery.toLowerCase()) ||
    group.members.some(m => m.name.toLowerCase().includes(memberSearchQuery.toLowerCase()))
  );

  const statusColors = {
    online: "bg-green-500",
    busy: "bg-red-500",
    offline: "bg-gray-400",
  };

  const roleLabels = {
    admin: "管理者",
    member: "メンバー",
    readonly: "閲覧のみ",
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-full max-w-3xl overflow-hidden shadow-xl">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-800">
            {activeTab === "dm" ? "フレンドを追加" : "グループチャットを新規作成"}
          </h2>
          <button
            onClick={handleClose}
            className="text-slate-400 hover:text-slate-600 text-xl"
          >
            ×
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200">
          <button
            onClick={() => setActiveTab("dm")}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === "dm"
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            DM
          </button>
          <button
            onClick={() => setActiveTab("group")}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === "group"
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            グループ
          </button>
        </div>

        {/* Content */}
        <div>
          {activeTab === "dm" ? (
            /* DM - フレンド追加UI */
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm text-slate-600 mb-2">
                  ユーザーを検索（名前、Gyomussss ID）
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="ユーザー名またはIDで検索"
                    className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* 検索結果 */}
              <div className="space-y-2">
                {searchQuery && filteredUsers.length > 0 ? (
                  filteredUsers.map(user => (
                    <div
                      key={user.id}
                      className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg"
                    >
                      <div className="w-10 h-10 bg-slate-300 rounded-full flex items-center justify-center text-sm font-medium">
                        {user.avatar}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-800">{user.name}</p>
                        {user.company && (
                          <p className="text-xs text-slate-500">{user.company}</p>
                        )}
                      </div>
                      {pendingRequests.includes(user.id) ? (
                        <span className="text-xs text-slate-500 px-3 py-1 bg-slate-200 rounded">
                          申請済み
                        </span>
                      ) : (
                        <button
                          onClick={() => handleSendFriendRequest(user.id)}
                          className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                        >
                          フレンド申請
                        </button>
                      )}
                    </div>
                  ))
                ) : searchQuery ? (
                  <p className="text-center text-slate-500 py-4">
                    ユーザーが見つかりません
                  </p>
                ) : (
                  <div className="text-center py-8 text-slate-500">
                    <p className="text-sm">ユーザー名またはIDを入力して検索してください</p>
                  </div>
                )}
              </div>

              {/* フレンド申請受信中 */}
              <div className="border-t border-slate-200 pt-4">
                <h3 className="text-sm font-medium text-slate-700 mb-2">
                  フレンド申請（受信中）
                </h3>
                <p className="text-xs text-slate-500">
                  現在、保留中のフレンド申請はありません
                </p>
              </div>
            </div>
          ) : (
            /* グループ作成UI */
            <div className="p-4 space-y-4">
              {/* アイコンと名前 */}
              <div className="flex gap-4">
                <div className="relative">
                  <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center text-3xl">
                    {groupIcon}
                  </div>
                  <button
                    onClick={() => {
                      const currentIndex = icons.indexOf(groupIcon);
                      const nextIndex = (currentIndex + 1) % icons.length;
                      setGroupIcon(icons[nextIndex]);
                    }}
                    className="absolute bottom-0 right-0 bg-blue-600 text-white text-xs px-2 py-1 rounded hover:bg-blue-700"
                  >
                    変更
                  </button>
                </div>
                <div className="flex-1">
                  <label className="flex items-center gap-1 text-sm text-slate-600 mb-1">
                    チャット名：<span className="text-slate-400 text-xs">ⓘ</span>
                  </label>
                  <input
                    type="text"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* 概要 */}
              <div>
                <label className="flex items-center gap-1 text-sm text-slate-600 mb-1">
                  概要：<span className="text-slate-400 text-xs">ⓘ</span>
                </label>
                <textarea
                  value={groupDescription}
                  onChange={(e) => setGroupDescription(e.target.value)}
                  placeholder="このチャットの説明やメモ、関連するリンクなどを記入することができます"
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-sm"
                />
              </div>

              {/* DM / グループ からメンバー選択 */}
              <div className="border-t border-slate-200 pt-4">
                <div className="flex gap-4 mb-3">
                  <button
                    onClick={() => setMemberSourceTab("dm")}
                    className={`text-sm pb-1 ${
                      memberSourceTab === "dm"
                        ? "font-medium text-slate-800 border-b-2 border-slate-800"
                        : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    DM
                  </button>
                  <button
                    onClick={() => setMemberSourceTab("group")}
                    className={`text-sm pb-1 ${
                      memberSourceTab === "group"
                        ? "font-medium text-slate-800 border-b-2 border-slate-800"
                        : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    グループ
                  </button>
                </div>

                {/* 検索 */}
                <div className="relative mb-3">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
                  <input
                    type="text"
                    value={memberSearchQuery}
                    onChange={(e) => setMemberSearchQuery(e.target.value)}
                    placeholder={memberSourceTab === "dm" ? "DMから検索" : "グループから検索"}
                    className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>

                {/* メンバーリスト */}
                <div className="border border-slate-200 rounded max-h-56 overflow-y-auto">
                  {memberSourceTab === "dm" ? (
                    /* DMリスト */
                    filteredFriends.length > 0 ? (
                      filteredFriends.map(friend => (
                        <div
                          key={friend.id}
                          className="flex items-center gap-3 p-2 hover:bg-slate-50 border-b border-slate-100 last:border-b-0"
                        >
                          <input
                            type="checkbox"
                            checked={isSelected(friend.id)}
                            onChange={() => handleToggleMember(friend.id)}
                            className="rounded"
                          />
                          <div className="relative">
                            <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center text-xs">
                              {friend.avatar}
                            </div>
                            <div className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white ${statusColors[friend.status]}`} />
                          </div>
                          <span className="text-sm text-slate-800 flex-1">{friend.name}</span>
                          {isSelected(friend.id) && (
                            <div className="relative">
                              <button
                                onClick={() => setOpenRoleDropdown(openRoleDropdown === friend.id ? null : friend.id)}
                                className="px-2 py-1 text-xs border border-slate-300 rounded hover:bg-slate-100 flex items-center gap-1"
                              >
                                {roleLabels[getMemberRole(friend.id)]}
                                <span className="text-[10px]">▼</span>
                              </button>
                              {openRoleDropdown === friend.id && (
                                <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded shadow-lg z-10 min-w-[90px]">
                                  <button
                                    onClick={() => handleSetRole(friend.id, "admin")}
                                    className={`block w-full text-left px-3 py-2 text-sm hover:bg-slate-100 whitespace-nowrap ${getMemberRole(friend.id) === "admin" ? "bg-blue-50 text-blue-600" : ""}`}
                                  >
                                    管理者
                                  </button>
                                  <button
                                    onClick={() => handleSetRole(friend.id, "member")}
                                    className={`block w-full text-left px-3 py-2 text-sm hover:bg-slate-100 whitespace-nowrap ${getMemberRole(friend.id) === "member" ? "bg-blue-50 text-blue-600" : ""}`}
                                  >
                                    メンバー
                                  </button>
                                  <button
                                    onClick={() => handleSetRole(friend.id, "readonly")}
                                    className={`block w-full text-left px-3 py-2 text-sm hover:bg-slate-100 whitespace-nowrap ${getMemberRole(friend.id) === "readonly" ? "bg-blue-50 text-blue-600" : ""}`}
                                  >
                                    閲覧のみ
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="p-4 text-center text-slate-500 text-sm">
                        DMが見つかりません
                      </div>
                    )
                  ) : (
                    /* グループリスト（展開可能） */
                    filteredGroups.length > 0 ? (
                      filteredGroups.map(group => (
                        <div key={group.id} className="border-b border-slate-100 last:border-b-0">
                          {/* グループヘッダー */}
                          <div className="flex items-center gap-3 p-2 hover:bg-slate-50">
                            <input
                              type="checkbox"
                              checked={group.members.every(m => isSelected(m.id))}
                              onChange={() => handleSelectAllGroupMembers(group.id, group.members)}
                              className="rounded"
                            />
                            <button
                              onClick={() => handleToggleGroupExpand(group.id)}
                              className="text-xs text-slate-400"
                            >
                              {expandedGroups.includes(group.id) ? "▼" : "▶"}
                            </button>
                            <div className="w-8 h-8 bg-green-100 rounded flex items-center justify-center text-sm">
                              {group.icon}
                            </div>
                            <div className="flex-1">
                              <span className="text-sm text-slate-800">{group.name}</span>
                              <span className="text-xs text-slate-500 ml-2">{group.members.length}人</span>
                            </div>
                          </div>
                          {/* グループメンバー（展開時） */}
                          {expandedGroups.includes(group.id) && (
                            <div className="bg-slate-50 pl-10">
                              {group.members.map(member => (
                                <div
                                  key={member.id}
                                  className="flex items-center gap-3 p-2 border-t border-slate-100"
                                >
                                  <input
                                    type="checkbox"
                                    checked={isSelected(member.id)}
                                    onChange={() => handleToggleMember(member.id)}
                                    className="rounded"
                                  />
                                  <div className="w-7 h-7 bg-slate-200 rounded-full flex items-center justify-center text-xs">
                                    {member.avatar}
                                  </div>
                                  <div className="flex-1">
                                    <span className="text-sm text-slate-800">{member.name}</span>
                                    {member.company && (
                                      <span className="text-xs text-slate-500 ml-2">{member.company}</span>
                                    )}
                                  </div>
                                  {isSelected(member.id) && (
                                    <div className="relative">
                                      <button
                                        onClick={() => setOpenRoleDropdown(openRoleDropdown === member.id ? null : member.id)}
                                        className="px-2 py-1 text-xs border border-slate-300 rounded hover:bg-slate-100 flex items-center gap-1 bg-white"
                                      >
                                        {roleLabels[getMemberRole(member.id)]}
                                        <span className="text-[10px]">▼</span>
                                      </button>
                                      {openRoleDropdown === member.id && (
                                        <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded shadow-lg z-10 min-w-[90px]">
                                          <button
                                            onClick={() => handleSetRole(member.id, "admin")}
                                            className={`block w-full text-left px-3 py-2 text-sm hover:bg-slate-100 whitespace-nowrap ${getMemberRole(member.id) === "admin" ? "bg-blue-50 text-blue-600" : ""}`}
                                          >
                                            管理者
                                          </button>
                                          <button
                                            onClick={() => handleSetRole(member.id, "member")}
                                            className={`block w-full text-left px-3 py-2 text-sm hover:bg-slate-100 whitespace-nowrap ${getMemberRole(member.id) === "member" ? "bg-blue-50 text-blue-600" : ""}`}
                                          >
                                            メンバー
                                          </button>
                                          <button
                                            onClick={() => handleSetRole(member.id, "readonly")}
                                            className={`block w-full text-left px-3 py-2 text-sm hover:bg-slate-100 whitespace-nowrap ${getMemberRole(member.id) === "readonly" ? "bg-blue-50 text-blue-600" : ""}`}
                                          >
                                            閲覧のみ
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="p-4 text-center text-slate-500 text-sm">
                        グループが見つかりません
                      </div>
                    )
                  )}
                </div>
              </div>

              {/* 招待リンク */}
              <div className="border-t border-slate-200 pt-4">
                <label className="flex items-center gap-2 mb-2">
                  <input
                    type="checkbox"
                    defaultChecked
                    className="rounded"
                  />
                  <span className="text-sm text-slate-600">招待リンク</span>
                  <span className="text-slate-400 text-xs">❓</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={inviteLink}
                    className="flex-1 px-3 py-2 border border-slate-300 rounded bg-slate-50 text-sm text-slate-600"
                  />
                  <button
                    onClick={handleCopyInviteLink}
                    className="px-4 py-2 border border-slate-300 rounded hover:bg-slate-50 text-sm"
                  >
                    リンクをコピー
                  </button>
                </div>
                <label className="flex items-center gap-2 mt-2">
                  <input
                    type="checkbox"
                    checked={requireApproval}
                    onChange={(e) => setRequireApproval(e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm text-slate-600">参加には管理者の承認が必要</span>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 p-4 border-t border-slate-200 bg-slate-50">
          {activeTab === "group" && (
            <>
              <button
                onClick={handleClose}
                className="px-6 py-2 text-slate-600 hover:bg-slate-100 rounded transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={handleCreateGroup}
                disabled={!groupName.trim()}
                className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                作成する
              </button>
            </>
          )}
          {activeTab === "dm" && (
            <button
              onClick={handleClose}
              className="px-6 py-2 text-slate-600 hover:bg-slate-100 rounded transition-colors"
            >
              閉じる
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
