# 管理者ガイド

## 目次

1. [管理者権限について](#管理者権限について)
2. [システム管理](#システム管理)
3. [ユーザー管理](#ユーザー管理)
4. [コンテンツ管理](#コンテンツ管理)
5. [セキュリティ管理](#セキュリティ管理)
6. [監視・ログ管理](#監視ログ管理)
7. [バックアップ・復旧](#バックアップ復旧)
8. [パフォーマンス管理](#パフォーマンス管理)
9. [トラブルシューティング](#トラブルシューティング)
10. [メンテナンス手順](#メンテナンス手順)

## 管理者権限について

### 権限レベル

#### スーパー管理者

- システム全体の設定変更
- 他の管理者の権限管理
- サーバー管理・メンテナンス
- セキュリティ設定の変更

#### 管理者

- ユーザー管理
- コンテンツ管理
- 評価セッション管理
- レポート閲覧

#### モデレーター

- コンテンツの承認・削除
- ユーザーサポート
- 基本的な管理機能

### 管理画面へのアクセス

1. **管理画面URL**: `https://your-domain.com/admin`
2. **認証**: 管理者アカウントでログイン
3. **多要素認証**: 管理者は必須

## システム管理

### システム設定

#### 基本設定

```bash
# 管理画面 > システム設定 > 基本設定
- サイト名: YOSAKOIパフォーマンス評価システム
- サイトURL: https://your-domain.com
- 管理者メール: admin@your-domain.com
- タイムゾーン: Asia/Tokyo
- 言語: 日本語
```

#### 機能設定

```bash
# 新規登録の許可
ALLOW_REGISTRATION=true

# メール認証の必須化
REQUIRE_EMAIL_VERIFICATION=true

# ファイルアップロード制限
MAX_FILE_SIZE=10MB
ALLOWED_FILE_TYPES=jpg,jpeg,png,pdf

# YouTube API制限
YOUTUBE_API_QUOTA_LIMIT=10000
```

### サーバー管理

#### サービス状態確認

```bash
# Docker コンテナの状態確認
docker-compose -f docker-compose.prod.yml ps

# サービスログの確認
docker-compose -f docker-compose.prod.yml logs -f backend
docker-compose -f docker-compose.prod.yml logs -f frontend

# システムリソース確認
docker stats
```

#### サービス再起動

```bash
# 全サービス再起動
docker-compose -f docker-compose.prod.yml restart

# 特定サービスの再起動
docker-compose -f docker-compose.prod.yml restart backend
docker-compose -f docker-compose.prod.yml restart frontend
```

#### 設定変更の反映

```bash
# 環境変数変更後の再起動
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d

# 設定ファイル変更後の再読み込み
docker-compose -f docker-compose.prod.yml exec backend npm run reload-config
```

## ユーザー管理

### ユーザー一覧・検索

#### 管理画面での操作

1. **ユーザー一覧**: 管理画面 > ユーザー管理 > 一覧
2. **検索・フィルタ**:
   - メールアドレス、ユーザー名で検索
   - 登録日、最終ログイン日でフィルタ
   - アカウント状態（アクティブ、停止、未認証）でフィルタ

#### CLI での操作

```bash
# ユーザー一覧取得
docker-compose exec backend npm run admin:users:list

# 特定ユーザーの詳細
docker-compose exec backend npm run admin:users:show user@example.com

# ユーザー検索
docker-compose exec backend npm run admin:users:search --query "keyword"
```

### ユーザー作成・編集

#### 管理者による手動作成

```bash
# 管理画面での作成
管理画面 > ユーザー管理 > 新規作成

# CLI での作成
docker-compose exec backend npm run admin:users:create \
  --email user@example.com \
  --username testuser \
  --role user \
  --password temporary_password
```

#### ユーザー情報の編集

```bash
# 基本情報の変更
docker-compose exec backend npm run admin:users:update user@example.com \
  --username new_username \
  --role moderator

# パスワードリセット
docker-compose exec backend npm run admin:users:reset-password user@example.com
```

### アカウント管理

#### アカウント停止・復活

```bash
# アカウント停止
docker-compose exec backend npm run admin:users:suspend user@example.com \
  --reason "利用規約違反"

# アカウント復活
docker-compose exec backend npm run admin:users:activate user@example.com
```

#### アカウント削除

```bash
# 論理削除（データ保持）
docker-compose exec backend npm run admin:users:soft-delete user@example.com

# 物理削除（完全削除）
docker-compose exec backend npm run admin:users:hard-delete user@example.com \
  --confirm
```

### 権限管理

#### ロール変更

```bash
# ユーザーを管理者に昇格
docker-compose exec backend npm run admin:users:promote user@example.com admin

# 管理者をユーザーに降格
docker-compose exec backend npm run admin:users:demote admin@example.com user
```

#### 権限の確認

```bash
# ユーザーの権限確認
docker-compose exec backend npm run admin:users:permissions user@example.com

# ロール別ユーザー数確認
docker-compose exec backend npm run admin:users:stats --by-role
```

## コンテンツ管理

### 動画管理

#### 動画一覧・検索
```bash
# 管理画面での確認
管理画面 > コンテンツ管理 > 動画一覧

# CLI での操作
docker-compose exec backend npm run admin:videos:list --limit 50
docker-compose exec backend npm run admin:videos:search --query "チーム名"
```

#### 動画の承認・削除
```bash
# 動画の承認
docker-compose exec backend npm run admin:videos:approve video_id

# 動画の削除
docker-compose exec backend npm run admin:videos:delete video_id \
  --reason "不適切なコンテンツ"

# 一括削除
docker-compose exec backend npm run admin:videos:bulk-delete \
  --ids video_id1,video_id2,video_id3
```

### テンプレート管理

#### システムテンプレートの管理
```bash
# システム標準テンプレートの作成
docker-compose exec backend npm run admin:templates:create-system \
  --name "標準評価テンプレート" \
  --file templates/standard.json

# テンプレートの公開・非公開
docker-compose exec backend npm run admin:templates:publish template_id
docker-compose exec backend npm run admin:templates:unpublish template_id
```

### 評価セッション管理

#### セッション監視
```bash
# アクティブセッション一覧
docker-compose exec backend npm run admin:sessions:active

# セッション詳細確認
docker-compose exec backend npm run admin:sessions:show session_id

# 問題のあるセッションの強制終了
docker-compose exec backend npm run admin:sessions:force-close session_id
```

## セキュリティ管理

### セキュリティ監査

#### 定期監査の実行
```bash
# 包括的セキュリティ監査
npm run security:audit

# 依存関係の脆弱性チェック
npm run security:scan

# セキュリティテストの実行
npm run security:test
```

#### 監査レポートの確認
```bash
# 最新の監査レポート確認
cat security-audit-report.json | jq '.vulnerabilities'

# 重要度別の脆弱性確認
cat security-audit-report.json | jq '.vulnerabilities[] | select(.severity == "critical")'
```

### アクセス制御

#### IP制限の設定
```bash
# 特定IPの許可
docker-compose exec backend npm run admin:security:allow-ip 192.168.1.100

# 特定IPのブロック
docker-compose exec backend npm run admin:security:block-ip 192.168.1.200

# IP制限一覧の確認
docker-compose exec backend npm run admin:security:list-ip-rules
```

#### レート制限の調整
```bash
# レート制限設定の確認
docker-compose exec backend npm run admin:security:rate-limits

# 特定ユーザーのレート制限解除
docker-compose exec backend npm run admin:security:reset-rate-limit user@example.com
```

### セキュリティインシデント対応

#### 不正アクセスの検知
```bash
# 不正ログイン試行の確認
docker-compose exec backend npm run admin:security:failed-logins --last 24h

# 異常なアクセスパターンの検知
docker-compose exec backend npm run admin:security:anomaly-detection
```

#### 緊急時の対応
```bash
# システム緊急停止
docker-compose -f docker-compose.prod.yml down

# 特定ユーザーの緊急停止
docker-compose exec backend npm run admin:users:emergency-suspend user@example.com

# セキュリティアラートの送信
docker-compose exec backend npm run admin:security:send-alert \
  --message "セキュリティインシデント発生"
```

## 監視・ログ管理

### システム監視

#### Grafana ダッシュボード

- **URL**: `http://your-domain.com:3000`
- **ログイン**: admin / (GRAFANA_ADMIN_PASSWORD)
- **主要メトリクス**:
  - CPU使用率
  - メモリ使用率
  - ディスク使用率
  - ネットワークトラフィック
  - アプリケーション応答時間

#### Prometheus メトリクス

- **URL**: `http://your-domain.com:9090`
- **カスタムメトリクス**:
  - ユーザー登録数
  - 評価セッション数
  - API呼び出し回数
  - エラー発生率

### ログ管理

#### ログファイルの場所

```bash
# アプリケーションログ
./logs/app.log
./logs/error.log
./logs/access.log

# システムログ
./logs/system.log
./logs/security.log

# データベースログ
./logs/mongodb.log
./logs/redis.log
```

#### ログの確認・分析

```bash
# エラーログの確認
tail -f logs/error.log

# 特定期間のログ抽出
grep "2023-12-01" logs/app.log | grep "ERROR"

# ログの統計情報
docker-compose exec backend npm run admin:logs:stats --date 2023-12-01

# セキュリティログの分析
docker-compose exec backend npm run admin:logs:security-analysis
```

### アラート設定

#### アラートルールの設定
```yaml
# monitoring/alert_rules.yml
groups:
  - name: custom_alerts
    rules:
      - alert: HighUserRegistration
        expr: increase(user_registrations_total[1h]) > 100
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "大量のユーザー登録が検出されました"
```

#### 通知設定
```bash
# Slack通知の設定
SLACK_WEBHOOK=https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK

# メール通知の設定
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=alerts@your-domain.com
SMTP_PASS=your_password
```

## バックアップ・復旧

### 自動バックアップ

#### バックアップスケジュール
```bash
# crontab設定の確認
crontab -l

# バックアップスケジュールの編集
crontab -e

# 設定例
0 2 * * * /opt/yosakoi-evaluation/scripts/backup.sh daily
0 1 * * 0 /opt/yosakoi-evaluation/scripts/backup.sh weekly
0 0 1 * * /opt/yosakoi-evaluation/scripts/backup.sh monthly
```

#### バックアップ状態の確認
```bash
# 最新バックアップの確認
ls -la /opt/backups/ | head -10

# バックアップサイズの確認
du -sh /opt/backups/*

# バックアップの整合性チェック
./scripts/verify-backup.sh latest
```

### 手動バックアップ

#### 即座のバックアップ実行
```bash
# 完全バックアップ
./scripts/backup.sh manual

# データベースのみ
./scripts/backup.sh --component mongodb

# 特定日付のバックアップ
./scripts/backup.sh --date 2023-12-01
```

### 復旧手順

#### データベース復旧
```bash
# MongoDB復旧
./scripts/restore.sh mongodb backup_20231201_020000.tar.gz

# Redis復旧
./scripts/restore.sh redis backup_20231201_020000.rdb

# 復旧後の整合性チェック
./scripts/verify-restore.sh
```

#### 災害復旧
```bash
# 完全システム復旧
./scripts/disaster-recovery.sh --backup-date 2023-12-01

# 段階的復旧
./scripts/restore.sh --step-by-step --backup latest
```

## パフォーマンス管理

### パフォーマンス監視

#### リアルタイム監視
```bash
# システムリソース監視
htop
iotop
nethogs

# Docker コンテナ監視
docker stats

# データベース監視
docker-compose exec mongodb mongostat
docker-compose exec redis redis-cli info stats
```

#### パフォーマンステスト
```bash
# 負荷テストの実行
npm run test:load

# API レスポンステスト
npm run test:performance

# データベースパフォーマンステスト
docker-compose exec backend npm run test:db-performance
```

### 最適化

#### データベース最適化
```bash
# MongoDB インデックス最適化
docker-compose exec mongodb mongo yosakoi_evaluation --eval "db.runCommand({reIndex: 'videos'})"

# Redis メモリ最適化
docker-compose exec redis redis-cli config set maxmemory-policy allkeys-lru
```

#### アプリケーション最適化
```bash
# Node.js プロセス最適化
docker-compose exec backend npm run optimize:memory

# 静的ファイル最適化
docker-compose exec frontend npm run optimize:assets
```

## トラブルシューティング

### 一般的な問題

#### サービス起動失敗
```bash
# 問題の特定
docker-compose -f docker-compose.prod.yml logs backend
docker-compose -f docker-compose.prod.yml logs frontend

# ポート競合の確認
netstat -tulpn | grep :3001
netstat -tulpn | grep :80

# 解決方法
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d
```

#### データベース接続エラー
```bash
# MongoDB接続確認
docker-compose exec mongodb mongo --eval "db.adminCommand('ping')"

# Redis接続確認
docker-compose exec redis redis-cli ping

# 接続設定の確認
docker-compose exec backend npm run admin:db:test-connection
```

#### メモリ不足
```bash
# メモリ使用量確認
free -h
docker stats --no-stream

# 対処方法
docker-compose restart
docker system prune -f
```

### ログ分析

#### エラーログの分析
```bash
# 頻出エラーの確認
grep "ERROR" logs/app.log | sort | uniq -c | sort -nr

# 特定エラーの詳細確認
grep -A 10 -B 10 "specific_error" logs/error.log

# エラー傾向の分析
docker-compose exec backend npm run admin:logs:error-analysis
```

## メンテナンス手順

### 定期メンテナンス

#### 日次メンテナンス
```bash
#!/bin/bash
# daily-maintenance.sh

# ログローテーション
logrotate /etc/logrotate.d/yosakoi-evaluation

# 一時ファイルクリーンアップ
find /tmp -name "yosakoi-*" -mtime +1 -delete

# データベース統計更新
docker-compose exec mongodb mongo yosakoi_evaluation --eval "db.runCommand({updateStats: 1})"

# システムリソース確認
df -h
free -h
```

#### 週次メンテナンス
```bash
#!/bin/bash
# weekly-maintenance.sh

# セキュリティ監査
npm run security:audit

# パフォーマンステスト
npm run test:performance

# バックアップ検証
./scripts/verify-backup.sh weekly

# 不要なDockerイメージ削除
docker image prune -f
```

#### 月次メンテナンス
```bash
#!/bin/bash
# monthly-maintenance.sh

# 依存関係更新
npm audit fix
cd backend && npm update
cd ../frontend && npm update

# データベース最適化
docker-compose exec mongodb mongo yosakoi_evaluation --eval "db.runCommand({compact: 'videos'})"

# SSL証明書確認
openssl x509 -in nginx/ssl/cert.pem -text -noout | grep "Not After"
```

### アップデート手順

#### アプリケーションアップデート
```bash
# 1. バックアップ作成
./scripts/backup.sh pre-update

# 2. 新バージョンのダウンロード
git fetch origin
git checkout v2.0.0

# 3. 依存関係更新
npm run install:all

# 4. データベースマイグレーション
docker-compose exec backend npm run migrate

# 5. アプリケーション再起動
docker-compose -f docker-compose.prod.yml restart

# 6. 動作確認
curl -f http://localhost/health
npm run test:smoke
```

#### システムアップデート
```bash
# OS アップデート
sudo apt update && sudo apt upgrade -y

# Docker アップデート
sudo apt install docker-ce docker-ce-cli containerd.io

# Docker Compose アップデート
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
```

### 緊急時対応

#### サービス緊急停止
```bash
# 全サービス停止
docker-compose -f docker-compose.prod.yml down

# 特定サービスのみ停止
docker-compose -f docker-compose.prod.yml stop backend
```

#### 緊急復旧
```bash
# 最新バックアップからの復旧
./scripts/emergency-restore.sh

# 最小限のサービス起動
docker-compose -f docker-compose.minimal.yml up -d
```

#### インシデント報告
```bash
# インシデントレポート作成
./scripts/incident-report.sh --type emergency --description "説明"

# ステークホルダーへの通知
./scripts/notify-stakeholders.sh --incident incident_id
```