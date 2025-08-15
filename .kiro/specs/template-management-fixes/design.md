# Design Document

## Overview

テンプレート管理機能の不具合修正を行い、完全に機能するテンプレート管理システムを実現する。主な修正対象は、テンプレート編集機能の実装、APIとの適切な連携、複製機能の永続化、公開・非公開切り替え機能の追加である。

## Architecture

### Frontend Architecture

```
components/template/
├── TemplateList.tsx (既存 - 修正)
├── TemplateDetailPage.tsx (既存 - 修正)
├── TemplateCreatePage.tsx (既存)
└── TemplateEditPage.tsx (新規作成)

services/
└── templateService.ts (既存 - 修正)

App.tsx (ルーティング追加)
```

### Backend Architecture

```
routes/
└── templates.ts (既存 - 修正)

models/
└── Template.ts (既存 - 修正)
```

## Components and Interfaces

### 1. TemplateEditPage Component (新規作成)

**Purpose**: 既存テンプレートの編集機能を提供

**Props**:
```typescript
interface TemplateEditPageProps {
  // URLパラメータからテンプレートIDを取得
}
```

**State**:
```typescript
interface TemplateEditState {
  template: Template | null;
  isLoading: boolean;
  error: string | null;
  isSaving: boolean;
}
```

**Key Features**:
- テンプレートデータの事前読み込み
- フォーム検証
- 保存・キャンセル機能
- エラーハンドリング

### 2. Template Model Extension (Backend)

**Current Model**: 既存のTemplateモデルに以下のフィールドを追加

```typescript
interface ITemplate extends Document {
  // 既存フィールド
  name: string;
  description: string;
  createdAt: Date;
  creatorId: mongoose.Types.ObjectId;
  categories: ICategory[];
  allowGeneralComments?: boolean;
  
  // 新規追加フィールド
  isPublic: boolean; // 公開・非公開フラグ
  updatedAt: Date; // 更新日時
}
```

### 3. Template Service Updates

**New Methods**:
```typescript
class TemplateService {
  // 既存メソッド
  async getTemplates(): Promise<Template[]>
  async getTemplate(id: string): Promise<Template>
  async createTemplate(templateData: CreateTemplateRequest): Promise<Template>
  async updateTemplate(id: string, templateData: CreateTemplateRequest): Promise<Template>
  async deleteTemplate(id: string): Promise<void>
  async duplicateTemplate(id: string): Promise<Template>
  
  // 新規追加メソッド
  async toggleTemplateVisibility(id: string, isPublic: boolean): Promise<Template>
}
```

### 4. API Endpoints Updates

**New/Modified Endpoints**:
```
PUT /api/templates/:id/visibility - テンプレート可視性切り替え
POST /api/templates/:id/duplicate - テンプレート複製 (既存 - 修正)
PUT /api/templates/:id - テンプレート更新 (既存 - 修正)
GET /api/templates - テンプレート一覧 (既存 - 修正)
GET /api/templates/:id - テンプレート詳細 (既存 - 修正)
```

## Data Models

### Template Model Schema Update

```typescript
const TemplateSchema = new Schema<ITemplate>({
  // 既存フィールド
  name: { type: String, required: true, trim: true, maxlength: 100 },
  description: { type: String, required: true, trim: true, maxlength: 1000 },
  createdAt: { type: Date, default: Date.now },
  creatorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  categories: { type: [CategorySchema], required: true },
  allowGeneralComments: { type: Boolean, default: true },
  
  // 新規追加フィールド
  isPublic: { type: Boolean, default: true }, // デフォルトは公開
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true // createdAt, updatedAtを自動管理
});
```

### Frontend Template Interface Update

```typescript
interface Template {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string; // 新規追加
  creatorId: string;
  categories: Category[];
  allowGeneralComments?: boolean;
  isPublic: boolean; // 新規追加
}
```

## Error Handling

### Frontend Error Handling Strategy

1. **API Error Handling**:
   - ネットワークエラー: 再試行オプション提供
   - 認証エラー: ログインページへリダイレクト
   - 権限エラー: 適切なエラーメッセージ表示
   - バリデーションエラー: フィールド別エラー表示

2. **User Feedback**:
   - ローディング状態の表示
   - 成功メッセージの表示
   - エラーメッセージの表示
   - 操作確認ダイアログ

### Backend Error Handling

1. **Validation Errors**:
   - 入力データの検証
   - 重み合計の検証
   - 必須フィールドの検証

2. **Authorization Errors**:
   - 作成者権限の確認
   - 管理者権限の確認

3. **Database Errors**:
   - 接続エラーの処理
   - 制約違反の処理

## Testing Strategy

### Unit Tests

1. **Frontend Component Tests**:
   - TemplateEditPage コンポーネントのレンダリング
   - フォーム入力の処理
   - API呼び出しの処理
   - エラー状態の処理

2. **Service Tests**:
   - templateService の各メソッド
   - API レスポンスの処理
   - エラーハンドリング

3. **Backend API Tests**:
   - 各エンドポイントの動作
   - 認証・認可の処理
   - バリデーションの処理

### Integration Tests

1. **Template CRUD Operations**:
   - 作成 → 読み取り → 更新 → 削除の一連の流れ
   - 複製機能の動作確認
   - 可視性切り替えの動作確認

2. **User Permission Tests**:
   - 作成者権限の確認
   - 管理者権限の確認
   - 非公開テンプレートのアクセス制御

### End-to-End Tests

1. **Template Management Flow**:
   - テンプレート一覧表示
   - テンプレート詳細表示
   - テンプレート編集
   - テンプレート複製
   - 可視性切り替え

## Implementation Plan

### Phase 1: Backend Model and API Updates

1. Template モデルに isPublic フィールドを追加
2. 可視性切り替えAPIエンドポイントを追加
3. 既存APIエンドポイントの修正（isPublic フィールドの対応）
4. 複製APIの修正（永続化の確保）

### Phase 2: Frontend Service Updates

1. templateService に可視性切り替えメソッドを追加
2. 既存メソッドの修正（isPublic フィールドの対応）
3. エラーハンドリングの改善

### Phase 3: Frontend Component Implementation

1. TemplateEditPage コンポーネントの作成
2. ルーティングの追加
3. TemplateList コンポーネントの修正（可視性切り替えUI追加）
4. TemplateDetailPage コンポーネントの修正（編集リンク修正）

### Phase 4: Testing and Bug Fixes

1. 単体テストの実装
2. 統合テストの実装
3. E2Eテストの実装
4. バグ修正と最適化

## Security Considerations

1. **Authorization**:
   - テンプレート編集は作成者または管理者のみ
   - 非公開テンプレートは作成者と管理者のみアクセス可能

2. **Input Validation**:
   - フロントエンドとバックエンドでの二重検証
   - XSS攻撃の防止
   - SQLインジェクション攻撃の防止

3. **Data Privacy**:
   - 非公開テンプレートの適切なアクセス制御
   - ユーザー情報の適切な管理

## Performance Considerations

1. **Frontend Optimization**:
   - 不要な再レンダリングの防止
   - 適切なローディング状態の管理
   - キャッシュの活用

2. **Backend Optimization**:
   - データベースクエリの最適化
   - 適切なインデックスの設定
   - レスポンス時間の最適化

3. **Network Optimization**:
   - 必要最小限のデータ転送
   - 適切なHTTPステータスコードの使用
   - エラーレスポンスの最適化