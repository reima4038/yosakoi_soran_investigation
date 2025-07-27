# デプロイメントガイド

## 概要

このドキュメントでは、YOSAKOIパフォーマンス評価システムの本番環境へのデプロイメント手順について説明します。

## 前提条件

- Docker および Docker Compose がインストールされていること
- AWS CLI が設定されていること
- Terraform がインストールされていること
- 必要な環境変数が設定されていること

## 環境設定

### 1. 環境変数の設定

`.env.production.example` をコピーして `.env.production` を作成し、適切な値を設定してください。

```bash
cp .env.production.example .env.production
```

### 2. SSL証明書の準備

SSL証明書を `nginx/ssl/` ディレクトリに配置してください：

```
nginx/ssl/
├── cert.pem
└── key.pem
```

## デプロイメント手順

### 1. インフラストラクチャのデプロイ

```bash
cd infrastructure
terraform init
terraform plan
terraform apply
```

### 2. アプリケーションのデプロイ

```bash
# 自動デプロイスクリプトを使用
npm run deploy

# または手動でDocker Composeを使用
npm run docker:build
npm run docker:up
```

### 3. ヘルスチェック

```bash
curl -f http://your-domain.com/health
```

## 監視とメンテナンス

### 監視ダッシュボード

- **Grafana**: http://your-domain.com:3000
- **Prometheus**: http://your-domain.com:9090

### ログの確認

```bash
# アプリケーションログ
npm run docker:logs

# 特定のサービスのログ
docker-compose -f docker-compose.prod.yml logs -f backend
```

### バックアップ

```bash
# 手動バックアップ
npm run backup

# 自動バックアップ（cron設定例）
0 2 * * * /path/to/project/scripts/backup.sh
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

## 更新手順

1. **段階的デプロイメント**
   - ステージング環境でのテスト
   - 本番環境への段階的ロールアウト

2. **ダウンタイムの最小化**
   - ブルーグリーンデプロイメント
   - ローリングアップデート

3. **バックアップの確保**
   - デプロイ前の完全バックアップ
   - ロールバック計画の準備