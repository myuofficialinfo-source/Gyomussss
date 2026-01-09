"use client";

import { useState, useRef, useEffect } from "react";
import type { BookmarkedMessage, ProjectMember, LinkedChat } from "./Sidebar";

type Reaction = {
  emoji: string;
  users: string[];
};

// 添付ファイルの型
type Attachment = {
  id: string;
  type: "image" | "video";
  url: string;
  name: string;
  size?: number; // bytes
  thumbnail?: string; // 動画のサムネイル
};

type Message = {
  id: string;
  userId: string;
  userName: string;
  avatar: string;
  content: string;
  timestamp: string;
  date: string;
  isRead: boolean;
  isBookmarked: boolean;
  reactions: Reaction[];
  mentions: string[]; // TO機能用
  attachments?: Attachment[]; // 添付ファイル
  replyTo?: {
    id: string;
    userName: string;
    content: string;
  };
};

// 初期メッセージ（空）
const dummyMessages: Message[] = [];

// メッセージ保存用のキープレフィックス
const MESSAGES_STORAGE_KEY_PREFIX = "gyomussss_messages_";

type GroupInfo = {
  name: string;
  description: string;
  members: { id: string; name: string; avatar: string; role: string }[];
};

type DMInfo = {
  name: string;
  email: string;
  company: string;
  note: string;
  status: "online" | "offline" | "busy";
};

// グループ情報（実際にはpropsから取得）
const dummyGroupInfo: GroupInfo = {
  name: "",
  description: "",
  members: [],
};

// DM情報（実際にはpropsから取得）
const dummyDMInfo: DMInfo = {
  name: "",
  email: "",
  company: "",
  note: "",
  status: "offline",
};

// AIから追加するデータの型
export type AIAddData = {
  type: "task" | "todo" | "url" | "memo";
  data: {
    title?: string;
    content?: string;
    assigneeId?: string;      // メンバーID
    assigneeName?: string;    // メンバー名
    startDate?: string;
    endDate?: string;
    hours?: number;
    priority?: string;
    url?: string;
    description?: string;
    groupId?: string;         // グループID
    groupName?: string;       // グループ名
  };
};

type Props = {
  chatName: string;
  chatId: string;
  chatType: "dm" | "group";
  onOpenSettings?: () => void;
  scrollToMessageId?: string;
  onBookmarkChange?: (message: BookmarkedMessage, isBookmarked: boolean) => void;
  isProjectLinked?: boolean; // プロジェクト紐づきグループかどうか
  onAddFromAI?: (data: AIAddData) => void; // AIからのデータ追加コールバック
  projectMembers?: ProjectMember[]; // プロジェクトメンバー一覧
  linkedChats?: LinkedChat[]; // 紐づいているチャット一覧
  currentUserId?: string; // 現在のユーザーID
  currentUserName?: string; // 現在のユーザー名
  currentUserAvatar?: string; // 現在のユーザーアバター
};

// AI要約のタイプ
type AISummaryType = "summary" | "bullet" | "gentle";

// AIアクションのタイプとフォーマット
type AIActionType = "task" | "todo" | "url" | "memo";

const aiActionFormats: Record<AIActionType, string> = {
  task: `【タスク追加】
タスク名：
担当者：
開始日：
工数：
グループ：`,
  todo: `【TODO追加】
内容：
期限：
優先度：`,
  url: `【URL登録】
URL：
タイトル：
説明：`,
  memo: `【メモ保存】
`,
};

// AI返信メッセージの型
type AIResponse = {
  type: "task_created" | "todo_added" | "question" | "url_added" | "error";
  content: string;
  taskData?: {
    title: string;
    assignee?: string;
    startDate?: string;
    group?: string;
    hours?: number;
  };
};

// ローカルストレージのキー
const MESSAGE_DRAFT_KEY = "gyomussss_message_drafts";

