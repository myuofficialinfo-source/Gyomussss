"use client";

import { useState } from "react";

type LoginPageProps = {
  onLogin: (name: string) => void;
};

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsLoading(true);
    // 少し遅延を入れてUX向上
    setTimeout(() => {
      onLogin(name.trim());
    }, 500);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-blue-600 to-teal-500 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* ロゴ・タイトル */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-2xl shadow-lg mb-4">
            <span className="text-4xl">🎮</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Gyomussss!</h1>
          <p className="text-white/80">ゲーム開発者のための業務チャット</p>
        </div>

        {/* ログインカード */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-xl font-semibold text-slate-800 text-center mb-6">ログイン</h2>

          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-2">
                表示名
              </label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="あなたの名前を入力"
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-colors"
                disabled={isLoading}
                autoFocus
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || !name.trim()}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <span>ログイン</span>
              )}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-6">
            名前を入力するだけですぐに使えます
          </p>
        </div>

        {/* フッター */}
        <p className="text-center text-white/60 text-sm mt-6">
          © 2024 Gyomussss! - Game Dev Communication Tool
        </p>
      </div>

      {/* ローディングオーバーレイ */}
      {isLoading && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 flex items-center gap-3">
            <div className="w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-slate-700">ログイン中...</span>
          </div>
        </div>
      )}
    </div>
  );
}
