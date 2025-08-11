# 設計書

## 概要

セッション管理機能の完成を目的として、現在不足している機能を実装します。主な問題は、セッション詳細でのモックデータ表示、セッション編集機能の404エラー、参加者管理機能の404エラーです。これらを解決するために、適切なルーティング、コンポーネント、APIインテグレーションを実装します。

## アーキテクチャ

### 現在の問題点
1. **ルーティングの不備**: `/sessions/:id/edit` と `/sessions/:id/participants` のルートが未定義
2. **コンポーネントの不足**: SessionEditPage と ParticipantManagementPage が存在しない
3. **APIインテグレーションの不完全**: SessionDetailPageでモックデータを使用

### 解決アプローチ
1. **ルーティングの追加**: App.tsxに不足しているルートを追加
2. **新規コンポーネントの作成**: 編集と参加者管理のページコンポーネントを作成
3. **APIインテグレーションの修正**: 実際のAPIを使用するように修正

## コンポーネントとインターフェース

### 1. ルーティング構造
```
/sessions                    - SessionList
/sessions/create            - SessionManagement (作成)
/sessions/:id               - SessionDetailPage
/sessions/:id/edit          - SessionEditPage (新規作成)
/sessions/:id/participants  - ParticipantManagementPage (新規作成)
/sessions/:id/results       - ResultsPage (既存)
```

### 2. 新規コンポーネント

#### SessionEditPage
- **目的**: 既存セッションの編集
- **機能**:
  - セッション基本情報の編集（名前、説明、期間）
  - セッション設定の変更
  - 動画・テンプレートの変更
  - 保存・キャンセル機能
- **権限**: ADMIN、EVALUATOR（作成者のみ）

#### ParticipantManagementPage
- **目的**: セッション参加者の管理
- **機能**:
  - 現在の参加者一覧表示
  - 新規参加者の招待（メール送信）
  - 参加者の削除
  - 参加者権限の変更
  - 招待状況の確認
- **権限**: ADMIN、EVALUATOR（作成者のみ）

### 3. 既存コンポーネントの修正

#### SessionDetailPage
- **修正内容**:
  - モックデータの削除
  - 実際のAPIを使用したデータ取得
  - エラーハンドリングの改善
  - ローディング状態の適切な管理

#### SessionList
- **修正内容**:
  - APIエラー時のフォールバック処理改善
  - モックデータの削除

## データモデル

### SessionDetail (拡張型)
```typescript
interface SessionDetail extends Session {
  video: {
    id: string;
    title: string;
    youtubeId: string;
    thumbnailUrl: string;
    duration: string;
  };
  template: {
    id: string;
    name: string;
    description: string;
    categoryCount: number;
    criteriaCount: number;
  };
  participants: SessionParticipant[];
  evaluations: EvaluationSummary[];
  creator: {
    id: string;
    name: string;
  };
}
```

### SessionParticipant (拡張型)
```typescript
interface SessionParticipant {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: SessionUserRole;
  hasSubmitted: boolean;
  submittedAt?: string;
  invitedAt: string;
  joinedAt?: string;
  invitationStatus: 'pending' | 'accepted' | 'declined';
}
```

### ParticipantInvitation
```typescript
interface ParticipantInvitation {
  emails: string[];
  message?: string;
  role: SessionUserRole;
}
```

## エラーハンドリング

### APIエラーの分類
1. **ネットワークエラー**: 接続失敗、タイムアウト
2. **認証エラー**: 未認証、権限不足
3. **データエラー**: 不正なデータ、バリデーション失敗
4. **サーバーエラー**: 500系エラー

### エラー表示戦略
- **グローバルエラー**: Snackbarでの通知
- **ページレベルエラー**: Alertコンポーネントでの表示
- **フォームエラー**: フィールド単位でのエラー表示
- **404エラー**: 専用の404ページへリダイレクト

## テスト戦略

### 単体テスト
- **コンポーネントテスト**: React Testing Libraryを使用
- **サービステスト**: APIモックを使用したテスト
- **ユーティリティテスト**: 純粋関数のテスト

### 統合テスト
- **ページレベルテスト**: ユーザーフローのテスト
- **APIインテグレーションテスト**: 実際のAPIとの連携テスト

### テストケース
1. **セッション詳細表示**:
   - 正常なデータ表示
   - APIエラー時の処理
   - 権限による表示制御

2. **セッション編集**:
   - フォームの初期値設定
   - バリデーション
   - 保存処理
   - 権限チェック

3. **参加者管理**:
   - 参加者一覧表示
   - 招待機能
   - 削除機能
   - 権限変更

## セキュリティ考慮事項

### 認証・認可
- **JWT認証**: APIリクエストでのトークン検証
- **ロールベースアクセス制御**: 機能レベルでの権限チェック
- **セッション所有者チェック**: 編集・管理権限の確認

### データ保護
- **入力値検証**: XSS攻撃の防止
- **CSRFトークン**: 状態変更操作での保護
- **機密情報の保護**: パスワード、トークンの適切な管理

## パフォーマンス最適化

### データ取得の最適化
- **キャッシュ戦略**: Redux Toolkitでのデータキャッシュ
- **遅延読み込み**: 大きなデータセットの段階的読み込み
- **リアルタイム更新**: WebSocketでの進捗状況更新

### UI/UXの最適化
- **ローディング状態**: スケルトンローダーの使用
- **楽観的更新**: ユーザー操作の即座な反映
- **エラー回復**: 自動リトライ機能

## 実装優先度

### 高優先度
1. ルーティングの追加
2. SessionEditPageの作成
3. ParticipantManagementPageの作成
4. SessionDetailPageのAPI統合

### 中優先度
1. エラーハンドリングの改善
2. ローディング状態の最適化
3. 権限チェックの強化

### 低優先度
1. パフォーマンス最適化
2. 高度なUI/UX改善
3. 追加機能の実装