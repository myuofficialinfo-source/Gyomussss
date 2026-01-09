"use client";

import { useState } from "react";
import type { Project, LinkedChat, ProjectMember, ProjectPermission } from "./Sidebar";

// ダミーのグループリスト（各グループにメンバー情報を追加）
const availableGroups = [
  {
    id: "g1",
    name: "【ノイズ】PPMD",
    icon: "🎮",
    members: [
      { id: "m1", name: "松村優樹", avatar: "松" },
      { id: "m2", name: "杉山楓", avatar: "杉" },
      { id: "m3", name: "田中太郎", avatar: "田" },
    ],
  },
  {
    id: "g2",
    name: "【ノイズ】勤務報告",
    icon: "📋",
    members: [
      { id: "m4", name: "佐藤花子", avatar: "佐" },
      { id: "m5", name: "山田一郎", avatar: "山" },
    ],
  },
  {
    id: "g3",
    name: "【ベリー】DH_グラフィック",
    icon: "🎨",
    members: [
      { id: "m6", name: "鈴木次郎", avatar: "鈴" },
      { id: "m7", name: "高橋美咲", avatar: "高" },
      { id: "m8", name: "伊藤健太", avatar: "伊" },
    ],
  },
  {
    id: "g4",
    name: "マイチャット",
    icon: "📝",
    members: [],
  },
  {
    id: "g5",
    name: "【ノイズ】Jenkins",
    icon: "🔧",
    members: [
      { id: "m9", name: "渡辺隆", avatar: "渡" },
      { id: "m10", name: "小林真理", avatar: "小" },
    ],
  },
];

// ダミーのDMリスト
const availableDMs = [
  { id: "dm1", name: "田中太郎", avatar: "田", status: "online" as const },
  { id: "dm2", name: "佐藤花子", avatar: "佐", status: "busy" as const },
  { id: "dm3", name: "山田一郎", avatar: "山", status: "offline" as const },
  { id: "dm4", name: "鈴木次郎", avatar: "鈴", status: "online" as const },
];

const roleLabels: Record<ProjectPermission, string> = {
  admin: "管理者",
  member: "メンバー",
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (project: Omit<Project, "id">) => void;
};

