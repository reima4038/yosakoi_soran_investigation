# デプロイメントガイド

## 概要

このドキュメントでは、YOSAKOIパフォーマンス評価システムの本番環境へのデプロイメント手順について説明します。

## 前提条件

- Docker および Docker Compose がインストールされていること
- AWS CLI が設定されていること
- Terraform がインストールされていること
- 必要な環境変数が設定されていること

## 環境設定

### 1. 環境変数の詳細設定

**本番環境用設定ファイルの作成**:

```bash
cp .env.production.example .env.production
```

**必須環境変数の設定**:

```bash
# .env.production
# アプリケーション設定
NODE_ENV=production
PORT=3001

# データベース設定
MONGODB_URI=mongodb://mongodb_user:mongodb_password@mongodb:27017/yosakoi_evaluation?authSource=admin
REDIS_URL=redis://redis_user:redis_password@redis:6379

# JWT設定（32文字以上の強力なキーを使用）
JWT_SECRET=your_very_secure_jwt_secret_key_minimum_32_characters_long
JWT_REFRESH_SECRET=your_different_refresh_secret_key_minimum_32_characters
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d

# 外部API設定
YOUTUBE_API_KEY=your_youtube_api_key_from_google_console

# メール設定
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_gmail_app_password

# セキュリティ設定
BCRYPT_SALT_ROUNDS=12
CORS_ORIGIN=https://your-domain.com,https://www.your-domain.com

# ログ設定
LOG_LEVEL=warn
LOG_FILE_PATH=/app/logs

# 監視設定
ENABLE_METRICS=true
METRICS_PORT=9090
```

### 2. SSL証明書の詳細設定

**Let's Encrypt を使用した自動証明書取得**:

```bash
# Certbot のインストール
sudo apt-get update
sudo apt-get install certbot

# 証明書の取得
sudo certbot certonly --standalone \
  --email admin@your-domain.com \
  --agree-tos \
  --no-eff-email \
  -d your-domain.com \
  -d www.your-domain.com

# 証明書の配置
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem nginx/ssl/cert.pem
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem nginx/ssl/key.pem

# 権限設定
sudo chown $USER:$USER nginx/ssl/*.pem
chmod 600 nginx/ssl/key.pem
chmod 644 nginx/ssl/cert.pem
```

**証明書の自動更新設定**:

```bash
# 更新スクリプトの作成
cat > scripts/renew-ssl.sh << 'EOF'
#!/bin/bash
certbot renew --quiet
cp /etc/letsencrypt/live/your-domain.com/fullchain.pem nginx/ssl/cert.pem
cp /etc/letsencrypt/live/your-domain.com/privkey.pem nginx/ssl/key.pem
docker-compose -f docker-compose.prod.yml restart nginx
EOF

chmod +x scripts/renew-ssl.sh

# Cron ジョブの設定（毎月1日の午前2時に実行）
echo "0 2 1 * * /path/to/yosakoi-evaluation/scripts/renew-ssl.sh" | crontab -
```

**証明書ディレクトリ構造**:

```
nginx/ssl/
├── cert.pem          # SSL証明書（公開鍵）
├── key.pem           # 秘密鍵
├── dhparam.pem       # Diffie-Hellman パラメータ（オプション）
└── backup/           # 証明書のバックアップ
    ├── cert.pem.bak
    └── key.pem.bak
```

## デプロイメント手順

### 1. 前提条件の確認

```bash
# Docker と Docker Compose のバージョン確認
docker --version  # 推奨: 20.10以上
docker-compose --version  # 推奨: 2.0以上

# 必要なポートが利用可能か確認
netstat -tulpn | grep -E ':(80|443|3001|27017|6379)'

# ディスク容量確認
df -h  # 最低10GB以上の空き容量が必要
```

### 2. 環境設定ファイルの準備

```bash
# 本番環境用設定ファイルをコピー
cp .env.production.example .env.production

# 設定値を編集（重要: 実際の値に変更）
nano .env.production

# 必須設定項目の確認
grep -E '^(JWT_SECRET|MONGODB_URI|REDIS_URL|YOUTUBE_API_KEY)=' .env.production
```

