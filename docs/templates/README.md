# ドキュメントテンプレート集

## 概要

このディレクトリには、よさこいパフォーマンス評価システムのドキュメント作成を効率化するためのテンプレートが格納されています。

## テンプレート一覧

| テンプレート名 | ファイル名 | 用途 | 対象読者 |
|---------------|-----------|------|----------|
| [APIエンドポイント記述テンプレート](#apiエンドポイント記述テンプレート) | `api-endpoint-template.md` | API仕様書の作成 | 開発者 |
| [トラブルシューティング記述テンプレート](#トラブルシューティング記述テンプレート) | `troubleshooting-template.md` | 問題解決手順の作成 | 管理者、開発者 |
| [機能説明テンプレート](#機能説明テンプレート) | `feature-documentation-template.md` | 新機能の説明文書作成 | 全ユーザー |

## 使用方法

### 基本的な使用手順

1. **テンプレート選択**: 作成したいドキュメントの種類に応じてテンプレートを選択
2. **ファイルコピー**: テンプレートファイルを適切な場所にコピー
3. **内容編集**: プレースホルダーを実際の内容に置き換え
4. **品質確認**: チェックリストを使用して品質を確認
5. **レビュー**: 他のメンバーによるレビューを実施

### ファイル配置規則

```
docs/
├── api-documentation.md          # APIエンドポイントを追加
├── admin-guide.md               # トラブルシューティングを追加
├── user-manual.md               # 機能説明を追加
├── developer-guide.md           # 技術的な機能説明を追加
└── features/                    # 独立した機能説明
    ├── feature1.md
    └── feature2.md
```

## テンプレート詳細

### APIエンドポイント記述テンプレート

**用途**: 新しいAPIエンドポイントの仕様書作成

**主な要素**:
- エンドポイント概要
- 認証・権限要件
- パラメーター仕様
- リクエスト・レスポンス例
- エラーハンドリング
- 使用例

**使用場面**:
- 新しいAPIエンドポイントの追加時
- 既存APIの仕様変更時
- API仕様書の標準化

**例**:
```bash
# 新しいAPIエンドポイントの文書化
cp docs/templates/api-endpoint-template.md docs/api-new-endpoint.md
# プレースホルダーを実際の値に置換
sed -i 's/{METHOD}/POST/g' docs/api-new-endpoint.md
```

### トラブルシューティング記述テンプレート

**用途**: システムの問題解決手順の文書化

**主な要素**:
- 問題の症状と原因
- 診断手順
- 解決方法（複数の選択肢）
- 予防策
- エスカレーション条件

**使用場面**:
- 新しい問題の解決手順作成時
- 既存の問題解決手順の更新時
- サポート文書の標準化

**カテゴリ別テンプレート**:
- システム障害（緊急度：高）
- パフォーマンス問題（緊急度：中）
- 設定エラー（緊急度：中）
- ユーザー操作問題（緊急度：低）

### 機能説明テンプレート

**用途**: 新機能や既存機能の詳細説明文書作成

**主な要素**:
- 機能概要と価値
- 対象ユーザーと前提条件
- 詳細な使用方法
- 技術仕様
- トラブルシューティング
- 関連情報

**使用場面**:
- 新機能リリース時
- 既存機能の大幅な変更時
- ユーザーガイドの拡充

**対象別バリエーション**:
- エンドユーザー向け
- システム管理者向け
- 開発者向け

## 自動化ツール

### テンプレート生成スクリプト

#### 基本的な生成スクリプト

```bash
#!/bin/bash
# scripts/generate-doc.sh

DOC_TYPE="$1"
DOC_NAME="$2"

case "$DOC_TYPE" in
  "api")
    TEMPLATE="docs/templates/api-endpoint-template.md"
    OUTPUT="docs/api-${DOC_NAME}.md"
    ;;
  "troubleshooting")
    TEMPLATE="docs/templates/troubleshooting-template.md"
    OUTPUT="docs/troubleshooting-${DOC_NAME}.md"
    ;;
  "feature")
    TEMPLATE="docs/templates/feature-documentation-template.md"
    OUTPUT="docs/features/${DOC_NAME}.md"
    ;;
  *)
    echo "Usage: $0 {api|troubleshooting|feature} <name>"
    exit 1
    ;;
esac

# ディレクトリ作成
mkdir -p "$(dirname "$OUTPUT")"

# テンプレートをコピー
cp "$TEMPLATE" "$OUTPUT"

echo "Document created: $OUTPUT"
echo "Please edit the placeholders in the file."
```

#### 使用例

```bash
# APIエンドポイント文書の作成
./scripts/generate-doc.sh api user-profile

# トラブルシューティング文書の作成
./scripts/generate-doc.sh troubleshooting login-failure

# 機能説明文書の作成
./scripts/generate-doc.sh feature real-time-notifications
```

### インタラクティブ生成ツール

```bash
#!/bin/bash
# scripts/interactive-doc-generator.sh

echo "=== ドキュメント生成ツール ==="
echo ""

# ドキュメントタイプの選択
echo "作成するドキュメントのタイプを選択してください:"
echo "1) APIエンドポイント"
echo "2) トラブルシューティング"
echo "3) 機能説明"
read -p "選択 (1-3): " doc_type

# ドキュメント名の入力
read -p "ドキュメント名を入力してください: " doc_name

# 基本情報の入力
read -p "作成者名: " author
read -p "概要: " description

# テンプレートの選択と生成
case "$doc_type" in
  "1")
    template="api-endpoint-template.md"
    output="docs/api-${doc_name}.md"
    ;;
  "2")
    template="troubleshooting-template.md"
    output="docs/troubleshooting-${doc_name}.md"
    ;;
  "3")
    template="feature-documentation-template.md"
    output="docs/features/${doc_name}.md"
    ;;
esac

# ディレクトリ作成
mkdir -p "$(dirname "$output")"

# テンプレートをコピーして基本情報を置換
sed -e "s/{author}/${author}/g" \
    -e "s/{description}/${description}/g" \
    -e "s/{date}/$(date +%Y-%m-%d)/g" \
    "docs/templates/${template}" > "$output"

echo ""
echo "✅ ドキュメントが作成されました: $output"
echo "📝 エディターで開いてプレースホルダーを編集してください"
```

### VSCode統合

#### スニペット設定

```json
{
  "API Endpoint Documentation": {
    "prefix": "api-doc",
    "body": [
      "### $1",
      "",
      "#### 概要",
      "",
      "$2",
      "",
      "#### エンドポイント",
      "",
      "```http",
      "$3 $4",
      "```",
      "",
      "#### 認証",
      "",
      "- **必要**: $5",
      "- **権限**: $6",
      "",
      "#### パラメーター",
      "",
      "| パラメーター | 型 | 必須 | 説明 |",
      "|-------------|----|----|------|",
      "| $7 | $8 | $9 | $10 |"
    ],
    "description": "API endpoint documentation template"
  },
  
  "Troubleshooting Section": {
    "prefix": "trouble-doc",
    "body": [
      "#### $1",
      "",
      "**症状**: $2",
      "",
      "**原因**: $3",
      "",
      "**解決方法**:",
      "",
      "```bash",
      "$4",
      "```",
      "",
      "**期待される結果**: $5"
    ],
    "description": "Troubleshooting documentation template"
  },
  
  "Feature Documentation": {
    "prefix": "feature-doc",
    "body": [
      "# $1",
      "",
      "## 概要",
      "",
      "$2",
      "",
      "## 対象ユーザー",
      "",
      "- **主要ユーザー**: $3",
      "- **権限要件**: $4",
      "",
      "## 使用方法",
      "",
      "### 基本的な使用方法",
      "",
      "1. $5",
      "2. $6",
      "3. $7"
    ],
    "description": "Feature documentation template"
  }
}
```

#### タスク設定

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Generate API Documentation",
      "type": "shell",
      "command": "./scripts/generate-doc.sh",
      "args": ["api", "${input:apiName}"],
      "group": "build",
      "presentation": {
        "echo": true,
        "reveal": "always",
        "focus": false,
        "panel": "shared"
      }
    },
    {
      "label": "Generate Troubleshooting Documentation",
      "type": "shell",
      "command": "./scripts/generate-doc.sh",
      "args": ["troubleshooting", "${input:troubleName}"],
      "group": "build"
    }
  ],
  "inputs": [
    {
      "id": "apiName",
      "description": "API endpoint name",
      "default": "new-endpoint",
      "type": "promptString"
    },
    {
      "id": "troubleName",
      "description": "Troubleshooting issue name",
      "default": "new-issue",
      "type": "promptString"
    }
  ]
}
```

