#!/bin/bash

set -e

# 設定
BACKUP_DIR="/opt/backups"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=30

echo "🗄️  Starting backup process..."

# バックアップディレクトリの作成
mkdir -p $BACKUP_DIR

# MongoDB バックアップ
echo "📊 Backing up MongoDB..."
docker exec mongodb mongodump \
    --host localhost:27017 \
    --db yosakoi_evaluation \
    --out /tmp/backup_$DATE

docker cp mongodb:/tmp/backup_$DATE $BACKUP_DIR/mongodb_$DATE
docker exec mongodb rm -rf /tmp/backup_$DATE

# MongoDB バックアップの圧縮
cd $BACKUP_DIR
tar -czf mongodb_backup_$DATE.tar.gz mongodb_$DATE
rm -rf mongodb_$DATE

# Redis バックアップ
echo "🔴 Backing up Redis..."
docker exec redis redis-cli BGSAVE
sleep 5
docker cp redis:/data/dump.rdb $BACKUP_DIR/redis_backup_$DATE.rdb

# アプリケーションログのバックアップ
echo "📝 Backing up application logs..."
if [ -d "./logs" ]; then
    tar -czf $BACKUP_DIR/logs_backup_$DATE.tar.gz logs/
fi

# SSL証明書のバックアップ
echo "🔐 Backing up SSL certificates..."
if [ -d "./nginx/ssl" ]; then
    tar -czf $BACKUP_DIR/ssl_backup_$DATE.tar.gz nginx/ssl/
fi

# 古いバックアップの削除
echo "🧹 Cleaning up old backups..."
find $BACKUP_DIR -name "*backup*" -type f -mtime +$RETENTION_DAYS -delete

# S3 にアップロード（オプション）
if [ ! -z "$AWS_S3_BACKUP_BUCKET" ]; then
    echo "☁️  Uploading backups to S3..."
    aws s3 sync $BACKUP_DIR s3://$AWS_S3_BACKUP_BUCKET/backups/$(date +%Y/%m/%d)/
fi

echo "✅ Backup completed successfully!"
echo "📁 Backup location: $BACKUP_DIR"