### 3. SSL証明書の設置

```bash
# SSL証明書ディレクトリの作成
mkdir -p nginx/ssl

# 証明書ファイルの配置
# Let's Encrypt を使用する場合
certbot certonly --standalone -d your-domain.com
cp /etc/letsencrypt/live/your-domain.com/fullchain.pem nginx/ssl/cert.pem
cp /etc/letsencrypt/live/your-domain.com/privkey.pem nginx/ssl/key.pem

# 自己署名証明書を使用する場合（開発・テスト用）
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx/ssl/key.pem \
  -out nginx/ssl/cert.pem \
  -subj "/C=JP/ST=Tokyo/L=Tokyo/O=YosakoiEval/CN=your-domain.com"

# 証明書ファイルの権限設定
chmod 600 nginx/ssl/key.pem
chmod 644 nginx/ssl/cert.pem
```

### 4. アプリケーションのビルドとデプロイ

```bash
# 依存関係のインストール
npm run install:all

# アプリケーションのビルド
npm run build

# Docker イメージのビルド
npm run docker:build

# 本番環境でのコンテナ起動
npm run docker:up

# または手動でDocker Composeを使用
docker-compose -f docker-compose.prod.yml up -d
```

### 5. デプロイメント検証

```bash
# コンテナの起動状況確認
docker-compose -f docker-compose.prod.yml ps

# ヘルスチェック
curl -f http://localhost:3001/api/health
curl -f https://your-domain.com/api/health

# データベース接続確認
docker-compose -f docker-compose.prod.yml exec backend npm run db:ping

# ログの確認
docker-compose -f docker-compose.prod.yml logs --tail=50
```

### 6. 初期データのセットアップ

```bash
# 管理者アカウントの作成
docker-compose -f docker-compose.prod.yml exec backend npm run admin:create-user \
  --email admin@your-domain.com \
  --username admin \
  --password "secure_password_here" \
  --role admin

# サンプルテンプレートの作成（オプション）
docker-compose -f docker-compose.prod.yml exec backend npm run seed:templates
```

## 監視とメンテナンス

### 監視システムの設定

**Docker Compose での監視サービス追加**:

```yaml
# docker-compose.monitoring.yml
version: '3.8'
services:
  prometheus:
    image: prom/prometheus:latest
    container_name: prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/etc/prometheus/console_libraries'
      - '--web.console.templates=/etc/prometheus/consoles'

  grafana:
    image: grafana/grafana:latest
    container_name: grafana
    ports:
      - "3000:3000"
    volumes:
      - grafana_data:/var/lib/grafana
      - ./monitoring/grafana/dashboards:/etc/grafana/provisioning/dashboards
      - ./monitoring/grafana/datasources:/etc/grafana/provisioning/datasources
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_ADMIN_PASSWORD}

volumes:
  prometheus_data:
  grafana_data:
```

**監視サービスの起動**:

```bash
# 監視サービスの起動
docker-compose -f docker-compose.prod.yml -f docker-compose.monitoring.yml up -d

# 監視ダッシュボードへのアクセス
# Grafana: http://your-domain.com:3000 (admin / GRAFANA_ADMIN_PASSWORD)
# Prometheus: http://your-domain.com:9090
```

### ログ管理の詳細設定

**ログローテーション設定**:

```bash
# /etc/logrotate.d/yosakoi-evaluation
/opt/yosakoi-evaluation/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 root root
    postrotate
        docker-compose -f /opt/yosakoi-evaluation/docker-compose.prod.yml restart backend
    endscript
}
```

**ログの確認コマンド**:

```bash
# 全サービスのログ確認
docker-compose -f docker-compose.prod.yml logs --tail=100

# 特定サービスのログ確認
docker-compose -f docker-compose.prod.yml logs -f backend
docker-compose -f docker-compose.prod.yml logs -f frontend
docker-compose -f docker-compose.prod.yml logs -f nginx

# エラーログのみ確認
docker-compose -f docker-compose.prod.yml logs backend | grep ERROR

# ログファイルの直接確認
tail -f logs/app.log
tail -f logs/error.log
tail -f logs/access.log
```