## 品質管理

### 共通チェックリスト

#### 内容品質

- [ ] 目的と対象読者が明確
- [ ] 情報が正確で最新
- [ ] 手順が実際に動作することを確認済み
- [ ] 必要な前提条件が記載されている
- [ ] 適切な例やスクリーンショットが含まれている

#### 文書品質

- [ ] Markdownフォーマットが正しい
- [ ] リンクが有効
- [ ] スペルチェック済み
- [ ] 用語統一されている
- [ ] 適切な見出し階層

#### 保守性

- [ ] 変更履歴が記録されている
- [ ] 関連文書へのリンクが設定されている
- [ ] 更新責任者が明確
- [ ] 次回レビュー日が設定されている

### 自動品質チェック

```bash
#!/bin/bash
# scripts/check-doc-quality.sh

DOC_FILE="$1"

echo "=== ドキュメント品質チェック ==="
echo "対象ファイル: $DOC_FILE"
echo ""

# Markdownリント
echo "📝 Markdownフォーマットチェック..."
markdownlint "$DOC_FILE"

# リンクチェック
echo "🔗 リンクチェック..."
markdown-link-check "$DOC_FILE"

# スペルチェック
echo "📖 スペルチェック..."
cspell "$DOC_FILE"

# プレースホルダーチェック
echo "🔍 未置換プレースホルダーチェック..."
if grep -q "{.*}" "$DOC_FILE"; then
  echo "⚠️  未置換のプレースホルダーが見つかりました:"
  grep -n "{.*}" "$DOC_FILE"
else
  echo "✅ プレースホルダーはすべて置換済みです"
fi

echo ""
echo "品質チェック完了"
```

