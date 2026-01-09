"use client";

import { useState } from "react";
import type { User } from "./Sidebar";

type Props = {
  onLogin: (user: User) => void;
};

export default function LoginPage({ onLogin }: Props) {
  const [isEmailLogin, setIsEmailLogin] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // ダミーログイン処理
  const handleSocialLogin = (provider: "google" | "twitter" | "discord") => {
    setIsLoading(true);
    setError("");

    // ダミーユーザー情報
    setTimeout(() => {
      const dummyUser: User = {
        id: `user-${Date.now()}`,
        name: provider === "google" ? "松村優樹" : provider === "twitter" ? "TwitterUser" : "DiscordUser",
        email: `user@${provider}.com`,
        avatar: "松",
        provider,
      };
      onLogin(dummyUser);
      setIsLoading(false);
    }, 1000);
  };

  const handleEmailLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("メールアドレスとパスワードを入力してください");
      return;
    }

    setIsLoading(true);
    setError("");

    // ダミーログイン
    setTimeout(() => {
      const dummyUser: User = {
        id: `user-${Date.now()}`,
        name: email.split("@")[0],
        email,
        avatar: email.charAt(0).toUpperCase(),
        provider: "email",
      };
      onLogin(dummyUser);
      setIsLoading(false);
    }, 1000);
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
          {!isEmailLogin ? (
            <>
              <h2 className="text-xl font-semibold text-slate-800 text-center mb-6">ログイン</h2>

              {/* ソーシャルログインボタン */}
              <div className="space-y-3">
                {/* Google */}
                <button
                  onClick={() => handleSocialLogin("google")}
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  <span className="text-slate-700 font-medium">Googleでログイン</span>
                </button>

                {/* X (Twitter) */}
                <button
                  onClick={() => handleSocialLogin("twitter")}
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                  <span className="font-medium">Xでログイン</span>
                </button>

                {/* Discord */}
                <button
                  onClick={() => handleSocialLogin("discord")}
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-[#5865F2] text-white rounded-lg hover:bg-[#4752C4] transition-colors disabled:opacity-50"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z" />
                  </svg>
                  <span className="font-medium">Discordでログイン</span>
                </button>
              </div>

              {/* 区切り線 */}
              <div className="flex items-center gap-4 my-6">
                <div className="flex-1 h-px bg-slate-200" />
                <span className="text-sm text-slate-400">または</span>
                <div className="flex-1 h-px bg-slate-200" />
              </div>

              {/* メールでログイン */}
              <button
                onClick={() => setIsEmailLogin(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <span className="text-xl">📧</span>
                <span className="font-medium">メールアドレスでログイン</span>
              </button>
            </>
          ) : (
            <>
              {/* メールログインフォーム */}
              <button
                onClick={() => setIsEmailLogin(false)}
                className="flex items-center gap-1 text-slate-500 hover:text-slate-700 mb-4"
              >
                ← 戻る
              </button>

              <h2 className="text-xl font-semibold text-slate-800 mb-6">メールでログイン</h2>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                  {error}
                </div>
              )}

              <form onSubmit={handleEmailLogin} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    メールアドレス
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="example@email.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    パスワード
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="••••••••"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors disabled:opacity-50"
                >
                  {isLoading ? "ログイン中..." : "ログイン"}
                </button>
              </form>

              <p className="text-center text-sm text-slate-500 mt-4">
                アカウントをお持ちでない方は
                <button className="text-purple-600 hover:underline ml-1">新規登録</button>
              </p>
            </>
          )}
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
