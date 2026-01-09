"use client";

import { useState, useEffect, useCallback } from "react";
import { useToast } from "./Toast";

type SearchUser = {
  id: string;
  name: string;
  avatar: string;
  provider: string;
};

type FriendRequest = {
  id: string;
  fromUserId: string;
  toUserId: string;
  status: string;
  fromUser?: {
    id: string;
    name: string;
    avatar: string;
  };
};

type Friend = {
  id: string;
  name: string;
  avatar: string;
  provider: string;
};

type MemberRole = "admin" | "member" | "readonly";

type SelectedMember = {
  id: string;
  role: MemberRole;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (project: { name: string; icon: string; type: "dm" | "group"; members?: SelectedMember[] }) => void;
  currentUserId: string;
};

export default function CreateProjectModal({ isOpen, onClose, onCreate, currentUserId }: Props) {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<"dm" | "group">("dm");

  // DM用のstate
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [pendingRequests, setPendingRequests] = useState<string[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<FriendRequest[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);

  // グループ用のstate
  const [groupName, setGroupName] = useState("");
  const [groupIcon, setGroupIcon] = useState("🎮");
  const [groupDescription, setGroupDescription] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<SelectedMember[]>([]);
  const [memberSearchQuery, setMemberSearchQuery] = useState("");
  const [requireApproval, setRequireApproval] = useState(true);
  const [openRoleDropdown, setOpenRoleDropdown] = useState<string | null>(null);

  // 招待リンク生成用
  const inviteLink = `https://gyomussss.vercel.app/invite/${Math.random().toString(36).substring(2, 14)}`;

  // フレンド一覧とリクエストを取得
  const fetchFriendsAndRequests = useCallback(async () => {
    if (!currentUserId) return;

    try {
      // フレンド一覧
      const friendsRes = await fetch(`/api/friends?userId=${currentUserId}&type=friends`);
      const friendsData = await friendsRes.json();
      if (friendsData.friends) {
        setFriends(friendsData.friends);
      }

      // 受信したリクエスト
      const requestsRes = await fetch(`/api/friends?userId=${currentUserId}&type=requests`);
      const requestsData = await requestsRes.json();
      if (requestsData.requests) {
        setIncomingRequests(requestsData.requests);
      }

      // 送信済みリクエスト
      const pendingRes = await fetch(`/api/friends?userId=${currentUserId}&type=pending`);
      const pendingData = await pendingRes.json();
      if (pendingData.requests) {
        setPendingRequests(pendingData.requests.map((r: FriendRequest) => r.toUserId));
      }
    } catch (error) {
      console.error("Failed to fetch friends:", error);
    }
  }, [currentUserId]);

  useEffect(() => {
    if (isOpen) {
      fetchFriendsAndRequests();
    }
  }, [isOpen, fetchFriendsAndRequests]);

  // ユーザー検索
  useEffect(() => {
    const searchUsers = async () => {
      if (!searchQuery.trim()) {
        setSearchResults([]);
        return;
      }

      setIsSearching(true);
      try {
        const res = await fetch(`/api/users?q=${encodeURIComponent(searchQuery)}`);
        const data = await res.json();
        if (data.users) {
          // 自分自身と既にフレンドの人を除外
          const filtered = data.users.filter((u: SearchUser) =>
            u.id !== currentUserId &&
            !friends.some(f => f.id === u.id)
          );
          setSearchResults(filtered);
        }
      } catch (error) {
        console.error("Search error:", error);
      }
      setIsSearching(false);
    };

    const debounce = setTimeout(searchUsers, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery, currentUserId, friends]);

  if (!isOpen) return null;

  const handleClose = () => {
    setActiveTab("dm");
    setSearchQuery("");
    setSearchResults([]);
    setGroupName("");
    setGroupIcon("🎮");
    setGroupDescription("");
    setSelectedMembers([]);
    setMemberSearchQuery("");
    setOpenRoleDropdown(null);
    onClose();
  };

  const handleSendFriendRequest = async (toUserId: string) => {
    try {
      const res = await fetch("/api/friends", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "send",
          fromUserId: currentUserId,
          toUserId,
        }),
      });
      const data = await res.json();
      if (data.request) {
        setPendingRequests([...pendingRequests, toUserId]);
        showToast({
          type: "success",
          title: "フレンド申請を送信しました",
          message: "相手が承認するとフレンドになります",
        });
      } else if (data.error) {
        showToast({
          type: "error",
          title: "フレンド申請に失敗しました",
          message: data.error,
        });
      }
    } catch (error) {
      console.error("Failed to send friend request:", error);
      showToast({
        type: "error",
        title: "フレンド申請に失敗しました",
        message: "通信エラーが発生しました",
      });
    }
  };

  const handleAcceptRequest = async (requestId: string, fromUserName?: string) => {
    try {
      const res = await fetch("/api/friends", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "accept",
          requestId,
        }),
      });
      const data = await res.json();
      if (data.request) {
        showToast({
          type: "success",
          title: "フレンドになりました",
          message: fromUserName ? `${fromUserName}さんとフレンドになりました` : undefined,
        });
        fetchFriendsAndRequests();
      } else if (data.error) {
        showToast({
          type: "error",
          title: "承認に失敗しました",
          message: data.error,
        });
      }
    } catch (error) {
      console.error("Failed to accept request:", error);
      showToast({
        type: "error",
        title: "承認に失敗しました",
        message: "通信エラーが発生しました",
      });
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    try {
      const res = await fetch("/api/friends", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reject",
          requestId,
        }),
      });
      const data = await res.json();
      if (data.request) {
        setIncomingRequests(incomingRequests.filter(r => r.id !== requestId));
        showToast({
          type: "info",
          title: "フレンド申請を拒否しました",
        });
      }
    } catch (error) {
      console.error("Failed to reject request:", error);
      showToast({
        type: "error",
        title: "拒否に失敗しました",
        message: "通信エラーが発生しました",
      });
    }
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

  const handleCopyInviteLink = () => {
    navigator.clipboard.writeText(inviteLink);
  };

  const icons = ["🎮", "🎪", "🎬", "🎨", "🎵", "📱", "💻", "🌐", "🚀", "⚔️", "🏰", "🌲", "📋", "🔧", "📧", "📝"];

  const filteredFriends = friends.filter(friend =>
    friend.name.toLowerCase().includes(memberSearchQuery.toLowerCase())
  );

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
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {isSearching ? (
                  <div className="text-center py-4">
                    <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
                  </div>
                ) : searchQuery && searchResults.length > 0 ? (
                  searchResults.map(user => (
                    <div
                      key={user.id}
                      className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg"
                    >
                      <div className="w-10 h-10 bg-slate-300 rounded-full flex items-center justify-center text-sm font-medium">
                        {user.avatar}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-800">{user.name}</p>
                        <p className="text-xs text-slate-500">ID: {user.id.slice(0, 12)}...</p>
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
                {incomingRequests.length > 0 ? (
                  <div className="space-y-2">
                    {incomingRequests.map(request => (
                      <div
                        key={request.id}
                        className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg"
                      >
                        <div className="w-10 h-10 bg-blue-200 rounded-full flex items-center justify-center text-sm font-medium">
                          {request.fromUser?.avatar || "?"}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-slate-800">
                            {request.fromUser?.name || "Unknown"}
                          </p>
                        </div>
                        <button
                          onClick={() => handleAcceptRequest(request.id, request.fromUser?.name)}
                          className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                        >
                          承認
                        </button>
                        <button
                          onClick={() => handleRejectRequest(request.id)}
                          className="px-3 py-1 text-sm bg-slate-300 text-slate-700 rounded hover:bg-slate-400 transition-colors"
                        >
                          拒否
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">
                    現在、保留中のフレンド申請はありません
                  </p>
                )}
              </div>

              {/* フレンド一覧 */}
              {friends.length > 0 && (
                <div className="border-t border-slate-200 pt-4">
                  <h3 className="text-sm font-medium text-slate-700 mb-2">
                    フレンド一覧（{friends.length}人）
                  </h3>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {friends.map(friend => (
                      <div
                        key={friend.id}
                        className="flex items-center gap-3 p-2 bg-slate-50 rounded"
                      >
                        <div className="w-8 h-8 bg-slate-300 rounded-full flex items-center justify-center text-xs font-medium">
                          {friend.avatar}
                        </div>
                        <span className="text-sm text-slate-800">{friend.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
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

              {/* フレンドからメンバー選択 */}
              <div className="border-t border-slate-200 pt-4">
                <h3 className="text-sm font-medium text-slate-700 mb-2">メンバーを追加</h3>

                {/* 検索 */}
                <div className="relative mb-3">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
                  <input
                    type="text"
                    value={memberSearchQuery}
                    onChange={(e) => setMemberSearchQuery(e.target.value)}
                    placeholder="フレンドから検索"
                    className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>

                {/* フレンドリスト */}
                <div className="border border-slate-200 rounded max-h-56 overflow-y-auto">
                  {filteredFriends.length > 0 ? (
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
                        <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center text-xs">
                          {friend.avatar}
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
                      {friends.length === 0
                        ? "まずフレンドを追加してください"
                        : "フレンドが見つかりません"}
                    </div>
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
