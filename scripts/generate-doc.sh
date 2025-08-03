#!/bin/bash

# ドキュメント生成スクリプト
# 使用方法: ./scripts/generate-doc.sh {api|troubleshooting|feature} <name>

set -e

# 色付きログ出力
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 使用方法の表示
show_usage() {
    cat << EOF
ドキュメント生成スクリプト

使用方法:
    $0 <type> <name> [options]

タイプ:
    api             APIエンドポイント文書
    troubleshooting トラブルシューティング文書
    feature         機能説明文書

オプション:
    --author <name>     作成者名
    --interactive       インタラクティブモード
    --help             このヘルプを表示

例:
    $0 api user-profile
    $0 troubleshooting login-failure --author "John Doe"
    $0 feature real-time-notifications --interactive
EOF
}

# インタラクティブモードの実行
interactive_mode() {
    local doc_type="$1"
    
    echo "=== インタラクティブドキュメント生成 ==="
    echo ""
    
    # 基本情報の入力
    read -p "ドキュメント名: " doc_name
    read -p "作成者名: " author
    read -p "概要: " description
    
    case "$doc_type" in
        "api")
            read -p "HTTPメソッド (GET/POST/PUT/DELETE): " method
            read -p "APIパス (例: /api/users): " api_path
            read -p "認証が必要ですか？ (yes/no): " auth_required
            ;;
        "troubleshooting")
            read -p "問題の緊急度 (高/中/低): " urgency
            read -p "影響範囲: " impact_scope
            ;;
        "feature")
            read -p "対象ユーザー: " target_users
            read -p "必要な権限: " required_permissions
            ;;
    esac
    
    # 変数をエクスポート（テンプレート置換で使用）
    export DOC_NAME="$doc_name"
    export AUTHOR="$author"
    export DESCRIPTION="$description"
    export METHOD="$method"
    export API_PATH="$api_path"
    export AUTH_REQUIRED="$auth_required"
    export URGENCY="$urgency"
    export IMPACT_SCOPE="$impact_scope"
    export TARGET_USERS="$target_users"
    export REQUIRED_PERMISSIONS="$required_permissions"
}

# テンプレートの置換処理
replace_placeholders() {
    local input_file="$1"
    local output_file="$2"
    
    # 基本的な置換
    sed -e "s/{date}/$(date +%Y-%m-%d)/g" \
        -e "s/{author}/${AUTHOR:-システム管理者}/g" \
        -e "s/{description}/${DESCRIPTION:-説明を記入してください}/g" \
        -e "s/{METHOD}/${METHOD:-GET}/g" \
        -e "s/{PATH}/${API_PATH:-\/api\/endpoint}/g" \
        -e "s/{auth_required}/${AUTH_REQUIRED:-Yes}/g" \
        -e "s/{urgency}/${URGENCY:-中}/g" \
        -e "s/{impact_scope}/${IMPACT_SCOPE:-特定機能}/g" \
        -e "s/{target_users}/${TARGET_USERS:-一般ユーザー}/g" \
        -e "s/{required_permissions}/${REQUIRED_PERMISSIONS:-なし}/g" \
        "$input_file" > "$output_file"
}

# メイン処理
main() {
    local doc_type="$1"
    local doc_name="$2"
    local author=""
    local interactive=false
    
    # 引数の解析
    shift 2
    while [[ $# -gt 0 ]]; do
        case $1 in
            --author)
                author="$2"
                shift 2
                ;;
            --interactive)
                interactive=true
                shift
                ;;
            --help)
                show_usage
                exit 0
                ;;
            *)
                log_error "不明なオプション: $1"
                show_usage
                exit 1
                ;;
        esac
    done
    
    # 必須引数のチェック
    if [[ -z "$doc_type" || -z "$doc_name" ]]; then
        log_error "ドキュメントタイプと名前は必須です"
        show_usage
        exit 1
    fi
    
    # テンプレートファイルと出力先の決定
    case "$doc_type" in
        "api")
            template="docs/templates/api-endpoint-template.md"
            output="docs/api-${doc_name}.md"
            ;;
        "troubleshooting")
            template="docs/templates/troubleshooting-template.md"
            output="docs/troubleshooting-${doc_name}.md"
            ;;
        "feature")
            template="docs/templates/feature-documentation-template.md"
            output="docs/features/${doc_name}.md"
            ;;
        *)
            log_error "無効なドキュメントタイプ: $doc_type"
            log_info "有効なタイプ: api, troubleshooting, feature"
            exit 1
            ;;
    esac
    
    # テンプレートファイルの存在確認
    if [[ ! -f "$template" ]]; then
        log_error "テンプレートファイルが見つかりません: $template"
        exit 1
    fi
    
    # インタラクティブモードの実行
    if [[ "$interactive" == true ]]; then
        interactive_mode "$doc_type"
    else
        export AUTHOR="$author"
    fi
    
    # 出力ディレクトリの作成
    mkdir -p "$(dirname "$output")"
    
    # 出力ファイルの存在確認
    if [[ -f "$output" ]]; then
        log_warning "ファイルが既に存在します: $output"
        read -p "上書きしますか？ (y/N): " overwrite
        if [[ "$overwrite" != "y" && "$overwrite" != "Y" ]]; then
            log_info "処理を中止しました"
            exit 0
        fi
    fi
    
    # テンプレートのコピーと置換
    log_info "ドキュメントを生成中..."
    replace_placeholders "$template" "$output"
    
    # 成功メッセージ
    log_success "ドキュメントが作成されました: $output"
    
    # 次のステップの案内
    echo ""
    echo "📝 次のステップ:"
    echo "1. エディターでファイルを開く: code $output"
    echo "2. プレースホルダー（{}で囲まれた部分）を実際の内容に置き換える"
    echo "3. 品質チェックを実行: ./scripts/check-doc-quality.sh $output"
    echo "4. レビューを依頼してプルリクエストを作成"
    
    # 未置換のプレースホルダーの確認
    local placeholders=$(grep -o '{[^}]*}' "$output" | sort | uniq)
    if [[ -n "$placeholders" ]]; then
        echo ""
        log_warning "以下のプレースホルダーを置換してください:"
        echo "$placeholders" | sed 's/^/  - /'
    fi
}

# スクリプトが直接実行された場合
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi