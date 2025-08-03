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
- サイト名: よさこいパフォーマンス評価システム
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

**注意**: 以下のCLIコマンドは現在実装されていません。管理画面またはAPIを使用してください。

```bash
# 将来実装予定のコマンド例
# docker-compose exec backend npm run admin:users:list
# docker-compose exec backend npm run admin:users:show user@example.com
# docker-compose exec backend npm run admin:users:search --query "keyword"
```

**現在利用可能な方法**:

- 管理画面: `https://your-domain.com/admin`
- API経由: `GET /api/users` (管理者権限必要)

### ユーザー作成・編集

#### 管理者による手動作成

**管理画面での作成**:

1. 管理画面 > ユーザー管理 > 新規作成
2. 必要な情報を入力
3. 「作成」ボタンをクリック

**API経由での作成**:

```bash
# POST /api/auth/register (管理者権限で実行)
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <admin_token>" \
  -d '{
    "username": "testuser",
    "email": "user@example.com",
    "password": "temporary_password"
  }'
```

#### ユーザー情報の編集

**管理画面での編集**:

1. 管理画面 > ユーザー管理 > 一覧
2. 編集したいユーザーを選択
3. 情報を修正して保存

**API経由での編集**:

```bash
# PUT /api/users/me (対象ユーザーのトークンで実行)
curl -X PUT http://localhost:3001/api/users/me \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <user_token>" \
  -d '{
    "username": "new_username"
  }'
```

### アカウント管理

#### アカウント停止・復活

**注意**: 専用のCLIコマンドは現在実装されていません。管理画面またはデータベース直接操作で対応してください。

**管理画面での操作**:

1. 管理画面 > ユーザー管理 > 一覧
2. 対象ユーザーを選択
3. 「アカウント停止」または「アカウント復活」ボタンをクリック

**データベース直接操作** (緊急時のみ):

```bash
# MongoDB でユーザーを無効化
docker-compose exec mongodb mongo yosakoi_evaluation --eval "
  db.users.updateOne(
    {email: 'user@example.com'}, 
    {\$set: {isActive: false, suspendedAt: new Date()}}
  )
"

# MongoDB でユーザーを復活
docker-compose exec mongodb mongo yosakoi_evaluation --eval "
  db.users.updateOne(
    {email: 'user@example.com'}, 
    {\$set: {isActive: true}, \$unset: {suspendedAt: 1}}
  )
"
```

#### アカウント削除

**注意**: アカウント削除は慎重に行ってください。バックアップを取ってから実行することを推奨します。

**データベース直接操作**:

```bash
# 論理削除（推奨）
docker-compose exec mongodb mongo yosakoi_evaluation --eval "
  db.users.updateOne(
    {email: 'user@example.com'}, 
    {\$set: {isDeleted: true, deletedAt: new Date()}}
  )
"

# 物理削除（注意: 復旧不可）
docker-compose exec mongodb mongo yosakoi_evaluation --eval "
  db.users.deleteOne({email: 'user@example.com'})
"
```

### 権限管理

#### ロール変更

**データベース直接操作**:

```bash
# ユーザーを管理者に昇格
docker-compose exec mongodb mongo yosakoi_evaluation --eval "
  db.users.updateOne(
    {email: 'user@example.com'}, 
    {\$set: {role: 'admin'}}
  )
"

# 管理者をユーザーに降格
docker-compose exec mongodb mongo yosakoi_evaluation --eval "
  db.users.updateOne(
    {email: 'admin@example.com'}, 
    {\$set: {role: 'user'}}
  )
"
```

#### 権限の確認

**データベースクエリ**:

```bash
# ユーザーの権限確認
docker-compose exec mongodb mongo yosakoi_evaluation --eval "
  db.users.findOne(
    {email: 'user@example.com'}, 
    {email: 1, username: 1, role: 1, isActive: 1}
  )
"

# ロール別ユーザー数確認
docker-compose exec mongodb mongo yosakoi_evaluation --eval "
  db.users.aggregate([
    {\$group: {_id: '\$role', count: {\$sum: 1}}},
    {\$sort: {_id: 1}}
  ])
"
```

## コンテンツ管理

### 動画管理

#### 動画一覧・検索

**管理画面での確認**:

- 管理画面 > コンテンツ管理 > 動画一覧

**API経由での操作**:

