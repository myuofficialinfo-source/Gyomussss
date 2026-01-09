"use client";

import { useState, useEffect } from "react";

// フレンドリスト（空）
const existingFriends: {
  id: string;
  name: string;
  avatar: string;
  status: "online" | "busy" | "offline";
}[] = [];

// グループリスト（空）
const existingGroups: {
  id: string;
  name: string;
  icon: string;
  members: { id: string; name: string; avatar: string; company: string }[];
}[] = [];

// 現在のグループメンバー（空）
const currentGroupMembers: {
  id: string;
  name: string;
  avatar: string;
  role: "admin" | "member" | "readonly";
}[] = [];

type MemberRole = "admin" | "member" | "readonly";

type GroupMember = {
  id: string;
  name: string;
  avatar: string;
  role: MemberRole;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  projectName: string;
  groupIcon?: string;
  groupDescription?: string;
};

export default function ProjectSettingsModal({ isOpen, onClose, projectName, groupIcon = "🎮", groupDescription = "" }: Props) {
  const [activeTab, setActiveTab] = useState<"general" | "members">("general");

  // 基本設定用のstate
  const [editName, setEditName] = useState(projectName);
  const [editIcon, setEditIcon] = useState(groupIcon);
  const [editDescription, setEditDescription] = useState(groupDescription || "PPMDプロジェクトの開発チャンネルです。\n進捗報告や相談はこちらで。");

  // projectNameが変更されたら更新
  useEffect(() => {
    setEditName(projectName);
  }, [projectName]);

  // メンバー管理用のstate
  const [members, setMembers] = useState<GroupMember[]>(currentGroupMembers);
  const [memberSourceTab, setMemberSourceTab] = useState<"dm" | "group">("dm");
  const [memberSearchQuery, setMemberSearchQuery] = useState("");
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
  const [openRoleDropdown, setOpenRoleDropdown] = useState<string | null>(null);

  const icons = ["🎮", "🎪", "🎬", "🎨", "🎵", "📱", "💻", "🌐", "🚀", "⚔️", "🏰", "🌲", "📋", "🔧", "📧", "📝"];

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

  if (!isOpen) return null;

  const handleClose = () => {
    setActiveTab("general");
    setMemberSearchQuery("");
    setExpandedGroups([]);
    setOpenRoleDropdown(null);
    onClose();
  };

  const handleSave = () => {
    console.log("Saved:", { name: editName, icon: editIcon, description: editDescription, members });
    handleClose();
  };

  const isMemberInGroup = (memberId: string) => {
    return members.some(m => m.id === memberId);
  };

  const getMemberRole = (memberId: string): MemberRole => {
    const member = members.find(m => m.id === memberId);
    return member?.role || "member";
  };

  const handleToggleMember = (memberId: string, memberName: string, memberAvatar: string) => {
    if (isMemberInGroup(memberId)) {
      setMembers(members.filter(m => m.id !== memberId));
    } else {
      setMembers([...members, { id: memberId, name: memberName, avatar: memberAvatar, role: "member" }]);
    }
  };

  const handleSetRole = (memberId: string, role: MemberRole) => {
    setMembers(members.map(m =>
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

  const handleSelectAllGroupMembers = (groupMembers: { id: string; name: string; avatar: string }[]) => {
    const memberIds = groupMembers.map(m => m.id);
    const allSelected = memberIds.every(id => isMemberInGroup(id));

    if (allSelected) {
      setMembers(members.filter(m => !memberIds.includes(m.id)));
    } else {
      const newMembers = groupMembers
        .filter(gm => !isMemberInGroup(gm.id))
        .map(gm => ({ id: gm.id, name: gm.name, avatar: gm.avatar, role: "member" as MemberRole }));
      setMembers([...members, ...newMembers]);
    }
  };

  const handleRemoveMember = (memberId: string) => {
    setMembers(members.filter(m => m.id !== memberId));
  };

  const filteredFriends = existingFriends.filter(friend =>
    friend.name.toLowerCase().includes(memberSearchQuery.toLowerCase())
  );

  const filteredGroups = existingGroups.filter(group =>
    group.name.toLowerCase().includes(memberSearchQuery.toLowerCase()) ||
    group.members.some(m => m.name.toLowerCase().includes(memberSearchQuery.toLowerCase()))
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-full max-w-3xl overflow-hidden shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-800">
            グループ設定 - {projectName}
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
                  <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center text-3xl">
                    {editIcon}
                  </div>
                  <button
                    onClick={() => {
                      const currentIndex = icons.indexOf(editIcon);
                      const nextIndex = (currentIndex + 1) % icons.length;
                      setEditIcon(icons[nextIndex]);
                    }}
                    className="absolute bottom-0 right-0 bg-blue-600 text-white text-xs px-2 py-1 rounded hover:bg-blue-700"
                  >
                    変更
                  </button>
                </div>
                <div className="flex-1">
                  <label className="flex items-center gap-1 text-sm text-slate-600 mb-1">
                    チャット名：
                  </label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* 概要 */}
              <div>
                <label className="flex items-center gap-1 text-sm text-slate-600 mb-1">
                  概要：
                </label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="このチャットの説明やメモ、関連するリンクなどを記入することができます"
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
                  現在のメンバー ({members.length}人)
                </h3>
                <div className="border border-slate-200 rounded max-h-40 overflow-y-auto">
                  {members.map(member => (
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
                          onClick={() => setOpenRoleDropdown(openRoleDropdown === `current-${member.id}` ? null : `current-${member.id}`)}
                          className="px-2 py-1 text-xs border border-slate-300 rounded hover:bg-slate-100 flex items-center gap-1"
                        >
                          {roleLabels[member.role]}
                          <span className="text-[10px]">▼</span>
                        </button>
                        {openRoleDropdown === `current-${member.id}` && (
                          <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded shadow-lg z-10 min-w-[90px]">
                            <button
                              onClick={() => handleSetRole(member.id, "admin")}
                              className={`block w-full text-left px-3 py-2 text-sm hover:bg-slate-100 whitespace-nowrap ${member.role === "admin" ? "bg-blue-50 text-blue-600" : ""}`}
                            >
                              管理者
                            </button>
                            <button
                              onClick={() => handleSetRole(member.id, "member")}
                              className={`block w-full text-left px-3 py-2 text-sm hover:bg-slate-100 whitespace-nowrap ${member.role === "member" ? "bg-blue-50 text-blue-600" : ""}`}
                            >
                              メンバー
                            </button>
                            <button
                              onClick={() => handleSetRole(member.id, "readonly")}
                              className={`block w-full text-left px-3 py-2 text-sm hover:bg-slate-100 whitespace-nowrap ${member.role === "readonly" ? "bg-blue-50 text-blue-600" : ""}`}
                            >
                              閲覧のみ
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
                  ))}
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
                            checked={isMemberInGroup(friend.id)}
                            onChange={() => handleToggleMember(friend.id, friend.name, friend.avatar)}
                            className="rounded"
                          />
                          <div className="relative">
                            <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center text-xs">
                              {friend.avatar}
                            </div>
                            <div className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white ${statusColors[friend.status]}`} />
                          </div>
                          <span className="text-sm text-slate-800 flex-1">{friend.name}</span>
                          {isMemberInGroup(friend.id) && (
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
                              checked={group.members.every(m => isMemberInGroup(m.id))}
                              onChange={() => handleSelectAllGroupMembers(group.members)}
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
                                    checked={isMemberInGroup(member.id)}
                                    onChange={() => handleToggleMember(member.id, member.name, member.avatar)}
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
                                  {isMemberInGroup(member.id) && (
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
            onClick={handleSave}
            className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
          >
            保存する
          </button>
        </div>
      </div>
    </div>
  );
}