export default function ChatArea({ chatName, chatId, chatType, onOpenSettings, scrollToMessageId, onBookmarkChange, isProjectLinked = false, onAddFromAI, projectMembers = [], linkedChats = [], currentUserId = "me", currentUserName = "ユーザー", currentUserAvatar = "U" }: Props) {
  // 管理者かどうかをチェック（グループ設定は管理者のみ編集可能）
  // デバッグモード: 常に管理者として扱う
  const isAdmin = true;
  // 初期値をlocalStorageから取得
  const [message, setMessage] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        const drafts = localStorage.getItem(MESSAGE_DRAFT_KEY);
        if (drafts) {
          const parsed = JSON.parse(drafts);
          return parsed[chatId] || "";
        }
      } catch {
        // パースエラーは無視
      }
    }
    return "";
  });
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(true);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null);
  const [showMoreMenu, setShowMoreMenu] = useState<string | null>(null);
  const [showInfoPanel, setShowInfoPanel] = useState(true);
  const [toTarget, setToTarget] = useState<{ id: string; name: string }[]>([]);
  const [showToPopup, setShowToPopup] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const toPopupRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 添付ファイル用のstate
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  // AI要約機能用のstate
  const [messageHistory, setMessageHistory] = useState<string[]>([]);
  const [isAISummarizing, setIsAISummarizing] = useState(false);
  const [showAIMenu, setShowAIMenu] = useState(false);
  const aiMenuRef = useRef<HTMLDivElement>(null);

  // AIからの返信表示用
  const [aiResponseMessage, setAIResponseMessage] = useState<AIResponse | null>(null);
  const [showAIResponseModal, setShowAIResponseModal] = useState(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // ファイル選択処理
  const handleFileSelect = (files: FileList | null) => {
    if (!files) return;

    const newAttachments: Attachment[] = [];
    Array.from(files).forEach((file) => {
      // 画像または動画のみ許可
      if (file.type.startsWith("image/") || file.type.startsWith("video/")) {
        const url = URL.createObjectURL(file);
        newAttachments.push({
          id: `att-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          type: file.type.startsWith("image/") ? "image" : "video",
          url,
          name: file.name,
          size: file.size,
        });
      }
    });

    if (newAttachments.length > 0) {
      setAttachments((prev) => [...prev, ...newAttachments]);
    }
  };

  // 添付ファイル削除
  const removeAttachment = (id: string) => {
    setAttachments((prev) => {
      const toRemove = prev.find((a) => a.id === id);
      if (toRemove) {
        URL.revokeObjectURL(toRemove.url);
      }
      return prev.filter((a) => a.id !== id);
    });
  };

  // ドラッグ&ドロップ処理
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  };

  // メッセージをサーバーとローカルストレージから取得
  useEffect(() => {
    const loadMessages = async () => {
      setIsLoadingMessages(true);
      let loadedMessages: Message[] = [];

      // まずローカルストレージから読み込み
      const localData = localStorage.getItem(MESSAGES_STORAGE_KEY_PREFIX + chatId);
      if (localData) {
        try {
          loadedMessages = JSON.parse(localData);
        } catch {
          console.error("Failed to parse local messages");
        }
      }

      // サーバーからも取得を試みる
      try {
        const res = await fetch(`/api/data?type=messages&chatId=${chatId}`);
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          loadedMessages = data;
          // ローカルにも同期
          localStorage.setItem(MESSAGES_STORAGE_KEY_PREFIX + chatId, JSON.stringify(data));
        } else if (loadedMessages.length > 0) {
          // ローカルにデータがあってサーバーにない場合は同期
          fetch("/api/data", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ type: "messages", chatId, data: loadedMessages }),
          }).catch(console.error);
        }
      } catch (error) {
        console.error("Failed to load messages from server:", error);
      }

      setMessages(loadedMessages.length > 0 ? loadedMessages : dummyMessages);
      setIsLoadingMessages(false);
    };

    loadMessages();
  }, [chatId]);

  // メッセージをサーバーとローカルストレージに保存
  const saveMessages = async (messagesToSave: Message[]) => {
    // ローカルストレージに保存
    localStorage.setItem(MESSAGES_STORAGE_KEY_PREFIX + chatId, JSON.stringify(messagesToSave));

    // サーバーにも保存
    try {
      await fetch("/api/data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "messages", chatId, data: messagesToSave }),
      });
    } catch (error) {
      console.error("Failed to save messages to server:", error);
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // メッセージをlocalStorageに保存
  useEffect(() => {
    try {
      const drafts = localStorage.getItem(MESSAGE_DRAFT_KEY);
      const parsed = drafts ? JSON.parse(drafts) : {};
      if (message.trim()) {
        parsed[chatId] = message;
      } else {
        delete parsed[chatId];
      }
      localStorage.setItem(MESSAGE_DRAFT_KEY, JSON.stringify(parsed));
    } catch {
      // 保存エラーは無視
    }
  }, [message, chatId]);

  // chatIdが変わったらlocalStorageから読み込み
  useEffect(() => {
    try {
      const drafts = localStorage.getItem(MESSAGE_DRAFT_KEY);
      if (drafts) {
        const parsed = JSON.parse(drafts);
        setMessage(parsed[chatId] || "");
      } else {
        setMessage("");
      }
    } catch {
      setMessage("");
    }
  }, [chatId]);

  // scrollToMessageIdが指定されたら該当メッセージを一番下（入力欄のすぐ上）に表示
  useEffect(() => {
    if (scrollToMessageId) {
      const messageElement = document.getElementById(`msg-${scrollToMessageId}`);
      if (messageElement) {
        // block: "end" で要素を表示領域の一番下に配置
        messageElement.scrollIntoView({ behavior: "smooth", block: "end" });
        // ハイライト効果を追加
        messageElement.classList.add("bg-yellow-100");
        setTimeout(() => {
          messageElement.classList.remove("bg-yellow-100");
        }, 2000);
      }
    }
  }, [scrollToMessageId]);

  // ポップアップの外側をクリックしたら閉じる
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (toPopupRef.current && !toPopupRef.current.contains(event.target as Node)) {
        setShowToPopup(false);
      }
      if (aiMenuRef.current && !aiMenuRef.current.contains(event.target as Node)) {
        setShowAIMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Ctrl+Z でメッセージを元に戻す
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        if (messageHistory.length > 0) {
          e.preventDefault();
          const previousMessage = messageHistory[messageHistory.length - 1];
          setMessage(previousMessage);
          setMessageHistory(messageHistory.slice(0, -1));
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [messageHistory]);

  // AI要約処理
  const handleAISummarize = async (type: AISummaryType) => {
    if (!message.trim()) return;

    // 現在のメッセージを履歴に保存
    setMessageHistory([...messageHistory, message]);
    setIsAISummarizing(true);
    setShowAIMenu(false);

    try {
      // Gemini APIを使用して要約
      const promptMap: Record<AISummaryType, string> = {
        summary: `以下のメッセージを簡潔に要約してください。要約だけを返してください。\n\n${message}`,
        bullet: `以下のメッセージを箇条書きに整理してください。各項目は「・」で始めてください。箇条書きだけを返してください。\n\n${message}`,
        gentle: `以下のメッセージをより丁寧で優しい表現に書き換えてください。書き換えた文章だけを返してください。\n\n${message}`,
      };

      const response = await fetch("/api/ai-summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: promptMap[type],
          type,
        }),
      });

      if (!response.ok) {
        throw new Error("AI API request failed");
      }

      const data = await response.json();
      if (data.result) {
        setMessage(data.result);
      } else {
        throw new Error("No result from AI");
      }
    } catch (error) {
      console.error("AI summarization failed:", error);
      // エラー時は元のメッセージを復元
      alert("AI処理に失敗しました。もう一度お試しください。");
      const lastMessage = messageHistory[messageHistory.length - 1];
      if (lastMessage) {
        setMessage(lastMessage);
        setMessageHistory(messageHistory.slice(0, -1));
      }
    } finally {
      setIsAISummarizing(false);
    }
  };

  // AIアクションフォーマットを挿入
  const handleInsertAIFormat = (actionType: AIActionType) => {
    const format = aiActionFormats[actionType];
    setMessage(format);
    inputRef.current?.focus();
  };

  // AIへのメッセージを処理（不備チェック＆返信＆ダッシュボード追加）
  const handleSendToAI = async (userMessage: string) => {
    const now = new Date();
    const timestamp = now.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });
    const date = now.toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric" });

    // ユーザーのメッセージを追加
    const userMsg: Message = {
      id: Date.now().toString(),
      userId: currentUserId,
      userName: currentUserName,
      avatar: currentUserAvatar,
      content: `[To:AI] AIさん\n${userMessage}`,
      timestamp,
      date,
      isRead: true,
      isBookmarked: false,
      reactions: [],
      mentions: ["AI"],
    };
    setMessages(prev => {
      const updated = [...prev, userMsg];
      saveMessages(updated);
      return updated;
    });
    setMessage("");
    setToTarget([]);
    setIsAISummarizing(true);

    try {
      // 今日の日付を取得
      const today = new Date();
      const todayStr = today.toISOString().split("T")[0]; // YYYY-MM-DD形式
      const tomorrowDate = new Date(today);
      tomorrowDate.setDate(today.getDate() + 1);
      const tomorrowStr = tomorrowDate.toISOString().split("T")[0];

      // メッセージの種類を判定
      const messageType: AIActionType | "freeform" =
        userMessage.includes("【タスク追加】") ? "task" :
        userMessage.includes("【TODO追加】") ? "todo" :
        userMessage.includes("【URL登録】") ? "url" :
        userMessage.includes("【メモ保存】") ? "memo" : "freeform";

      console.log("[Message Type]:", messageType);

      // 種類ごとにクライアント側で解析
      let aiResult: {
        status: "complete" | "incomplete" | "freeform" | "need_clarification";
        type?: AIActionType | null;
        clarify?: "assignee" | "group" | null;
        candidates?: string[];
        missing?: string[];
        data?: Record<string, unknown>;
        message: string;
      };

      if (messageType === "task") {
        // ===== タスク追加の処理 =====
        // プロジェクトメンバー情報を文字列化
        const memberList = projectMembers.map(m => `- ${m.name} (ID: ${m.id})`).join("\n");

        // 担当者名をメンバー一覧から検索してマッチング（厳密なマッチングのみ）
        const matchAssignee = (inputName: string): { id: string | null; name: string; notFound: boolean } => {
          if (!inputName || inputName === "なし" || inputName === "") {
            return { id: null, name: "", notFound: false };
          }
          const exactMatch = projectMembers.find(m => m.name === inputName);
          if (exactMatch) {
            return { id: exactMatch.id, name: exactMatch.name, notFound: false };
          }
          const normalizedInput = inputName.toLowerCase();
          for (const member of projectMembers) {
            const memberName = member.name.toLowerCase();
            if (memberName.includes(normalizedInput)) {
              return { id: member.id, name: member.name, notFound: false };
            }
            if (normalizedInput.includes(memberName)) {
              return { id: member.id, name: member.name, notFound: false };
            }
          }
          return { id: null, name: inputName, notFound: true };
        };

        // タスク情報を解析
        const lines = userMessage.split("\n");
        let title = "";
        let assigneeInput = "";
        let startDateText = "";
        let hoursText = "";
        let groupName = "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith("タスク名：") || trimmed.startsWith("タスク名:")) {
            title = trimmed.replace(/^タスク名[：:]/, "").trim();
          } else if (trimmed.startsWith("担当者：") || trimmed.startsWith("担当者:")) {
            assigneeInput = trimmed.replace(/^担当者[：:]/, "").trim();
          } else if (trimmed.startsWith("開始日：") || trimmed.startsWith("開始日:")) {
            startDateText = trimmed.replace(/^開始日[：:]/, "").trim();
          } else if (trimmed.startsWith("工数：") || trimmed.startsWith("工数:")) {
            hoursText = trimmed.replace(/^工数[：:]/, "").trim();
          } else if (trimmed.startsWith("グループ：") || trimmed.startsWith("グループ:")) {
            groupName = trimmed.replace(/^グループ[：:]/, "").trim();
          }
        }

        const assigneeMatch = matchAssignee(assigneeInput);
        let startDate = todayStr;
        if (startDateText === "今日" || startDateText === "今日から") {
          startDate = todayStr;
        } else if (startDateText === "明日" || startDateText === "明日から") {
          startDate = tomorrowStr;
        } else if (startDateText.match(/^\d{4}-\d{2}-\d{2}$/)) {
          startDate = startDateText;
        }
        let hours = 1;
        const hoursMatch = hoursText.match(/(\d+)/);
        if (hoursMatch) {
          hours = parseInt(hoursMatch[1], 10);
        }

        if (!title) {
          aiResult = {
            status: "incomplete",
            type: "task",
            missing: ["タスク名"],
            message: "タスク名を入力してください。",
          };
        } else if (assigneeMatch.notFound && assigneeInput) {
          const memberNames = projectMembers.map(m => m.name).join("、");
          aiResult = {
            status: "need_clarification",
            type: "task",
            clarify: "assignee",
            candidates: projectMembers.map(m => m.name),
            data: { title, assigneeInput, startDate, hours, groupName: groupName || null },
            message: `「${assigneeInput}」さんはプロジェクトメンバーに見つかりませんでした。\n\n登録されているメンバー: ${memberNames || "なし"}\n\nどなたのことでしょうか？`,
          };
        } else {
          aiResult = {
            status: "complete",
            type: "task",
            data: {
              title,
              assigneeId: assigneeMatch.id,
              assigneeName: assigneeMatch.name,
              startDate,
              hours,
              groupName: groupName || null,
              groupId: null,
            },
            message: `タスク「${title}」を追加しました！担当: ${assigneeMatch.name || "未設定"}、開始日: ${startDate}、工数: ${hours}日`,
          };
        }

      } else if (messageType === "todo") {
        // ===== TODO追加の処理 =====
        const lines = userMessage.split("\n");
        let content = "";
        let deadline = "";
        let priority = "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith("内容：") || trimmed.startsWith("内容:")) {
            content = trimmed.replace(/^内容[：:]/, "").trim();
          } else if (trimmed.startsWith("期限：") || trimmed.startsWith("期限:")) {
            deadline = trimmed.replace(/^期限[：:]/, "").trim();
          } else if (trimmed.startsWith("優先度：") || trimmed.startsWith("優先度:")) {
            priority = trimmed.replace(/^優先度[：:]/, "").trim();
          }
        }

        // 期限の変換
        let deadlineDate = "";
        if (deadline === "今日") {
          deadlineDate = todayStr;
        } else if (deadline === "明日") {
          deadlineDate = tomorrowStr;
        } else if (deadline.match(/^\d{4}-\d{2}-\d{2}$/)) {
          deadlineDate = deadline;
        } else if (deadline) {
          deadlineDate = deadline; // そのまま保持
        }

        if (!content) {
          aiResult = {
            status: "incomplete",
            type: "todo",
            missing: ["内容"],
            message: "TODOの内容を入力してください。",
          };
        } else {
          aiResult = {
            status: "complete",
            type: "todo",
            data: {
              content,
              deadline: deadlineDate,
              priority: priority || "普通",
            },
            message: `TODO「${content}」を追加しました！${deadlineDate ? `期限: ${deadlineDate}` : ""}${priority ? `、優先度: ${priority}` : ""}`,
          };
        }

      } else if (messageType === "url") {
        // ===== URL登録の処理 =====
        const lines = userMessage.split("\n");
        let url = "";
        let urlTitle = "";
        let description = "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith("URL：") || trimmed.startsWith("URL:")) {
            url = trimmed.replace(/^URL[：:]/, "").trim();
          } else if (trimmed.startsWith("タイトル：") || trimmed.startsWith("タイトル:")) {
            urlTitle = trimmed.replace(/^タイトル[：:]/, "").trim();
          } else if (trimmed.startsWith("説明：") || trimmed.startsWith("説明:")) {
            description = trimmed.replace(/^説明[：:]/, "").trim();
          }
        }

        if (!url) {
          aiResult = {
            status: "incomplete",
            type: "url",
            missing: ["URL"],
            message: "URLを入力してください。",
          };
        } else if (!url.startsWith("http://") && !url.startsWith("https://")) {
          aiResult = {
            status: "incomplete",
            type: "url",
            missing: ["URL"],
            message: "正しいURL形式で入力してください（http:// または https:// で始まる必要があります）。",
          };
        } else {
          aiResult = {
            status: "complete",
            type: "url",
            data: {
              url,
              title: urlTitle || url,
              description: description || "",
            },
            message: `URL「${urlTitle || url}」を登録しました！`,
          };
        }

      } else if (messageType === "memo") {
        // ===== メモ保存の処理 =====
        // 【メモ保存】の後のテキストをすべてメモ内容として扱う
        const memoContent = userMessage.replace(/^【メモ保存】\s*/m, "").trim();

        if (!memoContent) {
          aiResult = {
            status: "incomplete",
            type: "memo",
            missing: ["内容"],
            message: "メモの内容を入力してください。",
          };
        } else {
          aiResult = {
            status: "complete",
            type: "memo",
            data: {
              content: memoContent,
            },
            message: `メモを保存しました！\n「${memoContent.substring(0, 50)}${memoContent.length > 50 ? "..." : ""}」`,
          };
        }

      } else {
        // ===== フリーフォーム（通常の会話） =====
        // AIに問い合わせて返答を得る
        const response = await fetch("/api/ai-summarize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: `あなたはゲーム開発チームのAIアシスタントです。ユーザーからの質問や相談に答えてください。\n\nユーザー: ${userMessage}`,
            type: "ai-chat",
          }),
        });

        if (!response.ok) {
          throw new Error("AI API request failed");
        }

        const responseData = await response.json();
        aiResult = {
          status: "freeform",
          message: responseData.result || "すみません、うまく処理できませんでした。",
        };
      }

      console.log("[AI Result]:", aiResult);

      // complete の場合はダッシュボードに追加（タスクのみ）
      if (aiResult.status === "complete" && aiResult.type && aiResult.data && onAddFromAI) {
        // hoursが未定義または0の場合、デフォルト値を設定
        let hours = aiResult.data.hours as number;
        if (!hours || hours <= 0) {
          hours = 1; // デフォルト1日
        }

        // startDateが未定義の場合、今日の日付を設定
        let startDate = aiResult.data.startDate as string;
        if (!startDate) {
          startDate = new Date().toISOString().split("T")[0];
        }

        console.log("[AI Task] hours:", hours, "startDate:", startDate, "data:", aiResult.data);

        onAddFromAI({
          type: aiResult.type,
          data: {
            title: aiResult.data.title as string,
            content: aiResult.data.content as string,
            assigneeId: aiResult.data.assigneeId as string,
            assigneeName: aiResult.data.assigneeName as string,
            startDate,
            endDate: aiResult.data.endDate as string,
            hours,
            priority: aiResult.data.priority as string,
            url: aiResult.data.url as string,
            description: aiResult.data.description as string,
            groupId: aiResult.data.groupId as string,
            groupName: aiResult.data.groupName as string,
          },
        });
      }

      // AIの返信メッセージを追加
      let aiReplyContent = aiResult.message;
      if (aiResult.status === "complete") {
        // 種類ごとに完了メッセージを変える
        if (aiResult.type === "task") {
          aiReplyContent = `✅ ${aiResult.message}\n\nガントチャートに追加しました！`;
        } else if (aiResult.type === "todo") {
          aiReplyContent = `✅ ${aiResult.message}\n\nTODOリストに追加しました！`;
        } else if (aiResult.type === "url") {
          aiReplyContent = `✅ ${aiResult.message}\n\nURLリンクに登録しました！`;
        } else if (aiResult.type === "memo") {
          aiReplyContent = `✅ ${aiResult.message}`;
        } else {
          aiReplyContent = `✅ ${aiResult.message}`;
        }
      } else if (aiResult.status === "incomplete") {
        // 入力不足の場合
        aiReplyContent = `⚠️ ${aiResult.message}`;
      } else if (aiResult.status === "need_clarification") {
        // 確認が必要な場合はそのまま質問を表示
        aiReplyContent = `🤔 ${aiResult.message}`;
      }

      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        userId: "AI",
        userName: "AI アシスタント",
        avatar: "🤖",
        content: aiReplyContent,
        timestamp: new Date().toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" }),
        date,
        isRead: false,
        isBookmarked: false,
        reactions: [],
        mentions: [],
      };
      setMessages(prev => {
        const updated = [...prev, aiMsg];
        saveMessages(updated);
        return updated;
      });

    } catch (error) {
      console.error("AI processing failed:", error);
      // エラー時もAIからの返信として表示
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        userId: "AI",
        userName: "AI アシスタント",
        avatar: "🤖",
        content: "すみません、処理中にエラーが発生しました。もう一度お試しください。",
        timestamp: new Date().toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" }),
        date,
        isRead: false,
        isBookmarked: false,
        reactions: [],
        mentions: [],
      };
      setMessages(prev => {
        const updated = [...prev, errorMsg];
        saveMessages(updated);
        return updated;
      });
    } finally {
      setIsAISummarizing(false);
    }
  };

  const handleSend = () => {
    // メッセージか添付ファイルがないと送信できない
    if (!message.trim() && attachments.length === 0) return;

    // TO AIが選択されている場合はAI処理
    if (toTarget.some(t => t.id === "AI")) {
      handleSendToAI(message);
      return;
    }

    // 直前のメッセージがAIからの質問（need_clarification）の場合、AIへの返信として処理
    const lastMessage = messages[messages.length - 1];
    if (lastMessage && lastMessage.userId === "AI" && lastMessage.content.startsWith("🤔")) {
      handleSendToAI(message);
      return;
    }

    const now = new Date();
    let finalContent = message;
    const mentions: string[] = [];

    if (toTarget.length > 0) {
      const toLines = toTarget.map((t) => {
        if (t.id === "ALL") {
          mentions.push("ALL");
          return "[To:ALL]";
        } else {
          mentions.push(t.name);
          return `[To:${t.name}] ${t.name}さん`;
        }
      });
      finalContent = `${toLines.join("\n")}\n${message}`;
    }

    const newMessage: Message = {
      id: Date.now().toString(),
      userId: currentUserId,
      userName: currentUserName,
      avatar: currentUserAvatar,
      content: finalContent,
      timestamp: now.toLocaleTimeString("ja-JP", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      date: now.toLocaleDateString("ja-JP", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
      isRead: true,
      isBookmarked: false,
      reactions: [],
      mentions,
      attachments: attachments.length > 0 ? [...attachments] : undefined,
      replyTo: replyingTo
        ? {
            id: replyingTo.id,
            userName: replyingTo.userName,
            content: replyingTo.content.substring(0, 50),
          }
        : undefined,
    };

    const updatedMessages = [...messages, newMessage];
    setMessages(updatedMessages);
    setMessage("");
    setReplyingTo(null);
    setToTarget([]);
    setAttachments([]); // 添付ファイルをクリア

    // サーバーに保存
    saveMessages(updatedMessages);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleReaction = (messageId: string, emoji: string) => {
    const updatedMessages = messages.map((msg) => {
      if (msg.id !== messageId) return msg;
      const existingReaction = msg.reactions.find((r) => r.emoji === emoji);
      if (existingReaction) {
        if (existingReaction.users.includes(currentUserName)) {
          return {
            ...msg,
            reactions: msg.reactions
              .map((r) =>
                r.emoji === emoji
                  ? { ...r, users: r.users.filter((u) => u !== currentUserName) }
                  : r
              )
              .filter((r) => r.users.length > 0),
          };
        } else {
          return {
            ...msg,
            reactions: msg.reactions.map((r) =>
              r.emoji === emoji ? { ...r, users: [...r.users, currentUserName] } : r
            ),
          };
        }
      } else {
        return {
          ...msg,
          reactions: [...msg.reactions, { emoji, users: [currentUserName] }],
        };
      }
    });
    setMessages(updatedMessages);
    setShowEmojiPicker(null);
    saveMessages(updatedMessages);
  };

  const handleBookmark = (msg: Message) => {
    const newIsBookmarked = !msg.isBookmarked;

    const updatedMessages = messages.map((m) =>
      m.id === msg.id ? { ...m, isBookmarked: newIsBookmarked } : m
    );
    setMessages(updatedMessages);
    saveMessages(updatedMessages);

    // 親コンポーネントに通知
    if (onBookmarkChange) {
      const bookmarkData: BookmarkedMessage = {
        id: msg.id,
        chatId: chatId,
        chatName: chatName,
        chatType: chatType,
        senderName: msg.userName.split(" ")[0],
        senderAvatar: msg.avatar,
        preview: msg.content.substring(0, 50) + (msg.content.length > 50 ? "..." : ""),
        timestamp: `${msg.date.replace("年", "/").replace("月", "/").replace("日", "")} ${msg.timestamp}`,
      };
      onBookmarkChange(bookmarkData, newIsBookmarked);
    }
  };

  const handleReply = (msg: Message) => {
    setReplyingTo(msg);
    inputRef.current?.focus();
  };

  const handleEdit = (msg: Message) => {
    setEditingId(msg.id);
    setEditContent(msg.content);
  };

  const handleSaveEdit = (messageId: string) => {
    const updatedMessages = messages.map((msg) =>
      msg.id === messageId ? { ...msg, content: editContent } : msg
    );
    setMessages(updatedMessages);
    setEditingId(null);
    setEditContent("");
    saveMessages(updatedMessages);
  };

  const handleDelete = (messageId: string) => {
    if (confirm("このメッセージを削除しますか？")) {
      const updatedMessages = messages.filter((msg) => msg.id !== messageId);
      setMessages(updatedMessages);
      saveMessages(updatedMessages);
    }
  };

  const handleCopyLink = (messageId: string) => {
    navigator.clipboard.writeText(`${window.location.href}#msg-${messageId}`);
  };

  const handleAddToTarget = (id: string, name: string) => {
    // 既に追加済みでなければ追加
    if (!toTarget.some((t) => t.id === id)) {
      setToTarget([...toTarget, { id, name }]);
    }
    setShowToPopup(false);
    inputRef.current?.focus();
  };

  const handleRemoveToTarget = (id: string) => {
    setToTarget(toTarget.filter((t) => t.id !== id));
  };

  const commonEmojis = ["👍", "❤️", "😊", "🎉", "👀", "🙏"];

  const groupedMessages: { date: string; messages: Message[] }[] = [];
  messages.forEach((msg) => {
    const lastGroup = groupedMessages[groupedMessages.length - 1];
    if (lastGroup && lastGroup.date === msg.date) {
      lastGroup.messages.push(msg);
    } else {
      groupedMessages.push({ date: msg.date, messages: [msg] });
    }
  });

  // メンバー名からアバターを取得
  const getAvatarForName = (name: string) => {
    const member = dummyGroupInfo.members.find((m) => m.name === name);
    return member?.avatar || name.charAt(0);
  };

  // メッセージ内のTO表記をアイコン付きで表示
  const renderContent = (content: string, mentions: string[]) => {
    const isMentionedToMe = mentions.includes("me") || mentions.includes("ALL");

    // 行ごとに処理
    const lines = content.split("\n");

    return (
      <span>
        {lines.map((line, lineIndex) => {
          // [To:xxx] パターンを検出（後ろの「xxxさん」も含めてマッチ）
          const toMatch = line.match(/^\[To:([^\]]+)\](\s*[^\s]*さん)?(.*)$/);

          if (toMatch) {
            const toName = toMatch[1];
            const restOfLine = toMatch[3] || ""; // 「xxxさん」の後の部分
            const isAll = toName === "ALL";

            return (
              <span key={lineIndex}>
                <span
                  className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs ${
                    isMentionedToMe
                      ? "bg-red-100 text-red-600"
                      : "bg-green-100 text-green-700"
                  }`}
                >
                  {isAll ? (
                    <span className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center text-white text-[8px]">
                      ALL
                    </span>
                  ) : (
                    <span className="w-4 h-4 bg-slate-400 rounded-full flex items-center justify-center text-white text-[10px]">
                      {getAvatarForName(toName)}
                    </span>
                  )}
                  <span className="font-medium">{isAll ? "ALL" : toName}</span>
                </span>
                {restOfLine && <span>{restOfLine}</span>}
                {lineIndex < lines.length - 1 && <br />}
              </span>
            );
          }

          return (
            <span key={lineIndex}>
              {line}
              {lineIndex < lines.length - 1 && <br />}
            </span>
          );
        })}
      </span>
    );
  };

  return (
    <div className="flex h-screen">
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-slate-200 shrink-0">
          {/* Top row - チャット title and search */}
          <div className="h-14 flex items-center justify-between px-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-800">チャット</h2>
            <div className="flex items-center gap-2">
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="メッセージ内容を検索"
                  className="w-64 px-3 py-1.5 pl-8 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🔍</span>
              </div>
            </div>
          </div>

          {/* Bottom row - Chat name and actions */}
          <div className="h-12 flex items-center justify-between px-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-green-600 rounded flex items-center justify-center text-white text-sm">
                {chatName.charAt(0)}
              </div>
              <div>
                <h3 className="font-medium text-slate-700 text-sm">{chatName}</h3>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowInfoPanel(!showInfoPanel)}
                className={`p-2 rounded transition-colors text-sm ${
                  showInfoPanel ? "bg-blue-100 text-blue-600" : "hover:bg-slate-100 text-slate-500"
                }`}
              >
                ℹ️
              </button>
              {chatType === "group" && isAdmin && (
                <button
                  onClick={onOpenSettings}
                  className="p-2 hover:bg-slate-100 rounded transition-colors text-slate-500 text-sm"
                  title="グループ設定（管理者のみ）"
                >
                  ⚙️
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto bg-white">
          {isLoadingMessages ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <p className="text-sm text-slate-500">メッセージを読み込み中...</p>
              </div>
            </div>
          ) : groupedMessages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-slate-400">
                <p className="text-4xl mb-2">💬</p>
                <p className="text-sm">まだメッセージがありません</p>
              </div>
            </div>
          ) : (
          groupedMessages.map((group) => (
            <div key={group.date}>
              <div className="flex items-center justify-center py-4">
                <span className="text-xs text-slate-400 bg-slate-100 px-3 py-1 rounded-full">
                  {group.date}
                </span>
              </div>

              {group.messages.map((msg) => {
                const isMentionedToMe = msg.mentions.includes("me") || msg.mentions.includes("ALL");

                return (
                  <div
                    key={msg.id}
                    id={`msg-${msg.id}`}
                    className={`group px-4 py-3 hover:bg-slate-50 border-l-4 ${
                      isMentionedToMe
                        ? "border-l-red-500 bg-red-50/50"
                        : !msg.isRead
                        ? "border-l-blue-500 bg-blue-50/30"
                        : "border-l-transparent"
                    }`}
                  >
                    {msg.replyTo && (
                      <div className="flex items-center gap-2 ml-12 mb-1 text-xs text-slate-500">
                        <span className="text-slate-400">↩️</span>
                        <span className="font-medium">{msg.replyTo.userName}</span>
                        <span className="truncate max-w-xs">{msg.replyTo.content}</span>
                      </div>
                    )}

                    <div className="flex gap-3">
                      <div className="w-10 h-10 bg-slate-300 rounded flex items-center justify-center text-sm font-medium shrink-0">
                        {msg.avatar}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm text-slate-800">
                            {msg.userName}
                          </span>
                          <span className="text-xs text-slate-400">{msg.timestamp}</span>
                          {msg.isBookmarked && (
                            <span className="text-yellow-500 text-xs">⭐</span>
                          )}
                        </div>

                        {editingId === msg.id ? (
                          <div className="space-y-2">
                            <textarea
                              value={editContent}
                              onChange={(e) => setEditContent(e.target.value)}
                              className="w-full p-2 border border-slate-300 rounded text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                              rows={3}
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleSaveEdit(msg.id)}
                                className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                              >
                                保存
                              </button>
                              <button
                                onClick={() => setEditingId(null)}
                                className="px-3 py-1 bg-slate-200 text-slate-600 text-xs rounded hover:bg-slate-300"
                              >
                                キャンセル
                              </button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-slate-700 whitespace-pre-wrap">
                            {renderContent(msg.content, msg.mentions)}
                          </p>
                        )}

                        {/* 添付ファイル表示 */}
                        {msg.attachments && msg.attachments.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {msg.attachments.map((att) => (
                              <div key={att.id} className="relative group/att">
                                {att.type === "image" ? (
                                  <img
                                    src={att.url}
                                    alt={att.name}
                                    className="max-w-xs max-h-48 rounded-lg border border-slate-200 cursor-pointer hover:opacity-90 transition-opacity"
                                    onClick={() => window.open(att.url, "_blank")}
                                  />
                                ) : (
                                  <video
                                    src={att.url}
                                    controls
                                    className="max-w-xs max-h-48 rounded-lg border border-slate-200"
                                  />
                                )}
                                <div className="absolute bottom-1 left-1 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded">
                                  {att.name.length > 20 ? att.name.substring(0, 20) + "..." : att.name}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Reactions */}
                        {msg.reactions.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {msg.reactions.map((reaction) => (
                              <button
                                key={reaction.emoji}
                                onClick={() => handleReaction(msg.id, reaction.emoji)}
                                className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 hover:bg-slate-200 rounded-full text-xs"
                              >
                                <span>{reaction.emoji}</span>
                                <span className="text-slate-600">{reaction.users.length}</span>
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Action Buttons - 右下に配置 (Chatwork style) */}
                        <div className="opacity-0 group-hover:opacity-100 flex items-center justify-end gap-0.5 mt-2 transition-opacity">
                          <button
                            onClick={() => handleReply(msg)}
                            className="px-2 py-1 text-xs text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded"
                          >
                            ↩ 返信
                          </button>
                          <div className="relative">
                            <button
                              onClick={() =>
                                setShowEmojiPicker(showEmojiPicker === msg.id ? null : msg.id)
                              }
                              className="px-2 py-1 text-xs text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded"
                            >
                              😀 リアクション
                            </button>
                            {showEmojiPicker === msg.id && (
                              <div className="absolute right-0 bottom-8 bg-white border border-slate-200 rounded-lg shadow-lg p-2 flex gap-1 z-10">
                                {commonEmojis.map((emoji) => (
                                  <button
                                    key={emoji}
                                    onClick={() => handleReaction(msg.id, emoji)}
                                    className="p-1.5 hover:bg-slate-100 rounded text-lg"
                                  >
                                    {emoji}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => handleReply(msg)}
                            className="px-2 py-1 text-xs text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded"
                          >
                            ❝❞ 引用
                          </button>
                          <button
                            onClick={() => handleBookmark(msg)}
                            className={`px-2 py-1 text-xs hover:bg-slate-100 rounded ${
                              msg.isBookmarked ? "text-yellow-500" : "text-slate-500 hover:text-slate-700"
                            }`}
                          >
                            🔖 ブックマーク
                          </button>
                          <button
                            onClick={() => handleCopyLink(msg.id)}
                            className="px-2 py-1 text-xs text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded"
                          >
                            🔗 リンク
                          </button>
                          {msg.userId === currentUserId && (
                            <>
                              <button
                                onClick={() => handleEdit(msg)}
                                className="px-2 py-1 text-xs text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded"
                              >
                                ✏️ 編集
                              </button>
                              <button
                                onClick={() => handleDelete(msg.id)}
                                className="px-2 py-1 text-xs text-slate-500 hover:text-red-600 hover:bg-slate-100 rounded"
                              >
                                🗑️ 削除
                              </button>
                            </>
                          )}
                          <div className="relative">
                            <button
                              onClick={() =>
                                setShowMoreMenu(showMoreMenu === msg.id ? null : msg.id)
                              }
                              className="px-2 py-1 text-xs text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded"
                            >
                              ･･･
                            </button>
                            {showMoreMenu === msg.id && (
                              <div className="absolute right-0 bottom-8 bg-white border border-slate-200 rounded-lg shadow-lg py-1 min-w-[120px] z-10">
                                <button
                                  onClick={() => {
                                    navigator.clipboard.writeText(msg.content);
                                    setShowMoreMenu(null);
                                  }}
                                  className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2"
                                >
                                  📋 コピー
                                </button>
                                <button
                                  onClick={() => {
                                    setMessages(
                                      messages.map((m) =>
                                        m.id === msg.id ? { ...m, isRead: false } : m
                                      )
                                    );
                                    setShowMoreMenu(null);
                                  }}
                                  className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2"
                                >
                                  📩 未読
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Reply Preview */}
        {replyingTo && (
          <div className="px-4 py-2 bg-slate-100 border-t border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <span>↩️</span>
              <span className="font-medium">{replyingTo.userName}</span>
              <span className="truncate max-w-md">に返信: {replyingTo.content}</span>
            </div>
            <button
              onClick={() => setReplyingTo(null)}
              className="text-slate-400 hover:text-slate-600"
            >
              ✕
            </button>
          </div>
        )}

        {/* TO Target Preview */}
        {toTarget.length > 0 && !toTarget.some(t => t.id === "AI") && (
          <div className="px-4 py-2 border-t flex items-center justify-between bg-blue-50 border-blue-200">
            <div className="flex items-center gap-2 text-sm flex-wrap text-blue-600">
              <span>TO:</span>
              {toTarget.map((t) => (
                <span
                  key={t.id}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-100"
                >
                  <span className="font-medium">{t.id === "ALL" ? "全員" : t.name}</span>
                  <button
                    onClick={() => handleRemoveToTarget(t.id)}
                    className="text-xs text-blue-400 hover:text-blue-600"
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>
            <button
              onClick={() => setToTarget([])}
              className="text-xs text-blue-400 hover:text-blue-600"
            >
              全てクリア
            </button>
          </div>
        )}

        {/* AI Action Panel - TO AIが選択された時に表示 */}
        {toTarget.some(t => t.id === "AI") && (
          <div className="px-4 py-2 border-t border-purple-200 bg-gradient-to-r from-purple-50 to-blue-50 flex items-center gap-2">
            <div className="flex items-center gap-2 text-sm text-purple-600">
              <span>🤖</span>
              <span className="font-medium">AI:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleInsertAIFormat("task")}
                className="px-3 py-1 bg-white border border-purple-200 rounded-full text-xs text-purple-700 hover:bg-purple-100 flex items-center gap-1 transition-colors"
              >
                <span>📋</span>
                <span>タスク追加</span>
              </button>
              <button
                onClick={() => handleInsertAIFormat("todo")}
                className="px-3 py-1 bg-white border border-purple-200 rounded-full text-xs text-purple-700 hover:bg-purple-100 flex items-center gap-1 transition-colors"
              >
                <span>☑️</span>
                <span>TODO追加</span>
              </button>
              <button
                onClick={() => handleInsertAIFormat("url")}
                className="px-3 py-1 bg-white border border-purple-200 rounded-full text-xs text-purple-700 hover:bg-purple-100 flex items-center gap-1 transition-colors"
              >
                <span>🔗</span>
                <span>URL登録</span>
              </button>
              <button
                onClick={() => handleInsertAIFormat("memo")}
                className="px-3 py-1 bg-white border border-purple-200 rounded-full text-xs text-purple-700 hover:bg-purple-100 flex items-center gap-1 transition-colors"
              >
                <span>📝</span>
                <span>メモ保存</span>
              </button>
            </div>
            <button
              onClick={() => setToTarget([])}
              className="ml-auto text-xs text-purple-400 hover:text-purple-600"
            >
              ✕
            </button>
          </div>
        )}

        {/* Input */}
        <div
          className={`p-4 bg-white border-t border-slate-200 shrink-0 relative ${isDragging ? "bg-blue-50" : ""}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {/* ドラッグ&ドロップオーバーレイ */}
          {isDragging && (
            <div className="absolute inset-0 bg-blue-100/80 border-2 border-dashed border-blue-400 rounded-lg flex items-center justify-center z-10 pointer-events-none">
              <div className="text-center">
                <span className="text-4xl">📎</span>
                <p className="text-blue-600 font-medium mt-2">ここにファイルをドロップ</p>
                <p className="text-blue-400 text-sm">画像・動画ファイルを追加</p>
              </div>
            </div>
          )}
          <div className="flex items-center gap-2 mb-2 text-slate-500">
            <div className="relative" ref={toPopupRef}>
              <button
                onClick={() => setShowToPopup(!showToPopup)}
                className={`px-2 py-1 text-xs rounded hover:bg-slate-100 ${toTarget.length > 0 ? (toTarget.some(t => t.id === "AI") ? "bg-purple-100 text-purple-600" : "bg-blue-100 text-blue-600") : ""}`}
              >
                TO
              </button>
              {showToPopup && (
                <div className="absolute bottom-8 left-0 bg-white border border-slate-200 rounded-lg shadow-lg py-2 min-w-[200px] z-20">
                  <div className="px-3 py-2 border-b border-slate-100">
                    <p className="text-xs text-slate-500">TOを付けずに送信してみましょう</p>
                    <p className="text-xs text-slate-400 mt-1">
                      ダイレクトチャットでは、TOの指定をしなくても、受信者のチャット一覧にTOをつけた時と同じように表示されるようになりました。
                    </p>
                    <button className="text-xs text-blue-500 mt-2 hover:underline">
                      今後このメッセージを表示しない
                    </button>
                  </div>
                  <div className="py-1">
                    {/* AIオプション - プロジェクト紐づきグループのみ表示 */}
                    {isProjectLinked && chatType === "group" && (
                      <button
                        onClick={() => handleAddToTarget("AI", "AI")}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-purple-50 flex items-center gap-2 border-b border-slate-100"
                      >
                        <span className="w-6 h-6 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-white text-xs">
                          🤖
                        </span>
                        <span className="text-purple-700 font-medium">AI</span>
                        <span className="text-xs text-slate-400 ml-1">タスク登録・TODO管理</span>
                        {toTarget.some((t) => t.id === "AI") && (
                          <span className="ml-auto text-purple-500">✓</span>
                        )}
                      </button>
                    )}
                    <button
                      onClick={() => handleAddToTarget("ALL", "全員")}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2"
                    >
                      <span className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs">
                        ALL
                      </span>
                      <span>全員</span>
                    </button>
                    {dummyGroupInfo.members.map((member) => (
                      <button
                        key={member.id}
                        onClick={() => handleAddToTarget(member.id, member.name)}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2"
                      >
                        <span className="w-6 h-6 bg-slate-300 rounded-full flex items-center justify-center text-xs">
                          {member.avatar}
                        </span>
                        <span>{member.name}</span>
                        {toTarget.some((t) => t.id === member.id) && (
                          <span className="ml-auto text-green-500">✓</span>
                        )}
                      </button>
                    ))}
                  </div>
                  <div className="px-3 py-2 border-t border-slate-100">
                    <p className="text-xs text-slate-400">To：相手に呼びかけることができます</p>
                  </div>
                </div>
              )}
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              className={`px-2 py-1 text-xs rounded hover:bg-slate-100 ${attachments.length > 0 ? "bg-blue-100 text-blue-600" : ""}`}
              title="画像・動画を添付"
            >
              📎 {attachments.length > 0 && <span className="text-[10px]">({attachments.length})</span>}
            </button>
            <button className="px-2 py-1 text-xs rounded hover:bg-slate-100">
              😀
            </button>

            {/* AI要約ボタン */}
            <div className="relative ml-auto" ref={aiMenuRef}>
              <button
                onClick={() => setShowAIMenu(!showAIMenu)}
                disabled={!message.trim() || isAISummarizing}
                className={`px-2 py-1 text-xs rounded flex items-center gap-1 ${
                  message.trim()
                    ? "bg-gradient-to-r from-purple-500 to-blue-500 text-white hover:from-purple-600 hover:to-blue-600"
                    : "bg-slate-100 text-slate-400 cursor-not-allowed"
                }`}
              >
                {isAISummarizing ? (
                  <>
                    <span className="animate-spin">⏳</span>
                    <span>処理中...</span>
                  </>
                ) : (
                  <>
                    <span>✨</span>
                    <span>AI編集</span>
                  </>
                )}
              </button>
              {showAIMenu && (
                <div className="absolute bottom-8 right-0 bg-white border border-slate-200 rounded-lg shadow-lg py-1 min-w-[200px] z-20">
                  <div className="px-3 py-2 border-b border-slate-100">
                    <p className="text-xs text-slate-500 font-medium whitespace-nowrap">メッセージをAIで編集（Ctrl+Z で元に戻せます）</p>
                  </div>
                  <button
                    onClick={() => handleAISummarize("summary")}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2 whitespace-nowrap"
                  >
                    <span>📝</span>
                    <span>要約</span>
                    <span className="ml-auto text-xs text-slate-400">短くまとめる</span>
                  </button>
                  <button
                    onClick={() => handleAISummarize("bullet")}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2 whitespace-nowrap"
                  >
                    <span>📋</span>
                    <span>箇条書き</span>
                    <span className="ml-auto text-xs text-slate-400">ポイント整理</span>
                  </button>
                  <button
                    onClick={() => handleAISummarize("gentle")}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2 whitespace-nowrap"
                  >
                    <span>💕</span>
                    <span>優しく</span>
                    <span className="ml-auto text-xs text-slate-400">丁寧な表現に</span>
                  </button>
                </div>
              )}
            </div>

            {/* Undo表示 */}
            {messageHistory.length > 0 && (
              <button
                onClick={() => {
                  const previousMessage = messageHistory[messageHistory.length - 1];
                  setMessage(previousMessage);
                  setMessageHistory(messageHistory.slice(0, -1));
                }}
                className="px-2 py-1 text-xs rounded bg-slate-100 text-slate-600 hover:bg-slate-200 flex items-center gap-1"
                title="Ctrl+Z でも戻せます"
              >
                <span>↩️</span>
                <span>戻す</span>
              </button>
            )}
          </div>

          {/* 添付ファイルプレビュー */}
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2 p-2 bg-slate-50 rounded-lg">
              {attachments.map((att) => (
                <div key={att.id} className="relative group">
                  {att.type === "image" ? (
                    <img
                      src={att.url}
                      alt={att.name}
                      className="w-20 h-20 object-cover rounded-lg border border-slate-200"
                    />
                  ) : (
                    <div className="w-20 h-20 bg-slate-200 rounded-lg border border-slate-300 flex items-center justify-center">
                      <span className="text-2xl">🎬</span>
                    </div>
                  )}
                  <button
                    onClick={() => removeAttachment(att.id)}
                    className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    ×
                  </button>
                  <span className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[10px] px-1 py-0.5 rounded-b-lg truncate">
                    {att.name}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            multiple
            onChange={(e) => handleFileSelect(e.target.files)}
            className="hidden"
          />

          <div className="flex items-end gap-3">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={message}
                onChange={(e) => {
                  setMessage(e.target.value);
                  // 自動リサイズ
                  e.target.style.height = "auto";
                  const newHeight = Math.min(e.target.scrollHeight, 200); // 最大200px
                  e.target.style.height = `${newHeight}px`;
                }}
                onKeyDown={handleKeyDown}
                placeholder="ここにメッセージ内容を入力（Shift + Enterキーで送信）"
                rows={4}
                style={{ minHeight: "100px", maxHeight: "200px" }}
                className="w-full px-3 py-2 border border-slate-300 rounded resize-none focus:outline-none focus:ring-2 focus:ring-green-500 text-sm overflow-y-auto"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="flex items-center gap-1 text-xs text-slate-500">
                <input type="checkbox" className="rounded" />
                Enterで送信
              </label>
              <button
                onClick={handleSend}
                disabled={(!message.trim() && attachments.length === 0) || isAISummarizing}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                送信
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel */}
      {showInfoPanel && (
        <div className="w-80 border-l border-slate-200 bg-white overflow-y-auto shrink-0">
          {chatType === "group" ? (
            <>
              <div className="p-4 border-b border-slate-200">
                <h3 className="font-semibold text-slate-800 mb-3">概要</h3>
                <div className="space-y-3 text-sm">
                  <div>
                    <label className="text-slate-500 text-xs">メールアドレス（未）</label>
                    <p className="text-blue-600">spectrum.info@zatsuonkei.com</p>
                  </div>
                  <div>
                    <label className="text-slate-500 text-xs">ホームページ（未）</label>
                    <p className="text-slate-700">zatsuonkei.com</p>
                  </div>
                </div>
              </div>

              <div className="p-4 border-b border-slate-200">
                <h3 className="font-semibold text-slate-800 mb-2">グループ説明</h3>
                <p className="text-sm text-slate-600 whitespace-pre-wrap">
                  {dummyGroupInfo.description}
                </p>
                <button className="mt-2 text-xs text-blue-600 hover:underline">
                  編集
                </button>
              </div>

              <div className="p-4">
                <h3 className="font-semibold text-slate-800 mb-3">
                  メンバー ({dummyGroupInfo.members.length})
                </h3>
                <div className="space-y-2">
                  {dummyGroupInfo.members.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded cursor-pointer"
                      onClick={() => handleAddToTarget(member.id, member.name)}
                    >
                      <div className="w-8 h-8 bg-slate-300 rounded flex items-center justify-center text-xs">
                        {member.avatar}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-800 truncate">{member.name}</p>
                        <p className="text-xs text-slate-400">{member.role}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="p-4 border-b border-slate-200">
                <div className="flex flex-col items-center mb-4">
                  <div className="w-20 h-20 bg-slate-300 rounded-full flex items-center justify-center text-2xl mb-3">
                    {dummyDMInfo.name.charAt(0)}
                  </div>
                  <h3 className="font-semibold text-slate-800 text-lg">{dummyDMInfo.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`w-2 h-2 rounded-full ${
                      dummyDMInfo.status === "online" ? "bg-green-500" :
                      dummyDMInfo.status === "busy" ? "bg-red-500" : "bg-gray-400"
                    }`}></span>
                    <span className="text-xs text-slate-500">
                      {dummyDMInfo.status === "online" ? "オンライン" :
                       dummyDMInfo.status === "busy" ? "取り込み中" : "オフライン"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-4 border-b border-slate-200">
                <h3 className="font-semibold text-slate-800 mb-3">概要</h3>
                <div className="space-y-3 text-sm">
                  <div>
                    <label className="text-slate-500 text-xs">メールアドレス</label>
                    <p className="text-blue-600">{dummyDMInfo.email}</p>
                  </div>
                  <div>
                    <label className="text-slate-500 text-xs">会社・組織</label>
                    <p className="text-slate-700">{dummyDMInfo.company}</p>
                  </div>
                </div>
              </div>

              <div className="p-4">
                <h3 className="font-semibold text-slate-800 mb-2">メモ</h3>
                <p className="text-sm text-slate-600 whitespace-pre-wrap">
                  {dummyDMInfo.note}
                </p>
                <button className="mt-2 text-xs text-blue-600 hover:underline">
                  編集
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* AI Response Modal */}
      {showAIResponseModal && aiResponseMessage && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600 to-blue-600 px-6 py-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-xl">
                🤖
              </div>
              <div>
                <h3 className="text-white font-semibold">AI アシスタント</h3>
                <p className="text-white/80 text-xs">
                  {aiResponseMessage.type === "task_created" && "タスクを作成しました"}
                  {aiResponseMessage.type === "todo_added" && "TODOを追加しました"}
                  {aiResponseMessage.type === "url_added" && "URLを登録しました"}
                  {aiResponseMessage.type === "question" && "確認があります"}
                  {aiResponseMessage.type === "error" && "エラーが発生しました"}
                </p>
              </div>
              <button
                onClick={() => setShowAIResponseModal(false)}
                className="ml-auto text-white/80 hover:text-white text-xl"
              >
                ×
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">
                {aiResponseMessage.content}
              </p>

              {/* タスク作成成功時の追加情報 */}
              {aiResponseMessage.type === "task_created" && aiResponseMessage.taskData && (
                <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2 text-green-700 mb-2">
                    <span>✅</span>
                    <span className="font-medium">ガントチャートに追加されました</span>
                  </div>
                  <p className="text-sm text-green-600">
                    プロジェクトのガントチャートで確認できます。
                  </p>
                </div>
              )}

              {/* 質問時の入力フォーム */}
              {aiResponseMessage.type === "question" && (
                <div className="mt-4 space-y-3">
                  <textarea
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-500"
                    rows={3}
                    placeholder="追加情報を入力..."
                  />
                  <button
                    onClick={() => {
                      // TODO: 追加情報を送信
                      setShowAIResponseModal(false);
                    }}
                    className="w-full py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 text-sm font-medium"
                  >
                    送信
                  </button>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
              <button
                onClick={() => setShowAIResponseModal(false)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg text-sm"
              >
                閉じる
              </button>
              {aiResponseMessage.type === "task_created" && (
                <button
                  onClick={() => {
                    // TODO: ガントチャートを開く
                    setShowAIResponseModal(false);
                  }}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm"
                >
                  ガントチャートを見る
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