### バックアップシステムの詳細設定

**自動バックアップスクリプトの改良**:

```bash
#!/bin/bash
# scripts/backup.sh

set -e

BACKUP_DIR="/opt/backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="yosakoi_backup_${DATE}"

# バックアップディレクトリの作成
mkdir -p ${BACKUP_DIR}

echo "Starting backup: ${BACKUP_NAME}"

# MongoDB バックアップ
echo "Backing up MongoDB..."
docker-compose -f docker-compose.prod.yml exec -T mongodb mongodump \
  --out /tmp/mongodb_backup_${DATE}

docker cp $(docker-compose -f docker-compose.prod.yml ps -q mongodb):/tmp/mongodb_backup_${DATE} \
  ${BACKUP_DIR}/mongodb_${DATE}

# Redis バックアップ
echo "Backing up Redis..."
docker-compose -f docker-compose.prod.yml exec -T redis redis-cli SAVE
docker cp $(docker-compose -f docker-compose.prod.yml ps -q redis):/data/dump.rdb \
  ${BACKUP_DIR}/redis_${DATE}.rdb

# アプリケーションファイルのバックアップ
echo "Backing up application files..."
tar -czf ${BACKUP_DIR}/app_files_${DATE}.tar.gz \
  --exclude='node_modules' \
  --exclude='logs' \
  --exclude='.git' \
  .

# ログファイルのバックアップ
echo "Backing up logs..."
tar -czf ${BACKUP_DIR}/logs_${DATE}.tar.gz logs/

# 古いバックアップの削除（30日以上古いもの）
find ${BACKUP_DIR} -name "*.tar.gz" -mtime +30 -delete
find ${BACKUP_DIR} -name "*.rdb" -mtime +30 -delete
find ${BACKUP_DIR} -type d -name "mongodb_*" -mtime +30 -exec rm -rf {} +

echo "Backup completed: ${BACKUP_NAME}"

# バックアップ結果の通知（オプション）
if [ ! -z "$SLACK_WEBHOOK" ]; then
  curl -X POST -H 'Content-type: application/json' \
    --data "{\"text\":\"Backup completed: ${BACKUP_NAME}\"}" \
    $SLACK_WEBHOOK
fi
```

**Cron設定の詳細**:

```bash
# crontab -e で以下を追加

# 毎日午前2時にバックアップ実行
0 2 * * * /opt/yosakoi-evaluation/scripts/backup.sh daily >> /var/log/yosakoi-backup.log 2>&1

# 毎週日曜日午前1時に週次バックアップ
0 1 * * 0 /opt/yosakoi-evaluation/scripts/backup.sh weekly >> /var/log/yosakoi-backup.log 2>&1

# 毎月1日午前0時に月次バックアップ
0 0 1 * * /opt/yosakoi-evaluation/scripts/backup.sh monthly >> /var/log/yosakoi-backup.log 2>&1

# SSL証明書の更新チェック（毎月1日午前2時）
0 2 1 * * /opt/yosakoi-evaluation/scripts/renew-ssl.sh >> /var/log/ssl-renewal.log 2>&1
```

## トラブルシューティング

### よくある問題

1. **データベース接続エラー**
   - MongoDB コンテナが起動しているか確認
   - 環境変数 `MONGODB_URI` が正しく設定されているか確認

2. **SSL証明書エラー**
   - 証明書ファイルのパスと権限を確認
   - 証明書の有効期限を確認

3. **メモリ不足**
   - Docker コンテナのメモリ制限を確認
   - システムリソースの使用状況を監視

### ログレベルの調整

本番環境では、ログレベルを適切に設定してください：

```bash
# backend/.env.production
LOG_LEVEL=warn

# frontend/.env.production
REACT_APP_LOG_LEVEL=error
```

## セキュリティ考慮事項

