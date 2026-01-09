"use client";

import { useState, useEffect } from "react";
import type { GameSettings, GameTag, Platform, Project, RoleType, MemberRole } from "./Sidebar";

// タグの表示名マッピング
const tagLabels: Record<GameTag, string> = {
  indie: "インディーゲーム",
  action: "アクション",
  rpg: "RPG",
  puzzle: "パズル",
  social: "ソーシャルゲーム",
  console: "コンシューマーゲーム",
  free: "フリーゲーム",
  mobile: "モバイルゲーム",
  vr: "VRゲーム",
  simulation: "シミュレーション",
  adventure: "アドベンチャー",
  horror: "ホラー",
};

// プラットフォームの表示名マッピング
const platformLabels: Record<Platform, string> = {
  steam: "Steam",
  switch: "Nintendo Switch",
  ps5: "PlayStation 5",
  ps4: "PlayStation 4",
  xbox: "Xbox",
  pc: "PC (その他)",
  windows: "Windows",
  mac: "macOS",
  linux: "Linux",
  ios: "iOS",
  android: "Android",
  web: "ブラウザ",
};

// 役職の表示名マッピング（階層順）
const roleLabels: Record<RoleType, string> = {
  producer: "プロデューサー",
  director: "ディレクター",
  lead_engineer: "リードエンジニア",
  lead_designer: "リードデザイナー",
  lead_planner: "リードプランナー",
  engineer: "エンジニア",
  designer: "デザイナー",
  planner: "プランナー",
  qa: "QA",
  other: "その他",
};

// 役職の階層構造（リードの下に対応する担当者を配置）
type RoleNode = {
  role: RoleType;
  children?: RoleType[];
};

const roleTree: RoleNode[] = [
  { role: "producer" },
  { role: "director" },
  { role: "lead_engineer", children: ["engineer"] },
  { role: "lead_designer", children: ["designer"] },
  { role: "lead_planner", children: ["planner"] },
  { role: "qa" },
  { role: "other" },
];

// プレイ時間の選択肢
const playTimeOptions = [
  "1時間未満",
  "1-5時間",
  "5-10時間",
  "10-20時間",
  "20-50時間",
  "50-100時間",
  "100時間以上",
  "無限（エンドレス）",
];

// ジャンルの選択肢
const genreOptions = [
  "アクション",
  "アドベンチャー",
  "RPG",
  "シミュレーション",
  "パズル",
  "シューティング",
  "格闘",
  "スポーツ",
  "レース",
  "音楽/リズム",
  "ホラー",
  "ビジュアルノベル",
  "ローグライク",
  "メトロイドヴァニア",
  "サバイバル",
  "クラフト",
  "タワーディフェンス",
  "カードゲーム",
  "ボードゲーム",
  "その他",
];

type Props = {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
  onSave: (settings: GameSettings) => void;
};

