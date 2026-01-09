"use client";

import { useState } from "react";

// Tipのカテゴリー
type TipCategory = "planning" | "programming" | "design" | "sound" | "marketing" | "team";

type Tip = {
  id: string;
  title: string;
  content: string;
  category: TipCategory;
  author: string;
  date: string;
  likes: number;
  comments: number;
  tags: string[];
};

// カテゴリーの表示設定
const categoryConfig: Record<TipCategory, { label: string; icon: string; color: string }> = {
  planning: { label: "企画", icon: "📋", color: "bg-blue-100 text-blue-700" },
  programming: { label: "プログラミング", icon: "💻", color: "bg-green-100 text-green-700" },
  design: { label: "デザイン", icon: "🎨", color: "bg-pink-100 text-pink-700" },
  sound: { label: "サウンド", icon: "🎵", color: "bg-purple-100 text-purple-700" },
  marketing: { label: "マーケティング", icon: "📢", color: "bg-orange-100 text-orange-700" },
  team: { label: "チーム運営", icon: "👥", color: "bg-teal-100 text-teal-700" },
};

// サンプルTipsデータ
const sampleTips: Tip[] = [
  {
    id: "tip1",
    title: "ゲームデザインドキュメント（GDD）の書き方",
    content: "GDDは開発チーム全員が参照する重要なドキュメントです。最初から完璧を目指さず、イテレーションしながら更新していきましょう。",
    category: "planning",
    author: "松村優樹",
    date: "2024-01-15",
    likes: 24,
    comments: 8,
    tags: ["GDD", "ドキュメント", "初心者向け"],
  },
  {
    id: "tip2",
    title: "Unity vs Unreal Engine：どっちを選ぶ？",
    content: "小規模なインディーゲームならUnity、大規模な3Dゲームやリアルなグラフィックが必要ならUnreal Engineがおすすめです。",
    category: "programming",
    author: "杉山楓",
    date: "2024-01-12",
    likes: 45,
    comments: 15,
    tags: ["Unity", "Unreal", "ゲームエンジン"],
  },
  {
    id: "tip3",
    title: "ピクセルアートの基本テクニック",
    content: "限られたピクセル数で表現するコツは、シルエットを意識すること。まず形を決めてから色を塗りましょう。",
    category: "design",
    author: "田中太郎",
    date: "2024-01-10",
    likes: 32,
    comments: 5,
    tags: ["ピクセルアート", "2D", "アート"],
  },
  {
    id: "tip4",
    title: "効果音を自作する簡単な方法",
    content: "日用品を使った効果音制作のコツ。紙をくしゃくしゃにする音、水の音など、身近なものから始めよう。",
    category: "sound",
    author: "佐藤花子",
    date: "2024-01-08",
    likes: 18,
    comments: 3,
    tags: ["効果音", "SE", "自作"],
  },
  {
    id: "tip5",
    title: "Steamでのウィッシュリスト獲得戦略",
    content: "リリース前にウィッシュリストを増やすコツ。SNS、プレスリリース、デモ版配布など複数のチャネルを活用しましょう。",
    category: "marketing",
    author: "山田一郎",
    date: "2024-01-05",
    likes: 56,
    comments: 12,
    tags: ["Steam", "マーケティング", "リリース準備"],
  },
  {
    id: "tip6",
    title: "リモートチームでの効率的なコミュニケーション",
    content: "非同期コミュニケーションを基本に。定期的なスタンドアップミーティングと、ドキュメント化を徹底しましょう。",
    category: "team",
    author: "鈴木次郎",
    date: "2024-01-03",
    likes: 29,
    comments: 7,
    tags: ["リモート", "チーム", "コミュニケーション"],
  },
  {
    id: "tip7",
    title: "プロトタイプは2週間以内に作れ",
    content: "アイデアの検証は早ければ早いほど良い。見た目よりも「面白いか」を確認できる最小限のプロトタイプを作ろう。",
    category: "planning",
    author: "松村優樹",
    date: "2024-01-01",
    likes: 67,
    comments: 20,
    tags: ["プロトタイプ", "開発手法", "アジャイル"],
  },
  {
    id: "tip8",
    title: "ゲームのパフォーマンス最適化の基本",
    content: "オブジェクトプーリング、LOD、オクルージョンカリングなど、よく使われる最適化テクニックを紹介。",
    category: "programming",
    author: "杉山楓",
    date: "2023-12-28",
    likes: 38,
    comments: 9,
    tags: ["最適化", "パフォーマンス", "技術"],
  },
];

type Props = {
  onBack: () => void;
};

