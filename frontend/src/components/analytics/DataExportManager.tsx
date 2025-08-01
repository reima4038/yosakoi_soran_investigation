import React, { useState } from 'react';
import {
  Box,
  Button,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  CircularProgress,
  Alert,
  Snackbar,
} from '@mui/material';
import {
  GetApp as DownloadIcon,
  PictureAsPdf as PdfIcon,
  TableChart as CsvIcon,
  Image as ImageIcon,
} from '@mui/icons-material';
import { analyticsService } from '../../services/analyticsService';

interface DataExportManagerProps {
  sessionId: string;
  sessionName: string;
  disabled?: boolean;
}

export const DataExportManager: React.FC<DataExportManagerProps> = ({
  sessionId,
  sessionName,
  disabled = false,
}) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleExport = async (format: 'pdf' | 'csv' | 'json') => {
    setLoading(true);
    setError(null);
    handleClose();

    try {
      const blob = await analyticsService.exportSessionData(sessionId, format);

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;

      // Set filename based on format
      const timestamp = new Date().toISOString().split('T')[0];
      const sanitizedName = sessionName.replace(/[^a-zA-Z0-9]/g, '_');
      link.download = `${sanitizedName}_analytics_${timestamp}.${format}`;

      // Trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setSuccess(
        `${format.toUpperCase()}ファイルのダウンロードが開始されました`
      );
    } catch (err) {
      console.error('Export failed:', err);
      setError(
        `エクスポートに失敗しました: ${err instanceof Error ? err.message : '不明なエラー'}`
      );
    } finally {
      setLoading(false);
    }
  };

  const handleImageExport = async () => {
    setLoading(true);
    setError(null);
    handleClose();

    try {
      // Find all chart canvases in the current page
      const canvases = document.querySelectorAll('canvas');

      if (canvases.length === 0) {
        throw new Error('エクスポート可能なチャートが見つかりません');
      }

      // Create a combined image from all charts
      const combinedCanvas = document.createElement('canvas');
      const ctx = combinedCanvas.getContext('2d');

      if (!ctx) {
        throw new Error('Canvas context を取得できませんでした');
      }

      // Calculate combined dimensions
      let totalHeight = 0;
      let maxWidth = 0;
      const canvasArray = Array.from(canvases);

      canvasArray.forEach(canvas => {
        totalHeight += canvas.height + 20; // Add some spacing
        maxWidth = Math.max(maxWidth, canvas.width);
      });

      combinedCanvas.width = maxWidth;
      combinedCanvas.height = totalHeight;

      // Fill with white background
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, combinedCanvas.width, combinedCanvas.height);

      // Draw each chart
      let currentY = 0;
      canvasArray.forEach(canvas => {
        ctx.drawImage(canvas, 0, currentY);
        currentY += canvas.height + 20;
      });

      // Convert to blob and download
      combinedCanvas.toBlob(blob => {
        if (blob) {
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;

          const timestamp = new Date().toISOString().split('T')[0];
          const sanitizedName = sessionName.replace(/[^a-zA-Z0-9]/g, '_');
          link.download = `${sanitizedName}_charts_${timestamp}.png`;

          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);

          setSuccess('画像ファイルのダウンロードが開始されました');
        } else {
          throw new Error('画像の生成に失敗しました');
        }
      }, 'image/png');
    } catch (err) {
      console.error('Image export failed:', err);
      setError(
        `画像エクスポートに失敗しました: ${err instanceof Error ? err.message : '不明なエラー'}`
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSnackbarClose = () => {
    setError(null);
    setSuccess(null);
  };

  return (
    <>
      <Button
        variant='outlined'
        startIcon={loading ? <CircularProgress size={20} /> : <DownloadIcon />}
        onClick={handleClick}
        disabled={disabled || loading}
      >
        エクスポート
      </Button>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
      >
        <MenuItem onClick={() => handleExport('pdf')}>
          <ListItemIcon>
            <PdfIcon fontSize='small' />
          </ListItemIcon>
          <ListItemText>PDFレポート</ListItemText>
        </MenuItem>

        <MenuItem onClick={() => handleExport('csv')}>
          <ListItemIcon>
            <CsvIcon fontSize='small' />
          </ListItemIcon>
          <ListItemText>CSVデータ</ListItemText>
        </MenuItem>

        <MenuItem onClick={handleImageExport}>
          <ListItemIcon>
            <ImageIcon fontSize='small' />
          </ListItemIcon>
          <ListItemText>チャート画像</ListItemText>
        </MenuItem>
      </Menu>

      <Snackbar
        open={Boolean(error)}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
      >
        <Alert onClose={handleSnackbarClose} severity='error'>
          {error}
        </Alert>
      </Snackbar>

      <Snackbar
        open={Boolean(success)}
        autoHideDuration={4000}
        onClose={handleSnackbarClose}
      >
        <Alert onClose={handleSnackbarClose} severity='success'>
          {success}
        </Alert>
      </Snackbar>
    </>
  );
};
