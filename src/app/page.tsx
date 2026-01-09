"use client";

import { useState, useEffect } from "react";
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
const USER_STORAGE_KEY = "gyomussss_user";
const PROJECTS_STORAGE_KEY = "gyomussss_projects";

// User型をローカルで定義
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
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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

  // チャット一覧
  type DMChat = {
    id: string;
    type: "dm";
    name: string;
    otherUser: {
      id: string;
      name: string;
      avatar: string;
      status: string;
    };
  };
  type GroupChat = {
    id: string;
    type: "group";
    name: string;
    icon: string;
    members: unknown[];
  };
  const [dmChats, setDmChats] = useState<DMChat[]>([]);
  const [groupChats, setGroupChats] = useState<GroupChat[]>([]);

  // AIから追加されるタスク
  const [pendingAITask, setPendingAITask] = useState<AITaskData | null>(null);

  // プロジェクトデータをサーバーとローカルストレージに保存
  const saveProjects = async (projectsToSave: Project[]) => {
    // ローカルストレージに保存（バックアップ）
    localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(projectsToSave));

    // サーバーにも保存を試みる
    try {
      await fetch("/api/data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "projects", data: projectsToSave }),
      });
    } catch (error) {
      console.error("Failed to save projects to server:", error);
    }
  };

  // 初期化：ユーザー情報とプロジェクトデータを取得
  useEffect(() => {
    const init = async () => {
      // ユーザー情報をローカルストレージから取得
      const savedUser = localStorage.getItem(USER_STORAGE_KEY);
      if (savedUser) {
        const user = JSON.parse(savedUser) as User;
        setCurrentUser(user);
        setUserMood(user.mood);
      }

      // 勤怠情報をチェック
      const savedAttendance = localStorage.getItem(ATTENDANCE_STORAGE_KEY);
      const today = new Date().toISOString().split("T")[0];
      if (savedAttendance) {
        const attendance = JSON.parse(savedAttendance) as AttendanceRecord;
        if (attendance.date === today) {
          setTodayAttendance(attendance);
        }
      }

      // プロジェクトデータを取得（サーバー優先、なければローカルストレージ）
      let loadedProjects: Project[] = [];
      try {
        const res = await fetch("/api/data?type=projects");
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          loadedProjects = data;
        }
      } catch (error) {
        console.error("Failed to load projects from server:", error);
      }

      // サーバーにデータがない場合、ローカルストレージから復元
      if (loadedProjects.length === 0) {
        const savedProjects = localStorage.getItem(PROJECTS_STORAGE_KEY);
        if (savedProjects) {
          try {
            loadedProjects = JSON.parse(savedProjects);
            // サーバーに同期
            if (loadedProjects.length > 0) {
              fetch("/api/data", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ type: "projects", data: loadedProjects }),
              }).catch(console.error);
            }
          } catch {
            console.error("Failed to parse local projects");
          }
        }
      } else {
        // サーバーデータをローカルにも保存
        localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(loadedProjects));
      }

      setProjects(loadedProjects);

      setIsLoading(false);
    };

    init();
  }, []);

  // チャット一覧を取得
  const fetchChats = async (userId: string) => {
    try {
      const res = await fetch(`/api/chats?userId=${userId}`);
      const data = await res.json();
      if (data.dms) {
        setDmChats(data.dms);
      }
      if (data.groups) {
        setGroupChats(data.groups);
      }
    } catch (error) {
      console.error("Failed to fetch chats:", error);
    }
  };

  // ユーザーがログインしたらチャット一覧を取得
  useEffect(() => {
    if (currentUser?.id) {
      fetchChats(currentUser.id);
    }
  }, [currentUser?.id]);

  // ログイン処理（サーバーに登録）
  const handleLogin = async (name: string) => {
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, provider: "email" }),
      });
      const data = await res.json();

      if (data.user) {
        const newUser: User = {
          id: data.user.id,
          name: data.user.name,
          email: data.user.email || "",
          avatar: data.user.avatar,
          provider: data.user.provider,
        };
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(newUser));
        setCurrentUser(newUser);
      }
    } catch (error) {
      console.error("Login error:", error);
    }
  };

  // ログアウト処理
  const handleLogout = () => {
    setCurrentUser(null);
    setTodayAttendance(null);
    localStorage.removeItem(USER_STORAGE_KEY);
    localStorage.removeItem(ATTENDANCE_STORAGE_KEY);
  };

  // ユーザー情報更新処理
  const handleUpdateUser = (user: User) => {
    setUserMood(user.mood);
    const updatedUser = { ...currentUser, ...user };
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updatedUser));
    setCurrentUser(updatedUser as User);
  };

  // 勤怠完了処理
  const handleAttendanceComplete = (record: AttendanceRecord, mood: MoodType) => {
    setTodayAttendance(record);
    localStorage.setItem(ATTENDANCE_STORAGE_KEY, JSON.stringify(record));
    setUserMood(mood);
    setShowAttendance(false);
  };

  const handleBookmarkChange = (message: BookmarkedMessage, isBookmarked: boolean) => {
    if (isBookmarked) {
      setBookmarkedMessages((prev) => {
        if (prev.some((m) => m.id === message.id)) return prev;
        return [...prev, message];
      });
    } else {
      setBookmarkedMessages((prev) => prev.filter((m) => m.id !== message.id));
    }
  };

  const handleSelectChat = (type: "dm" | "group", id: string, name: string, messageId?: string) => {
    setSelectedChat({ type, id, name, scrollToMessageId: messageId });
    setSelectedProject(null);
  };

  const handleSelectProject = (project: Project) => {
    setSelectedProject(project);
    setSelectedChat(null);
  };

  const handleCreateProject = (project: { name: string; icon: string; type: "dm" | "group"; members?: { id: string; role: string }[] }) => {
    console.log("Created project:", project);
  };

  const handleCreateNewProject = async (projectData: Omit<Project, "id">) => {
    const newProject: Project = {
      id: `p${Date.now()}`,
      ...projectData,
      creatorId: currentUser?.id, // 作成者IDを設定
    };
    const updatedProjects = [...projects, newProject];
    setProjects(updatedProjects);
    setSelectedProject(newProject);
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

  // フレンドとのDMを開始
  const handleStartDM = async (friendId: string, friendName: string) => {
    // DMが既に存在するか確認
    const [user1, user2] = [currentUser?.id || "", friendId].sort();
    const dmChatId = `dm_${user1}_${user2}`;

    const existingDm = dmChats.find(dm => dm.id === dmChatId);
    if (existingDm) {
      // 既存のDMを開く
      setSelectedChat({ type: "dm", id: dmChatId, name: friendName });
      setSelectedProject(null);
      return;
    }

    // DMがなければ作成
    try {
      const res = await fetch("/api/chats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "createDM",
          userId: currentUser?.id,
          friendId,
        }),
      });
      const data = await res.json();
      if (data.dm) {
        // チャット一覧を更新してから開く
        await fetchChats(currentUser?.id || "");
        setSelectedChat({ type: "dm", id: dmChatId, name: friendName });
        setSelectedProject(null);
      }
    } catch (error) {
      console.error("Failed to create DM:", error);
    }
  };

  // ローディング中
  if (isLoading) {
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
  if (!currentUser) {
    return <LoginPage onLogin={handleLogin} />;
  }

  // 現在のユーザー（moodを反映）
  const userWithMood: User = {
    ...currentUser,
    mood: userMood,
  };

  // ログイン済みで勤怠画面表示
  if (showAttendance) {
    return (
      <>
        <AttendancePage
          user={userWithMood}
          projects={projects}
          onComplete={handleAttendanceComplete}
          existingRecord={todayAttendance || undefined}
          onBack={() => setShowAttendance(false)}
          onOpenSettings={() => setIsAccountSettingsOpen(true)}
        />
        <AccountSettingsModal
          isOpen={isAccountSettingsOpen}
          onClose={() => setIsAccountSettingsOpen(false)}
          user={userWithMood}
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
        currentUser={userWithMood}
        onLogout={handleLogout}
        onOpenAttendance={() => setShowAttendance(true)}
        onUpdateUser={handleUpdateUser}
        dmChats={dmChats}
        groupChats={groupChats}
        onRefreshChats={() => fetchChats(userWithMood.id)}
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
            currentUserId={userWithMood.id}
          />
        ) : selectedChat ? (
          (() => {
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
                currentUserId={userWithMood.id}
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
        currentUserId={userWithMood.id}
        onStartDM={handleStartDM}
      />

      <CreateNewProjectModal
        isOpen={isCreateNewProjectOpen}
        onClose={() => setIsCreateNewProjectOpen(false)}
        onCreate={handleCreateNewProject}
        currentUser={userWithMood}
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