```bash
# 動画一覧取得
curl -X GET "http://localhost:3001/api/videos?page=1&limit=50" \
  -H "Authorization: Bearer <admin_token>"

# 動画検索
curl -X GET "http://localhost:3001/api/videos?search=チーム名" \
  -H "Authorization: Bearer <admin_token>"
```

**データベース直接クエリ**:

```bash
# 動画一覧確認
docker-compose exec mongodb mongo yosakoi_evaluation --eval "
  db.videos.find({}, {title: 1, youtubeId: 1, createdAt: 1}).limit(10)
"
```

#### 動画の承認・削除

**API経由での操作**:

```bash
# 動画削除
curl -X DELETE "http://localhost:3001/api/videos/video_id" \
  -H "Authorization: Bearer <admin_token>"
```

**データベース直接操作**:

```bash
# 動画の論理削除
docker-compose exec mongodb mongo yosakoi_evaluation --eval "
  db.videos.updateOne(
    {_id: ObjectId('video_id')}, 
    {\$set: {isDeleted: true, deletedAt: new Date()}}
  )
"

# 動画の物理削除（注意: 復旧不可）
docker-compose exec mongodb mongo yosakoi_evaluation --eval "
  db.videos.deleteOne({_id: ObjectId('video_id')})
"
```

### テンプレート管理

#### システムテンプレートの管理

**API経由での操作**:

```bash
# テンプレート一覧取得
curl -X GET "http://localhost:3001/api/templates" \
  -H "Authorization: Bearer <admin_token>"

# テンプレート作成
curl -X POST "http://localhost:3001/api/templates" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <admin_token>" \
  -d '{
    "name": "標準評価テンプレート",
    "description": "システム標準テンプレート",
    "categories": [...]
  }'
```

**データベース直接操作**:

```bash
# テンプレートの公開・非公開切り替え
docker-compose exec mongodb mongo yosakoi_evaluation --eval "
  db.templates.updateOne(
    {_id: ObjectId('template_id')}, 
    {\$set: {isPublic: true}}
  )
"
```

### 評価セッション管理

#### セッション監視

**API経由での操作**:

```bash
# アクティブセッション一覧
curl -X GET "http://localhost:3001/api/sessions?status=active" \
  -H "Authorization: Bearer <admin_token>"

# セッション詳細確認
curl -X GET "http://localhost:3001/api/sessions/session_id" \
  -H "Authorization: Bearer <admin_token>"
```

**データベース直接クエリ**:

```bash
# アクティブセッション確認
docker-compose exec mongodb mongo yosakoi_evaluation --eval "
  db.sessions.find(
    {status: 'active'}, 
    {name: 1, createdBy: 1, startDate: 1, endDate: 1}
  )
"

# 問題のあるセッションの強制終了
docker-compose exec mongodb mongo yosakoi_evaluation --eval "
  db.sessions.updateOne(
    {_id: ObjectId('session_id')}, 
    {\$set: {status: 'closed', closedAt: new Date()}}
  )
"
```

## セキュリティ管理

### セキュリティ監査

#### 定期監査の実行

**実装済みコマンド**:

```bash
# 包括的セキュリティ監査
npm run security:audit

# 依存関係の脆弱性チェック
npm run security:scan

# セキュリティテストの実行
npm run security:test
```

#### 監査レポートの確認

**注意**: 監査レポートファイルの場所は実装により異なります。

```bash
# npm audit の結果確認
npm audit --json | jq '.vulnerabilities'

# 重要度別の脆弱性確認
npm audit --json | jq '.vulnerabilities[] | select(.severity == "critical")'

# バックエンドの脆弱性チェック
cd backend && npm audit

# フロントエンドの脆弱性チェック
cd frontend && npm audit
```

### アクセス制御

#### IP制限の設定

**注意**: 専用のCLIコマンドは実装されていません。以下の方法で対応してください。

**Nginx設定での制御** (推奨):

```bash
# nginx設定ファイルを編集
docker-compose exec nginx vi /etc/nginx/conf.d/default.conf

# 特定IPの許可例
# allow 192.168.1.100;
# deny all;

# 設定反映
docker-compose exec nginx nginx -s reload
```

**ファイアウォール設定**:

```bash
# iptablesでIP制限
sudo iptables -A INPUT -s 192.168.1.100 -j ACCEPT
sudo iptables -A INPUT -s 192.168.1.200 -j DROP

# 設定の確認
sudo iptables -L
```

#### レート制限の調整

**Express Rate Limit設定の確認**:

