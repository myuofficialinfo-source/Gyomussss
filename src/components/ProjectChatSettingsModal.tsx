"use client";

import { useState, useEffect } from "react";
import type { LinkedChat, ProjectMember, ProjectPermission } from "./Sidebar";

// DM型定義
type DMChat = {
  id: string;
  name: string;
  avatar: string;
  status: "online" | "busy" | "offline";
};

// グループ型定義
type GroupChat = {
  id: string;
  name: string;
  icon: string;
  members: { id: string; name: string; avatar: string }[];
};

const roleLabels: Record<ProjectPermission, string> = {
  admin: "管理者",
  member: "メンバー",
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  linkedChats: LinkedChat[];
  projectMembers: ProjectMember[];
  onSave: (chats: LinkedChat[], members: ProjectMember[]) => void;
  availableDMs?: DMChat[];
  availableGroups?: GroupChat[];
};

export default function ProjectChatSettingsModal({
  isOpen,
  onClose,
  linkedChats,
  projectMembers,
  onSave,
  availableDMs = [],
  availableGroups = [],
}: Props) {
  const [selectedChats, setSelectedChats] = useState<LinkedChat[]>(linkedChats);
  const [selectedMembers, setSelectedMembers] = useState<ProjectMember[]>(projectMembers);
  const [searchQuery, setSearchQuery] = useState("");
  const [memberSourceTab, setMemberSourceTab] = useState<"dm" | "group">("dm");
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
  const [openRoleDropdown, setOpenRoleDropdown] = useState<string | null>(null);

  // モーダルが開くたびに初期化
  useEffect(() => {
    if (isOpen) {
      setSelectedChats(linkedChats);
      setSelectedMembers(projectMembers);
      setOpenRoleDropdown(null);
    }
  }, [isOpen, linkedChats, projectMembers]);

  const statusColors = {
    online: "bg-green-500",
    busy: "bg-red-500",
    offline: "bg-gray-400",
  };

  if (!isOpen) return null;

  const handleClose = () => {
    setSearchQuery("");
    setExpandedGroups([]);
    setOpenRoleDropdown(null);
    onClose();
  };

  const handleSave = () => {
    onSave(selectedChats, selectedMembers);
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
  const handleToggleMember = (memberId: string, memberName: string, memberAvatar: string, sourceType: "dm" | "group", sourceId: string, sourceName: string) => {
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
  const handleSelectAllGroupMembers = (group: GroupChat) => {
    const memberIds = group.members.map((m) => m.id);
    const allSelected = memberIds.every((id) => isMemberInGroup(id));

    if (allSelected) {
      setSelectedMembers(selectedMembers.filter((m) => !memberIds.includes(m.id)));
      // チャットリストからも削除
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
      // チャットリストにも追加
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
          <h2 className="text-lg font-semibold text-slate-800">
            プロジェクトメンバー設定
          </h2>
          <button
            onClick={handleClose}
            className="text-slate-400 hover:text-slate-600 text-xl"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {/* 現在のメンバー一覧 */}
          <div className="mb-4">
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
                            openRoleDropdown === `current-${member.id}` ? null : `current-${member.id}`
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
                <div className="p-4 text-center text-slate-400 text-sm">
                  メンバーがいません
                </div>
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
                /* DMリスト */
                filteredDMs.length > 0 ? (
                  filteredDMs.map((dm) => {
                    const memberId = dm.id; // 相手ユーザーの実際のIDを使用
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
                                    getMemberRole(memberId) === "admin" ? "bg-blue-50 text-blue-600" : ""
                                  }`}
                                >
                                  管理者
                                </button>
                                <button
                                  onClick={() => handleSetRole(memberId, "member")}
                                  className={`block w-full text-left px-3 py-2 text-sm hover:bg-slate-100 whitespace-nowrap ${
                                    getMemberRole(memberId) === "member" ? "bg-blue-50 text-blue-600" : ""
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
              ) : /* グループリスト（展開可能） */
              filteredGroups.length > 0 ? (
                filteredGroups.map((group) => (
                  <div key={group.id} className="border-b border-slate-100 last:border-b-0">
                    {/* グループヘッダー */}
                    <div className="flex items-center gap-3 p-2 hover:bg-slate-50">
                      <input
                        type="checkbox"
                        checked={group.members.length > 0 && group.members.every((m) => isMemberInGroup(m.id))}
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
                        <span className="text-xs text-slate-500 ml-2">{group.members.length}人</span>
                      </div>
                    </div>
                    {/* グループメンバー（展開時） */}
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
                <div className="p-4 text-center text-slate-500 text-sm">グループが見つかりません</div>
              )}
            </div>
          </div>
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
