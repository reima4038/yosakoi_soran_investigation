# バリデーションガイド

## 概要

このドキュメントでは、YouTube URL バリデーション改善プロジェクトで実装されたバリデーションシステムについて説明します。

## バリデーション戦略

### 多層バリデーション

1. **フロントエンド（UX重視）**
   - リアルタイムフィードバック
   - ユーザーフレンドリーなエラーメッセージ
   - 修正提案の表示

2. **バックエンド（セキュリティ重視）**
   - 厳密なデータ検証
   - SQLインジェクション対策
   - データ整合性の確保

### バリデーションレベル

#### レベル1: 基本バリデーション（relaxedVideoRegistrationSchema）
- 必須フィールドのチェックのみ
- 開発・テスト環境で使用
- ユーザビリティを最優先

#### レベル2: 標準バリデーション（videoRegistrationSchema）
- 文字数制限、形式チェック
- 本番環境で使用
- セキュリティとUXのバランス

#### レベル3: 動的バリデーション（createDynamicVideoRegistrationSchema）
- URL検証状態に基づく動的スキーマ
- EnhancedURLInputと連携
- リアルタイムフィードバック

## バリデーションスキーマ

### YouTube URL バリデーション

```typescript
import { youtubeUrlSchema } from '../utils/validationSchemas';

// 基本的なURL検証
const isValid = await youtubeUrlSchema.isValid('https://www.youtube.com/watch?v=dQw4w9WgXcQ');

// エラーメッセージ付き検証
try {
  await youtubeUrlSchema.validate(url);
} catch (error) {
  console.log(error.message); // "YouTube URLは必須です"
}
```

### 動画メタデータバリデーション

```typescript
import { videoMetadataSchema } from '../utils/validationSchemas';

const metadata = {
  teamName: 'サンプルチーム',
  performanceName: 'サンプル演舞',
  eventName: 'サンプル大会',
  year: 2023,
  location: 'サンプル会場'
};

const validatedMetadata = await videoMetadataSchema.validate(metadata);
```

### タグバリデーション

```typescript
import { tagsSchema } from '../utils/validationSchemas';

const tags = ['タグ1', 'タグ2', 'タグ3'];
const validatedTags = await tagsSchema.validate(tags);
```

## 動的バリデーション

### URL検証状態に基づくスキーマ生成

```typescript
import { createDynamicVideoRegistrationSchema } from '../utils/validationSchemas';

// URL検証が成功している場合
const validSchema = createDynamicVideoRegistrationSchema(true);

// URL検証が失敗している場合
const invalidSchema = createDynamicVideoRegistrationSchema(
  false, 
  'URLの形式が正しくありません'
);
```

### React Hook Formとの統合

```typescript
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { createDynamicVideoRegistrationSchema } from '../utils/validationSchemas';

const MyComponent = () => {
  const [isUrlValid, setIsUrlValid] = useState(false);
  
  const { control, handleSubmit } = useForm({
    resolver: yupResolver(
      createDynamicVideoRegistrationSchema(isUrlValid)
    )
  });
  
  // ...
};
```

## フィールド別バリデーション

### 個別フィールドの検証

```typescript
import { fieldValidators } from '../utils/validationSchemas';

// YouTube URL検証
const urlError = fieldValidators.youtubeUrl('https://example.com', false);
if (urlError) {
  console.log(urlError); // エラーメッセージ
}

// チーム名検証
const teamNameError = fieldValidators.teamName('a'.repeat(101));
if (teamNameError) {
  console.log(teamNameError); // "チーム名は100文字以下で入力してください"
}

// 年度検証
const yearError = fieldValidators.year(1800);
if (yearError) {
  console.log(yearError); // 年度範囲エラー
}

// タグ検証
const tagError = fieldValidators.tag('a'.repeat(31));
if (tagError) {
  console.log(tagError); // "タグは30文字以下で入力してください"
}
```

## バリデーションメッセージ

### 標準メッセージの使用

