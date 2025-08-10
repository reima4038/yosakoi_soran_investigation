import React from 'react';
import { useNavigate } from 'react-router-dom';
import SessionCreationForm from './SessionCreationForm';

interface SessionManagementProps {}

const SessionManagement: React.FC<SessionManagementProps> = () => {
  const navigate = useNavigate();

  // セッション作成ページでは常にフォームを表示
  return (
    <SessionCreationForm
      onSessionCreated={() => {
        // セッション作成後はセッション一覧に戻る
        navigate('/sessions');
      }}
      onCancel={() => navigate('/sessions')}
    />
  );
};

export default SessionManagement;