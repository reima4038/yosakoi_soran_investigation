# データバックアップ戦略

## 概要

YOSAKOIパフォーマンス評価システムのデータバックアップ戦略について説明します。

## バックアップ対象

### 1. データベース
- **MongoDB**: 評価データ、ユーザー情報、セッション情報
- **Redis**: キャッシュデータ、セッション情報

### 2. アプリケーションデータ
- アップロードされたファイル
- 設定ファイル
- SSL証明書

### 3. ログファイル
- アプリケーションログ
- アクセスログ
- エラーログ

## バックアップスケジュール

### 日次バックアップ
- **時刻**: 午前2時（JST）
- **対象**: 全データベース、アプリケーションログ
- **保存期間**: 30日間

### 週次バックアップ
- **時刻**: 日曜日午前1時（JST）
- **対象**: 完全バックアップ（データベース + ファイル）
- **保存期間**: 12週間

### 月次バックアップ
- **時刻**: 毎月1日午前0時（JST）
- **対象**: アーカイブバックアップ
- **保存期間**: 12ヶ月間

## バックアップ方法

### 自動バックアップ

```bash
# crontab 設定例
# 日次バックアップ（午前2時）
0 2 * * * /opt/yosakoi-evaluation/scripts/backup.sh daily

# 週次バックアップ（日曜日午前1時）
0 1 * * 0 /opt/yosakoi-evaluation/scripts/backup.sh weekly

# 月次バックアップ（毎月1日午前0時）
0 0 1 * * /opt/yosakoi-evaluation/scripts/backup.sh monthly
```

### 手動バックアップ

```bash
# 即座にバックアップを実行
./scripts/backup.sh manual

# 特定のコンポーネントのみバックアップ
./scripts/backup.sh --component mongodb
./scripts/backup.sh --component redis
./scripts/backup.sh --component files
```

## ストレージ戦略

### ローカルストレージ
- **場所**: `/opt/backups/`
- **用途**: 短期保存、高速復旧
- **容量**: 500GB

### クラウドストレージ（AWS S3）
- **バケット**: `yosakoi-backups-prod`
- **用途**: 長期保存、災害復旧
- **ストレージクラス**: 
  - 日次: Standard
  - 週次: Standard-IA
  - 月次: Glacier

### 暗号化
- **転送時**: TLS 1.2以上
- **保存時**: AES-256暗号化
- **キー管理**: AWS KMS

## 復旧手順

### MongoDB復旧

```bash
# バックアップファイルの確認
ls -la /opt/backups/mongodb_backup_*.tar.gz

# バックアップの展開
tar -xzf /opt/backups/mongodb_backup_20231201_020000.tar.gz

# MongoDB復旧
docker exec -i mongodb mongorestore --drop --dir /backup/mongodb_20231201_020000/yosakoi_evaluation
```

### Redis復旧

```bash
# Redisサービス停止
docker stop redis

# バックアップファイルをコピー
docker cp /opt/backups/redis_backup_20231201_020000.rdb redis:/data/dump.rdb

# Redisサービス開始
docker start redis
```

### アプリケーションファイル復旧

```bash
# SSL証明書の復旧
tar -xzf /opt/backups/ssl_backup_20231201_020000.tar.gz -C /

# ログファイルの復旧
tar -xzf /opt/backups/logs_backup_20231201_020000.tar.gz -C /
```

## 監視とアラート

### バックアップ成功監視

```bash
# バックアップ成功確認スクリプト
#!/bin/bash
BACKUP_LOG="/var/log/backup.log"
LAST_BACKUP=$(tail -n 1 $BACKUP_LOG | grep "Backup completed successfully")

if [ -z "$LAST_BACKUP" ]; then
    # Slack通知
    curl -X POST -H 'Content-type: application/json' \
        --data '{"text":"⚠️ バックアップが失敗しました"}' \
        $SLACK_WEBHOOK_URL
fi
```

### ストレージ容量監視

```bash
# ディスク使用量チェック
df -h /opt/backups | awk 'NR==2 {print $5}' | sed 's/%//' | \
while read usage; do
    if [ $usage -gt 80 ]; then
        echo "警告: バックアップディスクの使用量が${usage}%です"
    fi
done
```

## テスト手順

### 復旧テスト（月次）

1. **テスト環境の準備**
   ```bash
   docker-compose -f docker-compose.test.yml up -d
   ```

2. **バックアップからの復旧**
   ```bash
   ./scripts/restore-test.sh latest
   ```

3. **データ整合性確認**
   ```bash
   ./scripts/verify-backup.sh
   ```

4. **機能テスト**
   ```bash
   npm run test:integration
   ```

### 災害復旧テスト（四半期）

1. **完全な環境再構築**
2. **バックアップからの全データ復旧**
3. **サービス復旧時間の測定**
4. **データ損失の確認**

## セキュリティ考慮事項

### アクセス制御
- バックアップファイルへのアクセスは管理者のみ
- IAMロールによる最小権限の原則
- 多要素認証の必須化

### 監査ログ
- バックアップ・復旧操作のログ記録
- アクセスログの保存
- 定期的な監査の実施

### データ保護
- 個人情報の匿名化オプション
- GDPR準拠のデータ削除手順
- データ保存期間の遵守

## 災害復旧計画（DRP）

### RTO（Recovery Time Objective）
- **目標復旧時間**: 4時間以内
- **最大許容停止時間**: 8時間

### RPO（Recovery Point Objective）
- **目標復旧ポイント**: 1時間以内
- **最大データ損失許容時間**: 4時間

### 復旧優先順位
1. データベース復旧
2. 認証システム復旧
3. コアアプリケーション復旧
4. 監視システム復旧

## 改善計画

### 短期（3ヶ月）
- 増分バックアップの実装
- 復旧時間の短縮
- 自動テストの拡充

### 中期（6ヶ月）
- 地理的分散バックアップ
- リアルタイムレプリケーション
- 自動フェイルオーバー

### 長期（12ヶ月）
- マルチクラウド対応
- ゼロダウンタイム復旧
- AI による異常検知