export default function ProjectGameSettingsModal({ isOpen, onClose, project, onSave }: Props) {
  const [activeTab, setActiveTab] = useState<"basic" | "roles">("basic");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [playTime, setPlayTime] = useState("");
  const [genre, setGenre] = useState("");
  const [releaseDate, setReleaseDate] = useState("");
  const [tags, setTags] = useState<GameTag[]>([]);
  const [memberRoles, setMemberRoles] = useState<MemberRole[]>([]);

  // モーダルが開くたびに既存の設定で初期化
  useEffect(() => {
    if (isOpen && project.gameSettings) {
      setTitle(project.gameSettings.title);
      setDescription(project.gameSettings.description);
      setPlatforms(project.gameSettings.platforms);
      setPlayTime(project.gameSettings.playTime);
      setGenre(project.gameSettings.genre);
      setReleaseDate(project.gameSettings.releaseDate);
      setTags(project.gameSettings.tags);
      setMemberRoles(project.gameSettings.memberRoles || []);
    } else if (isOpen) {
      // 新規の場合はプロジェクト名をタイトルに
      setTitle(project.name);
      setDescription(project.description);
      setPlatforms([]);
      setPlayTime("");
      setGenre("");
      setReleaseDate("");
      setTags([]);
      // projectMembersからメンバーを初期化（役職なし）
      if (project.projectMembers) {
        setMemberRoles(project.projectMembers.map(member => ({
          memberId: `${member.id}-${member.sourceId}`,
          memberName: member.name,
          roles: [],
        })));
      } else {
        setMemberRoles([]);
      }
    }
  }, [isOpen, project]);

  // projectMembersが変更された場合、新しいメンバーを追加
  useEffect(() => {
    if (isOpen && project.projectMembers) {
      const existingIds = memberRoles.map(m => m.memberId);
      const newMembers = project.projectMembers
        .filter(member => !existingIds.includes(`${member.id}-${member.sourceId}`))
        .map(member => ({
          memberId: `${member.id}-${member.sourceId}`,
          memberName: member.name,
          roles: [] as RoleType[],
        }));
      if (newMembers.length > 0) {
        setMemberRoles([...memberRoles, ...newMembers]);
      }
    }
  }, [isOpen, project.projectMembers, memberRoles]);

  if (!isOpen) return null;

  const handleClose = () => {
    setActiveTab("basic");
    onClose();
  };

  const handleSave = () => {
    const settings: GameSettings = {
      title,
      description,
      platforms,
      playTime,
      genre,
      releaseDate,
      tags,
      memberRoles,
    };
    onSave(settings);
    handleClose();
  };

  const togglePlatform = (platform: Platform) => {
    if (platforms.includes(platform)) {
      setPlatforms(platforms.filter(p => p !== platform));
    } else {
      setPlatforms([...platforms, platform]);
    }
  };

  const toggleTag = (tag: GameTag) => {
    if (tags.includes(tag)) {
      setTags(tags.filter(t => t !== tag));
    } else {
      setTags([...tags, tag]);
    }
  };

  const toggleMemberRole = (memberId: string, role: RoleType) => {
    setMemberRoles(prev => prev.map(member => {
      if (member.memberId !== memberId) return member;
      const hasRole = member.roles.includes(role);
      return {
        ...member,
        roles: hasRole
          ? member.roles.filter(r => r !== role)
          : [...member.roles, role],
      };
    }));
  };

  // 役職ごとのメンバーを取得
  const getMembersForRole = (role: RoleType) => {
    return memberRoles.filter(m => m.roles.includes(role));
  };

  // 役職が割り当てられていないメンバーを取得
  const getUnassignedMembers = () => {
    return memberRoles.filter(m => m.roles.length === 0);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-full max-w-3xl max-h-[90vh] overflow-hidden shadow-xl flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">プロジェクト設定</h2>
            <p className="text-sm text-slate-500">プロジェクトの詳細情報と体制を設定</p>
          </div>
          <button
            onClick={handleClose}
            className="text-slate-400 hover:text-slate-600 text-xl"
          >
            ×
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 shrink-0">
          <button
            onClick={() => setActiveTab("basic")}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === "basic"
                ? "text-purple-600 border-b-2 border-purple-600"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            基本情報
          </button>
          <button
            onClick={() => setActiveTab("roles")}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === "roles"
                ? "text-purple-600 border-b-2 border-purple-600"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            役職・体制
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto flex-1">
          {activeTab === "basic" ? (
            <div className="space-y-5">
              {/* ゲームタイトル */}
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">ゲームタイトル</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="ゲームのタイトル"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                />
              </div>

              {/* ゲーム内容 */}
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">ゲーム内容</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="ゲームの説明・概要"
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm resize-none"
                />
              </div>

              {/* リリースプラットフォーム */}
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">リリースプラットフォーム</label>
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(platformLabels) as Platform[]).map(platform => (
                    <button
                      key={platform}
                      onClick={() => togglePlatform(platform)}
                      className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                        platforms.includes(platform)
                          ? "bg-purple-500 text-white"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {platformLabels[platform]}
                    </button>
                  ))}
                </div>
              </div>

              {/* プレイ時間とジャンル */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1 block">プレイ時間</label>
                  <select
                    value={playTime}
                    onChange={(e) => setPlayTime(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm bg-white"
                  >
                    <option value="">選択してください</option>
                    {playTimeOptions.map(option => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1 block">メインジャンル</label>
                  <select
                    value={genre}
                    onChange={(e) => setGenre(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm bg-white"
                  >
                    <option value="">選択してください</option>
                    {genreOptions.map(option => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* リリース予定日 */}
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">リリース予定日</label>
                <input
                  type="date"
                  value={releaseDate}
                  onChange={(e) => setReleaseDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                />
              </div>

              {/* タグ */}
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">
                  タグ
                  <span className="text-slate-400 font-normal ml-2">（イベント自動取得に使用）</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(tagLabels) as GameTag[]).map(tag => (
                    <button
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                        tags.includes(tag)
                          ? "bg-green-500 text-white"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {tagLabels[tag]}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  選択したタグに基づいて、関連するゲームイベント（展示会・即売会など）がカレンダーに自動表示されます
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* メンバーがいない場合 */}
              {memberRoles.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-3">👥</div>
                  <p className="text-slate-500 mb-2">メンバーがいません</p>
                  <p className="text-sm text-slate-400">
                    先に「メンバー設定」からメンバーを追加してください
                  </p>
                </div>
              ) : (
                <>
                  <p className="text-sm text-slate-500 mb-4">
                    各役職にメンバーを割り当てます。1人に複数の役職を設定できます。
                  </p>

                  {/* 役職ツリー */}
                  <div className="space-y-3">
                    {roleTree.map((node) => {
                      const membersInRole = getMembersForRole(node.role);
                      const isLead = node.children && node.children.length > 0;

                      return (
                        <div key={node.role} className="border border-slate-200 rounded-lg overflow-hidden">
                          {/* 親役職 */}
                          <div className="bg-slate-50 p-3">
                            <div className="flex items-center gap-2 mb-2">
                              <div className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                                node.role === "producer" || node.role === "director"
                                  ? "bg-purple-100 text-purple-700"
                                  : isLead
                                  ? "bg-blue-100 text-blue-700"
                                  : "bg-slate-100 text-slate-700"
                              }`}>
                                {roleLabels[node.role]}
                              </div>
                              <span className="text-xs text-slate-400">
                                ({membersInRole.length}人)
                              </span>
                            </div>

                            {/* 割り当てられたメンバー */}
                            <div className="flex flex-wrap gap-2 ml-2">
                              {membersInRole.map(member => (
                                <div
                                  key={member.memberId}
                                  className="flex items-center gap-1 bg-white border border-slate-200 px-2 py-1 rounded-full text-sm"
                                >
                                  <span>👤</span>
                                  <span>{member.memberName}</span>
                                  <button
                                    onClick={() => toggleMemberRole(member.memberId, node.role)}
                                    className="ml-1 text-slate-400 hover:text-red-500"
                                  >
                                    ×
                                  </button>
                                </div>
                              ))}

                              {/* メンバー追加ドロップダウン */}
                              <select
                                className="bg-white border border-dashed border-slate-300 px-2 py-1 rounded-full text-xs text-slate-500 cursor-pointer hover:bg-slate-100"
                                value=""
                                onChange={(e) => {
                                  if (e.target.value) {
                                    toggleMemberRole(e.target.value, node.role);
                                  }
                                }}
                              >
                                <option value="">+ 追加</option>
                                {memberRoles
                                  .filter(m => !m.roles.includes(node.role))
                                  .map(member => (
                                    <option key={member.memberId} value={member.memberId}>
                                      {member.memberName}
                                    </option>
                                  ))}
                              </select>
                            </div>
                          </div>

                          {/* 子役職（リードの下に表示） */}
                          {node.children && node.children.map(childRole => {
                            const childMembers = getMembersForRole(childRole);
                            return (
                              <div key={childRole} className="border-t border-slate-200 bg-white p-3 ml-6">
                                <div className="flex items-center gap-2 mb-2">
                                  <div className="text-slate-300">└─</div>
                                  <div className="px-3 py-1.5 rounded-lg text-sm font-medium bg-slate-100 text-slate-700">
                                    {roleLabels[childRole]}
                                  </div>
                                  <span className="text-xs text-slate-400">
                                    ({childMembers.length}人)
                                  </span>
                                </div>

                                {/* 割り当てられたメンバー */}
                                <div className="flex flex-wrap gap-2 ml-8">
                                  {childMembers.map(member => (
                                    <div
                                      key={member.memberId}
                                      className="flex items-center gap-1 bg-white border border-slate-200 px-2 py-1 rounded-full text-sm"
                                    >
                                      <span>👤</span>
                                      <span>{member.memberName}</span>
                                      <button
                                        onClick={() => toggleMemberRole(member.memberId, childRole)}
                                        className="ml-1 text-slate-400 hover:text-red-500"
                                      >
                                        ×
                                      </button>
                                    </div>
                                  ))}

                                  {/* メンバー追加ドロップダウン */}
                                  <select
                                    className="bg-slate-50 border border-dashed border-slate-300 px-2 py-1 rounded-full text-xs text-slate-500 cursor-pointer hover:bg-slate-100"
                                    value=""
                                    onChange={(e) => {
                                      if (e.target.value) {
                                        toggleMemberRole(e.target.value, childRole);
                                      }
                                    }}
                                  >
                                    <option value="">+ 追加</option>
                                    {memberRoles
                                      .filter(m => !m.roles.includes(childRole))
                                      .map(member => (
                                        <option key={member.memberId} value={member.memberId}>
                                          {member.memberName}
                                        </option>
                                      ))}
                                  </select>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>

                  {/* 未割り当てメンバー */}
                  {getUnassignedMembers().length > 0 && (
                    <div className="mt-6 pt-4 border-t border-slate-200">
                      <div className="text-sm font-medium text-slate-600 mb-2">
                        未割り当てのメンバー
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {getUnassignedMembers().map(member => (
                          <div
                            key={member.memberId}
                            className="flex items-center gap-1 bg-yellow-50 border border-yellow-200 px-2 py-1 rounded-full text-sm"
                          >
                            <span>👤</span>
                            <span>{member.memberName}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 p-4 border-t border-slate-200 bg-slate-50 shrink-0">
          <button
            onClick={handleClose}
            className="px-6 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            キャンセル
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}
