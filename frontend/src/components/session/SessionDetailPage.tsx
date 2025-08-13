import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  Chip,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Tabs,
  Tab,
  LinearProgress,
  Divider,
  Paper,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
  People as PeopleIcon,
  Assessment as AssessmentIcon,
  PlayArrow as PlayArrowIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  VideoLibrary as VideoLibraryIcon,
  Settings as SettingsIcon,
  Share as ShareIcon,
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth, UserRole } from '../../contexts/AuthContext';
import { sessionService } from '../../services/sessionService';
import { videoService } from '../../services/videoService';
import { templateService } from '../../services/templateService';
import { Session, SessionStatus } from '../../types';
import { handleSessionError, ErrorInfo } from '../../utils/errorHandler';
import { formatDateForDisplay } from '../../utils/dateUtils';
import { ErrorDisplay, LoadingDisplay } from '../common';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role='tabpanel'
      hidden={value !== index}
      id={`session-tabpanel-${index}`}
      aria-labelledby={`session-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

// セッション詳細の拡張型定義（APIレスポンス用）
interface SessionDetail extends Session {
  video?: {
    id: string;
    title: string;
    youtubeId: string;
    thumbnailUrl: string;
    duration?: string;
  };
  template?: {
    id: string;
    name: string;
    description: string;
    categoryCount?: number;
    criteriaCount?: number;
  };
  participantDetails?: Array<{
    id: string;
    name: string;
    email: string;
    avatar?: string;
    role: string;
    hasSubmitted: boolean;
    submittedAt?: string | Date;
    invitedAt: string | Date;
    joinedAt?: string | Date;
  }>;
  evaluations?: Array<{
    id: string;
    evaluatorName: string;
    submittedAt: string | Date;
    overallScore: number;
    commentCount: number;
  }>;
  creatorName?: string;
}

const SessionDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [session, setSession] = useState<SessionDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<ErrorInfo | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [tabValue, setTabValue] = useState(0);

  // セッション詳細の取得
  useEffect(() => {
    let isMounted = true;

    const loadSessionDetail = async () => {
      if (id && isMounted) {
        await fetchSessionDetail(id);
      }
    };

    loadSessionDetail();

    // クリーンアップ関数
    return () => {
      isMounted = false;
    };
  }, [id]);

  const fetchSessionDetail = async (sessionId: string) => {
    try {
      setIsLoading(true);
      setError(null);
      setNotFound(false);

      // まず基本的なセッション詳細を取得
      const sessionData = await sessionService.getSession(sessionId, true);

      if (process.env.NODE_ENV === 'development') {
        console.log('SessionDetailPage: Raw session data:', sessionData);
        console.log('SessionDetailPage: Settings data:', sessionData?.settings);
      }

      if (!sessionData) {
        setNotFound(true);
        setError({
          message: 'セッションデータが見つかりません。',
          severity: 'error',
          details:
            'セッションが削除されたか、データが破損している可能性があります。',
        });
        return;
      }

      // セッション詳細オブジェクトを構築
      const sessionDetail: SessionDetail = {
        ...sessionData,
        // IDフィールドを正規化
        id: sessionData.id || sessionData._id,
        // videoIdとtemplateIdが文字列でない場合は文字列に変換
        videoId:
          typeof sessionData.videoId === 'string'
            ? sessionData.videoId
            : typeof sessionData.videoId === 'object' && sessionData.videoId?.id
              ? sessionData.videoId.id
              : sessionData.videoId,
        templateId:
          typeof sessionData.templateId === 'string'
            ? sessionData.templateId
            : typeof sessionData.templateId === 'object' &&
                sessionData.templateId?.id
              ? sessionData.templateId.id
              : sessionData.templateId,
        // 設定のデフォルト値を確保（バックエンドとフロントエンドのフィールド名をマッピング）
        settings: {
          isAnonymous: sessionData.settings?.allowAnonymous || false,
          showResultsAfterSubmit:
            sessionData.settings?.showRealTimeResults !== false,
          allowComments: !sessionData.settings?.requireComments,
        },
        video: undefined,
        template: undefined,
        participantDetails: undefined,
        evaluations: undefined,
        creatorName: undefined,
      };

      // 動画詳細情報を取得
      const videoId =
        typeof sessionData.videoId === 'string'
          ? sessionData.videoId
          : typeof sessionData.videoId === 'object' && sessionData.videoId
            ? sessionData.videoId.id || sessionData.videoId._id
            : null;

      if (process.env.NODE_ENV === 'development') {
        console.log('Video ID extraction:', {
          rawVideoId: sessionData.videoId,
          extractedVideoId: videoId,
          videoIdType: typeof sessionData.videoId,
        });
      }

      if (videoId) {
        try {
          const videoData = await videoService.getVideo(videoId);
          if (videoData) {
            sessionDetail.video = {
              id: videoData.id || videoData._id,
              title: videoData.title,
              youtubeId: videoData.youtubeId,
              thumbnailUrl: videoData.thumbnailUrl,
              duration: undefined, // YouTube APIから取得する場合は別途実装
            };
          }
        } catch (videoError) {
          console.warn('動画情報の取得に失敗しました:', videoError);
          // 動画情報の取得に失敗してもセッション詳細は表示する
        }
      } else if (
        sessionData.videoId &&
        typeof sessionData.videoId === 'object'
      ) {
        // videoIdがオブジェクトの場合、直接動画情報として使用
        const videoObj = sessionData.videoId as any;
        sessionDetail.video = {
          id: videoObj.id || videoObj._id,
          title: videoObj.title,
          youtubeId: videoObj.youtubeId,
          thumbnailUrl: videoObj.thumbnailUrl,
          duration: undefined,
        };
      }

      // テンプレート詳細情報を取得
      const templateId =
        typeof sessionData.templateId === 'string'
          ? sessionData.templateId
          : typeof sessionData.templateId === 'object' &&
              sessionData.templateId?.id
            ? sessionData.templateId.id
            : null;

      if (templateId) {
        try {
          const templateData = await templateService.getTemplate(templateId);
          if (templateData) {
            sessionDetail.template = {
              id: templateData.id,
              name: templateData.name,
              description: templateData.description,
              categoryCount: templateData.categories?.length || 0,
              criteriaCount:
                templateData.categories?.reduce(
                  (total, category) => total + (category.criteria?.length || 0),
                  0
                ) || 0,
            };
          }
        } catch (templateError) {
          console.warn('テンプレート情報の取得に失敗しました:', templateError);
          // テンプレート情報の取得に失敗してもセッション詳細は表示する
        }
      } else if (
        sessionData.templateId &&
        typeof sessionData.templateId === 'object'
      ) {
        // templateIdがオブジェクトの場合、直接テンプレート情報として使用
        const templateObj = sessionData.templateId as any;
        sessionDetail.template = {
          id: templateObj.id,
          name: templateObj.name,
          description: templateObj.description,
          categoryCount: templateObj.categories?.length || 0,
          criteriaCount:
            templateObj.categories?.reduce(
              (total: number, category: any) =>
                total + (category.criteria?.length || 0),
              0
            ) || 0,
        };
      }

      // 参加者詳細情報を取得
      try {
        const participantsData =
          await sessionService.getSessionParticipants(sessionId);
        if (participantsData && Array.isArray(participantsData)) {
          sessionDetail.participantDetails = participantsData.map(
            (participant: any) => ({
              id: participant.id || participant.userId,
              name: participant.name || participant.displayName || '名前未設定',
              email: participant.email || 'メール未設定',
              avatar: participant.avatar,
              role: participant.role || 'evaluator',
              hasSubmitted: participant.hasSubmitted || false,
              submittedAt: participant.submittedAt,
              invitedAt: participant.invitedAt || participant.createdAt,
              joinedAt: participant.joinedAt,
            })
          );
        }
      } catch (participantsError) {
        console.warn('参加者情報の取得に失敗しました:', participantsError);
        // 参加者情報の取得に失敗した場合は基本の参加者情報を使用
        sessionDetail.participantDetails = sessionData.participants?.map(
          (participant: any) => ({
            id: participant.userId || participant.id,
            name: '名前未設定',
            email: 'メール未設定',
            avatar: undefined,
            role: participant.role || 'evaluator',
            hasSubmitted: participant.hasSubmitted || false,
            submittedAt: undefined,
            invitedAt: participant.invitedAt,
            joinedAt: participant.joinedAt,
          })
        );
      }

      // 評価結果情報を取得（将来的に実装）
      try {
        // 評価結果取得のAPIが実装されたら追加
        sessionDetail.evaluations = [];
      } catch (evaluationsError) {
        console.warn('評価結果の取得に失敗しました:', evaluationsError);
        sessionDetail.evaluations = [];
      }

      // 開発環境でのデバッグ情報
      if (process.env.NODE_ENV === 'development') {
        console.log('Session detail loaded:', {
          sessionId,
          hasVideo: !!sessionDetail.video,
          hasTemplate: !!sessionDetail.template,
          participantCount: sessionDetail.participantDetails?.length || 0,
          videoId:
            typeof sessionData.videoId === 'string'
              ? sessionData.videoId
              : 'object',
          templateId:
            typeof sessionData.templateId === 'string'
              ? sessionData.templateId
              : 'object',
          rawSettings: sessionData.settings,
          mappedSettings: sessionDetail.settings,
        });
      }

      setSession(sessionDetail);
    } catch (error: any) {
      console.error('Session detail fetch error:', error);

      // 統一されたエラーハンドリングを使用
      if (error.response?.status === 404) {
        setNotFound(true);
      }

      const errorInfo = handleSessionError(error, '詳細取得');
      setError(errorInfo);
    } finally {
      setIsLoading(false);
    }
  };

  // ステータス表示用の設定
  const getStatusConfig = (status: SessionStatus) => {
    switch (status) {
      case SessionStatus.DRAFT:
        return {
          label: '下書き',
          color: 'default' as const,
          icon: <EditIcon />,
        };
      case SessionStatus.ACTIVE:
        return {
          label: '進行中',
          color: 'primary' as const,
          icon: <PlayArrowIcon />,
        };
      case SessionStatus.COMPLETED:
        return {
          label: '完了',
          color: 'success' as const,
          icon: <CheckCircleIcon />,
        };
      case SessionStatus.ARCHIVED:
        return {
          label: 'アーカイブ',
          color: 'secondary' as const,
          icon: <ScheduleIcon />,
        };
      default:
        return {
          label: '不明',
          color: 'default' as const,
          icon: <ScheduleIcon />,
        };
    }
  };

  // 進捗率の計算
  const getProgressPercentage = (session: SessionDetail) => {
    const participants =
      session.participantDetails || session.participants || [];
    const submittedCount = participants.filter(
      (p: any) => p.hasSubmitted
    ).length;
    if (participants.length === 0) return 0;
    return Math.round((submittedCount / participants.length) * 100);
  };

  // 日付フォーマット - ユーティリティ関数を使用
  const formatDate = (date: string | Date | undefined | null) => {
    return formatDateForDisplay(date, true);
  };

  // タブ変更
  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // 編集権限の確認
  const canEdit = useMemo(() => {
    if (!user || !session) return false;

    // ADMINは常に編集可能
    if (user.role === UserRole.ADMIN) return true;

    // EVALUATORの場合、セッション作成者のみ編集可能
    if (user.role === UserRole.EVALUATOR) {
      return session.creatorId === user.id;
    }

    return false;
  }, [user, session]);

  // 状態変更ハンドラー
  const handleStatusChange = async (newStatus: SessionStatus) => {
    if (!session) return;

    try {
      setIsLoading(true);
      await sessionService.updateSessionStatus(session.id, newStatus);

      // セッション詳細を再取得
      await fetchSessionDetail(session.id);

      // 成功メッセージを表示（必要に応じて）
      console.log(`セッション状態を${newStatus}に変更しました`);
    } catch (error) {
      console.error('Status update error:', error);
      setError({
        message: 'セッション状態の変更に失敗しました。',
        severity: 'error',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 状態に応じたアクションボタンを取得
  const getStatusActionButton = () => {
    if (!canEdit || !session) return null;

    switch (session.status) {
      case SessionStatus.DRAFT:
        return (
          <Button
            variant='contained'
            color='primary'
            startIcon={<PlayArrowIcon />}
            onClick={() => handleStatusChange(SessionStatus.ACTIVE)}
            disabled={isLoading}
          >
            セッション開始
          </Button>
        );
      case SessionStatus.ACTIVE:
        return (
          <Button
            variant='contained'
            color='success'
            startIcon={<CheckCircleIcon />}
            onClick={() => handleStatusChange(SessionStatus.COMPLETED)}
            disabled={isLoading}
          >
            セッション完了
          </Button>
        );
      case SessionStatus.COMPLETED:
        return (
          <Button
            variant='outlined'
            startIcon={<SettingsIcon />}
            onClick={() => handleStatusChange(SessionStatus.ARCHIVED)}
            disabled={isLoading}
          >
            アーカイブ
          </Button>
        );
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <LoadingDisplay type='linear' message='セッション詳細を読み込み中...' />
    );
  }

  // 404エラーの場合は専用の表示を行う
  if (notFound) {
    const notFoundError: ErrorInfo = {
      message: `指定されたセッション（ID: ${id}）が見つかりません。`,
      severity: 'error',
      details: 'セッションが削除されたか、URLが間違っている可能性があります。',
    };

    return (
      <Box sx={{ p: 3 }}>
        <ErrorDisplay error={notFoundError} showDetails={true} />
        <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
          <Button
            variant='contained'
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/sessions')}
          >
            セッション一覧に戻る
          </Button>
          <Button variant='outlined' onClick={() => navigate('/dashboard')}>
            ダッシュボードに戻る
          </Button>
        </Box>
      </Box>
    );
  }

  if (error || !session) {
    const displayError = error || {
      message: 'セッションが見つかりません',
      severity: 'error' as const,
      details: 'セッションデータの読み込みに失敗しました。',
    };

    return (
      <Box sx={{ p: 3 }}>
        <ErrorDisplay
          error={displayError}
          onRetry={!notFound && id ? () => fetchSessionDetail(id) : undefined}
          showDetails={true}
        />
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mt: 3 }}>
          <Button
            variant='contained'
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/sessions')}
          >
            セッション一覧に戻る
          </Button>
          <Button variant='outlined' onClick={() => navigate('/dashboard')}>
            ダッシュボードに戻る
          </Button>
        </Box>
      </Box>
    );
  }

  const statusConfig = getStatusConfig(session.status);
  const progressPercentage = getProgressPercentage(session);
  const participants = session.participantDetails || session.participants || [];
  const submittedCount = participants.filter((p: any) => p.hasSubmitted).length;

  return (
    <Box sx={{ p: 3 }}>
      {/* ヘッダー */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <IconButton onClick={() => navigate('/sessions')} sx={{ mr: 2 }}>
          <ArrowBackIcon />
        </IconButton>
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant='h4' gutterBottom>
            {session.name}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Chip
              icon={statusConfig.icon}
              label={statusConfig.label}
              color={statusConfig.color}
            />
            <Typography variant='body2' color='text.secondary'>
              作成者: {session.creatorName || '不明'} | 作成日:{' '}
              {formatDate(session.createdAt)}
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {getStatusActionButton()}
          {canEdit && (
            <Button
              variant='outlined'
              startIcon={<EditIcon />}
              onClick={() => navigate(`/sessions/${session.id}/edit`)}
            >
              編集
            </Button>
          )}
        </Box>
      </Box>

      {/* 基本情報カード */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant='h6' gutterBottom>
                セッション概要
              </Typography>
              <Typography variant='body1' sx={{ mb: 2 }}>
                {session.description || 'セッションの説明が設定されていません'}
              </Typography>
              <Typography variant='body2' color='text.secondary'>
                評価期間: {formatDate(session.startDate)} ～{' '}
                {formatDate(session.endDate)}
              </Typography>
              {/* デバッグ情報（開発環境のみ） */}
              {process.env.NODE_ENV === 'development' && (
                <Box sx={{ mt: 2, p: 1, bgcolor: 'grey.100', borderRadius: 1 }}>
                  <Typography variant='caption' color='text.secondary'>
                    Debug: Video ID:{' '}
                    {typeof session.videoId === 'string'
                      ? session.videoId
                      : 'object'}{' '}
                    | Template ID:{' '}
                    {typeof session.templateId === 'string'
                      ? session.templateId
                      : 'object'}
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant='h6' gutterBottom>
                評価進捗
              </Typography>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  mb: 1,
                }}
              >
                <Typography variant='body2'>提出済み</Typography>
                <Typography variant='h6' color='primary'>
                  {submittedCount}/{participants.length}
                </Typography>
              </Box>
              <LinearProgress
                variant='determinate'
                value={progressPercentage}
                sx={{ height: 8, borderRadius: 4, mb: 1 }}
              />
              <Typography variant='body2' color='text.secondary' align='center'>
                {progressPercentage}% 完了
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* タブ */}
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          variant='scrollable'
          scrollButtons='auto'
        >
          <Tab icon={<VideoLibraryIcon />} label='動画・テンプレート' />
          <Tab icon={<PeopleIcon />} label='参加者' />
          <Tab icon={<AssessmentIcon />} label='評価結果' />
          <Tab icon={<SettingsIcon />} label='設定' />
        </Tabs>

        {/* 動画・テンプレートタブ */}
        <TabPanel value={tabValue} index={0}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant='h6' gutterBottom>
                    評価対象動画
                  </Typography>
                  {session.video ? (
                    <>
                      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                        <img
                          src={session.video.thumbnailUrl}
                          alt={session.video.title}
                          style={{
                            width: 120,
                            height: 68,
                            objectFit: 'cover',
                            borderRadius: 4,
                          }}
                          onError={e => {
                            // サムネイル読み込みエラー時のフォールバック
                            (e.target as HTMLImageElement).src =
                              '/placeholder-video.png';
                          }}
                        />
                        <Box>
                          <Typography variant='subtitle1' gutterBottom>
                            {session.video.title}
                          </Typography>
                          <Typography variant='body2' color='text.secondary'>
                            YouTube ID: {session.video.youtubeId}
                          </Typography>
                          {session.video.duration && (
                            <Typography variant='body2' color='text.secondary'>
                              再生時間: {session.video.duration}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                      <Button
                        variant='outlined'
                        startIcon={<PlayArrowIcon />}
                        onClick={() => {
                          const videoId = session.video?.id || session.videoId;
                          if (videoId) {
                            navigate(`/videos/${videoId}`);
                          } else {
                          }
                        }}
                        fullWidth
                      >
                        動画を表示
                      </Button>
                    </>
                  ) : (
                    <Box sx={{ textAlign: 'center', py: 3 }}>
                      <VideoLibraryIcon
                        sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }}
                      />
                      <Typography variant='body2' color='text.secondary'>
                        動画情報を読み込み中...
                      </Typography>
                      {session.videoId && (
                        <Typography variant='caption' color='text.secondary'>
                          動画ID: {session.videoId}
                        </Typography>
                      )}
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant='h6' gutterBottom>
                    評価テンプレート
                  </Typography>
                  {session.template ? (
                    <>
                      <Typography variant='subtitle1' gutterBottom>
                        {session.template.name}
                      </Typography>
                      <Typography
                        variant='body2'
                        color='text.secondary'
                        sx={{ mb: 2 }}
                      >
                        {session.template.description}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                        {(session.template.categoryCount || 0) > 0 && (
                          <Chip
                            label={`${session.template.categoryCount} カテゴリ`}
                            size='small'
                          />
                        )}
                        {(session.template.criteriaCount || 0) > 0 && (
                          <Chip
                            label={`${session.template.criteriaCount} 評価項目`}
                            size='small'
                          />
                        )}
                      </Box>
                      <Button
                        variant='outlined'
                        startIcon={<SettingsIcon />}
                        onClick={() =>
                          session.template &&
                          navigate(`/templates/${session.template.id}`)
                        }
                        fullWidth
                      >
                        テンプレートを表示
                      </Button>
                    </>
                  ) : (
                    <Box sx={{ textAlign: 'center', py: 3 }}>
                      <AssessmentIcon
                        sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }}
                      />
                      <Typography variant='body2' color='text.secondary'>
                        テンプレート情報を読み込み中...
                      </Typography>
                      {session.templateId && (
                        <Typography variant='caption' color='text.secondary'>
                          テンプレートID: {session.templateId}
                        </Typography>
                      )}
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        {/* 参加者タブ */}
        <TabPanel value={tabValue} index={1}>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mb: 2,
            }}
          >
            <Typography variant='h6'>
              参加者一覧 ({participants.length}名)
            </Typography>
            {canEdit && (
              <Button
                variant='outlined'
                startIcon={<PeopleIcon />}
                onClick={() => navigate(`/sessions/${session.id}/participants`)}
              >
                参加者管理
              </Button>
            )}
          </Box>
          {participants.length > 0 ? (
            <List>
              {participants.map((participant: any, index: number) => (
                <React.Fragment
                  key={participant.id || participant.userId || index}
                >
                  <ListItem>
                    <ListItemAvatar>
                      <Avatar src={participant.avatar}>
                        {participant.name?.[0] || '?'}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={participant.name || '名前未設定'}
                      secondary={
                        <Box>
                          <Typography variant='body2' color='text.secondary'>
                            {participant.email || 'メール未設定'} |{' '}
                            {participant.role || '役割未設定'}
                          </Typography>
                          <Typography variant='caption' color='text.secondary'>
                            招待日: {formatDate(participant.invitedAt)}
                            {participant.joinedAt &&
                              ` | 参加日: ${formatDate(participant.joinedAt)}`}
                          </Typography>
                        </Box>
                      }
                    />
                    <ListItemSecondaryAction>
                      <Chip
                        label={participant.hasSubmitted ? '提出済み' : '未提出'}
                        color={participant.hasSubmitted ? 'success' : 'default'}
                        size='small'
                      />
                    </ListItemSecondaryAction>
                  </ListItem>
                  {index < participants.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          ) : (
            <Typography
              variant='body2'
              color='text.secondary'
              align='center'
              sx={{ py: 4 }}
            >
              参加者がいません
            </Typography>
          )}
        </TabPanel>

        {/* 評価結果タブ */}
        <TabPanel value={tabValue} index={2}>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mb: 2,
            }}
          >
            <Typography variant='h6'>
              評価結果 ({session.evaluations?.length || 0}件)
            </Typography>
            <Button
              variant='outlined'
              startIcon={<ShareIcon />}
              onClick={() => navigate(`/sessions/${session.id}/results`)}
            >
              詳細分析を表示
            </Button>
          </Box>
          {session.evaluations && session.evaluations.length > 0 ? (
            <List>
              {session.evaluations.map((evaluation, index) => (
                <React.Fragment key={evaluation.id}>
                  <ListItem>
                    <ListItemText
                      primary={evaluation.evaluatorName}
                      secondary={
                        <Box>
                          <Typography variant='body2' color='text.secondary'>
                            提出日: {formatDate(evaluation.submittedAt)}
                          </Typography>
                          <Typography variant='body2' color='text.secondary'>
                            コメント数: {evaluation.commentCount}件
                          </Typography>
                        </Box>
                      }
                    />
                    <ListItemSecondaryAction>
                      <Chip
                        label={`${evaluation.overallScore}点`}
                        color='primary'
                        variant='outlined'
                      />
                    </ListItemSecondaryAction>
                  </ListItem>
                  {session.evaluations &&
                    index < session.evaluations.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          ) : (
            <Typography
              variant='body2'
              color='text.secondary'
              align='center'
              sx={{ py: 4 }}
            >
              まだ評価結果がありません
            </Typography>
          )}
        </TabPanel>

        {/* 設定タブ */}
        <TabPanel value={tabValue} index={3}>
          <Typography variant='h6' gutterBottom>
            セッション設定
          </Typography>
          {session.settings ? (
            <List>
              <ListItem>
                <ListItemText
                  primary='匿名評価'
                  secondary='評価者の名前を他の参加者に表示しない'
                />
                <ListItemSecondaryAction>
                  <Chip
                    label={session.settings.isAnonymous ? '有効' : '無効'}
                    color={session.settings.isAnonymous ? 'success' : 'default'}
                    size='small'
                  />
                </ListItemSecondaryAction>
              </ListItem>
              <Divider />
              <ListItem>
                <ListItemText
                  primary='提出後結果表示'
                  secondary='評価提出後に他の評価結果を表示する'
                />
                <ListItemSecondaryAction>
                  <Chip
                    label={
                      session.settings.showResultsAfterSubmit ? '有効' : '無効'
                    }
                    color={
                      session.settings.showResultsAfterSubmit
                        ? 'success'
                        : 'default'
                    }
                    size='small'
                  />
                </ListItemSecondaryAction>
              </ListItem>
              <Divider />
              <ListItem>
                <ListItemText
                  primary='コメント機能'
                  secondary='タイムライン連動コメントを許可する'
                />
                <ListItemSecondaryAction>
                  <Chip
                    label={session.settings.allowComments ? '有効' : '無効'}
                    color={
                      session.settings.allowComments ? 'success' : 'default'
                    }
                    size='small'
                  />
                </ListItemSecondaryAction>
              </ListItem>
            </List>
          ) : (
            <Typography
              variant='body2'
              color='text.secondary'
              align='center'
              sx={{ py: 4 }}
            >
              設定情報が読み込まれていません
            </Typography>
          )}
        </TabPanel>
      </Paper>
    </Box>
  );
};

export default SessionDetailPage;