export default function GameDevTips({ onBack }: Props) {
  const [selectedCategory, setSelectedCategory] = useState<TipCategory | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"latest" | "popular">("latest");

  const filteredTips = sampleTips
    .filter(tip => {
      if (selectedCategory !== "all" && tip.category !== selectedCategory) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          tip.title.toLowerCase().includes(query) ||
          tip.content.toLowerCase().includes(query) ||
          tip.tags.some(tag => tag.toLowerCase().includes(query))
        );
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "popular") return b.likes - a.likes;
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });

  const getCategoryTips = (category: TipCategory) => {
    return sampleTips.filter(tip => tip.category === category);
  };

  return (
    <div className="h-full flex flex-col bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 p-4">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={onBack}
            className="text-slate-500 hover:text-slate-700 transition-colors"
          >
            ← 戻る
          </button>
          <h1 className="text-xl font-bold text-slate-800">ゲーム開発Tips</h1>
        </div>

        {/* 検索とソート */}
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tipsを検索..."
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
            />
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as "latest" | "popular")}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="latest">新着順</option>
            <option value="popular">人気順</option>
          </select>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex">
        {/* サイドバー：カテゴリー一覧 */}
        <div className="w-64 bg-white border-r border-slate-200 p-4 overflow-y-auto">
          <h2 className="text-sm font-semibold text-slate-600 mb-3">カテゴリー</h2>
          <div className="space-y-1">
            <button
              onClick={() => setSelectedCategory("all")}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm transition-colors ${
                selectedCategory === "all"
                  ? "bg-purple-100 text-purple-700"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <span>📚</span>
              <span>すべて</span>
              <span className="ml-auto text-xs text-slate-400">{sampleTips.length}</span>
            </button>

            {(Object.keys(categoryConfig) as TipCategory[]).map(category => {
              const config = categoryConfig[category];
              const count = getCategoryTips(category).length;
              return (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm transition-colors ${
                    selectedCategory === category
                      ? "bg-purple-100 text-purple-700"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <span>{config.icon}</span>
                  <span>{config.label}</span>
                  <span className="ml-auto text-xs text-slate-400">{count}</span>
                </button>
              );
            })}
          </div>

          {/* 新規投稿ボタン */}
          <div className="mt-6 pt-4 border-t border-slate-200">
            <button className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm">
              <span>✏️</span>
              <span>新しいTipsを投稿</span>
            </button>
          </div>
        </div>

        {/* メインコンテンツ：Tips一覧 */}
        <div className="flex-1 overflow-y-auto p-4">
          {selectedCategory === "all" ? (
            // カテゴリー別のセクション表示
            <div className="space-y-6">
              {(Object.keys(categoryConfig) as TipCategory[]).map(category => {
                const config = categoryConfig[category];
                const tips = getCategoryTips(category);
                if (tips.length === 0) return null;

                return (
                  <div key={category}>
                    <div className="flex items-center gap-2 mb-3">
                      <span className={`px-2 py-1 rounded-lg text-sm font-medium ${config.color}`}>
                        {config.icon} {config.label}
                      </span>
                      <button
                        onClick={() => setSelectedCategory(category)}
                        className="text-xs text-purple-600 hover:text-purple-700"
                      >
                        すべて見る →
                      </button>
                    </div>
                    <div className="grid gap-3">
                      {tips.slice(0, 2).map(tip => (
                        <TipCard key={tip.id} tip={tip} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            // 選択したカテゴリーのTips
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-4">
                <span className={`px-3 py-1.5 rounded-lg text-sm font-medium ${categoryConfig[selectedCategory].color}`}>
                  {categoryConfig[selectedCategory].icon} {categoryConfig[selectedCategory].label}
                </span>
                <span className="text-sm text-slate-500">{filteredTips.length}件のTips</span>
              </div>
              {filteredTips.length > 0 ? (
                filteredTips.map(tip => (
                  <TipCard key={tip.id} tip={tip} />
                ))
              ) : (
                <div className="text-center py-12">
                  <div className="text-4xl mb-3">🔍</div>
                  <p className="text-slate-500">該当するTipsが見つかりません</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Tipカードコンポーネント
function TipCard({ tip }: { tip: Tip }) {
  const config = categoryConfig[tip.category];

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4 hover:shadow-md transition-shadow cursor-pointer">
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg ${config.color}`}>
          {config.icon}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-slate-800 mb-1 hover:text-purple-600 transition-colors">
            {tip.title}
          </h3>
          <p className="text-sm text-slate-500 line-clamp-2 mb-2">{tip.content}</p>

          {/* タグ */}
          <div className="flex flex-wrap gap-1 mb-2">
            {tip.tags.map(tag => (
              <span
                key={tag}
                className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs"
              >
                {tag}
              </span>
            ))}
          </div>

          {/* メタ情報 */}
          <div className="flex items-center gap-4 text-xs text-slate-400">
            <span>{tip.author}</span>
            <span>{tip.date}</span>
            <span className="flex items-center gap-1">
              <span>👍</span>
              {tip.likes}
            </span>
            <span className="flex items-center gap-1">
              <span>💬</span>
              {tip.comments}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