1. **定期的なセキュリティアップデート**
   ```bash
   # 依存関係の脆弱性チェック
   npm audit
   
   # Docker イメージの更新
   docker-compose pull
   ```

2. **アクセス制御**
   - 管理者パネルへのアクセス制限
   - API レート制限の設定
   - ファイアウォール設定の確認

3. **データ暗号化**
   - データベース接続の暗号化
   - 機密データの暗号化保存

## パフォーマンス最適化

1. **キャッシュ設定**
   - Redis キャッシュの適切な設定
   - CDN の活用

2. **データベース最適化**
   - インデックスの最適化
   - クエリパフォーマンスの監視

3. **リソース監視**
   - CPU、メモリ使用率の監視
   - ディスク容量の監視

## 災害復旧

### バックアップからの復旧

```bash
# MongoDB の復旧
docker exec -i mongodb mongorestore --drop /backup/path

# Redis の復旧
docker cp backup/redis_backup.rdb redis:/data/dump.rdb
docker restart redis
```

### 緊急時の対応

1. **サービス停止**
   ```bash
   npm run docker:down
   ```

2. **ロールバック**
   ```bash
   git checkout previous-stable-tag
   npm run deploy
   ```

3. **緊急連絡先**
   - システム管理者: admin@example.com
   - 開発チーム: dev-team@example.com

## 更新・アップデート手順

### 1. 段階的デプロイメント

**ステージング環境でのテスト**:

```bash
# ステージング環境用設定
cp .env.staging.example .env.staging

# ステージング環境でのデプロイ
docker-compose -f docker-compose.staging.yml up -d

# 自動テストの実行
npm run test:e2e:staging

# 手動テストの実行
echo "Manual testing checklist:"
echo "- [ ] User registration and login"
echo "- [ ] Video upload and management"
echo "- [ ] Evaluation session creation"
echo "- [ ] Real-time evaluation features"
echo "- [ ] Results visualization"
```

**本番環境への段階的ロールアウト**:

```bash
# 1. 事前バックアップ
./scripts/backup.sh pre-deployment

# 2. メンテナンスモードの有効化
docker-compose -f docker-compose.prod.yml exec nginx \
  cp /etc/nginx/maintenance.html /usr/share/nginx/html/index.html

# 3. 新バージョンのビルド
git fetch origin
git checkout v1.2.0  # 新しいバージョンタグ
npm run build

# 4. データベースマイグレーション（必要な場合）
docker-compose -f docker-compose.prod.yml exec backend npm run migrate

# 5. アプリケーションの更新
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d

# 6. ヘルスチェック
sleep 30
curl -f http://localhost:3001/api/health

# 7. メンテナンスモードの解除
docker-compose -f docker-compose.prod.yml exec nginx \
  rm /usr/share/nginx/html/index.html
docker-compose -f docker-compose.prod.yml restart nginx
```

### 2. ダウンタイムの最小化

**ブルーグリーンデプロイメント設定**:

```yaml
# docker-compose.blue-green.yml
version: '3.8'
services:
  backend-blue:
    build: ./backend
    environment:
      - NODE_ENV=production
      - PORT=3001
    networks:
      - app-network

  backend-green:
    build: ./backend
    environment:
      - NODE_ENV=production
      - PORT=3002
    networks:
      - app-network

  nginx-lb:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/blue-green.conf:/etc/nginx/nginx.conf
    depends_on:
      - backend-blue
      - backend-green
```

**ローリングアップデート**:

```bash
# ローリングアップデートスクリプト
#!/bin/bash
# scripts/rolling-update.sh

SERVICES=("backend" "frontend")

for service in "${SERVICES[@]}"; do
  echo "Updating $service..."
  
  # 新しいイメージをプル
  docker-compose -f docker-compose.prod.yml pull $service
  
  # サービスを1つずつ更新
  docker-compose -f docker-compose.prod.yml up -d --no-deps $service
  
  # ヘルスチェック
  sleep 10
  if ! curl -f http://localhost:3001/api/health; then
    echo "Health check failed for $service"
    exit 1
  fi
  
  echo "$service updated successfully"
done
```

