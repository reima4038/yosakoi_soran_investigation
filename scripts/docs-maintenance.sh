#!/bin/bash

# ドキュメントメンテナンススクリプト
# 定期的なドキュメント品質チェックと更新を自動化

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

# プロジェクトルートディレクトリの確認
if [[ ! -f "package.json" ]]; then
    log_error "package.json not found. Please run this script from the project root."
    exit 1
fi

# 必要なツールのインストール確認
check_dependencies() {
    log_info "Checking dependencies..."
    
    local missing_deps=()
    
    if ! command -v markdownlint &> /dev/null; then
        missing_deps+=("markdownlint-cli")
    fi
    
    if ! command -v markdown-link-check &> /dev/null; then
        missing_deps+=("markdown-link-check")
    fi
    
    if ! command -v cspell &> /dev/null; then
        missing_deps+=("cspell")
    fi
    
    if [[ ${#missing_deps[@]} -gt 0 ]]; then
        log_warning "Missing dependencies: ${missing_deps[*]}"
        log_info "Installing missing dependencies..."
        npm install -g "${missing_deps[@]}"
    fi
    
    log_success "All dependencies are available"
}

# Markdownリント実行
run_markdown_lint() {
    log_info "Running Markdown lint..."
    
    if markdownlint docs/**/*.md; then
        log_success "Markdown lint passed"
        return 0
    else
        log_error "Markdown lint failed"
        return 1
    fi
}

# リンクチェック実行
run_link_check() {
    log_info "Running link check..."
    
    local failed_files=()
    
    for file in docs/*.md; do
        if [[ -f "$file" ]]; then
            log_info "Checking links in $file"
            if ! markdown-link-check "$file" --config .markdown-link-check.json; then
                failed_files+=("$file")
            fi
        fi
    done
    
    if [[ ${#failed_files[@]} -eq 0 ]]; then
        log_success "All links are valid"
        return 0
    else
        log_error "Link check failed for: ${failed_files[*]}"
        return 1
    fi
}

# スペルチェック実行
run_spell_check() {
    log_info "Running spell check..."
    
    # cspell設定ファイルが存在しない場合は作成
    if [[ ! -f "cspell.json" ]]; then
        log_info "Creating cspell configuration..."
        cat > cspell.json << 'EOF'
{
  "version": "0.2",
  "language": "en,ja",
  "words": [
    "yosakoi", "soran", "youtube", "api", "jwt", "mongodb", "redis",
    "nodejs", "typescript", "javascript", "mui", "websocket",
    "dockerfile", "nginx", "grafana", "prometheus", "oauth",
    "cors", "csrf", "xss", "https", "ssl", "tls", "cdn",
    "ui", "ux", "spa", "pwa", "dom", "json", "xml", "yaml",
    "backend", "frontend", "middleware", "auth", "eval",
    "admin", "evaluator", "moderator", "timestamp", "metadata"
  ],
  "ignorePaths": [
    "node_modules/**",
    ".git/**",
    "*.log",
    "package-lock.json"
  ]
}
EOF
    fi
    
    if cspell "docs/**/*.md"; then
        log_success "Spell check passed"
        return 0
    else
        log_error "Spell check failed"
        return 1
    fi
}

# ドキュメント構造チェック
check_docs_structure() {
    log_info "Checking documentation structure..."
    
    local required_files=(
        "docs/user-manual.md"
        "docs/admin-guide.md"
        "docs/developer-guide.md"
        "docs/api-documentation.md"
        "docs/architecture.md"
        "docs/CHANGELOG.md"
        "docs/glossary.md"
    )
    
    local missing_files=()
    
    for file in "${required_files[@]}"; do
        if [[ ! -f "$file" ]]; then
            missing_files+=("$file")
        fi
    done
    
    if [[ ${#missing_files[@]} -gt 0 ]]; then
        log_error "Missing required documentation files: ${missing_files[*]}"
        return 1
    fi
    
    # 各ファイルにメインタイトルがあるかチェック
    for file in "${required_files[@]}"; do
        if ! grep -q "^# " "$file"; then
            log_warning "$file does not have a main title (# heading)"
        fi
    done
    
    log_success "Documentation structure is valid"
    return 0
}

# API仕様の自動生成
generate_api_docs() {
    log_info "Generating API documentation..."
    
    if [[ -f "scripts/generate-api-docs.js" ]]; then
        if node scripts/generate-api-docs.js; then
            log_success "API documentation generated successfully"
            return 0
        else
            log_error "Failed to generate API documentation"
            return 1
        fi
    else
        log_warning "API documentation generator not found"
        return 0
    fi
}

# ドキュメント統計の生成
generate_docs_stats() {
    log_info "Generating documentation statistics..."
    
    local stats_file="docs/docs-stats.json"
    local total_files=0
    local total_lines=0
    local total_words=0
    
    # 統計情報を収集
    for file in docs/*.md; do
        if [[ -f "$file" ]]; then
            ((total_files++))
            local lines=$(wc -l < "$file")
            local words=$(wc -w < "$file")
            ((total_lines += lines))
            ((total_words += words))
        fi
    done
    
    # JSON形式で統計情報を保存
    cat > "$stats_file" << EOF
{
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "total_files": $total_files,
  "total_lines": $total_lines,
  "total_words": $total_words,
  "average_lines_per_file": $((total_lines / total_files)),
  "average_words_per_file": $((total_words / total_files)),
  "files": {
EOF

    local first=true
    for file in docs/*.md; do
        if [[ -f "$file" ]]; then
            local filename=$(basename "$file")
            local lines=$(wc -l < "$file")
            local words=$(wc -w < "$file")
            
            if [[ "$first" == true ]]; then
                first=false
            else
                echo "," >> "$stats_file"
            fi
            
            echo -n "    \"$filename\": {\"lines\": $lines, \"words\": $words}" >> "$stats_file"
        fi
    done
    
    cat >> "$stats_file" << EOF

  }
}
EOF
    
    log_success "Documentation statistics saved to $stats_file"
}

# メイン実行関数
main() {
    log_info "Starting documentation maintenance..."
    
    local exit_code=0
    
    # 依存関係チェック
    check_dependencies
    
    # 各チェックを実行
    if ! check_docs_structure; then
        exit_code=1
    fi
    
    if ! run_markdown_lint; then
        exit_code=1
    fi
    
    if ! run_link_check; then
        exit_code=1
    fi
    
    if ! run_spell_check; then
        exit_code=1
    fi
    
    # API仕様生成（エラーでも継続）
    generate_api_docs || true
    
    # 統計情報生成
    generate_docs_stats
    
    if [[ $exit_code -eq 0 ]]; then
        log_success "Documentation maintenance completed successfully!"
    else
        log_error "Documentation maintenance completed with errors"
    fi
    
    return $exit_code
}

# ヘルプ表示
show_help() {
    cat << EOF
Documentation Maintenance Script

Usage: $0 [OPTIONS]

OPTIONS:
    --lint-only         Run only Markdown lint
    --links-only        Run only link check
    --spell-only        Run only spell check
    --structure-only    Run only structure check
    --generate-api      Generate API documentation only
    --stats-only        Generate statistics only
    --help              Show this help message

Examples:
    $0                  Run all checks
    $0 --lint-only      Run only Markdown lint
    $0 --generate-api   Generate API documentation only
EOF
}

# コマンドライン引数の処理
case "${1:-}" in
    --lint-only)
        check_dependencies
        run_markdown_lint
        ;;
    --links-only)
        check_dependencies
        run_link_check
        ;;
    --spell-only)
        check_dependencies
        run_spell_check
        ;;
    --structure-only)
        check_docs_structure
        ;;
    --generate-api)
        generate_api_docs
        ;;
    --stats-only)
        generate_docs_stats
        ;;
    --help)
        show_help
        ;;
    "")
        main
        ;;
    *)
        log_error "Unknown option: $1"
        show_help
        exit 1
        ;;
esac