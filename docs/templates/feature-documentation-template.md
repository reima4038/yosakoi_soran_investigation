# 機能説明テンプレート

このテンプレートは、新しい機能をドキュメント化する際に使用します。

## 基本テンプレート

```markdown
# {機能名}

## 概要

{機能の目的と価値の簡潔な説明}

## 対象ユーザー

- **主要ユーザー**: {メインターゲット}
- **副次ユーザー**: {サブターゲット}
- **権限要件**: {必要な権限レベル}

## 前提条件

- {前提条件1}
- {前提条件2}
- {必要な設定や準備}

## 機能詳細

### 主要機能

#### {サブ機能1}

{サブ機能の詳細説明}

**利用場面**: {どのような時に使用するか}

**操作手順**:

1. {手順1の説明}
2. {手順2の説明}
3. {手順3の説明}

**結果**: {操作後の期待される結果}

#### {サブ機能2}

{サブ機能の詳細説明}

### 技術仕様

- **実装技術**: {使用している技術スタック}
- **データ形式**: {扱うデータの形式}
- **パフォーマンス**: {応答時間、処理能力など}
- **制限事項**: {技術的な制限や制約}

## 使用方法

### 基本的な使用方法

#### ステップ1: {初期設定}

{初期設定の詳細手順}

```bash
# 設定コマンド例
{setup_command}
```

#### ステップ2: {基本操作}

{基本操作の詳細手順}

1. {操作手順1}
   
   ![{スクリーンショット説明}](./images/ui/{screenshot1}.png)
   
   *図1: {図の説明}*

2. {操作手順2}
   
   ```javascript
   // コード例
   {code_example}
   ```

3. {操作手順3}

#### ステップ3: {結果確認}

{結果確認の方法}

### 高度な使用方法

#### {高度な機能1}

{高度な機能の説明と使用方法}

#### {高度な機能2}

{高度な機能の説明と使用方法}

## 設定オプション

| オプション名 | 型 | デフォルト値 | 説明 | 例 |
|-------------|----|-----------|----|-----|
| {option1} | {type} | {default} | {説明} | {example} |
| {option2} | {type} | {default} | {説明} | {example} |

### 設定例

```json
{
  "{option1}": "{example_value}",
  "{option2}": {example_number},
  "{option3}": {
    "{nested_option}": "{nested_value}"
  }
}
```

## API連携

### 関連エンドポイント

- **{エンドポイント1}**: `{METHOD} {PATH}` - {説明}
- **{エンドポイント2}**: `{METHOD} {PATH}` - {説明}

### 使用例

```javascript
// JavaScript/TypeScript例
const {function_name} = async ({parameters}) => {
  try {
    const response = await fetch('{api_endpoint}', {
      method: '{METHOD}',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({data})
    });
    
    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
};
```

## トラブルシューティング

### よくある問題

#### {問題1}

**症状**: {問題の症状}

**原因**: {問題の原因}

**解決方法**:
```bash
{solution_command}
```

#### {問題2}

**症状**: {問題の症状}

**原因**: {問題の原因}

**解決方法**:
1. {解決手順1}
2. {解決手順2}

### エラーメッセージ

| エラーメッセージ | 原因 | 解決方法 |
|-----------------|------|----------|
| "{error_message_1}" | {原因1} | {解決方法1} |
| "{error_message_2}" | {原因2} | {解決方法2} |

## セキュリティ考慮事項

- **データ保護**: {データ保護に関する注意事項}
- **アクセス制御**: {アクセス制御の仕組み}
- **監査ログ**: {ログ記録の内容}
- **暗号化**: {暗号化の実装}

## パフォーマンス

### 性能指標

- **応答時間**: {typical_response_time}
- **スループット**: {requests_per_second}
- **同時接続数**: {concurrent_connections}
- **メモリ使用量**: {memory_usage}

### 最適化のヒント

- {最適化ポイント1}
- {最適化ポイント2}
- {パフォーマンス監視方法}

## 制限事項

- **技術的制限**: {技術的な制限事項}
- **利用制限**: {利用上の制限事項}
- **既知の問題**: {既知の問題と回避方法}

## 今後の予定

- **短期計画**: {近い将来の改善予定}
- **長期計画**: {長期的な機能拡張予定}
- **廃止予定**: {廃止予定の機能がある場合}

## 関連情報

### 関連機能

- [ユーザーマニュアル](../user-manual.md) - エンドユーザー向け操作説明
- [管理者ガイド](../admin-guide.md) - システム管理者向けガイド

### 参考資料

- [{外部ドキュメント1}]({external_link1})
- [{外部ドキュメント2}]({external_link2})
- [{技術仕様書}]({spec_link})

### 学習リソース

- [{チュートリアル}]({tutorial_link})
- [{サンプルコード}]({sample_code_link})
- [{動画説明}]({video_link})

## FAQ

### Q: {よくある質問1}

A: {回答1}

### Q: {よくある質問2}

A: {回答2}

### Q: {よくある質問3}

A: {回答3}

## フィードバック

この機能に関するフィードバックやバグ報告は以下までお寄せください：

- **GitHub Issues**: [{リポジトリ名}]({github_issues_link})
- **メール**: {contact_email}
- **Slack**: {slack_channel}

## 変更履歴

| バージョン | 日付 | 変更内容 | 担当者 |
|-----------|------|----------|--------|
| v{version} | {date} | {change_description} | {author} |

---

**作成日**: {creation_date}  
**最終更新**: {last_update}  
**次回レビュー予定**: {next_review}
```

## 使用方法

1. **テンプレートをコピー**: 上記のテンプレートをコピーします
2. **プレースホルダーを置換**: `{}`で囲まれた部分を実際の値に置き換えます
3. **不要なセクションを削除**: 該当しない項目は削除します
4. **実際の検証**: 記載した手順で実際に機能が動作することを確認します

## プレースホルダー一覧

| プレースホルダー | 説明 | 例 |
|-----------------|------|-----|
| `{機能名}` | 機能の名前 | ユーザー認証機能 |
| `{メインターゲット}` | 主要な利用者 | システム管理者 |
| `{前提条件1}` | 利用前提条件 | Node.js 18以上がインストール済み |
| `{サブ機能1}` | 個別機能名 | パスワードリセット |
| `{setup_command}` | 設定コマンド | npm install package-name |
| `{code_example}` | コード例 | const user = await getUser(id); |
| `{METHOD}` | HTTPメソッド | GET, POST, PUT, DELETE |
| `{PATH}` | APIパス | /api/users |

## 機能タイプ別テンプレート

### ユーザー向け機能

```markdown
# {機能名}

## 概要

{ユーザーにとっての価値と利便性}

## 利用開始

### 前提条件

- アカウント登録済み
- 必要な権限を保有

### 基本的な使い方

1. {ログイン手順}
2. {機能へのアクセス方法}
3. {基本操作}

### 画面説明

![{画面名}](./images/ui/{screen}.png)

*図1: {画面の説明}*

#### 画面要素

- **{要素1}**: {説明}
- **{要素2}**: {説明}
```

### 管理者向け機能

```markdown
# {機能名}

## 概要

{システム管理における価値と必要性}

## 設定・管理

### 初期設定

```bash
# 設定コマンド
{admin_setup_command}
```

### 運用管理

#### 日常的な管理作業

1. {定期チェック項目}
2. {メンテナンス作業}

#### 監視項目

- **{監視項目1}**: {正常値の範囲}
- **{監視項目2}**: {アラート条件}
```

### 開発者向け機能

```markdown
# {機能名}

## 概要

{開発者にとっての技術的価値}

## 技術仕様

### アーキテクチャ

```mermaid
graph TD
    A[{コンポーネント1}] --> B[{コンポーネント2}]
    B --> C[{コンポーネント3}]
```

### API仕様

#### {エンドポイント名}

```http
{METHOD} {PATH}
```

**パラメーター**:
- `{param}`: {説明}

**レスポンス**:
```json
{
  "{field}": "{value}"
}
```

### 実装例

```typescript
// TypeScript実装例
interface {InterfaceName} {
  {property}: {type};
}

class {ClassName} implements {InterfaceName} {
  {property}: {type};
  
  constructor({parameters}) {
    // 実装
  }
  
  {methodName}(): {returnType} {
    // 実装
  }
}
```
```

## 品質チェックリスト

- [ ] 機能の目的と価値が明確に記述されている
- [ ] 対象ユーザーが特定されている
- [ ] 前提条件が明記されている
- [ ] 操作手順が段階的に整理されている
- [ ] スクリーンショットや図表が適切に配置されている
- [ ] コード例が実際に動作することを確認済み
- [ ] トラブルシューティング情報が含まれている
- [ ] セキュリティ考慮事項が記載されている
- [ ] 関連情報へのリンクが設定されている
- [ ] 変更履歴が記録されている

## 執筆ガイドライン

### 文体と構成

- **ユーザー中心**: ユーザーの視点で価値を説明
- **段階的説明**: 基本から応用へ段階的に説明
- **実用的**: 実際の使用場面を想定した内容

### 視覚的要素

- **スクリーンショット**: 主要な操作画面を含める
- **図表**: 複雑な概念は図で説明
- **コードハイライト**: 重要なコードは適切にハイライト

### 保守性

- **モジュラー構成**: セクションごとに独立した内容
- **リンク管理**: 関連情報への適切なリンク
- **バージョン管理**: 変更履歴の適切な記録

## 自動化のヒント

### テンプレート生成スクリプト

```bash
#!/bin/bash
# generate-feature-doc.sh

FEATURE_NAME="$1"
TEMPLATE_FILE="docs/templates/feature-documentation-template.md"
OUTPUT_FILE="docs/features/${FEATURE_NAME}.md"

# ディレクトリ作成
mkdir -p "docs/features"

# テンプレートをコピーして基本的な置換を実行
sed "s/{機能名}/${FEATURE_NAME}/g" "$TEMPLATE_FILE" > "$OUTPUT_FILE"

echo "Feature documentation created: $OUTPUT_FILE"
```

### 自動スクリーンショット

```bash
# Puppeteerを使用した自動スクリーンショット例
const puppeteer = require('puppeteer');

async function captureScreenshot(url, selector, filename) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto(url);
  await page.waitForSelector(selector);
  await page.screenshot({
    path: `docs/images/ui/${filename}`,
    fullPage: true
  });
  await browser.close();
}
```

## 参考資料

- [Technical Writing Guidelines](https://developers.google.com/tech-writing)
- [Documentation Best Practices](https://www.writethedocs.org/guide/)
- [User Experience Writing](https://uxwritinghub.com/)
- [API Documentation Best Practices](https://swagger.io/resources/articles/best-practices-in-api-documentation/)

---

**作成日**: 2024年1月15日  
**最終更新**: 2024年1月15日  
**バージョン**: 1.0