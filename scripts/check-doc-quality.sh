#!/bin/bash

# ドキュメント品質チェックスクリプト
# 使用方法: ./scripts/check-doc-quality.sh <file_path>

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
ドキュメント品質チェックスクリプト

使用方法:
    $0 <file_path> [options]

オプション:
    --fix               自動修正可能な問題を修正
    --report            詳細レポートを生成
    --help              このヘルプを表示

例:
    $0 docs/api-users.md
    $0 docs/user-manual.md --fix
    $0 docs/features/notifications.md --report
EOF
}

# Markdownリントチェック
check_markdown_lint() {
    local file="$1"
    local fix_mode="$2"
    
    log_info "📝 Markdownフォーマットチェック..."
    
    if command -v markdownlint &> /dev/null; then
        if [[ "$fix_mode" == true ]]; then
            if markdownlint --fix "$file"; then
                log_success "Markdownフォーマットを自動修正しました"
            else
                log_error "Markdownリントでエラーが見つかりました"
                return 1
            fi
        else
            if markdownlint "$file"; then
                log_success "Markdownフォーマットは正常です"
            else
                log_error "Markdownリントでエラーが見つかりました"
                log_info "自動修正するには --fix オプションを使用してください"
                return 1
            fi
        fi
    else
        log_warning "markdownlint がインストールされていません"
        log_info "インストール: npm install -g markdownlint-cli"
    fi
}

# リンクチェック
check_links() {
    local file="$1"
    
    log_info "🔗 リンクチェック..."
    
    if command -v markdown-link-check &> /dev/null; then
        if markdown-link-check "$file" --config .markdown-link-check.json; then
            log_success "すべてのリンクが有効です"
        else
            log_error "無効なリンクが見つかりました"
            return 1
        fi
    else
        log_warning "markdown-link-check がインストールされていません"
        log_info "インストール: npm install -g markdown-link-check"
    fi
}

# スペルチェック
check_spelling() {
    local file="$1"
    
    log_info "📖 スペルチェック..."
    
    if command -v cspell &> /dev/null; then
        if cspell "$file"; then
            log_success "スペルチェックは正常です"
        else
            log_error "スペルエラーが見つかりました"
            log_info "カスタム辞書に追加するか、cspell.json を更新してください"
            return 1
        fi
    else
        log_warning "cspell がインストールされていません"
        log_info "インストール: npm install -g cspell"
    fi
}

# プレースホルダーチェック
check_placeholders() {
    local file="$1"
    
    log_info "🔍 未置換プレースホルダーチェック..."
    
    local placeholders=$(grep -n '{[^}]*}' "$file" || true)
    
    if [[ -n "$placeholders" ]]; then
        log_error "未置換のプレースホルダーが見つかりました:"
        echo "$placeholders" | while IFS= read -r line; do
            echo "  $line"
        done
        return 1
    else
        log_success "プレースホルダーはすべて置換済みです"
    fi
}

