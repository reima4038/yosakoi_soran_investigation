# ドキュメント画像管理ガイド

## 概要

このディレクトリには、よさこいパフォーマンス評価システムのドキュメントで使用される画像ファイルが格納されています。

## ディレクトリ構造

```
docs/images/
├── architecture/          # システムアーキテクチャ図
├── ui/                    # UI スクリーンショット
├── diagrams/              # フローチャート・シーケンス図
├── monitoring/            # 監視ダッシュボード画像
└── README.md             # このファイル
```

## ファイル命名規則

### 基本ルール

- 小文字とハイフンを使用: `login-screen.png`
- 日本語は使用しない: ❌ `ログイン画面.png`
- スペースは使用しない: ❌ `login screen.png`
- アンダースコアよりハイフンを優先: ✅ `user-dashboard.png`

### カテゴリ別命名規則

#### UI スクリーンショット (`ui/`)

- `{画面名}-{状態}.png`
- 例: `login-screen.png`, `dashboard-overview.png`, `video-management.png`

#### アーキテクチャ図 (`architecture/`)

- `{システム名}-{図の種類}.png`
- 例: `system-overview.png`, `database-schema.png`, `api-structure.png`

#### フローチャート (`diagrams/`)

- `{プロセス名}-flow.png`
- 例: `user-registration-flow.png`, `evaluation-process-flow.png`

#### 監視画像 (`monitoring/`)

- `{ツール名}-{ダッシュボード名}.png`
- 例: `grafana-dashboard.png`, `prometheus-metrics.png`

## ファイル仕様

### 画像形式

- **推奨**: PNG（透明背景、高品質）
- **代替**: JPG（写真系、ファイルサイズ重視）
- **避ける**: GIF（アニメーション以外）、BMP、TIFF

### 解像度・サイズ

| 用途 | 推奨解像度 | 最大ファイルサイズ |
|------|------------|-------------------|
| UI スクリーンショット | 1920x1080 | 2MB |
| アーキテクチャ図 | 1200x800 | 1MB |
| フローチャート | 1000x800 | 1MB |
| 監視ダッシュボード | 1920x1080 | 2MB |

### 品質基準

- **DPI**: 72dpi（Web用）
- **色深度**: 24bit（フルカラー）
- **圧縮**: 適度な圧縮（品質80-90%）

## スクリーンショット撮影ガイドライン

### 準備

1. **ブラウザー設定**:
   - ズーム: 100%
   - ウィンドウサイズ: 1920x1080
   - 開発者ツール: 非表示

2. **データ準備**:
   - サンプルデータの用意
   - 個人情報の除去・マスキング
   - 適切な状態での撮影

### 撮影手順

1. **画面の準備**:
   - 不要な要素の非表示
   - ローディング状態の回避
   - エラーメッセージの除去

2. **撮影**:
   - 全画面または必要な部分のみ
   - 一貫した撮影範囲
   - 高解像度での撮影

3. **後処理**:
   - 不要な部分のトリミング
   - 個人情報のマスキング
   - ファイルサイズの最適化

### 撮影ツール

#### macOS
- **標準**: `Cmd + Shift + 4`（部分スクリーンショット）
- **推奨**: Screenshot アプリ
- **高機能**: CleanShot X, Skitch

#### Windows
- **標準**: `Win + Shift + S`（Snipping Tool）
- **推奨**: Snipping Tool
- **高機能**: Greenshot, LightShot

#### ブラウザー拡張
- **Chrome**: Awesome Screenshot
- **Firefox**: Firefox Screenshots
- **Edge**: Web Capture

## 画像最適化

### 自動最適化ツール

```bash
# ImageOptim (macOS)
imageoptim docs/images/**/*.png

# TinyPNG CLI
tinypng docs/images/**/*.png

# ImageMagick
mogrify -resize 1920x1080 -quality 85 docs/images/**/*.jpg
```

### 手動最適化

1. **リサイズ**: 適切な解像度に調整
2. **圧縮**: 品質とファイルサイズのバランス
3. **フォーマット変換**: 用途に応じた最適な形式

## バージョン管理

### ファイル更新

1. **既存ファイルの更新**:
   - 同じファイル名で上書き
   - コミットメッセージに更新理由を記載

2. **新規ファイルの追加**:
   - 命名規則に従ってファイル作成
   - 対応するドキュメントでの参照追加

### 履歴管理

- Git で画像ファイルも管理
- 大きなファイルは Git LFS の使用を検討
- 不要になった画像は削除

## 使用方法

### Markdown での参照

```markdown
![代替テキスト](./images/category/filename.png)

*図1: 画像の説明*
```

### 相対パス

- ドキュメントから画像への相対パス: `./images/`
- 画像間の相対パス: `../`

### 代替テキスト

- 画像の内容を簡潔に説明
- スクリーンリーダー対応
- SEO 効果

## メンテナンス

### 定期チェック

- **月次**: 不要な画像ファイルの確認
- **四半期**: ファイルサイズの最適化
- **年次**: 画像品質の見直し

### 品質管理

```bash
# ファイルサイズチェック
find docs/images -name "*.png" -size +2M

# 解像度チェック
identify docs/images/**/*.png | grep -v "1920x1080"

# 使用されていない画像の検出
grep -r "images/" docs/*.md | cut -d: -f2 | sort | uniq
```

## トラブルシューティング

### よくある問題

#### 画像が表示されない

**原因**:
- ファイルパスの間違い
- ファイル名の大文字・小文字
- ファイルの存在確認

**解決方法**:
```bash
# ファイルの存在確認
ls -la docs/images/ui/login-screen.png

# パスの確認
grep -n "login-screen.png" docs/user-manual.md
```

#### ファイルサイズが大きい

**原因**:
- 高解像度すぎる画像
- 圧縮率が低い
- 不適切なファイル形式

**解決方法**:
```bash
# ImageMagick で最適化
convert input.png -resize 1920x1080 -quality 85 output.png

# ファイルサイズ確認
du -h docs/images/**/*.png | sort -hr
```

#### 画像品質が悪い

**原因**:
- 過度な圧縮
- 低解像度での撮影
- 不適切なリサイズ

**解決方法**:
- 元画像から再作成
- 適切な圧縮率の設定
- 高解像度での撮影

## 参考資料

- [Web Content Accessibility Guidelines (WCAG)](https://www.w3.org/WAI/WCAG21/quickref/)
- [Google 画像最適化ガイド](https://developers.google.com/speed/docs/insights/OptimizeImages)
- [MDN: 画像の最適化](https://developer.mozilla.org/ja/docs/Learn/HTML/Multimedia_and_embedding/Responsive_images)

---

**最終更新**: 2024年1月15日  
**次回レビュー予定**: 2024年4月15日