```bash
# バックエンドのログでレート制限状況を確認
docker-compose logs backend | grep "rate limit"

# Redis でレート制限データを確認
docker-compose exec redis redis-cli keys "*rate-limit*"
```

### セキュリティインシデント対応

#### 不正アクセスの検知

**ログ分析による検知**:

```bash
# 失敗したログイン試行の確認
docker-compose logs backend | grep "login failed" | tail -20

# 異常なアクセスパターンの確認
docker-compose logs backend | grep "401\|403" | tail -50

# アクセスログの分析
tail -f logs/access.log | grep -E "(401|403|429)"
```

#### 緊急時の対応

**システム緊急停止**:

```bash
# 全サービス停止
docker-compose -f docker-compose.prod.yml down

# 特定サービスのみ停止
docker-compose -f docker-compose.prod.yml stop backend
```

**緊急対応手順**:

```bash
# 1. システム状況の確認
docker-compose ps
docker stats --no-stream

# 2. ログの保全
cp -r logs/ incident_logs_$(date +%Y%m%d_%H%M%S)/

# 3. 必要に応じてデータベースの緊急バックアップ
docker-compose exec mongodb mongodump --out /backup/emergency_$(date +%Y%m%d_%H%M%S)
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

**実装済みスクリプト**:

```bash
# 基本バックアップスクリプト実行
npm run backup
# または
./scripts/backup.sh
```

**手動データベースバックアップ**:

```bash
# MongoDB バックアップ
docker-compose exec mongodb mongodump --out /backup/mongodb_$(date +%Y%m%d_%H%M%S)

# Redis バックアップ
docker-compose exec redis redis-cli save
docker cp $(docker-compose ps -q redis):/data/dump.rdb ./backup/redis_$(date +%Y%m%d_%H%M%S).rdb
```

### 復旧手順

#### データベース復旧

**注意**: 専用の復旧スクリプトは実装されていません。手動で復旧を行ってください。

**MongoDB復旧**:

```bash
# バックアップファイルからの復旧
docker-compose exec mongodb mongorestore --drop /backup/mongodb_backup_directory

# 特定のコレクションのみ復旧
docker-compose exec mongodb mongorestore --drop --collection videos /backup/mongodb_backup_directory/yosakoi_evaluation/videos.bson
```

**Redis復旧**:

```bash
# Redisサービス停止
docker-compose stop redis

# バックアップファイルをコピー
docker cp ./backup/redis_backup.rdb $(docker-compose ps -q redis):/data/dump.rdb

# Redisサービス再開
docker-compose start redis
```

#### 災害復旧

**手動復旧手順**:

```bash
# 1. システム停止
docker-compose -f docker-compose.prod.yml down

# 2. データベース復旧（上記手順参照）

