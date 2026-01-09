"use client";

import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import Sidebar, { BookmarkedMessage, Project, LinkedChat, GameSettings, ProjectMember, MoodType, AttendanceRecord } from "@/components/Sidebar";
import ChatArea, { AIAddData } from "@/components/ChatArea";
import ProjectSettingsModal from "@/components/ProjectSettingsModal";
import CreateProjectModal from "@/components/CreateProjectModal";
import ProjectDashboard, { AITaskData } from "@/components/ProjectDashboard";
import CreateNewProjectModal from "@/components/CreateNewProjectModal";
import ProjectChatSettingsModal from "@/components/ProjectChatSettingsModal";
import ProjectGameSettingsModal from "@/components/ProjectGameSettingsModal";
import LoginPage from "@/components/LoginPage";
import AttendancePage from "@/components/AttendancePage";
import AccountSettingsModal from "@/components/AccountSettingsModal";

// ローカルストレージのキー
const ATTENDANCE_STORAGE_KEY = "gyomussss_attendance";

// User型をローカルで定義（NextAuth sessionと互換性を持たせる）
type User = {
  id: string;
  name: string;
  email: string;
  avatar: string;
  provider: "google" | "twitter" | "discord" | "email";
  mood?: MoodType;
  lastMoodUpdate?: string;
};