export default function CreateNewProjectModal({ isOpen, onClose, onCreate }: Props) {
  const [activeTab, setActiveTab] = useState<"general" | "members">("general");

  // 基本設定
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("📊");
  const [description, setDescription] = useState("");

  // メンバー設定
  const [selectedChats, setSelectedChats] = useState<LinkedChat[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<ProjectMember[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [memberSourceTab, setMemberSourceTab] = useState<"dm" | "group">("dm");
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
  const [openRoleDropdown, setOpenRoleDropdown] = useState<string | null>(null);

  const icons = ["📊", "🎮", "🎬", "🎨", "🚀", "💼", "📱", "🌐", "🔧", "📋", "🎯", "💡", "🏢", "📈", "🛠️", "⚡"];

  const statusColors = {
    online: "bg-green-500",
    busy: "bg-red-500",
    offline: "bg-gray-400",
  };

  if (!isOpen) return null;

  const handleClose = () => {
    setName("");
    setIcon("📊");
    setDescription("");
    setSelectedChats([]);
    setSelectedMembers([]);
    setSearchQuery("");
    setActiveTab("general");
    setExpandedGroups([]);
    setOpenRoleDropdown(null);
    onClose();
  };

  const handleCreate = () => {
    if (!name.trim()) return;
    onCreate({
      name: name.trim(),
      icon,
      description: description.trim(),
      linkedChats: selectedChats,
      projectMembers: selectedMembers,
    });
    handleClose();
  };

  // メンバーが既に追加されているかチェック
  const isMemberInGroup = (memberId: string) => {
    return selectedMembers.some((m) => m.id === memberId);
  };

  // メンバーの権限を取得
  const getMemberRole = (memberId: string): ProjectPermission => {
    const member = selectedMembers.find((m) => m.id === memberId);
    return member?.permission || "member";
  };

  // メンバーを追加/削除
  const handleToggleMember = (
    memberId: string,
    memberName: string,
    memberAvatar: string,
    sourceType: "dm" | "group",
    sourceId: string,
    sourceName: string
  ) => {
    if (isMemberInGroup(memberId)) {
      setSelectedMembers(selectedMembers.filter((m) => m.id !== memberId));
    } else {
      setSelectedMembers([
        ...selectedMembers,
        {
          id: memberId,
          name: memberName,
          avatar: memberAvatar,
          sourceType,
          sourceId,
          sourceName,
          permission: "member",
        },
      ]);
    }
  };

  // 権限を設定
  const handleSetRole = (memberId: string, role: ProjectPermission) => {
    setSelectedMembers(
      selectedMembers.map((m) => (m.id === memberId ? { ...m, permission: role } : m))
    );
    setOpenRoleDropdown(null);
  };

  // グループを展開/閉じる
  const handleToggleGroupExpand = (groupId: string) => {
    if (expandedGroups.includes(groupId)) {
      setExpandedGroups(expandedGroups.filter((id) => id !== groupId));
    } else {
      setExpandedGroups([...expandedGroups, groupId]);
    }
  };

  // グループの全メンバーを選択/解除
  const handleSelectAllGroupMembers = (group: (typeof availableGroups)[0]) => {
    const memberIds = group.members.map((m) => m.id);
    const allSelected = memberIds.every((id) => isMemberInGroup(id));

    if (allSelected) {
      setSelectedMembers(selectedMembers.filter((m) => !memberIds.includes(m.id)));
      setSelectedChats(selectedChats.filter((c) => c.id !== group.id));
    } else {
      const newMembers = group.members
        .filter((gm) => !isMemberInGroup(gm.id))
        .map((gm) => ({
          id: gm.id,
          name: gm.name,
          avatar: gm.avatar,
          sourceType: "group" as const,
          sourceId: group.id,
          sourceName: group.name,
          permission: "member" as ProjectPermission,
        }));
      setSelectedMembers([...selectedMembers, ...newMembers]);
      if (!selectedChats.some((c) => c.id === group.id)) {
        setSelectedChats([
          ...selectedChats,
          {
            id: group.id,
            name: group.name,
            type: "group",
            icon: group.icon,
          },
        ]);
      }
    }
  };

  // メンバーを削除
  const handleRemoveMember = (memberId: string) => {
    setSelectedMembers(selectedMembers.filter((m) => m.id !== memberId));
  };

  const filteredDMs = availableDMs.filter((dm) =>
    dm.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredGroups = availableGroups.filter(
    (group) =>
      group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      group.members.some((m) => m.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-full max-w-3xl overflow-hidden shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-800">新規プロジェクト作成</h2>
          <button onClick={handleClose} className="text-slate-400 hover:text-slate-600 text-xl">
            ×
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200">
          <button
            onClick={() => setActiveTab("general")}
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === "general"
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            基本設定
          </button>
          <button
            onClick={() => setActiveTab("members")}
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === "members"
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            メンバー管理
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {activeTab === "general" && (
            <div className="space-y-4">
              {/* アイコンと名前 */}
              <div className="flex gap-4">
                <div className="relative">
                  <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center text-3xl">
                    {icon}
                  </div>
                </div>
                <div className="flex-1">
                  <label className="flex items-center gap-1 text-sm text-slate-600 mb-1">
                    プロジェクト名：
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="プロジェクト名を入力"
                    className="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* アイコン選択 */}
              <div>
                <label className="text-sm text-slate-600 mb-2 block">アイコン</label>
                <div className="flex flex-wrap gap-2">
                  {icons.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => setIcon(emoji)}
                      className={`w-10 h-10 flex items-center justify-center text-xl rounded-lg transition-colors ${
                        icon === emoji
                          ? "bg-purple-100 ring-2 ring-purple-500"
                          : "hover:bg-slate-100"
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              {/* 概要 */}
              <div>
                <label className="flex items-center gap-1 text-sm text-slate-600 mb-1">
                  概要：
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="プロジェクトの説明やメモを記入できます"
                  rows={4}
                  className="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-sm"
                />
              </div>
            </div>
          )}

          {activeTab === "members" && (
            <div className="space-y-4">
              {/* 現在のメンバー一覧 */}
              <div>
                <h3 className="text-sm font-medium text-slate-700 mb-2">
                  現在のメンバー ({selectedMembers.length}人)
                </h3>
                <div className="border border-slate-200 rounded max-h-40 overflow-y-auto">
                  {selectedMembers.length > 0 ? (
                    selectedMembers.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center gap-3 p-2 hover:bg-slate-50 border-b border-slate-100 last:border-b-0"
                      >
                        <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center text-xs">
                          {member.avatar}
                        </div>
                        <span className="text-sm text-slate-800 flex-1">{member.name}</span>
                        <div className="relative">
                          <button
                            onClick={() =>
                              setOpenRoleDropdown(
                                openRoleDropdown === `current-${member.id}`
                                  ? null
                                  : `current-${member.id}`
                              )
                            }
                            className="px-2 py-1 text-xs border border-slate-300 rounded hover:bg-slate-100 flex items-center gap-1"
                          >
                            {roleLabels[member.permission]}
                            <span className="text-[10px]">▼</span>
                          </button>
                          {openRoleDropdown === `current-${member.id}` && (
                            <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded shadow-lg z-10 min-w-[90px]">
                              <button
                                onClick={() => handleSetRole(member.id, "admin")}
                                className={`block w-full text-left px-3 py-2 text-sm hover:bg-slate-100 whitespace-nowrap ${
                                  member.permission === "admin" ? "bg-blue-50 text-blue-600" : ""
                                }`}
                              >
                                管理者
                              </button>
                              <button
                                onClick={() => handleSetRole(member.id, "member")}
                                className={`block w-full text-left px-3 py-2 text-sm hover:bg-slate-100 whitespace-nowrap ${
                                  member.permission === "member" ? "bg-blue-50 text-blue-600" : ""
                                }`}
                              >
                                メンバー
                              </button>
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => handleRemoveMember(member.id)}
                          className="text-red-500 hover:text-red-700 text-sm"
                          title="削除"
                        >
                          ✕
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-center text-slate-400 text-sm">メンバーがいません</div>
                  )}
                </div>
              </div>

              {/* メンバー追加セクション */}
              <div className="border-t border-slate-200 pt-4">
                <h3 className="text-sm font-medium text-slate-700 mb-2">メンバーを追加</h3>

                {/* DM / グループ タブ */}
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
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={memberSourceTab === "dm" ? "DMから検索" : "グループから検索"}
                    className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>

                {/* メンバーリスト */}
                <div className="border border-slate-200 rounded max-h-56 overflow-y-auto">
                  {memberSourceTab === "dm" ? (
                    filteredDMs.length > 0 ? (
                      filteredDMs.map((dm) => {
                        const memberId = `dm-${dm.id}`;
                        const isSelected = isMemberInGroup(memberId);
                        return (
                          <div
                            key={dm.id}
                            className="flex items-center gap-3 p-2 hover:bg-slate-50 border-b border-slate-100 last:border-b-0"
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() =>
                                handleToggleMember(memberId, dm.name, dm.avatar, "dm", dm.id, dm.name)
                              }
                              className="rounded"
                            />
                            <div className="relative">
                              <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center text-xs">
                                {dm.avatar}
                              </div>
                              <div
                                className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white ${statusColors[dm.status]}`}
                              />
                            </div>
                            <span className="text-sm text-slate-800 flex-1">{dm.name}</span>
                            {isSelected && (
                              <div className="relative">
                                <button
                                  onClick={() =>
                                    setOpenRoleDropdown(openRoleDropdown === memberId ? null : memberId)
                                  }
                                  className="px-2 py-1 text-xs border border-slate-300 rounded hover:bg-slate-100 flex items-center gap-1"
                                >
                                  {roleLabels[getMemberRole(memberId)]}
                                  <span className="text-[10px]">▼</span>
                                </button>
                                {openRoleDropdown === memberId && (
                                  <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded shadow-lg z-10 min-w-[90px]">
                                    <button
                                      onClick={() => handleSetRole(memberId, "admin")}
                                      className={`block w-full text-left px-3 py-2 text-sm hover:bg-slate-100 whitespace-nowrap ${
                                        getMemberRole(memberId) === "admin"
                                          ? "bg-blue-50 text-blue-600"
                                          : ""
                                      }`}
                                    >
                                      管理者
                                    </button>
                                    <button
                                      onClick={() => handleSetRole(memberId, "member")}
                                      className={`block w-full text-left px-3 py-2 text-sm hover:bg-slate-100 whitespace-nowrap ${
                                        getMemberRole(memberId) === "member"
                                          ? "bg-blue-50 text-blue-600"
                                          : ""
                                      }`}
                                    >
                                      メンバー
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <div className="p-4 text-center text-slate-500 text-sm">DMが見つかりません</div>
                    )
                  ) : filteredGroups.length > 0 ? (
                    filteredGroups.map((group) => (
                      <div key={group.id} className="border-b border-slate-100 last:border-b-0">
                        <div className="flex items-center gap-3 p-2 hover:bg-slate-50">
                          <input
                            type="checkbox"
                            checked={
                              group.members.length > 0 &&
                              group.members.every((m) => isMemberInGroup(m.id))
                            }
                            onChange={() => handleSelectAllGroupMembers(group)}
                            className="rounded"
                            disabled={group.members.length === 0}
                          />
                          <button
                            onClick={() => handleToggleGroupExpand(group.id)}
                            className="text-xs text-slate-400"
                            disabled={group.members.length === 0}
                          >
                            {expandedGroups.includes(group.id) ? "▼" : "▶"}
                          </button>
                          <div className="w-8 h-8 bg-green-100 rounded flex items-center justify-center text-sm">
                            {group.icon}
                          </div>
                          <div className="flex-1">
                            <span className="text-sm text-slate-800">{group.name}</span>
                            <span className="text-xs text-slate-500 ml-2">
                              {group.members.length}人
                            </span>
                          </div>
                        </div>
                        {expandedGroups.includes(group.id) && group.members.length > 0 && (
                          <div className="bg-slate-50 pl-10">
                            {group.members.map((member) => {
                              const isSelected = isMemberInGroup(member.id);
                              return (
                                <div
                                  key={member.id}
                                  className="flex items-center gap-3 p-2 border-t border-slate-100"
                                >
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() =>
                                      handleToggleMember(
                                        member.id,
                                        member.name,
                                        member.avatar,
                                        "group",
                                        group.id,
                                        group.name
                                      )
                                    }
                                    className="rounded"
                                  />
                                  <div className="w-7 h-7 bg-slate-200 rounded-full flex items-center justify-center text-xs">
                                    {member.avatar}
                                  </div>
                                  <span className="text-sm text-slate-800 flex-1">{member.name}</span>
                                  {isSelected && (
                                    <div className="relative">
                                      <button
                                        onClick={() =>
                                          setOpenRoleDropdown(
                                            openRoleDropdown === member.id ? null : member.id
                                          )
                                        }
                                        className="px-2 py-1 text-xs border border-slate-300 rounded hover:bg-slate-100 flex items-center gap-1 bg-white"
                                      >
                                        {roleLabels[getMemberRole(member.id)]}
                                        <span className="text-[10px]">▼</span>
                                      </button>
                                      {openRoleDropdown === member.id && (
                                        <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded shadow-lg z-10 min-w-[90px]">
                                          <button
                                            onClick={() => handleSetRole(member.id, "admin")}
                                            className={`block w-full text-left px-3 py-2 text-sm hover:bg-slate-100 whitespace-nowrap ${
                                              getMemberRole(member.id) === "admin"
                                                ? "bg-blue-50 text-blue-600"
                                                : ""
                                            }`}
                                          >
                                            管理者
                                          </button>
                                          <button
                                            onClick={() => handleSetRole(member.id, "member")}
                                            className={`block w-full text-left px-3 py-2 text-sm hover:bg-slate-100 whitespace-nowrap ${
                                              getMemberRole(member.id) === "member"
                                                ? "bg-blue-50 text-blue-600"
                                                : ""
                                            }`}
                                          >
                                            メンバー
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-center text-slate-500 text-sm">
                      グループが見つかりません
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 p-4 border-t border-slate-200 bg-slate-50">
          <button
            onClick={handleClose}
            className="px-6 py-2 text-slate-600 hover:bg-slate-100 rounded transition-colors"
          >
            キャンセル
          </button>
          <button
            onClick={handleCreate}
            disabled={!name.trim()}
            className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            作成
          </button>
        </div>
      </div>
    </div>
  );
}
