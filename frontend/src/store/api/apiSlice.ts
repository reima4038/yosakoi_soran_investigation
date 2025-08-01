import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { RootState } from '../index';

// API基本設定
const baseQuery = fetchBaseQuery({
  baseUrl: '/api',
  prepareHeaders: (headers, { getState }) => {
    // 認証トークンを自動的に追加
    const token = localStorage.getItem('authToken');
    if (token) {
      headers.set('authorization', `Bearer ${token}`);
    }
    headers.set('content-type', 'application/json');
    return headers;
  },
});

// エラーハンドリング付きのbaseQuery
const baseQueryWithReauth = async (args: any, api: any, extraOptions: any) => {
  let result = await baseQuery(args, api, extraOptions);
  
  // 401エラーの場合、トークンを削除してログインページにリダイレクト
  if (result.error && result.error.status === 401) {
    localStorage.removeItem('authToken');
    window.location.href = '/login';
  }
  
  return result;
};

// メインAPIスライス
export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithReauth,
  tagTypes: [
    'User',
    'Video',
    'Session',
    'Template',
    'Evaluation',
    'Result',
    'Notification',
    'Dashboard',
  ],
  endpoints: (builder) => ({
    // 認証関連
    login: builder.mutation<
      { token: string; user: any },
      { email: string; password: string }
    >({
      query: (credentials) => ({
        url: '/auth/login',
        method: 'POST',
        body: credentials,
      }),
      invalidatesTags: ['User'],
    }),

    register: builder.mutation<
      { token: string; user: any },
      { username: string; email: string; password: string; displayName?: string }
    >({
      query: (userData) => ({
        url: '/auth/register',
        method: 'POST',
        body: userData,
      }),
      invalidatesTags: ['User'],
    }),

    getCurrentUser: builder.query<any, void>({
      query: () => '/users/me',
      providesTags: ['User'],
    }),

    updateProfile: builder.mutation<any, Partial<any>>({
      query: (profileData) => ({
        url: '/users/me',
        method: 'PUT',
        body: profileData,
      }),
      invalidatesTags: ['User'],
    }),

    // ダッシュボード関連
    getDashboardData: builder.query<any, void>({
      query: () => '/dashboard',
      providesTags: ['Dashboard'],
    }),

    getNotifications: builder.query<any[], void>({
      query: () => '/notifications',
      providesTags: ['Notification'],
    }),

    markNotificationAsRead: builder.mutation<void, string>({
      query: (notificationId) => ({
        url: `/notifications/${notificationId}/read`,
        method: 'PUT',
      }),
      invalidatesTags: ['Notification'],
    }),

    // 動画関連
    getVideos: builder.query<any[], { page?: number; limit?: number; search?: string }>({
      query: ({ page = 1, limit = 10, search = '' }) => ({
        url: '/videos',
        params: { page, limit, search },
      }),
      providesTags: ['Video'],
    }),

    getVideo: builder.query<any, string>({
      query: (id) => `/videos/${id}`,
      providesTags: (result, error, id) => [{ type: 'Video', id }],
    }),

    createVideo: builder.mutation<any, any>({
      query: (videoData) => ({
        url: '/videos',
        method: 'POST',
        body: videoData,
      }),
      invalidatesTags: ['Video'],
    }),

    updateVideo: builder.mutation<any, { id: string; data: any }>({
      query: ({ id, data }) => ({
        url: `/videos/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Video', id }],
    }),

    deleteVideo: builder.mutation<void, string>({
      query: (id) => ({
        url: `/videos/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Video'],
    }),

    // セッション関連
    getSessions: builder.query<any[], void>({
      query: () => '/sessions',
      providesTags: ['Session'],
    }),

    getSession: builder.query<any, string>({
      query: (id) => `/sessions/${id}`,
      providesTags: (result, error, id) => [{ type: 'Session', id }],
    }),

    createSession: builder.mutation<any, any>({
      query: (sessionData) => ({
        url: '/sessions',
        method: 'POST',
        body: sessionData,
      }),
      invalidatesTags: ['Session'],
    }),

    updateSession: builder.mutation<any, { id: string; data: any }>({
      query: ({ id, data }) => ({
        url: `/sessions/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Session', id }],
    }),

    deleteSession: builder.mutation<void, string>({
      query: (id) => ({
        url: `/sessions/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Session'],
    }),

    // テンプレート関連
    getTemplates: builder.query<any[], void>({
      query: () => '/templates',
      providesTags: ['Template'],
    }),

    getTemplate: builder.query<any, string>({
      query: (id) => `/templates/${id}`,
      providesTags: (result, error, id) => [{ type: 'Template', id }],
    }),

    createTemplate: builder.mutation<any, any>({
      query: (templateData) => ({
        url: '/templates',
        method: 'POST',
        body: templateData,
      }),
      invalidatesTags: ['Template'],
    }),

    updateTemplate: builder.mutation<any, { id: string; data: any }>({
      query: ({ id, data }) => ({
        url: `/templates/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Template', id }],
    }),

    deleteTemplate: builder.mutation<void, string>({
      query: (id) => ({
        url: `/templates/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Template'],
    }),

    duplicateTemplate: builder.mutation<any, string>({
      query: (id) => ({
        url: `/templates/${id}/duplicate`,
        method: 'POST',
      }),
      invalidatesTags: ['Template'],
    }),

    // 評価関連
    getEvaluation: builder.query<any, string>({
      query: (sessionId) => `/sessions/${sessionId}/evaluation`,
      providesTags: (result, error, sessionId) => [{ type: 'Evaluation', id: sessionId }],
    }),

    saveEvaluation: builder.mutation<any, { sessionId: string; data: any }>({
      query: ({ sessionId, data }) => ({
        url: `/evaluations/${sessionId}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (result, error, { sessionId }) => [{ type: 'Evaluation', id: sessionId }],
    }),

    submitEvaluation: builder.mutation<any, { sessionId: string; data: any }>({
      query: ({ sessionId, data }) => ({
        url: `/evaluations/${sessionId}/submit`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: (result, error, { sessionId }) => [
        { type: 'Evaluation', id: sessionId },
        { type: 'Session', id: sessionId },
        'Result',
      ],
    }),

    // 結果関連
    getSessionResults: builder.query<any, string>({
      query: (sessionId) => `/sessions/${sessionId}/results`,
      providesTags: (result, error, sessionId) => [{ type: 'Result', id: sessionId }],
    }),

    exportResults: builder.mutation<Blob, { sessionId: string; format: string }>({
      query: ({ sessionId, format }) => ({
        url: `/sessions/${sessionId}/export`,
        method: 'GET',
        params: { format },
        responseHandler: (response) => response.blob(),
      }),
    }),

    // 共有・フィードバック関連
    getSharingData: builder.query<any, string>({
      query: (sessionId) => `/sessions/${sessionId}/sharing`,
      providesTags: (result, error, sessionId) => [{ type: 'Session', id: sessionId }],
    }),

    createShareLink: builder.mutation<any, { sessionId: string; data: any }>({
      query: ({ sessionId, data }) => ({
        url: `/sessions/${sessionId}/share-links`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: (result, error, { sessionId }) => [{ type: 'Session', id: sessionId }],
    }),

    deleteShareLink: builder.mutation<void, { sessionId: string; linkId: string }>({
      query: ({ sessionId, linkId }) => ({
        url: `/sessions/${sessionId}/share-links/${linkId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, { sessionId }) => [{ type: 'Session', id: sessionId }],
    }),

    postFeedback: builder.mutation<any, { sessionId: string; content: string }>({
      query: ({ sessionId, content }) => ({
        url: `/sessions/${sessionId}/feedback`,
        method: 'POST',
        body: { content },
      }),
      invalidatesTags: (result, error, { sessionId }) => [{ type: 'Session', id: sessionId }],
    }),

    postReply: builder.mutation<any, { feedbackId: string; content: string }>({
      query: ({ feedbackId, content }) => ({
        url: `/feedback/${feedbackId}/replies`,
        method: 'POST',
        body: { content },
      }),
      invalidatesTags: ['Session'],
    }),

    likeFeedback: builder.mutation<any, { feedbackId: string; isLike: boolean }>({
      query: ({ feedbackId, isLike }) => ({
        url: `/feedback/${feedbackId}/${isLike ? 'like' : 'dislike'}`,
        method: 'POST',
      }),
      invalidatesTags: ['Session'],
    }),
  }),
});

// エクスポート用のフック
export const {
  // 認証
  useLoginMutation,
  useRegisterMutation,
  useGetCurrentUserQuery,
  useUpdateProfileMutation,
  
  // ダッシュボード
  useGetDashboardDataQuery,
  useGetNotificationsQuery,
  useMarkNotificationAsReadMutation,
  
  // 動画
  useGetVideosQuery,
  useGetVideoQuery,
  useCreateVideoMutation,
  useUpdateVideoMutation,
  useDeleteVideoMutation,
  
  // セッション
  useGetSessionsQuery,
  useGetSessionQuery,
  useCreateSessionMutation,
  useUpdateSessionMutation,
  useDeleteSessionMutation,
  
  // テンプレート
  useGetTemplatesQuery,
  useGetTemplateQuery,
  useCreateTemplateMutation,
  useUpdateTemplateMutation,
  useDeleteTemplateMutation,
  useDuplicateTemplateMutation,
  
  // 評価
  useGetEvaluationQuery,
  useSaveEvaluationMutation,
  useSubmitEvaluationMutation,
  
  // 結果
  useGetSessionResultsQuery,
  useExportResultsMutation,
  
  // 共有・フィードバック
  useGetSharingDataQuery,
  useCreateShareLinkMutation,
  useDeleteShareLinkMutation,
  usePostFeedbackMutation,
  usePostReplyMutation,
  useLikeFeedbackMutation,
} = apiSlice;