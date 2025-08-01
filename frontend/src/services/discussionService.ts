import { apiClient } from '../utils/api';

export interface DiscussionThread {
  _id: string;
  shareId?: string;
  evaluationId?: string;
  sessionId?: string;
  type: 'share_comment' | 'evaluation_feedback' | 'session_discussion';
  title?: string;
  isActive: boolean;
  participantIds: Array<{
    _id: string;
    username: string;
    profile?: { displayName?: string };
  }>;
  lastActivityAt: string;
  createdAt: string;
  updatedAt: string;
  commentCount?: number;
}

export interface DiscussionComment {
  _id: string;
  threadId: string;
  parentId?: string;
  authorId: {
    _id: string;
    username: string;
    profile?: {
      displayName?: string;
      avatar?: string;
    };
  };
  content: string;
  mentions: Array<{
    userId: {
      _id: string;
      username: string;
      profile?: { displayName?: string };
    };
    username: string;
    position: number;
  }>;
  isEdited: boolean;
  editedAt?: string;
  isDeleted: boolean;
  deletedAt?: string;
  reactions: Array<{
    userId: string;
    type: string;
    createdAt: string;
  }>;
  attachments: Array<{
    type: string;
    url: string;
    name: string;
    size?: number;
  }>;
  createdAt: string;
  updatedAt: string;
  replyCount?: number;
}

export interface CreateThreadRequest {
  shareId?: string;
  evaluationId?: string;
  sessionId?: string;
  type: 'share_comment' | 'evaluation_feedback' | 'session_discussion';
  title?: string;
}

export interface CreateCommentRequest {
  content: string;
  parentId?: string;
}

class DiscussionService {
  /**
   * ディスカッションスレッドを作成
   */
  async createThread(data: CreateThreadRequest): Promise<DiscussionThread> {
    const response = await api.post('/discussions/threads', data);
    return response.data.data;
  }

  /**
   * ディスカッションスレッド一覧を取得
   */
  async getThreads(params?: {
    shareId?: string;
    evaluationId?: string;
    sessionId?: string;
    type?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    threads: DiscussionThread[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }> {
    const response = await api.get('/discussions/threads', { params });
    return response.data.data;
  }

  /**
   * ディスカッションスレッド詳細を取得
   */
  async getThread(id: string): Promise<DiscussionThread> {
    const response = await api.get(`/discussions/threads/${id}`);
    return response.data.data;
  }

  /**
   * コメントを作成
   */
  async createComment(
    threadId: string,
    data: CreateCommentRequest
  ): Promise<DiscussionComment> {
    const response = await api.post(
      `/discussions/threads/${threadId}/comments`,
      data
    );
    return response.data.data;
  }

  /**
   * コメント一覧を取得
   */
  async getComments(
    threadId: string,
    params?: {
      page?: number;
      limit?: number;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    }
  ): Promise<{
    comments: DiscussionComment[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }> {
    const response = await api.get(
      `/discussions/threads/${threadId}/comments`,
      { params }
    );
    return response.data.data;
  }

  /**
   * コメントを更新
   */
  async updateComment(
    id: string,
    data: { content: string }
  ): Promise<DiscussionComment> {
    const response = await api.put(`/discussions/comments/${id}`, data);
    return response.data.data;
  }

  /**
   * コメントを削除
   */
  async deleteComment(id: string): Promise<void> {
    await api.delete(`/discussions/comments/${id}`);
  }

  /**
   * リアクションを追加/削除
   */
  async toggleReaction(
    commentId: string,
    type: string,
    action: 'add' | 'remove' = 'add'
  ): Promise<DiscussionComment> {
    const response = await api.post(
      `/discussions/comments/${commentId}/reactions`,
      {
        type,
        action,
      }
    );
    return response.data.data;
  }

  /**
   * 返信を取得
   */
  async getReplies(
    commentId: string,
    params?: {
      page?: number;
      limit?: number;
    }
  ): Promise<{
    replies: DiscussionComment[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }> {
    const response = await api.get(
      `/discussions/comments/${commentId}/replies`,
      { params }
    );
    return response.data.data;
  }

  /**
   * メンションを抽出
   */
  extractMentions(
    content: string
  ): Array<{ username: string; position: number }> {
    const mentionRegex = /@(\w+)/g;
    const mentions = [];
    let match;

    while ((match = mentionRegex.exec(content)) !== null) {
      mentions.push({
        username: match[1],
        position: match.index,
      });
    }

    return mentions;
  }

  /**
   * コンテンツ内のメンションをハイライト
   */
  highlightMentions(content: string): string {
    return content.replace(/@(\w+)/g, '<span class="mention">@$1</span>');
  }

  /**
   * リアクションの表示テキストを取得
   */
  getReactionText(type: string): string {
    const reactionMap: Record<string, string> = {
      like: '👍',
      dislike: '👎',
      helpful: '💡',
      agree: '✅',
      disagree: '❌',
    };
    return reactionMap[type] || type;
  }

  /**
   * リアクション数を集計
   */
  aggregateReactions(
    reactions: DiscussionComment['reactions']
  ): Record<string, number> {
    return reactions.reduce(
      (acc, reaction) => {
        acc[reaction.type] = (acc[reaction.type] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );
  }

  /**
   * ユーザーのリアクションを取得
   */
  getUserReaction(
    reactions: DiscussionComment['reactions'],
    userId: string
  ): string | null {
    const userReaction = reactions.find(r => r.userId === userId);
    return userReaction ? userReaction.type : null;
  }

  /**
   * コメントの階層構造を構築
   */
  buildCommentTree(comments: DiscussionComment[]): DiscussionComment[] {
    const commentMap = new Map<
      string,
      DiscussionComment & { replies?: DiscussionComment[] }
    >();
    const rootComments: (DiscussionComment & {
      replies?: DiscussionComment[];
    })[] = [];

    // まずすべてのコメントをマップに追加
    comments.forEach(comment => {
      commentMap.set(comment.id, { ...comment, replies: [] });
    });

    // 親子関係を構築
    comments.forEach(comment => {
      const commentWithReplies = commentMap.get(comment.id)!;

      if (comment.parentId) {
        const parent = commentMap.get(comment.parentId);
        if (parent) {
          parent.replies!.push(commentWithReplies);
        }
      } else {
        rootComments.push(commentWithReplies);
      }
    });

    return rootComments;
  }

  /**
   * 相対時間を取得
   */
  getRelativeTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) {
      return 'たった今';
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes}分前`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours}時間前`;
    } else if (diffInSeconds < 2592000) {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days}日前`;
    } else {
      return date.toLocaleDateString('ja-JP');
    }
  }

  /**
   * コメント内容のバリデーション
   */
  validateComment(content: string): string[] {
    const errors: string[] = [];

    if (!content || content.trim().length === 0) {
      errors.push('コメント内容は必須です');
    }

    if (content.length > 5000) {
      errors.push('コメントは5000文字以下で入力してください');
    }

    return errors;
  }

  /**
   * スレッドタイプの表示テキストを取得
   */
  getThreadTypeText(type: string): string {
    switch (type) {
      case 'share_comment':
        return '共有コメント';
      case 'evaluation_feedback':
        return '評価フィードバック';
      case 'session_discussion':
        return 'セッション議論';
      default:
        return '不明';
    }
  }
}

export const discussionService = new DiscussionService();