### 3. バックアップとロールバック

**デプロイ前の完全バックアップ**:

```bash
#!/bin/bash
# scripts/pre-deployment-backup.sh

DEPLOYMENT_DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/opt/backups/pre-deployment"

mkdir -p ${BACKUP_DIR}

echo "Creating pre-deployment backup: ${DEPLOYMENT_DATE}"

# アプリケーション状態のスナップショット
docker-compose -f docker-compose.prod.yml ps > ${BACKUP_DIR}/container_status_${DEPLOYMENT_DATE}.txt

# データベースバックアップ
docker-compose -f docker-compose.prod.yml exec -T mongodb mongodump --out /tmp/pre_deploy_${DEPLOYMENT_DATE}
docker cp $(docker-compose -f docker-compose.prod.yml ps -q mongodb):/tmp/pre_deploy_${DEPLOYMENT_DATE} \
  ${BACKUP_DIR}/mongodb_${DEPLOYMENT_DATE}

# 設定ファイルのバックアップ
cp -r nginx/ ${BACKUP_DIR}/nginx_${DEPLOYMENT_DATE}
cp .env.production ${BACKUP_DIR}/env_${DEPLOYMENT_DATE}
cp docker-compose.prod.yml ${BACKUP_DIR}/docker-compose_${DEPLOYMENT_DATE}.yml

echo "Pre-deployment backup completed"
```

**ロールバック計画**:

```bash
#!/bin/bash
# scripts/rollback.sh

if [ -z "$1" ]; then
  echo "Usage: $0 <backup_date>"
  echo "Available backups:"
  ls -la /opt/backups/pre-deployment/
  exit 1
fi

BACKUP_DATE=$1
BACKUP_DIR="/opt/backups/pre-deployment"

echo "Rolling back to: ${BACKUP_DATE}"

# 1. 現在のサービスを停止
docker-compose -f docker-compose.prod.yml down

# 2. 設定ファイルの復元
cp ${BACKUP_DIR}/env_${BACKUP_DATE} .env.production
cp ${BACKUP_DIR}/docker-compose_${BACKUP_DATE}.yml docker-compose.prod.yml
cp -r ${BACKUP_DIR}/nginx_${BACKUP_DATE}/* nginx/

# 3. データベースの復元
docker-compose -f docker-compose.prod.yml up -d mongodb redis
sleep 10

docker-compose -f docker-compose.prod.yml exec -T mongodb mongorestore --drop /tmp/restore_${BACKUP_DATE}
docker cp ${BACKUP_DIR}/mongodb_${BACKUP_DATE} $(docker-compose -f docker-compose.prod.yml ps -q mongodb):/tmp/restore_${BACKUP_DATE}

# 4. アプリケーションの起動
docker-compose -f docker-compose.prod.yml up -d

# 5. ヘルスチェック
sleep 30
if curl -f http://localhost:3001/api/health; then
  echo "Rollback completed successfully"
else
  echo "Rollback failed - manual intervention required"
  exit 1
fi
```

### 4. デプロイメント自動化

**GitHub Actions による CI/CD**:

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    tags:
      - 'v*'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: npm run install:all
        
      - name: Run tests
        run: |
          npm run test:backend
          npm run test:frontend
          
      - name: Build application
        run: npm run build
        
      - name: Deploy to production
        env:
          DEPLOY_HOST: ${{ secrets.DEPLOY_HOST }}
          DEPLOY_USER: ${{ secrets.DEPLOY_USER }}
          DEPLOY_KEY: ${{ secrets.DEPLOY_KEY }}
        run: |
          echo "$DEPLOY_KEY" > deploy_key
          chmod 600 deploy_key
          
          ssh -i deploy_key -o StrictHostKeyChecking=no $DEPLOY_USER@$DEPLOY_HOST '
            cd /opt/yosakoi-evaluation
            git fetch origin
            git checkout ${{ github.ref_name }}
            ./scripts/deploy.sh
          '
```