"use client";

import { useState } from "react";
import type { User } from "./Sidebar";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  onLogout: () => void;
  onUpdateUser: (user: User) => void;
};

// 設定メニュー項目
const menuItems = [
  { id: "account", icon: "👤", label: "マイアカウント" },
  { id: "profile", icon: "✏️", label: "プロフィール" },
  { id: "privacy", icon: "🔒", label: "プライバシー・安全" },
  { id: "apps", icon: "🔗", label: "連携済みアプリケーション" },
  { id: "devices", icon: "📱", label: "デバイス" },
  { id: "connections", icon: "🔌", label: "接続" },
];

export default function AccountSettingsModal({ isOpen, onClose, user, onLogout, onUpdateUser }: Props) {
  const [activeMenu, setActiveMenu] = useState("account");
  const [displayName, setDisplayName] = useState(user.name);
  const [isEditing, setIsEditing] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSaveDisplayName = () => {
    onUpdateUser({ ...user, name: displayName });
    setIsEditing(null);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-full max-w-3xl overflow-hidden shadow-xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">アカウント設定</h2>
            <p className="text-sm text-slate-500">ユーザー情報の確認と編集</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-xl"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* 左サイドバー */}
          <div className="w-48 bg-slate-50 border-r border-slate-200 p-3 overflow-y-auto">
            <nav className="space-y-0.5">
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveMenu(item.id)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                    activeMenu === item.id
                      ? "bg-purple-100 text-purple-700"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              ))}
            </nav>

            {/* 区切り線 */}
            <div className="border-t border-slate-200 my-3" />

            {/* ログアウト */}
            <button
              onClick={onLogout}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50 transition-colors"
            >
              <span>🚪</span>
              <span>ログアウト</span>
            </button>

            {/* バージョン */}
            <div className="text-xs text-slate-400 px-3 mt-4">
              Gyomussss! v0.1.0
            </div>
          </div>

          {/* メインコンテンツ */}
          <div className="flex-1 overflow-y-auto p-6">
            {activeMenu === "account" && (
              <div className="space-y-6">
                {/* プロフィールカード */}
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  {/* バナー */}
                  <div className="h-20 bg-gradient-to-r from-purple-500 to-blue-500" />

                  {/* プロフィール情報 */}
                  <div className="px-4 pb-4">
                    <div className="flex items-end gap-4 -mt-8">
                      {/* アバター */}
                      <div className="relative">
                        <div className="w-16 h-16 bg-purple-600 rounded-full border-4 border-white flex items-center justify-center text-2xl text-white shadow-md">
                          {user.avatar}
                        </div>
                        <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 rounded-full border-2 border-white" />
                      </div>

                      {/* 名前 */}
                      <div className="flex-1 pb-1">
                        <h3 className="text-lg font-bold text-slate-800">{user.name}</h3>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 情報カード */}
                <div className="space-y-4">
                  {/* 表示名 */}
                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                    <div className="flex-1">
                      <div className="text-xs text-slate-500 font-medium mb-1">表示名</div>
                      {isEditing === "name" ? (
                        <input
                          type="text"
                          value={displayName}
                          onChange={(e) => setDisplayName(e.target.value)}
                          className="w-full max-w-xs bg-white border border-slate-300 text-slate-800 px-3 py-1.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                          autoFocus
                        />
                      ) : (
                        <div className="text-slate-800">{user.name}</div>
                      )}
                    </div>
                    {isEditing === "name" ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => setIsEditing(null)}
                          className="px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
                        >
                          キャンセル
                        </button>
                        <button
                          onClick={handleSaveDisplayName}
                          className="px-4 py-1.5 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700"
                        >
                          保存
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setIsEditing("name")}
                        className="px-4 py-1.5 bg-slate-200 text-slate-700 text-sm rounded-lg hover:bg-slate-300"
                      >
                        編集
                      </button>
                    )}
                  </div>

                  {/* メールアドレス */}
                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                    <div>
                      <div className="text-xs text-slate-500 font-medium mb-1">メールアドレス</div>
                      <div className="text-slate-800">
                        {user.email.replace(/(.{3}).*(@.*)/, "$1*****$2")}
                        <button className="ml-2 text-purple-600 text-sm hover:underline">表示</button>
                      </div>
                    </div>
                    <button className="px-4 py-1.5 bg-slate-200 text-slate-700 text-sm rounded-lg hover:bg-slate-300">
                      編集
                    </button>
                  </div>

                  {/* 認証方法 */}
                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                    <div>
                      <div className="text-xs text-slate-500 font-medium mb-1">認証方法</div>
                      <div className="text-slate-800 flex items-center gap-2">
                        {user.provider === "google" && (
                          <>
                            <span className="text-lg">🔵</span>
                            <span>Google</span>
                          </>
                        )}
                        {user.provider === "twitter" && (
                          <>
                            <span className="text-lg">🐦</span>
                            <span>X (Twitter)</span>
                          </>
                        )}
                        {user.provider === "discord" && (
                          <>
                            <span className="text-lg">🎮</span>
                            <span>Discord</span>
                          </>
                        )}
                        {user.provider === "email" && (
                          <>
                            <span className="text-lg">📧</span>
                            <span>メール</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* パスワードと認証 */}
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 mb-3">パスワードと認証</h3>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2">
                    <span className="text-green-600">🔒</span>
                    <span className="text-green-700 text-sm">多要素認証が有効化されています</span>
                  </div>
                </div>

                {/* 危険な操作 */}
                <div className="pt-4 border-t border-slate-200">
                  <h3 className="text-sm font-semibold text-red-600 mb-3">危険な操作</h3>
                  <button className="px-4 py-2 bg-red-100 text-red-600 text-sm rounded-lg hover:bg-red-200 transition-colors">
                    アカウントを削除
                  </button>
                </div>
              </div>
            )}

            {activeMenu === "profile" && (
              <div>
                <h3 className="text-lg font-semibold text-slate-800 mb-4">プロフィール設定</h3>
                <p className="text-slate-500">プロフィールのカスタマイズ機能は準備中です。</p>
              </div>
            )}

            {activeMenu !== "account" && activeMenu !== "profile" && (
              <div>
                <h3 className="text-lg font-semibold text-slate-800 mb-4">
                  {menuItems.find(m => m.id === activeMenu)?.label}
                </h3>
                <p className="text-slate-500">この機能は準備中です。</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 p-4 border-t border-slate-200 bg-slate-50 shrink-0">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}
