import React, { useRef, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Box,
  Alert,
} from '@mui/material';
import {
  ContentCopy as CopyIcon,
  SelectAll as SelectAllIcon,
} from '@mui/icons-material';

interface ManualCopyDialogProps {
  open: boolean;
  onClose: () => void;
  text: string;
  title?: string;
  description?: string;
}

const ManualCopyDialog: React.FC<ManualCopyDialogProps> = ({
  open,
  onClose,
  text,
  title = '手動コピー',
  description = '以下のテキストを手動でコピーしてください',
}) => {
  const textFieldRef = useRef<HTMLInputElement>(null);

  // ダイアログが開いたときにテキストを選択
  useEffect(() => {
    if (open && textFieldRef.current) {
      // 少し遅延させてからフォーカスと選択を実行
      setTimeout(() => {
        if (textFieldRef.current) {
          textFieldRef.current.focus();
          textFieldRef.current.select();
        }
      }, 100);
    }
  }, [open]);

  // テキストを全選択
  const handleSelectAll = () => {
    if (textFieldRef.current) {
      textFieldRef.current.focus();
      textFieldRef.current.select();
    }
  };

  // キーボードショートカット（Ctrl+A）でも全選択
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.ctrlKey && event.key === 'a') {
      event.preventDefault();
      handleSelectAll();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth='md'
      fullWidth
      PaperProps={{
        sx: { minHeight: 300 },
      }}
    >
      <DialogTitle>
        <Box display='flex' alignItems='center' gap={1}>
          <CopyIcon />
          {title}
        </Box>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ pt: 1 }}>
          <Alert severity='info' sx={{ mb: 3 }}>
            <Typography variant='body2'>{description}</Typography>
            <Typography variant='body2' sx={{ mt: 1 }}>
              <strong>操作方法:</strong>
              <br />
              • テキストフィールドをクリックして全選択
              <br />
              • Ctrl+A（Windows）またはCmd+A（Mac）で全選択
              <br />• Ctrl+C（Windows）またはCmd+C（Mac）でコピー
            </Typography>
          </Alert>

          <TextField
            ref={textFieldRef}
            fullWidth
            multiline
            rows={4}
            value={text}
            InputProps={{
              readOnly: true,
              sx: {
                fontFamily: 'monospace',
                fontSize: '0.875rem',
              },
            }}
            onKeyDown={handleKeyDown}
            onClick={handleSelectAll}
            sx={{ mb: 2 }}
          />

          <Box display='flex' justifyContent='center'>
            <Button
              variant='outlined'
              startIcon={<SelectAllIcon />}
              onClick={handleSelectAll}
              size='small'
            >
              全選択
            </Button>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} variant='contained'>
          閉じる
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ManualCopyDialog;