export default function Home() {
  const { data: session, status } = useSession();

  const [showAttendance, setShowAttendance] = useState(false);
  const [todayAttendance, setTodayAttendance] = useState<AttendanceRecord | null>(null);
  const [userMood, setUserMood] = useState<MoodType | undefined>(undefined);

  const [selectedChat, setSelectedChat] = useState<{
    type: "dm" | "group";
    id: string;
    name: string;
    scrollToMessageId?: string;
  } | null>(null);

  const [isProjectSettingsOpen, setIsProjectSettingsOpen] = useState(false);
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
  const [isCreateNewProjectOpen, setIsCreateNewProjectOpen] = useState(false);
  const [isProjectChatSettingsOpen, setIsProjectChatSettingsOpen] = useState(false);
  const [isGameSettingsOpen, setIsGameSettingsOpen] = useState(false);
  const [isAccountSettingsOpen, setIsAccountSettingsOpen] = useState(false);
  const [bookmarkedMessages, setBookmarkedMessages] = useState<BookmarkedMessage[]>([]);

  // プロジェクト関連のstate
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  // AIから追加されるタスク
  const [pendingAITask, setPendingAITask] = useState<AITaskData | null>(null);

  // プロジェクトデータをサーバーに保存
  const saveProjects = async (projectsToSave: Project[]) => {
    try {
      await fetch("/api/data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "projects", data: projectsToSave }),
      });
    } catch (error) {
      console.error("Failed to save projects:", error);
    }
  };

  // 初期化：勤怠状態をチェック、プロジェクトデータを取得
  useEffect(() => {
    const init = async () => {
      if (status !== "authenticated") return;

      const savedAttendance = localStorage.getItem(ATTENDANCE_STORAGE_KEY);
      const today = new Date().toISOString().split("T")[0];

      // 今日の勤怠記録をチェック
      if (savedAttendance) {
        const attendance = JSON.parse(savedAttendance) as AttendanceRecord;
        if (attendance.date === today) {
          setTodayAttendance(attendance);
        }
      }

      // プロジェクトデータをサーバーから取得
      try {
        const res = await fetch("/api/data?type=projects");
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setProjects(data);
        } else {
          // 初期データがない場合は空の配列
          setProjects([]);
        }
      } catch (error) {
        console.error("Failed to load projects:", error);
        setProjects([]);
      }
    };

    init();
  }, [status]);

  // ログアウト処理
  const handleLogout = async () => {
    setTodayAttendance(null);
    localStorage.removeItem(ATTENDANCE_STORAGE_KEY);
    await signOut({ callbackUrl: "/" });
  };

  // セッションからUser型に変換
  const currentUser: User | null = session?.user ? {
    id: session.user.id,
    name: session.user.name || "Unknown",
    email: session.user.email || "",
    avatar: session.user.image || session.user.name?.charAt(0) || "U",
    provider: "google",
    mood: userMood,
  } : null;

  // ユーザー情報更新処理
  const handleUpdateUser = (user: User) => {
    setUserMood(user.mood);
  };

  // 勤怠完了処理
  const handleAttendanceComplete = (record: AttendanceRecord, mood: MoodType) => {
    // 勤怠記録を保存
    setTodayAttendance(record);
    localStorage.setItem(ATTENDANCE_STORAGE_KEY, JSON.stringify(record));

    // ユーザーの機嫌を更新
    setUserMood(mood);

    // 勤怠画面を閉じる
    setShowAttendance(false);
  };

  const handleBookmarkChange = (message: BookmarkedMessage, isBookmarked: boolean) => {
    if (isBookmarked) {
      // 追加（重複チェック）
      setBookmarkedMessages((prev) => {
        if (prev.some((m) => m.id === message.id)) return prev;
        return [...prev, message];
      });
    } else {
      // 削除
      setBookmarkedMessages((prev) => prev.filter((m) => m.id !== message.id));
    }
  };

  const handleSelectChat = (type: "dm" | "group", id: string, name: string, messageId?: string) => {
    setSelectedChat({ type, id, name, scrollToMessageId: messageId });
    setSelectedProject(null); // チャット選択時はプロジェクト選択を解除
  };

  const handleSelectProject = (project: Project) => {
    setSelectedProject(project);
    setSelectedChat(null); // プロジェクト選択時はチャット選択を解除
  };

  const handleCreateProject = (project: { name: string; icon: string; type: "dm" | "group"; members?: { id: string; role: string }[] }) => {
    console.log("Created project:", project);
  };

  const handleCreateNewProject = async (projectData: Omit<Project, "id">) => {
    const newProject: Project = {
      id: `p${Date.now()}`,
      ...projectData,
    };
    const updatedProjects = [...projects, newProject];
    setProjects(updatedProjects);
    setSelectedProject(newProject); // 作成後に自動選択
    await saveProjects(updatedProjects);
  };

  const handleSaveLinkedChats = async (chats: LinkedChat[], members: ProjectMember[]) => {
    if (!selectedProject) return;

    const updatedProject = { ...selectedProject, linkedChats: chats, projectMembers: members };
    const updatedProjects = projects.map(p => p.id === selectedProject.id ? updatedProject : p);
    setProjects(updatedProjects);
    setSelectedProject(updatedProject);
    await saveProjects(updatedProjects);
  };

  const handleSaveGameSettings = async (settings: GameSettings) => {
    if (!selectedProject) return;

    const updatedProject = { ...selectedProject, gameSettings: settings };
    const updatedProjects = projects.map(p => p.id === selectedProject.id ? updatedProject : p);
    setProjects(updatedProjects);
    setSelectedProject(updatedProject);
    await saveProjects(updatedProjects);
  };

  // AIからのデータ追加処理
  const handleAddFromAI = (data: AIAddData) => {
    console.log("AI added data:", data);

    if (data.type === "task" && data.data.title) {
      // タスクをProjectDashboardに追加
      setPendingAITask({
        title: data.data.title,
        assigneeId: data.data.assigneeId,
        assigneeName: data.data.assigneeName,
        startDate: data.data.startDate,
        hours: data.data.hours,
        groupId: data.data.groupId,
        groupName: data.data.groupName,
      });
    }
  };

  // AIタスク追加完了時の処理
  const handleAITaskAdded = () => {
    setPendingAITask(null);
  };

  // ローディング中
  if (status === "loading") {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  // 未ログイン時：ログイン画面
  if (status === "unauthenticated" || !currentUser) {
    return <LoginPage />;
  }

  // ログイン済みで勤怠画面表示
  if (showAttendance) {
    return (
      <>
        <AttendancePage
          user={currentUser}
          projects={projects}
          onComplete={handleAttendanceComplete}
          existingRecord={todayAttendance || undefined}
          onBack={() => setShowAttendance(false)}
          onOpenSettings={() => setIsAccountSettingsOpen(true)}
        />
        <AccountSettingsModal
          isOpen={isAccountSettingsOpen}
          onClose={() => setIsAccountSettingsOpen(false)}
          user={currentUser}
          onLogout={handleLogout}
          onUpdateUser={handleUpdateUser}
        />
      </>
    );
  }

  // メイン画面
  return (
    <div className="min-h-screen bg-slate-100">
      <Sidebar
        onSelectChat={handleSelectChat}
        selectedChat={selectedChat}
        onCreateProject={() => setIsCreateProjectOpen(true)}
        bookmarkedMessages={bookmarkedMessages}
        projects={projects}
        selectedProject={selectedProject}
        onSelectProject={handleSelectProject}
        onCreateNewProject={() => setIsCreateNewProjectOpen(true)}
        currentUser={currentUser}
        onLogout={handleLogout}
        onOpenAttendance={() => setShowAttendance(true)}
        onUpdateUser={handleUpdateUser}
      />

      {/* Main Content */}
      <main className="ml-64">
        {selectedProject ? (
          <ProjectDashboard
            project={selectedProject}
            onOpenChatSettings={() => setIsProjectChatSettingsOpen(true)}
            onOpenGameSettings={() => setIsGameSettingsOpen(true)}
            pendingAITask={pendingAITask}
            onAITaskAdded={handleAITaskAdded}
            currentUserId={currentUser.id}
          />
        ) : selectedChat ? (
          (() => {
            // このチャットが紐づいているプロジェクトを見つける
            const linkedProject = projects.find(p => p.linkedChats?.some(lc => lc.id === selectedChat.id));
            return (
              <ChatArea
                chatName={selectedChat.name}
                chatId={selectedChat.id}
                chatType={selectedChat.type}
                onOpenSettings={() => setIsProjectSettingsOpen(true)}
                scrollToMessageId={selectedChat.scrollToMessageId}
                onBookmarkChange={handleBookmarkChange}
                isProjectLinked={!!linkedProject}
                onAddFromAI={handleAddFromAI}
                projectMembers={linkedProject?.projectMembers || []}
                linkedChats={linkedProject?.linkedChats || []}
                currentUserId={currentUser.id}
              />
            );
          })()
        ) : (
          <div className="h-screen flex items-center justify-center">
            <div className="text-center">
              <div className="text-6xl mb-4">💬</div>
              <h2 className="text-xl font-semibold text-slate-700 mb-2">
                チャットを選択してください
              </h2>
              <p className="text-slate-500">
                左のサイドバーからDMやグループを選んでください
              </p>
            </div>
          </div>
        )}
      </main>

      {/* Modals */}
      <ProjectSettingsModal
        isOpen={isProjectSettingsOpen}
        onClose={() => setIsProjectSettingsOpen(false)}
        projectName={selectedChat?.name || ""}
      />

      <CreateProjectModal
        isOpen={isCreateProjectOpen}
        onClose={() => setIsCreateProjectOpen(false)}
        onCreate={handleCreateProject}
      />

      <CreateNewProjectModal
        isOpen={isCreateNewProjectOpen}
        onClose={() => setIsCreateNewProjectOpen(false)}
        onCreate={handleCreateNewProject}
      />

      <ProjectChatSettingsModal
        isOpen={isProjectChatSettingsOpen}
        onClose={() => setIsProjectChatSettingsOpen(false)}
        linkedChats={selectedProject?.linkedChats || []}
        projectMembers={selectedProject?.projectMembers || []}
        onSave={handleSaveLinkedChats}
      />

      {selectedProject && (
        <ProjectGameSettingsModal
          isOpen={isGameSettingsOpen}
          onClose={() => setIsGameSettingsOpen(false)}
          project={selectedProject}
          onSave={handleSaveGameSettings}
        />
      )}
    </div>
  );
}
