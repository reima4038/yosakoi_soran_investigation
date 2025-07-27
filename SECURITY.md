# セキュリティガイド

## 概要

YOSAKOIパフォーマンス評価システムのセキュリティ対策について説明します。

## セキュリティ機能

### 1. 認証・認可

#### JWT認証
- アクセストークンの有効期限: 1時間
- リフレッシュトークンの有効期限: 7日間
- トークンの自動更新機能

#### パスワードポリシー
- 最低8文字以上
- 大文字・小文字・数字・特殊文字を含む
- 過去3回のパスワードは再利用不可

#### 多要素認証（MFA）
- TOTP（Time-based One-Time Password）対応
- バックアップコード生成
- 管理者アカウントでは必須

### 2. データ保護

#### 暗号化
- **転送時**: TLS 1.2以上
- **保存時**: AES-256暗号化
- **パスワード**: bcrypt（ソルト付きハッシュ）

#### データサニタイゼーション
- XSS攻撃対策
- NoSQLインジェクション対策
- HTMLタグの無害化

### 3. アクセス制御

#### レート制限
- ログイン試行: 15分間に5回まで
- API呼び出し: 15分間に100回まで
- 登録試行: 1時間に3回まで

#### CORS設定
- 許可されたオリジンのみアクセス可能
- 認証情報付きリクエストの制御
- プリフライトリクエストの適切な処理

### 4. セキュリティヘッダー

```
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000; includeSubDomains
Content-Security-Policy: default-src 'self'; script-src 'self' https://www.youtube.com
```

## セキュリティ監査

### 自動監査
```bash
# 依存関係の脆弱性チェック
npm run security:scan

# セキュリティテストの実行
npm run security:test

# 包括的なセキュリティ監査
npm run security:audit
```

### 手動監査チェックリスト

#### コード監査
- [ ] ハードコードされたシークレットの確認
- [ ] 入力バリデーションの実装確認
- [ ] エラーハンドリングの適切性確認
- [ ] ログ出力の機密情報漏洩確認

#### 設定監査
- [ ] 環境変数の適切な設定
- [ ] データベース接続の暗号化
- [ ] SSL証明書の有効性確認
- [ ] ファイアウォール設定の確認

#### インフラ監査
- [ ] サーバーのセキュリティパッチ適用状況
- [ ] 不要なサービスの停止
- [ ] ログ監視システムの動作確認
- [ ] バックアップの暗号化確認

## 脆弱性対応

### 脆弱性報告
セキュリティ脆弱性を発見した場合は、以下の手順で報告してください：

1. **緊急度の判定**
   - Critical: システム全体に影響
   - High: 重要な機能に影響
   - Medium: 限定的な影響
   - Low: 軽微な影響

2. **報告先**
   - メール: security@example.com
   - 暗号化: PGPキーを使用

3. **報告内容**
   - 脆弱性の詳細説明
   - 再現手順
   - 影響範囲
   - 推奨される対策

### 対応プロセス

#### Critical/High脆弱性
1. **即座の対応**（24時間以内）
   - 緊急パッチの適用
   - 影響範囲の特定
   - ユーザーへの通知

2. **詳細調査**（48時間以内）
   - 根本原因の分析
   - 類似脆弱性の確認
   - 対策の検証

#### Medium/Low脆弱性
1. **計画的対応**（1週間以内）
   - 修正計画の策定
   - テスト環境での検証
   - 定期メンテナンスでの適用

## インシデント対応

### セキュリティインシデントの種類
- 不正アクセス
- データ漏洩
- サービス拒否攻撃
- マルウェア感染

### 対応手順

#### 1. 検知・報告
- 自動監視システムによる検知
- ユーザーからの報告
- 定期監査での発見

#### 2. 初期対応
```bash
# サービスの緊急停止
npm run docker:down

# ログの保全
cp -r logs/ incident_logs_$(date +%Y%m%d_%H%M%S)/

# ネットワークの遮断
iptables -A INPUT -j DROP
```

#### 3. 調査・分析
- ログ分析
- 影響範囲の特定
- 攻撃手法の解析

#### 4. 復旧・対策
- 脆弱性の修正
- システムの復旧
- 再発防止策の実装

## セキュリティ設定

### 環境変数
```bash
# JWT設定
JWT_SECRET=your_very_secure_jwt_secret_key_here
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d

# セッション設定
SESSION_SECRET=your_session_secret_here
SESSION_SECURE=true
SESSION_HTTPONLY=true

# レート制限設定
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# CORS設定
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# 通知設定
SLACK_SECURITY_WEBHOOK=https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK
```

### データベース設定
```javascript
// MongoDB接続設定
const mongoOptions = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  ssl: true,
  sslValidate: true,
  authSource: 'admin'
};
```

## 定期的なセキュリティタスク

### 日次
- [ ] セキュリティログの確認
- [ ] 異常なアクセスパターンの監視
- [ ] システムリソースの監視

### 週次
- [ ] 依存関係の脆弱性チェック
- [ ] セキュリティテストの実行
- [ ] バックアップの整合性確認

### 月次
- [ ] セキュリティ監査の実行
- [ ] アクセス権限の見直し
- [ ] インシデント対応手順の確認

### 四半期
- [ ] ペネトレーションテストの実施
- [ ] セキュリティポリシーの見直し
- [ ] 災害復旧テストの実施

## セキュリティトレーニング

### 開発者向け
- セキュアコーディング研修
- OWASP Top 10の理解
- 脆弱性対応手順の習得

### 運用者向け
- インシデント対応研修
- ログ分析手法の習得
- セキュリティツールの使用方法

## 参考資料

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Checklist](https://blog.risingstack.com/node-js-security-checklist/)
- [MongoDB Security Checklist](https://docs.mongodb.com/manual/administration/security-checklist/)
- [Express.js Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)