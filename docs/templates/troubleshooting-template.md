# トラブルシューティング記述テンプレート

このテンプレートは、新しいトラブルシューティング項目をドキュメント化する際に使用します。

## 基本テンプレート

```markdown
#### {問題の名前}

**症状**: {問題の症状や現象の詳細な説明}

**原因**: {問題が発生する原因の説明}

**影響範囲**: {問題が影響する機能やユーザー}

**緊急度**: {高/中/低}

##### 診断手順

1. **初期確認**
   ```bash
   # {確認コマンドの説明}
   {diagnostic_command}
   ```

2. **詳細調査**
   ```bash
   # {詳細調査コマンドの説明}
   {investigation_command}
   ```

3. **ログ確認**
   ```bash
   # {ログ確認コマンドの説明}
   {log_command}
   ```

##### 解決方法

**方法1: {解決方法の名前}**

```bash
# {解決手順の説明}
{solution_command_1}
{solution_command_2}
```

**期待される結果**: {解決後の期待される状態}

**方法2: {代替解決方法の名前}** (方法1が失敗した場合)

```bash
# {代替解決手順の説明}
{alternative_command_1}
{alternative_command_2}
```

##### 予防策

- {予防策1の説明}
- {予防策2の説明}
- {定期的なメンテナンス項目}

##### 関連情報

- **関連エラー**: {関連するエラーメッセージやコード}
- **参考ドキュメント**: [{ドキュメント名}]({link})
- **外部リソース**: [{リソース名}]({external_link})

##### エスカレーション

以下の場合は専門サポートにエスカレーションしてください：

- {エスカレーション条件1}
- {エスカレーション条件2}

**連絡先**: {サポート連絡先}

##### 変更履歴

| 日付 | 変更内容 | 更新者 |
|------|----------|--------|
| {date} | {change_description} | {author} |
```

## 使用方法

1. **テンプレートをコピー**: 上記のテンプレートをコピーします
2. **プレースホルダーを置換**: `{}`で囲まれた部分を実際の値に置き換えます
3. **実際の検証**: 記載した手順で実際に問題が解決できることを確認します
4. **スクリーンショット追加**: 必要に応じて画面キャプチャを追加します

## プレースホルダー一覧

| プレースホルダー | 説明 | 例 |
|-----------------|------|-----|
| `{問題の名前}` | 問題の簡潔な名前 | ログインできない |
| `{症状}` | 具体的な症状 | メールアドレスとパスワードを入力してもエラーが表示される |
| `{原因}` | 問題の根本原因 | JWTトークンの期限切れ |
| `{影響範囲}` | 影響を受ける範囲 | 全ユーザー、特定機能のみ |
| `{diagnostic_command}` | 診断用コマンド | docker-compose ps |
| `{solution_command_1}` | 解決用コマンド | docker-compose restart backend |
| `{date}` | 日付 | 2024-01-15 |

## 問題カテゴリ別テンプレート

### システム障害

```markdown
#### {システム障害名}

**症状**: システム全体または主要機能が利用できない

**緊急度**: 高

##### 即座の対応

1. **サービス状態確認**
   ```bash
   docker-compose ps
   curl -f http://localhost:3001/api/health
   ```

2. **緊急復旧**
   ```bash
   docker-compose restart
   ```

##### 根本原因調査

1. **ログ分析**
   ```bash
   docker-compose logs --tail=100 backend
   ```

2. **リソース確認**
   ```bash
   docker stats --no-stream
   ```
```

### パフォーマンス問題

```markdown
#### {パフォーマンス問題名}

**症状**: システムの応答が遅い、タイムアウトが発生する

**緊急度**: 中

##### 診断手順

1. **応答時間測定**
   ```bash
   curl -w "@curl-format.txt" -o /dev/null -s "http://localhost:3001/api/health"
   ```

2. **リソース使用量確認**
   ```bash
   top
   free -h
   df -h
   ```

##### 最適化手順

1. **データベース最適化**
   ```bash
   docker-compose exec mongodb mongo --eval "db.runCommand({planCacheClear: 'collection_name'})"
   ```

2. **キャッシュクリア**
   ```bash
   docker-compose exec redis redis-cli FLUSHALL
   ```
```

### 設定エラー

```markdown
#### {設定エラー名}

**症状**: 設定変更後に機能が正常に動作しない

**緊急度**: 中

##### 設定確認手順

1. **環境変数確認**
   ```bash
   docker-compose exec backend printenv | grep {VARIABLE_NAME}
   ```

2. **設定ファイル確認**
   ```bash
   cat {config_file_path}
   ```

##### 設定修正手順

1. **設定ファイル編集**
   ```bash
   vi {config_file_path}
   ```

2. **設定反映**
   ```bash
   docker-compose restart {service_name}
   ```
```

## 品質チェックリスト

- [ ] 問題の症状が具体的に記述されている
- [ ] 診断手順が段階的に整理されている
- [ ] 解決方法が実際に動作することを確認済み
- [ ] 代替手段が提供されている
- [ ] 予防策が記載されている
- [ ] エスカレーション条件が明確
- [ ] 関連情報へのリンクが設定されている
- [ ] 実際のコマンド出力例が含まれている

## 執筆ガイドライン

### 文体

- **簡潔で明確**: 技術的な内容を分かりやすく説明
- **手順は番号付き**: 診断・解決手順は順序立てて記述
- **コマンドは実行可能**: 記載したコマンドは実際に実行できること

### 構成

1. **問題の特定**: 症状から問題を特定できる情報
2. **段階的診断**: 簡単な確認から詳細調査へ
3. **複数の解決策**: 主要な方法と代替手段
4. **予防と改善**: 再発防止のための情報

### コマンド記述

```bash
# コメント: コマンドの目的と期待される結果
command_to_execute

# 出力例:
Expected output here
```

## 自動化のヒント

### テンプレート生成スクリプト

```bash
#!/bin/bash
# generate-troubleshooting.sh

ISSUE_NAME="$1"
TEMPLATE_FILE="docs/templates/troubleshooting-template.md"
OUTPUT_FILE="docs/troubleshooting/${ISSUE_NAME}.md"

# テンプレートをコピーして基本的な置換を実行
sed "s/{問題の名前}/${ISSUE_NAME}/g" "$TEMPLATE_FILE" > "$OUTPUT_FILE"

echo "Troubleshooting document created: $OUTPUT_FILE"
```

### 問題追跡との連携

```markdown
**関連Issue**: [#{issue_number}](https://github.com/your-org/repo/issues/{issue_number})
**報告日**: {report_date}
**解決日**: {resolution_date}
```

## 参考資料

- [Incident Response Best Practices](https://response.pagerduty.com/)
- [SRE Troubleshooting Guide](https://sre.google/sre-book/effective-troubleshooting/)
- [Linux Troubleshooting Commands](https://www.tecmint.com/linux-performance-monitoring-and-file-system-statistics-reports/)
- [Docker Troubleshooting](https://docs.docker.com/config/daemon/troubleshoot/)

---

**作成日**: 2024年1月15日  
**最終更新**: 2024年1月15日  
**バージョン**: 1.0