# 3. 設定ファイル復旧
cp backup/config/* ./

# 4. システム再起動
docker-compose -f docker-compose.prod.yml up -d

# 5. 動作確認
curl -f http://localhost/health
```

## パフォーマンス管理

### パフォーマンス監視

#### リアルタイム監視

**システムリソース監視**:

```bash
# システムリソース監視（要インストール）
htop
iotop
nethogs

# 基本的なシステム監視
top
free -h
df -h

# Docker コンテナ監視
docker stats

# ネットワーク監視
netstat -tulpn
ss -tulpn
```

**データベース監視**:

```bash
# MongoDB 監視
docker-compose exec mongodb mongostat
docker-compose exec mongodb mongo --eval "db.stats()"

# Redis 監視
docker-compose exec redis redis-cli info stats
docker-compose exec redis redis-cli info memory
```

#### パフォーマンステスト

**注意**: 専用のパフォーマンステストコマンドは実装されていません。

**基本的なテスト**:

```bash
# 既存のテスト実行
npm run test:backend
npm run test:frontend

# 簡単なAPI応答テスト
curl -w "@curl-format.txt" -o /dev/null -s "http://localhost:3001/api/health"

# Apache Bench を使用した負荷テスト（要インストール）
ab -n 100 -c 10 http://localhost:3001/api/health
```

### 最適化

#### データベース最適化

```bash
# MongoDB インデックス確認
docker-compose exec mongodb mongo yosakoi_evaluation --eval "
  db.videos.getIndexes()
"

# MongoDB 統計情報更新
docker-compose exec mongodb mongo yosakoi_evaluation --eval "
  db.runCommand({planCacheClear: 'videos'})
"

# Redis メモリ最適化
docker-compose exec redis redis-cli config set maxmemory-policy allkeys-lru
docker-compose exec redis redis-cli config get maxmemory
```

#### アプリケーション最適化

**注意**: 専用の最適化コマンドは実装されていません。

**手動最適化**:

```bash
# Node.js プロセスの再起動
docker-compose restart backend

# 静的ファイルの再ビルド
npm run build:frontend

# Docker イメージの最適化
docker system prune -f
docker image prune -f
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

# 時間別エラー分析
grep "ERROR" logs/app.log | awk '{print $1, $2}' | sort | uniq -c

# エラーレベル別の統計
grep -E "(ERROR|WARN|INFO)" logs/app.log | awk '{print $3}' | sort | uniq -c

# 特定期間のエラー分析
grep "2024-01-01" logs/app.log | grep "ERROR" | wc -l
```

#### 一般的なエラーパターンと対処法

**1. データベース接続エラー**

```bash
# エラーパターン
grep "MongoNetworkError\|ECONNREFUSED.*27017" logs/error.log

# 対処方法
# MongoDB コンテナの状態確認
docker-compose ps mongodb
docker-compose logs mongodb

# MongoDB の再起動
docker-compose restart mongodb

# 接続設定の確認
docker-compose exec backend node -e "
  const mongoose = require('mongoose');
  mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('Connection successful'))
    .catch(err => console.error('Connection failed:', err));
"
```

**2. Redis 接続エラー**

```bash
# エラーパターン
grep "Redis.*ECONNREFUSED\|Redis.*timeout" logs/error.log

# 対処方法
# Redis コンテナの状態確認
docker-compose ps redis
docker-compose logs redis

# Redis の接続テスト
docker-compose exec redis redis-cli ping

# Redis メモリ使用量確認
docker-compose exec redis redis-cli info memory
```

**3. JWT トークンエラー**

```bash
# エラーパターン
grep "JsonWebTokenError\|TokenExpiredError\|invalid token" logs/error.log

# 対処方法
# JWT シークレットの確認
docker-compose exec backend node -e "
  console.log('JWT_SECRET length:', process.env.JWT_SECRET?.length);
  console.log('JWT_REFRESH_SECRET length:', process.env.JWT_REFRESH_SECRET?.length);
"

# 期限切れトークンのクリーンアップ
docker-compose exec redis redis-cli FLUSHDB
```

**4. YouTube API エラー**

```bash
# エラーパターン
grep "YouTube.*quota\|YouTube.*forbidden\|YouTube.*not found" logs/error.log

# 対処方法
# API キーの確認
docker-compose exec backend node -e "
  console.log('YouTube API Key:', process.env.YOUTUBE_API_KEY ? 'Set' : 'Not set');
"

# API クォータの確認
curl -s "https://www.googleapis.com/youtube/v3/videos?part=snippet&id=dQw4w9WgXcQ&key=${YOUTUBE_API_KEY}" | jq .

# レート制限の確認
grep "quotaExceeded\|rateLimitExceeded" logs/error.log | tail -10
```

**5. メモリ不足エラー**

```bash
# エラーパターン
grep "out of memory\|ENOMEM\|heap out of memory" logs/error.log

# 対処方法
# メモリ使用量の確認
docker stats --no-stream

# Node.js ヒープサイズの確認
docker-compose exec backend node -e "
  console.log('Heap used:', Math.round(process.memoryUsage().heapUsed / 1024 / 1024), 'MB');
  console.log('Heap total:', Math.round(process.memoryUsage().heapTotal / 1024 / 1024), 'MB');
"

# メモリ制限の調整（docker-compose.yml）
# services:
#   backend:
#     deploy:
#       resources:
#         limits:
#           memory: 1G
```

#### パフォーマンス問題の診断

**1. 応答時間の分析**

```bash
# アクセスログから応答時間を抽出
awk '{print $NF}' logs/access.log | sort -n | tail -20

# 平均応答時間の計算
awk '{sum+=$NF; count++} END {print "Average response time:", sum/count, "ms"}' logs/access.log

# 遅いリクエストの特定
awk '$NF > 1000 {print $0}' logs/access.log | head -10
```

**2. データベースクエリの最適化**

```bash
# MongoDB スロークエリの確認
docker-compose exec mongodb mongo yosakoi_evaluation --eval "
  db.setProfilingLevel(2, { slowms: 100 });
  db.system.profile.find().limit(5).sort({ ts: -1 }).pretty();
"

# インデックス使用状況の確認
docker-compose exec mongodb mongo yosakoi_evaluation --eval "
  db.videos.find({title: /test/}).explain('executionStats');
"
```

**3. リソース使用量の監視**

```bash
# CPU 使用率の確認
docker stats --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}" --no-stream

# ディスク使用量の確認
df -h
du -sh logs/
du -sh /var/lib/docker/

# ネットワーク使用量の確認
docker-compose exec backend netstat -i
```

## メンテナンス手順

### 定期メンテナンス

#### 日次メンテナンス

```bash
#!/bin/bash
# daily-maintenance.sh

# ログファイルサイズ確認
ls -lh logs/

# 一時ファイルクリーンアップ
find /tmp -name "yosakoi-*" -mtime +1 -delete 2>/dev/null || true

# データベース統計確認
docker-compose exec mongodb mongo yosakoi_evaluation --eval "
  print('Collections stats:');
  db.stats();
"

# システムリソース確認
echo "=== Disk Usage ==="
df -h
echo "=== Memory Usage ==="
free -h
echo "=== Docker Stats ==="
docker stats --no-stream
```

#### 週次メンテナンス

```bash
#!/bin/bash
# weekly-maintenance.sh

# セキュリティ監査（実装済み）
npm run security:audit
npm run security:scan

# テスト実行
npm run test:backend
npm run test:frontend

# 不要なDockerイメージ削除
docker image prune -f
docker container prune -f

# ログファイルのアーカイブ
tar -czf logs_archive_$(date +%Y%m%d).tar.gz logs/
```

#### 月次メンテナンス

```bash
#!/bin/bash
# monthly-maintenance.sh

# 依存関係の脆弱性チェックと更新
npm audit
npm audit fix

# バックエンド依存関係更新
cd backend
npm audit
npm audit fix
cd ..

# フロントエンド依存関係更新
cd frontend
npm audit
npm audit fix
cd ..

# データベース統計情報更新
docker-compose exec mongodb mongo yosakoi_evaluation --eval "
  db.runCommand({planCacheClear: 'videos'});
  db.runCommand({planCacheClear: 'users'});
  db.runCommand({planCacheClear: 'sessions'});
"

# SSL証明書確認（証明書が存在する場合）
if [ -f "nginx/ssl/cert.pem" ]; then
  echo "SSL Certificate expiry:"
  openssl x509 -in nginx/ssl/cert.pem -text -noout | grep "Not After"
fi
```

### アップデート手順

#### アプリケーションアップデート

```bash
# 1. バックアップ作成
npm run backup

# 2. 新バージョンのダウンロード
git fetch origin
git checkout main  # または適切なブランチ/タグ

# 3. 依存関係更新
npm run install:all

# 4. アプリケーションビルド
npm run build

# 5. アプリケーション再起動
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d

# 6. 動作確認
sleep 30  # サービス起動待ち
curl -f http://localhost:3001/api/health || echo "Health check failed"

# 7. テスト実行
npm run test:backend
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

**注意**: 専用の緊急復旧スクリプトは実装されていません。

```bash
# 手動緊急復旧手順

# 1. 現在の状況確認
docker-compose ps
docker stats --no-stream

# 2. ログの保全
mkdir -p incident_$(date +%Y%m%d_%H%M%S)
cp -r logs/ incident_$(date +%Y%m%d_%H%M%S)/

# 3. 最新バックアップからの復旧（手動）
# MongoDB復旧
docker-compose exec mongodb mongorestore --drop /backup/latest_mongodb_backup

# 4. 最小限のサービス起動
docker-compose up -d mongodb redis
sleep 10
docker-compose up -d backend
sleep 10
docker-compose up -d frontend nginx
```

#### インシデント報告

**手動インシデント報告**:

```bash
# インシデント情報の記録
cat > incident_report_$(date +%Y%m%d_%H%M%S).txt << EOF
インシデント発生時刻: $(date)
システム状況: $(docker-compose ps)
エラーログ: $(tail -20 logs/error.log)
対応内容: [手動で記入]
EOF

# 関係者への通知（メール送信例）
echo "システムインシデントが発生しました。詳細は添付ファイルを確認してください。" | \
  mail -s "緊急: システムインシデント発生" -a incident_report_*.txt admin@your-domain.com
```