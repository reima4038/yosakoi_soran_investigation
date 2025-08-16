import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
  Divider,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Download as DownloadIcon,
  Refresh as RefreshIcon,
  Clear as ClearIcon,
  BugReport as BugReportIcon,
  Speed as SpeedIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import { logger } from '../../utils/logger';
import { errorMonitoring } from '../../utils/errorMonitoring';

export interface DiagnosticPanelProps {
  open?: boolean;
  onClose?: () => void;
}

const DiagnosticPanel: React.FC<DiagnosticPanelProps> = ({
  open = false,
  onClose,
}) => {
  const [diagnosticData, setDiagnosticData] = useState<any>(null);
  const [errorStats, setErrorStats] = useState<any>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (open) {
      refreshDiagnosticData();
    }
  }, [open, refreshKey]);

  const refreshDiagnosticData = () => {
    const diagnostic = logger.generateDiagnosticReport();
    const errors = errorMonitoring.generateErrorReport();
    
    setDiagnosticData(diagnostic);
    setErrorStats(errors);
  };

  const handleDownloadReport = () => {
    const report = {
      diagnostic: diagnosticData,
      errors: errorStats,
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], {
      type: 'application/json',
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `diagnostic-report-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleClearLogs = () => {
    logger.clearLogs();
    errorMonitoring.clearErrors();
    setRefreshKey(prev => prev + 1);
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms.toFixed(0)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const getSeverityColor = (level: number) => {
    switch (level) {
      case 0: return 'default'; // DEBUG
      case 1: return 'info';    // INFO
      case 2: return 'warning'; // WARN
      case 3: return 'error';   // ERROR
      default: return 'default';
    }
  };

  if (!open || !diagnosticData || !errorStats) {
    return null;
  }

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2,
      }}
      onClick={onClose}
    >
      <Card
        sx={{
          maxWidth: '90vw',
          maxHeight: '90vh',
          width: 1000,
          overflow: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <CardHeader
          title={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <BugReportIcon />
              診断パネル
            </Box>
          }
          action={
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Tooltip title="更新">
                <IconButton onClick={() => setRefreshKey(prev => prev + 1)}>
                  <RefreshIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="レポートダウンロード">
                <IconButton onClick={handleDownloadReport}>
                  <DownloadIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="ログクリア">
                <IconButton onClick={handleClearLogs}>
                  <ClearIcon />
                </IconButton>
              </Tooltip>
              <Button onClick={onClose} variant="outlined" size="small">
                閉じる
              </Button>
            </Box>
          }
        />
        
        <CardContent>
          {/* システム情報 */}
          <Accordion defaultExpanded>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="h6">システム情報</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                <Chip label={`ユーザー: ${diagnosticData.systemInfo.userId || '未ログイン'}`} />
                <Chip label={`セッション: ${diagnosticData.systemInfo.sessionId || 'なし'}`} />
                <Chip label={`接続: ${diagnosticData.systemInfo.connectionType || '不明'}`} />
              </Box>
              
              <Typography variant="body2" sx={{ mb: 1 }}>
                <strong>URL:</strong> {diagnosticData.systemInfo.url}
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                <strong>ユーザーエージェント:</strong> {diagnosticData.systemInfo.userAgent}
              </Typography>
              <Typography variant="body2">
                <strong>タイムスタンプ:</strong> {new Date(diagnosticData.systemInfo.timestamp).toLocaleString()}
              </Typography>

              {diagnosticData.systemInfo.memoryUsage && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>メモリ使用量</Typography>
                  <Typography variant="body2">
                    使用中: {Math.round(diagnosticData.systemInfo.memoryUsage.usedJSHeapSize / 1024 / 1024)}MB / 
                    合計: {Math.round(diagnosticData.systemInfo.memoryUsage.totalJSHeapSize / 1024 / 1024)}MB
                  </Typography>
                </Box>
              )}
            </AccordionDetails>
          </Accordion>

          {/* エラー統計 */}
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <ErrorIcon />
                <Typography variant="h6">エラー統計</Typography>
                {errorStats.stats.totalErrors > 0 && (
                  <Chip 
                    label={errorStats.stats.totalErrors} 
                    color="error" 
                    size="small" 
                  />
                )}
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                <Chip 
                  label={`総エラー数: ${errorStats.stats.totalErrors}`} 
                  color="error" 
                />
                <Chip 
                  label={`ユニークエラー: ${errorStats.stats.uniqueErrors}`} 
                  color="warning" 
                />
                <Chip 
                  label={`重要エラー: ${errorStats.stats.criticalErrors.length}`} 
                  color="error" 
                  variant="outlined" 
                />
              </Box>

              {errorStats.stats.recentErrors.length > 0 && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                  最近1時間で {errorStats.stats.recentErrors.length} 件のエラーが発生しています
                </Alert>
              )}

              {Object.keys(errorStats.stats.errorsByType).length > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>エラータイプ別</Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {Object.entries(errorStats.stats.errorsByType).map(([type, count]) => (
                      <Chip key={type} label={`${type}: ${count}`} size="small" />
                    ))}
                  </Box>
                </Box>
              )}
            </AccordionDetails>
          </Accordion>

          {/* パフォーマンス統計 */}
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <SpeedIcon />
                <Typography variant="h6">パフォーマンス統計</Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              {Object.keys(diagnosticData.summary.averagePerformance).length > 0 && (
                <TableContainer component={Paper} sx={{ mb: 2 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>操作</TableCell>
                        <TableCell align="right">平均時間</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {Object.entries(diagnosticData.summary.averagePerformance).map(([operation, avgTime]) => (
                        <TableRow key={operation}>
                          <TableCell>{operation}</TableCell>
                          <TableCell align="right">
                            <Chip 
                              label={formatDuration(avgTime as number)}
                              color={(avgTime as number) > 3000 ? 'error' : (avgTime as number) > 1000 ? 'warning' : 'success'}
                              size="small"
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}

              {diagnosticData.summary.slowOperations.length > 0 && (
                <Alert severity="warning">
                  {diagnosticData.summary.slowOperations.length} 件の遅い操作（3秒以上）が検出されました
                </Alert>
              )}
            </AccordionDetails>
          </Accordion>

          {/* 最近のログ */}
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <WarningIcon />
                <Typography variant="h6">最近のログ</Typography>
                <Chip 
                  label={diagnosticData.summary.totalLogs} 
                  size="small" 
                />
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <TableContainer component={Paper} sx={{ maxHeight: 300 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell>時刻</TableCell>
                      <TableCell>レベル</TableCell>
                      <TableCell>コンテキスト</TableCell>
                      <TableCell>メッセージ</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {diagnosticData.logs.slice(-20).reverse().map((log: any, index: number) => (
                      <TableRow key={index}>
                        <TableCell>
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={['DEBUG', 'INFO', 'WARN', 'ERROR'][log.level]}
                            color={getSeverityColor(log.level) as any}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>{log.context || '-'}</TableCell>
                        <TableCell sx={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {log.message}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </AccordionDetails>
          </Accordion>
        </CardContent>
      </Card>
    </Box>
  );
};

export default DiagnosticPanel;