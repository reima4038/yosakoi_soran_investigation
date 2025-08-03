# YouTube URL バリデーション改善

## 概要

現在のシステムでは、YouTube URLのバリデーションが厳しすぎるため、一般的なYouTube URL（追加のクエリパラメータを含む）が拒否されてしまいます。ユーザーがブラウザからコピーした通常のYouTube URLを受け入れ、適切にビデオIDを抽出できるように改善する必要があります。

## 問題の詳細

- 現在のバリデーション: `v` パラメータのみを含むURLしか受け入れない
- 実際のYouTube URL: `https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PLrAXtmRdnEQy8VJqQzNlkVjYoungUdmzP&index=1` のような追加パラメータを含む
- ユーザーは追加パラメータを手動で削除する必要がある（不親切）

## 要件

### 要件1: 柔軟なYouTube URL受け入れ

**ユーザーストーリー**: ユーザーとして、ブラウザからコピーしたYouTube URLをそのまま貼り付けて動画を登録したい。追加のクエリパラメータがあっても正常に処理されるべきである。

#### 受け入れ基準

1. WHEN ユーザーが `https://www.youtube.com/watch?v=VIDEO_ID&list=PLAYLIST_ID&index=1` のようなURLを入力 THEN システムは正常にビデオIDを抽出する
2. WHEN ユーザーが `https://www.youtube.com/watch?v=VIDEO_ID&t=30s` のようなタイムスタンプ付きURLを入力 THEN システムは正常にビデオIDを抽出する
3. WHEN ユーザーが `https://youtu.be/VIDEO_ID?si=SHARE_ID` のような短縮URLを入力 THEN システムは正常にビデオIDを抽出する
4. WHEN ユーザーが `https://www.youtube.com/embed/VIDEO_ID?start=30` のような埋め込みURLを入力 THEN システムは正常にビデオIDを抽出する

### 要件2: 改善されたエラーメッセージ

**ユーザーストーリー**: ユーザーとして、無効なURLを入力した場合、何が問題で、どのように修正すればよいかを明確に理解したい。

#### 受け入れ基準

1. WHEN ユーザーが無効なYouTube URLを入力 THEN システムは具体的なエラーメッセージを表示する
2. WHEN ユーザーがYouTube以外のURLを入力 THEN システムは「YouTube URLを入力してください」というメッセージを表示する
3. WHEN ユーザーが不完全なURLを入力 THEN システムは「完全なYouTube URLを入力してください」というメッセージを表示する
4. WHEN ユーザーがプライベート動画のURLを入力 THEN システムは「この動画は非公開のため登録できません」というメッセージを表示する

### 要件3: URL正規化機能

**ユーザーストーリー**: システム管理者として、様々な形式のYouTube URLが内部的に正規化され、重複登録が防がれることを期待する。

#### 受け入れ基準

1. WHEN 同じ動画の異なる形式のURL（通常URL、短縮URL、埋め込みURL）が入力される THEN システムは同一動画として認識し重複登録を防ぐ
2. WHEN URLに追加パラメータが含まれている THEN システムは内部的にクリーンなURLに正規化する
3. WHEN ユーザーがURLプレビューを確認する THEN 正規化されたURLが表示される

### 要件4: ユーザーフレンドリーなフィードバック

**ユーザーストーリー**: ユーザーとして、URL入力時にリアルタイムでフィードバックを受け取り、問題があれば即座に修正できるようにしたい。

#### 受け入れ基準

1. WHEN ユーザーがURLを入力中 THEN システムはリアルタイムでURL形式の妥当性を検証する
2. WHEN 有効なYouTube URLが検出される THEN 入力フィールドに成功インジケーターを表示する
3. WHEN 無効なURLが検出される THEN 入力フィールドにエラーインジケーターと修正提案を表示する
4. WHEN URLから動画情報を取得中 THEN ローディングインジケーターを表示する

### 要件5: 対応URL形式の拡張

**ユーザーストーリー**: ユーザーとして、YouTube の様々なURL形式（モバイル、デスクトップ、共有リンクなど）を使用して動画を登録したい。

#### 受け入れ基準

1. WHEN ユーザーが `https://m.youtube.com/watch?v=VIDEO_ID` のようなモバイルURLを入力 THEN システムは正常に処理する
2. WHEN ユーザーが `https://youtube.com/watch?v=VIDEO_ID` のような www なしのURLを入力 THEN システムは正常に処理する
3. WHEN ユーザーが `http://` プロトコルのURLを入力 THEN システムは正常に処理する
4. WHEN ユーザーがプロトコルなしのURL（`youtube.com/watch?v=VIDEO_ID`）を入力 THEN システムは正常に処理する

## 技術的考慮事項

- フロントエンドとバックエンドの両方でURL検証を改善
- 既存のYouTubeService.extractVideoId メソッドの拡張
- フロントエンドのバリデーションスキーマの更新
- エラーメッセージの国際化対応
- パフォーマンスへの影響を最小限に抑制

## 成功指標

- ユーザーが手動でURLを編集する必要性の削減（目標: 95%削減）
- URL関連のサポート問い合わせの減少
- 動画登録の成功率向上
- ユーザー満足度の向上