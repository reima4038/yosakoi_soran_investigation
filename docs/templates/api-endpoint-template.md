# APIエンドポイント記述テンプレート

このテンプレートは、新しいAPIエンドポイントをドキュメント化する際に使用します。

## 基本テンプレート

```markdown
### {エンドポイント名}

#### 概要

{エンドポイントの目的と機能の簡潔な説明}

#### エンドポイント

```http
{METHOD} {PATH}
```

#### 認証

- **必要**: {Yes/No}
- **権限**: {必要な権限レベル}

#### パラメーター

##### パスパラメーター

| パラメーター | 型 | 必須 | 説明 | 例 |
|-------------|----|----|------|-----|
| {param1} | {type} | {Yes/No} | {説明} | {example} |

##### クエリパラメーター

| パラメーター | 型 | 必須 | デフォルト | 説明 | 例 |
|-------------|----|----|----------|------|-----|
| {param1} | {type} | {Yes/No} | {default} | {説明} | {example} |

##### リクエストボディ

```json
{
  "{field1}": "{type} - {説明}",
  "{field2}": {
    "{nested_field}": "{type} - {説明}"
  }
}
```

#### リクエスト例

```bash
curl -X {METHOD} "{BASE_URL}{PATH}" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {token}" \
  -d '{
    "{field1}": "{example_value}",
    "{field2}": "{example_value}"
  }'
```

#### レスポンス

##### 成功レスポンス (200/201)

```json
{
  "status": "success",
  "data": {
    "{field1}": "{example_value}",
    "{field2}": "{example_value}"
  },
  "meta": {
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

##### エラーレスポンス

| ステータスコード | 説明 | レスポンス例 |
|-----------------|------|-------------|
| 400 | Bad Request | `{"status": "error", "code": "VALIDATION_ERROR", "message": "Invalid input"}` |
| 401 | Unauthorized | `{"status": "error", "code": "UNAUTHORIZED", "message": "Authentication required"}` |
| 403 | Forbidden | `{"status": "error", "code": "FORBIDDEN", "message": "Insufficient permissions"}` |
| 404 | Not Found | `{"status": "error", "code": "NOT_FOUND", "message": "Resource not found"}` |
| 429 | Too Many Requests | `{"status": "error", "code": "RATE_LIMIT", "message": "Rate limit exceeded"}` |
| 500 | Internal Server Error | `{"status": "error", "code": "INTERNAL_ERROR", "message": "Internal server error"}` |

#### 使用例

```javascript
// JavaScript/TypeScript例
const response = await fetch('{BASE_URL}{PATH}', {
  method: '{METHOD}',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    {field1}: '{example_value}',
    {field2}: '{example_value}'
  })
});

const data = await response.json();
console.log(data);
```

#### 注意事項

- {特別な注意点や制限事項}
- {レート制限の詳細}
- {データ形式の制約}

#### 関連エンドポイント

- [{関連エンドポイント1}]({link})
- [{関連エンドポイント2}]({link})

#### 変更履歴

| バージョン | 日付 | 変更内容 |
|-----------|------|----------|
| v1.0 | 2024-01-15 | 初回作成 |
```

## 使用方法

1. **テンプレートをコピー**: 上記のテンプレートをコピーします
2. **プレースホルダーを置換**: `{}`で囲まれた部分を実際の値に置き換えます
3. **不要な部分を削除**: 該当しない項目（パスパラメーターがない場合など）は削除します
4. **例を追加**: 実際の使用例を追加します

## プレースホルダー一覧

| プレースホルダー | 説明 | 例 |
|-----------------|------|-----|
| `{エンドポイント名}` | エンドポイントの名前 | ユーザー一覧取得 |
| `{METHOD}` | HTTPメソッド | GET, POST, PUT, DELETE |
| `{PATH}` | APIパス | /api/users |
| `{BASE_URL}` | ベースURL | http://localhost:3001 |
| `{param1}` | パラメーター名 | userId, page, limit |
| `{type}` | データ型 | string, number, boolean, object |
| `{field1}` | フィールド名 | username, email, createdAt |
| `{example_value}` | 例の値 | "john_doe", 123, true |
| `{説明}` | 項目の説明 | ユーザーの一意識別子 |

## 品質チェックリスト

- [ ] エンドポイントの目的が明確に記述されている
- [ ] 必要な認証・権限が明記されている
- [ ] すべてのパラメーターが文書化されている
- [ ] リクエスト・レスポンスの例が提供されている
- [ ] エラーケースが網羅されている
- [ ] 実際のコードで動作確認済み
- [ ] 関連エンドポイントへのリンクが設定されている

## 自動化のヒント

### OpenAPIからの生成

```bash
# OpenAPI仕様からMarkdownを生成
npx @apidevtools/swagger-parser docs/openapi.yaml
```

### テンプレート変数の一括置換

```bash
# sedを使用した一括置換例
sed 's/{METHOD}/GET/g; s/{PATH}/\/api\/users/g' template.md > new-endpoint.md
```

### VSCodeスニペット

```json
{
  "API Endpoint Documentation": {
    "prefix": "api-doc",
    "body": [
      "### $1",
      "",
      "#### 概要",
      "",
      "$2",
      "",
      "#### エンドポイント",
      "",
      "```http",
      "$3 $4",
      "```",
      "",
      "#### 認証",
      "",
      "- **必要**: $5",
      "- **権限**: $6"
    ],
    "description": "API endpoint documentation template"
  }
}
```

## 参考資料

- [OpenAPI Specification](https://swagger.io/specification/)
- [REST API Design Guidelines](https://restfulapi.net/)
- [HTTP Status Codes](https://httpstatuses.com/)
- [JSON Schema](https://json-schema.org/)

---

**作成日**: 2024年1月15日  
**最終更新**: 2024年1月15日  
**バージョン**: 1.0