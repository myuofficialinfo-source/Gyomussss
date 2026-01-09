import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const friendRequestsPath = path.join(process.cwd(), "data", "friend-requests.json");
const friendsPath = path.join(process.cwd(), "data", "friends.json");
const usersPath = path.join(process.cwd(), "data", "users.json");

type FriendRequest = {
  id: string;
  fromUserId: string;
  toUserId: string;
  status: "pending" | "accepted" | "rejected";
  createdAt: string;
};

type Friendship = {
  id: string;
  user1Id: string;
  user2Id: string;
  createdAt: string;
};

type StoredUser = {
  id: string;
  name: string;
  avatar: string;
  provider: string;
};

function readJSON<T>(filePath: string): T[] {
  try {
    const data = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(data);
  } catch {
    return [];
  }
}

function writeJSON<T>(filePath: string, data: T[]) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

// フレンドリクエスト送信 / フレンド一覧取得
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, fromUserId, toUserId, requestId } = body;

    if (action === "send") {
      // フレンドリクエスト送信
      if (!fromUserId || !toUserId) {
        return NextResponse.json({ error: "Both user IDs required" }, { status: 400 });
      }

      if (fromUserId === toUserId) {
        return NextResponse.json({ error: "Cannot send request to yourself" }, { status: 400 });
      }

      const requests = readJSON<FriendRequest>(friendRequestsPath);
      const friends = readJSON<Friendship>(friendsPath);

      // 既にフレンドか確認
      const alreadyFriends = friends.some(f =>
        (f.user1Id === fromUserId && f.user2Id === toUserId) ||
        (f.user1Id === toUserId && f.user2Id === fromUserId)
      );
      if (alreadyFriends) {
        return NextResponse.json({ error: "Already friends" }, { status: 400 });
      }

      // 既存のリクエストを確認
      const existingRequest = requests.find(r =>
        r.status === "pending" &&
        ((r.fromUserId === fromUserId && r.toUserId === toUserId) ||
          (r.fromUserId === toUserId && r.toUserId === fromUserId))
      );
      if (existingRequest) {
        return NextResponse.json({ error: "Request already exists" }, { status: 400 });
      }

      const newRequest: FriendRequest = {
        id: `req_${Date.now()}`,
        fromUserId,
        toUserId,
        status: "pending",
        createdAt: new Date().toISOString(),
      };

      requests.push(newRequest);
      writeJSON(friendRequestsPath, requests);

      return NextResponse.json({ request: newRequest });
    }

    if (action === "accept" || action === "reject") {
      // リクエスト承認/拒否
      if (!requestId) {
        return NextResponse.json({ error: "Request ID required" }, { status: 400 });
      }

      const requests = readJSON<FriendRequest>(friendRequestsPath);
      const requestIndex = requests.findIndex(r => r.id === requestId);

      if (requestIndex === -1) {
        return NextResponse.json({ error: "Request not found" }, { status: 404 });
      }

      const friendRequest = requests[requestIndex];

      if (action === "accept") {
        friendRequest.status = "accepted";

        // フレンド関係を作成
        const friends = readJSON<Friendship>(friendsPath);
        const newFriendship: Friendship = {
          id: `friend_${Date.now()}`,
          user1Id: friendRequest.fromUserId,
          user2Id: friendRequest.toUserId,
          createdAt: new Date().toISOString(),
        };
        friends.push(newFriendship);
        writeJSON(friendsPath, friends);
      } else {
        friendRequest.status = "rejected";
      }

      requests[requestIndex] = friendRequest;
      writeJSON(friendRequestsPath, requests);

      return NextResponse.json({ request: friendRequest });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Friend request error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// フレンド一覧 / リクエスト一覧取得
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const type = searchParams.get("type"); // "friends" | "requests" | "pending"

    if (!userId) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 });
    }

    const users = readJSON<StoredUser>(usersPath);

    if (type === "requests") {
      // 受信したフレンドリクエスト（pending）
      const requests = readJSON<FriendRequest>(friendRequestsPath);
      const pendingRequests = requests
        .filter(r => r.toUserId === userId && r.status === "pending")
        .map(r => {
          const fromUser = users.find(u => u.id === r.fromUserId);
          return {
            ...r,
            fromUser: fromUser ? {
              id: fromUser.id,
              name: fromUser.name,
              avatar: fromUser.avatar,
            } : null,
          };
        });

      return NextResponse.json({ requests: pendingRequests });
    }

    if (type === "pending") {
      // 送信済みで保留中のリクエスト
      const requests = readJSON<FriendRequest>(friendRequestsPath);
      const pendingRequests = requests
        .filter(r => r.fromUserId === userId && r.status === "pending")
        .map(r => {
          const toUser = users.find(u => u.id === r.toUserId);
          return {
            ...r,
            toUser: toUser ? {
              id: toUser.id,
              name: toUser.name,
              avatar: toUser.avatar,
            } : null,
          };
        });

      return NextResponse.json({ requests: pendingRequests });
    }

    // フレンド一覧
    const friendships = readJSON<Friendship>(friendsPath);
    const userFriendships = friendships.filter(f =>
      f.user1Id === userId || f.user2Id === userId
    );

    const friends = userFriendships.map(f => {
      const friendId = f.user1Id === userId ? f.user2Id : f.user1Id;
      const friend = users.find(u => u.id === friendId);
      return friend ? {
        id: friend.id,
        name: friend.name,
        avatar: friend.avatar,
        provider: friend.provider,
      } : null;
    }).filter(Boolean);

    return NextResponse.json({ friends });
  } catch (error) {
    console.error("Get friends error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