## メンテナンス

### 定期的な見直し

#### 月次レビュー

- テンプレートの使用状況確認
- フィードバックの収集と反映
- 新しいテンプレートの必要性検討

#### 四半期レビュー

- テンプレート構造の見直し
- 自動化ツールの改善
- 品質基準の更新

### バージョン管理

#### テンプレートのバージョニング

```markdown
---
template_version: "1.2.0"
last_updated: "2024-01-15"
changelog:
  - version: "1.2.0"
    date: "2024-01-15"
    changes: "APIエラーハンドリングセクションを追加"
  - version: "1.1.0"
    date: "2024-01-01"
    changes: "セキュリティ考慮事項セクションを追加"
---
```

#### 互換性管理

- メジャーバージョン: 構造の大幅な変更
- マイナーバージョン: 新しいセクションの追加
- パッチバージョン: 軽微な修正や改善

## 貢献ガイドライン

### 新しいテンプレートの提案

1. **必要性の検討**: 既存テンプレートで対応できないか確認
2. **設計書作成**: テンプレートの構造と要素を設計
3. **プロトタイプ作成**: 実際のケースで試用
4. **フィードバック収集**: チームメンバーからの意見収集
5. **正式版作成**: フィードバックを反映した最終版

### 既存テンプレートの改善

1. **問題の特定**: 使用時の問題点や改善点を特定
2. **改善案の作成**: 具体的な改善案を作成
3. **影響範囲の確認**: 既存文書への影響を確認
4. **テスト**: 改善版での文書作成をテスト
5. **リリース**: 改善版のリリースと移行ガイド作成

## 参考資料

### ドキュメント作成

- [Technical Writing Courses](https://developers.google.com/tech-writing)
- [Write the Docs](https://www.writethedocs.org/)
- [Markdown Guide](https://www.markdownguide.org/)

### テンプレート設計

- [Documentation Templates](https://github.com/thegooddocsproject/templates)
- [API Documentation Best Practices](https://swagger.io/resources/articles/best-practices-in-api-documentation/)
- [Troubleshooting Guide Templates](https://www.atlassian.com/software/confluence/templates/troubleshooting-article)

### 自動化ツール

- [markdownlint](https://github.com/DavidAnson/markdownlint)
- [markdown-link-check](https://github.com/tcort/markdown-link-check)
- [cspell](https://github.com/streetsidesoftware/cspell)

---

**作成日**: 2024年1月15日  
**最終更新**: 2024年1月15日  
**次回レビュー予定**: 2024年4月15日