```typescript
import { validationMessages } from '../utils/validationSchemas';

// 必須フィールドメッセージ
console.log(validationMessages.required.youtubeUrl); // "YouTube URLは必須です"

// 文字数制限メッセージ
console.log(validationMessages.maxLength.teamName); // "チーム名は100文字以下で入力してください"

// 形式エラーメッセージ
console.log(validationMessages.format.url); // "URLの形式が正しくありません"

// 範囲エラーメッセージ
console.log(validationMessages.range.year); // "年度は1900年から2025年の間で入力してください"
```

## バリデーションヘルパー

### フォームデータの一括検証

```typescript
import { validateFormData, videoRegistrationSchema } from '../utils/validationSchemas';

const formData = {
  youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  metadata: { teamName: 'テストチーム' },
  tags: ['タグ1']
};

const result = await validateFormData(videoRegistrationSchema, formData);

if (result.isValid) {
  console.log('バリデーション成功');
} else {
  console.log('エラー:', result.errors);
  // { youtubeUrl: "エラーメッセージ", "metadata.teamName": "エラーメッセージ" }
}
```

## バックエンドとの整合性

### 制限値の統一

フロントエンドとバックエンドで同じ制限値を使用しています：

- **文字数制限**
  - チーム名、演舞名、大会名、場所: 100文字
  - タグ: 30文字

- **数値範囲**
  - 年度: 1900年 〜 来年

- **配列制限**
  - タグ数: 最大20個

### エラーメッセージの統一

バックエンドのexpress-validatorと同じメッセージ形式を使用：

```typescript
// フロントエンド
"YouTube URLは必須です"
"チーム名は100文字以下で入力してください"

// バックエンド（express-validator）
.withMessage('YouTube URLは必須です')
.withMessage('チーム名は100文字以下である必要があります')
```

## ベストプラクティス

### 1. 適切なスキーマの選択

```typescript
// 開発・テスト環境
import { relaxedVideoRegistrationSchema } from '../utils/validationSchemas';

// 本番環境
import { videoRegistrationSchema } from '../utils/validationSchemas';

// リアルタイムバリデーション
import { createDynamicVideoRegistrationSchema } from '../utils/validationSchemas';
```

### 2. エラーハンドリング

```typescript
try {
  const validatedData = await schema.validate(data);
  // 成功時の処理
} catch (error) {
  if (error instanceof yup.ValidationError) {
    // バリデーションエラーの処理
    console.log(error.message);
    console.log(error.path); // エラーが発生したフィールド
  }
}
```

### 3. パフォーマンス最適化

```typescript
// 早期終了を使用（最初のエラーで停止）
await schema.validate(data, { abortEarly: true });

// 全エラーを収集
await schema.validate(data, { abortEarly: false });
```

### 4. 型安全性の確保

```typescript
interface FormData {
  youtubeUrl: string;
  metadata?: {
    teamName?: string;
    // ...
  };
  tags?: string[];
}

// 型安全なスキーマ定義
const schema: yup.ObjectSchema<FormData> = videoRegistrationSchema;
```

## トラブルシューティング

### よくある問題

1. **バリデーションが実行されない**
   - yupResolverが正しく設定されているか確認
   - スキーマが正しくインポートされているか確認

2. **エラーメッセージが表示されない**
   - formState.errorsを正しく参照しているか確認
   - エラーメッセージのパスが正しいか確認

3. **動的バリデーションが機能しない**
   - URL検証状態が正しく更新されているか確認
   - スキーマの再生成が適切なタイミングで行われているか確認

### デバッグ方法

```typescript
// バリデーション結果の詳細確認
const result = await validateFormData(schema, data);
console.log('Validation result:', result);

// 個別フィールドの検証
const error = fieldValidators.youtubeUrl(url, isValid);
console.log('Field validation error:', error);

// スキーマの構造確認
console.log('Schema fields:', schema.fields);
```

## 参考資料

- [Yup Documentation](https://github.com/jquense/yup)
- [React Hook Form Documentation](https://react-hook-form.com/)
- [Express Validator Documentation](https://express-validator.github.io/)