# 必須セクションチェック
check_required_sections() {
    local file="$1"
    local file_type="$2"
    
    log_info "📋 必須セクションチェック..."
    
    local missing_sections=()
    
    case "$file_type" in
        "api")
            local required_sections=("概要" "エンドポイント" "認証" "パラメーター" "レスポンス")
            ;;
        "troubleshooting")
            local required_sections=("症状" "原因" "解決方法")
            ;;
        "feature")
            local required_sections=("概要" "対象ユーザー" "使用方法")
            ;;
        *)
            local required_sections=("概要")
            ;;
    esac
    
    for section in "${required_sections[@]}"; do
        if ! grep -q "$section" "$file"; then
            missing_sections+=("$section")
        fi
    done
    
    if [[ ${#missing_sections[@]} -gt 0 ]]; then
        log_error "必須セクションが不足しています:"
        printf '  - %s\n' "${missing_sections[@]}"
        return 1
    else
        log_success "必須セクションはすべて含まれています"
    fi
}

# 画像リンクチェック
check_images() {
    local file="$1"
    
    log_info "🖼️  画像リンクチェック..."
    
    local image_links=$(grep -o '!\[.*\](.*\.png\|.*\.jpg\|.*\.jpeg\|.*\.gif)' "$file" || true)
    local missing_images=()
    
    if [[ -n "$image_links" ]]; then
        while IFS= read -r link; do
            local image_path=$(echo "$link" | sed -n 's/.*(\(.*\)).*/\1/p')
            local full_path="docs/$image_path"
            
            if [[ ! -f "$full_path" ]]; then
                missing_images+=("$image_path")
            fi
        done <<< "$image_links"
        
        if [[ ${#missing_images[@]} -gt 0 ]]; then
            log_error "存在しない画像ファイルが参照されています:"
            printf '  - %s\n' "${missing_images[@]}"
            return 1
        else
            log_success "すべての画像ファイルが存在します"
        fi
    else
        log_info "画像リンクは見つかりませんでした"
    fi
}

# コードブロックチェック
check_code_blocks() {
    local file="$1"
    
    log_info "💻 コードブロックチェック..."
    
    local code_blocks_without_lang=$(grep -n '^```$' "$file" || true)
    
    if [[ -n "$code_blocks_without_lang" ]]; then
        log_warning "言語指定のないコードブロックが見つかりました:"
        echo "$code_blocks_without_lang" | while IFS= read -r line; do
            echo "  行 $line"
        done
        log_info "言語を指定することを推奨します（例: ```bash, ```javascript）"
    else
        log_success "すべてのコードブロックに言語が指定されています"
    fi
}

# ファイルサイズチェック
check_file_size() {
    local file="$1"
    
    log_info "📏 ファイルサイズチェック..."
    
    local file_size=$(wc -c < "$file")
    local max_size=$((1024 * 1024))  # 1MB
    
    if [[ $file_size -gt $max_size ]]; then
        log_warning "ファイルサイズが大きすぎます: $(($file_size / 1024))KB"
        log_info "ファイルを分割することを検討してください"
    else
        log_success "ファイルサイズは適切です: $(($file_size / 1024))KB"
    fi
}

# 詳細レポート生成
generate_report() {
    local file="$1"
    local report_file="${file%.md}-quality-report.md"
    
    log_info "📊 詳細レポートを生成中..."
    
    cat > "$report_file" << EOF
# ドキュメント品質レポート

**対象ファイル**: $file  
**生成日時**: $(date)  
**チェック実行者**: $(whoami)

## 基本情報

- **ファイルサイズ**: $(wc -c < "$file") bytes
- **行数**: $(wc -l < "$file") lines
- **単語数**: $(wc -w < "$file") words

## チェック結果

### Markdownフォーマット

$(markdownlint "$file" 2>&1 || echo "エラーが見つかりました")

### リンクチェック

$(markdown-link-check "$file" 2>&1 || echo "無効なリンクが見つかりました")

### スペルチェック

$(cspell "$file" 2>&1 || echo "スペルエラーが見つかりました")

### プレースホルダー

$(grep -n '{[^}]*}' "$file" || echo "プレースホルダーは見つかりませんでした")

## 改善提案

- 定期的なリンクチェックの実施
- 画像ファイルの最適化
- セクション構成の見直し

---

*このレポートは自動生成されました*
EOF
    
    log_success "詳細レポートを生成しました: $report_file"
}

# ファイルタイプの判定
detect_file_type() {
    local file="$1"
    
    if [[ "$file" == *"api"* ]]; then
        echo "api"
    elif [[ "$file" == *"troubleshooting"* ]]; then
        echo "troubleshooting"
    elif [[ "$file" == *"feature"* ]]; then
        echo "feature"
    else
        echo "general"
    fi
}

# メイン処理
main() {
    local file="$1"
    local fix_mode=false
    local report_mode=false
    
    # 引数の解析
    shift
    while [[ $# -gt 0 ]]; do
        case $1 in
            --fix)
                fix_mode=true
                shift
                ;;
            --report)
                report_mode=true
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
    if [[ -z "$file" ]]; then
        log_error "ファイルパスは必須です"
        show_usage
        exit 1
    fi
    
    # ファイルの存在確認
    if [[ ! -f "$file" ]]; then
        log_error "ファイルが見つかりません: $file"
        exit 1
    fi
    
    echo "=== ドキュメント品質チェック ==="
    echo "対象ファイル: $file"
    echo ""
    
    local file_type=$(detect_file_type "$file")
    local error_count=0
    
    # 各チェックの実行
    check_markdown_lint "$file" "$fix_mode" || ((error_count++))
    echo ""
    
    check_links "$file" || ((error_count++))
    echo ""
    
    check_spelling "$file" || ((error_count++))
    echo ""
    
    check_placeholders "$file" || ((error_count++))
    echo ""
    
    check_required_sections "$file" "$file_type" || ((error_count++))
    echo ""
    
    check_images "$file" || ((error_count++))
    echo ""
    
    check_code_blocks "$file"
    echo ""
    
    check_file_size "$file"
    echo ""
    
    # 詳細レポート生成
    if [[ "$report_mode" == true ]]; then
        generate_report "$file"
        echo ""
    fi
    
    # 結果サマリー
    echo "=== チェック結果サマリー ==="
    if [[ $error_count -eq 0 ]]; then
        log_success "すべてのチェックが正常に完了しました ✨"
        echo ""
        echo "📝 次のステップ:"
        echo "1. レビューを依頼"
        echo "2. プルリクエストを作成"
        echo "3. ドキュメントを公開"
    else
        log_error "$error_count 個の問題が見つかりました"
        echo ""
        echo "🔧 修正方法:"
        echo "1. 上記のエラーメッセージを確認"
        echo "2. 必要な修正を実施"
        echo "3. 再度チェックを実行: $0 $file"
        if [[ "$fix_mode" != true ]]; then
            echo "4. 自動修正を試行: $0 $file --fix"
        fi
        exit 1
    fi
}

# スクリプトが直接実行された場合
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi