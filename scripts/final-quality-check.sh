#!/bin/bash

# 最終品質チェック・統合テストスクリプト
# 全ドキュメントの包括的な品質チェックを実行

set -e

# 色付きログ出力
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
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

log_section() {
    echo -e "${PURPLE}[SECTION]${NC} $1"
}

# グローバル変数
TOTAL_ERRORS=0
TOTAL_WARNINGS=0
TOTAL_FILES=0
REPORT_FILE="docs/final-quality-report.md"

# エラーカウンターの更新
increment_error() {
    ((TOTAL_ERRORS++))
}

increment_warning() {
    ((TOTAL_WARNINGS++))
}

# ドキュメントファイル一覧の取得
get_doc_files() {
    find docs -name "*.md" -type f | grep -v node_modules | sort
}

# 1. 全ドキュメントの構造整合性チェック
check_document_structure() {
    log_section "=== ドキュメント構造整合性チェック ==="
    
    local required_files=(
        "docs/user-manual.md"
        "docs/admin-guide.md"
        "docs/developer-guide.md"
        "docs/api-documentation.md"
        "docs/architecture.md"
        "docs/CHANGELOG.md"
        "docs/glossary.md"
        "docs/README.md"
        "docs/DOCUMENTATION_PROCESS.md"
    )
    
    log_info "必須ドキュメントファイルの存在確認..."
    local missing_files=()
    
    for file in "${required_files[@]}"; do
        if [[ ! -f "$file" ]]; then
            missing_files+=("$file")
        fi
    done
    
    if [[ ${#missing_files[@]} -gt 0 ]]; then
        log_error "必須ドキュメントファイルが不足しています:"
        printf '  - %s\n' "${missing_files[@]}"
        increment_error
    else
        log_success "すべての必須ドキュメントファイルが存在します"
    fi
    
    # ドキュメント間の相互参照チェック
    log_info "ドキュメント間の相互参照チェック..."
    local broken_internal_links=()
    
    while IFS= read -r file; do
        # 内部リンクの抽出と確認
        local internal_links=$(grep -o '\[.*\](\.\/[^)]*\.md[^)]*)' "$file" || true)
        
        if [[ -n "$internal_links" ]]; then
            while IFS= read -r link; do
                local target_file=$(echo "$link" | sed -n 's/.*(\.\//docs\//p' | sed 's/).*//')
                if [[ ! -f "$target_file" ]]; then
                    broken_internal_links+=("$file -> $target_file")
                fi
            done <<< "$internal_links"
        fi
    done < <(get_doc_files)
    
    if [[ ${#broken_internal_links[@]} -gt 0 ]]; then
        log_error "壊れた内部リンクが見つかりました:"
        printf '  - %s\n' "${broken_internal_links[@]}"
        increment_error
    else
        log_success "内部リンクはすべて有効です"
    fi
}

# 2. 全ドキュメントのMarkdownフォーマットチェック
check_markdown_format() {
    log_section "=== Markdownフォーマットチェック ==="
    
    if ! command -v markdownlint &> /dev/null; then
        log_warning "markdownlint がインストールされていません"
        log_info "インストール: npm install -g markdownlint-cli"
        increment_warning
        return
    fi
    
    log_info "全ドキュメントのMarkdownフォーマットをチェック中..."
    
    local format_errors=0
    while IFS= read -r file; do
        ((TOTAL_FILES++))
        if ! markdownlint "$file" >/dev/null 2>&1; then
            log_error "Markdownフォーマットエラー: $file"
            markdownlint "$file" 2>&1 | sed 's/^/    /'
            ((format_errors++))
        fi
    done < <(get_doc_files)
    
    if [[ $format_errors -eq 0 ]]; then
        log_success "すべてのドキュメントのMarkdownフォーマットが正常です"
    else
        log_error "$format_errors 個のファイルでフォーマットエラーが見つかりました"
        increment_error
    fi
}

# 3. 全リンクの有効性チェック
check_all_links() {
    log_section "=== 全リンク有効性チェック ==="
    
    if ! command -v markdown-link-check &> /dev/null; then
        log_warning "markdown-link-check がインストールされていません"
        log_info "インストール: npm install -g markdown-link-check"
        increment_warning
        return
    fi
    
    log_info "全ドキュメントのリンクをチェック中..."
    
    local link_errors=0
    while IFS= read -r file; do
        log_info "リンクチェック: $file"
        if ! markdown-link-check "$file" --config .markdown-link-check.json >/dev/null 2>&1; then
            log_error "リンクエラー: $file"
            markdown-link-check "$file" --config .markdown-link-check.json 2>&1 | grep -E "(✖|ERROR)" | sed 's/^/    /'
            ((link_errors++))
        fi
    done < <(get_doc_files)
    
    if [[ $link_errors -eq 0 ]]; then
        log_success "すべてのリンクが有効です"
    else
        log_error "$link_errors 個のファイルでリンクエラーが見つかりました"
        increment_error
    fi
}

# 4. 用語統一チェック
check_terminology_consistency() {
    log_section "=== 用語統一チェック ==="
    
    log_info "用語統一をチェック中..."
    
    # 用語集から統一すべき用語を抽出
    local terminology_issues=()
    
    # よくある表記ゆれのチェック
    local inconsistent_terms=(
        "YOSAKOI:よさこい"
        "Material-UI:MUI"
        "ブラウザ:ブラウザー"
        "サーバ:サーバー"
        "ユーザ:ユーザー"
        "コンピュータ:コンピューター"
    )
    
    for term_pair in "${inconsistent_terms[@]}"; do
        local old_term=$(echo "$term_pair" | cut -d: -f1)
        local new_term=$(echo "$term_pair" | cut -d: -f2)
        
        while IFS= read -r file; do
            if grep -q "$old_term" "$file"; then
                terminology_issues+=("$file: '$old_term' -> '$new_term' に統一してください")
            fi
        done < <(get_doc_files)
    done
    
    if [[ ${#terminology_issues[@]} -gt 0 ]]; then
        log_warning "用語統一の問題が見つかりました:"
        printf '  - %s\n' "${terminology_issues[@]}"
        increment_warning
    else
        log_success "用語統一は適切です"
    fi
}

# 5. 画像ファイルの存在確認
check_image_files() {
    log_section "=== 画像ファイル存在確認 ==="
    
    log_info "画像ファイルの存在をチェック中..."
    
    local missing_images=()
    
    while IFS= read -r file; do
        # 画像リンクの抽出
        local image_links=$(grep -o '!\[.*\]([^)]*\.\(png\|jpg\|jpeg\|gif\|svg\))' "$file" || true)
        
        if [[ -n "$image_links" ]]; then
            while IFS= read -r link; do
                local image_path=$(echo "$link" | sed -n 's/.*(\([^)]*\)).*/\1/p')
                
                # 相対パスの解決
                if [[ "$image_path" == ./* ]]; then
                    local full_path="docs/${image_path#./}"
                else
                    local full_path="$image_path"
                fi
                
                if [[ ! -f "$full_path" ]]; then
                    missing_images+=("$file -> $image_path")
                fi
            done <<< "$image_links"
        fi
    done < <(get_doc_files)
    
    if [[ ${#missing_images[@]} -gt 0 ]]; then
        log_error "存在しない画像ファイルが参照されています:"
        printf '  - %s\n' "${missing_images[@]}"
        increment_error
    else
        log_success "すべての画像ファイルが存在します"
    fi
}

# 6. コードブロックの検証
check_code_blocks() {
    log_section "=== コードブロック検証 ==="
    
    log_info "コードブロックをチェック中..."
    
    local code_issues=()
    
    while IFS= read -r file; do
        # 言語指定のないコードブロックをチェック
        local line_num=1
        while IFS= read -r line; do
            if [[ "$line" == '```' ]]; then
                code_issues+=("$file:$line_num - 言語指定のないコードブロック")
            fi
            ((line_num++))
        done < "$file"
        
        # bashコードブロックの構文チェック（簡易）
        local bash_blocks=$(grep -n '^```bash' "$file" || true)
        if [[ -n "$bash_blocks" ]]; then
            # 実際の構文チェックは複雑なので、基本的なパターンのみチェック
            local in_bash_block=false
            local bash_line_num=1
            while IFS= read -r line; do
                if [[ "$line" == '```bash' ]]; then
                    in_bash_block=true
                elif [[ "$line" == '```' ]] && [[ "$in_bash_block" == true ]]; then
                    in_bash_block=false
                elif [[ "$in_bash_block" == true ]]; then
                    # 基本的な構文エラーパターンをチェック
                    if [[ "$line" =~ ^[[:space:]]*#.*$ ]]; then
                        # コメント行はスキップ
                        continue
                    elif [[ "$line" =~ \$\{.*\}.*\$\{.*\} ]]; then
                        # 複雑な変数展開は警告
                        code_issues+=("$file:$bash_line_num - 複雑な変数展開: $line")
                    fi
                fi
                ((bash_line_num++))
            done < "$file"
        fi
    done < <(get_doc_files)
    
    if [[ ${#code_issues[@]} -gt 0 ]]; then
        log_warning "コードブロックの問題が見つかりました:"
        printf '  - %s\n' "${code_issues[@]}"
        increment_warning
    else
        log_success "コードブロックは適切です"
    fi
}

# 7. ドキュメント完全性チェック
check_document_completeness() {
    log_section "=== ドキュメント完全性チェック ==="
    
    log_info "ドキュメントの完全性をチェック中..."
    
    local completeness_issues=()
    
    # 各ドキュメントの必須セクションをチェック
    local doc_requirements=(
        "docs/user-manual.md:はじめに,アカウント作成,動画の登録,評価の実行"
        "docs/admin-guide.md:管理者権限,システム管理,ユーザー管理,監視"
        "docs/developer-guide.md:概要,技術スタック,開発環境,コーディング規約"
        "docs/api-documentation.md:概要,認証,エラーレスポンス"
        "docs/architecture.md:概要,アーキテクチャ,データベース設計"
    )
    
    for requirement in "${doc_requirements[@]}"; do
        local file=$(echo "$requirement" | cut -d: -f1)
        local sections=$(echo "$requirement" | cut -d: -f2)
        
        if [[ -f "$file" ]]; then
            IFS=',' read -ra SECTION_ARRAY <<< "$sections"
            for section in "${SECTION_ARRAY[@]}"; do
                if ! grep -q "$section" "$file"; then
                    completeness_issues+=("$file: '$section' セクションが見つかりません")
                fi
            done
        fi
    done
    
    if [[ ${#completeness_issues[@]} -gt 0 ]]; then
        log_warning "ドキュメント完全性の問題が見つかりました:"
        printf '  - %s\n' "${completeness_issues[@]}"
        increment_warning
    else
        log_success "ドキュメントの完全性は適切です"
    fi
}

# 8. 実装整合性チェック
check_implementation_consistency() {
    log_section "=== 実装整合性チェック ==="
    
    log_info "実装との整合性をチェック中..."
    
    local consistency_issues=()
    
    # package.jsonとの整合性チェック
    if [[ -f "package.json" ]]; then
        local package_scripts=$(jq -r '.scripts | keys[]' package.json 2>/dev/null || echo "")
        
        # ドキュメントに記載されているnpmスクリプトが実際に存在するかチェック
        while IFS= read -r file; do
            local npm_commands=$(grep -o 'npm run [a-zA-Z0-9:_-]*' "$file" || true)
            
            if [[ -n "$npm_commands" ]]; then
                while IFS= read -r cmd; do
                    local script_name=$(echo "$cmd" | sed 's/npm run //')
                    if [[ -n "$script_name" ]] && ! echo "$package_scripts" | grep -q "^$script_name$"; then
                        consistency_issues+=("$file: npm script '$script_name' が package.json に存在しません")
                    fi
                done <<< "$npm_commands"
            fi
        done < <(get_doc_files)
    fi
    
    # Docker Composeファイルとの整合性チェック
    if [[ -f "docker-compose.yml" ]] || [[ -f "docker-compose.prod.yml" ]]; then
        while IFS= read -r file; do
            local docker_commands=$(grep -o 'docker-compose[^[:space:]]*' "$file" || true)
            
            if [[ -n "$docker_commands" ]]; then
                while IFS= read -r cmd; do
                    # 基本的なdocker-composeコマンドの妥当性チェック
                    if [[ "$cmd" =~ docker-compose.*-f.*\.yml ]] && ! echo "$cmd" | grep -q -E "(docker-compose\.yml|docker-compose\.prod\.yml)"; then
                        consistency_issues+=("$file: 存在しないDocker Composeファイルが参照されています: $cmd")
                    fi
                done <<< "$docker_commands"
            fi
        done < <(get_doc_files)
    fi
    
    if [[ ${#consistency_issues[@]} -gt 0 ]]; then
        log_error "実装整合性の問題が見つかりました:"
        printf '  - %s\n' "${consistency_issues[@]}"
        increment_error
    else
        log_success "実装との整合性は適切です"
    fi
}

# 9. アクセシビリティチェック
check_accessibility() {
    log_section "=== アクセシビリティチェック ==="
    
    log_info "アクセシビリティをチェック中..."
    
    local accessibility_issues=()
    
    while IFS= read -r file; do
        # 画像の代替テキストチェック
        local images_without_alt=$(grep -n '!\[\](' "$file" || true)
        if [[ -n "$images_without_alt" ]]; then
            while IFS= read -r line; do
                accessibility_issues+=("$file:$(echo "$line" | cut -d: -f1) - 画像に代替テキストがありません")
            done <<< "$images_without_alt"
        fi
        
        # 見出し階層のチェック
        local prev_level=0
        local line_num=1
        while IFS= read -r line; do
            if [[ "$line" =~ ^#+[[:space:]] ]]; then
                local current_level=$(echo "$line" | grep -o '^#*' | wc -c)
                ((current_level--))  # wc -c は改行も数えるので-1
                
                if [[ $current_level -gt $((prev_level + 1)) ]] && [[ $prev_level -gt 0 ]]; then
                    accessibility_issues+=("$file:$line_num - 見出しレベルが飛んでいます (h$prev_level -> h$current_level)")
                fi
                prev_level=$current_level
            fi
            ((line_num++))
        done < "$file"
    done < <(get_doc_files)
    
    if [[ ${#accessibility_issues[@]} -gt 0 ]]; then
        log_warning "アクセシビリティの問題が見つかりました:"
        printf '  - %s\n' "${accessibility_issues[@]}"
        increment_warning
    else
        log_success "アクセシビリティは適切です"
    fi
}

# 10. 最終統計とレポート生成
generate_final_report() {
    log_section "=== 最終レポート生成 ==="
    
    log_info "最終品質レポートを生成中..."
    
    cat > "$REPORT_FILE" << EOF
# 最終品質チェックレポート

**実行日時**: $(date)  
**チェック対象**: よさこいパフォーマンス評価システム ドキュメント  
**総ファイル数**: $TOTAL_FILES

## 実行結果サマリー

- **エラー**: $TOTAL_ERRORS 件
- **警告**: $TOTAL_WARNINGS 件
- **チェック項目**: 9 項目

## チェック項目詳細

### 1. ドキュメント構造整合性
- 必須ドキュメントファイルの存在確認
- ドキュメント間の相互参照チェック

### 2. Markdownフォーマット
- 全ドキュメントのフォーマット検証
- markdownlint による品質チェック

### 3. リンク有効性
- 内部リンクの整合性確認
- 外部リンクの有効性確認

### 4. 用語統一
- プロジェクト固有用語の統一確認
- 表記ゆれの検出

### 5. 画像ファイル
- 参照されている画像ファイルの存在確認
- 画像リンクの整合性

### 6. コードブロック
- 言語指定の確認
- 基本的な構文チェック

### 7. ドキュメント完全性
- 必須セクションの存在確認
- 内容の網羅性チェック

### 8. 実装整合性
- package.json との整合性
- Docker Compose ファイルとの整合性

### 9. アクセシビリティ
- 画像の代替テキスト確認
- 見出し階層の適切性

## 品質スコア

EOF

    # 品質スコアの計算
    local total_checks=9
    local passed_checks=$((total_checks - TOTAL_ERRORS))
    local quality_score=$((passed_checks * 100 / total_checks))
    
    echo "**品質スコア**: $quality_score/100" >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"
    
    if [[ $quality_score -ge 90 ]]; then
        echo "🟢 **評価**: 優秀 - ドキュメント品質は非常に高いレベルです" >> "$REPORT_FILE"
    elif [[ $quality_score -ge 80 ]]; then
        echo "🟡 **評価**: 良好 - ドキュメント品質は良好ですが、改善の余地があります" >> "$REPORT_FILE"
    elif [[ $quality_score -ge 70 ]]; then
        echo "🟠 **評価**: 要改善 - いくつかの問題を修正する必要があります" >> "$REPORT_FILE"
    else
        echo "🔴 **評価**: 要大幅改善 - 多くの問題を修正する必要があります" >> "$REPORT_FILE"
    fi
    
    cat >> "$REPORT_FILE" << EOF

## 推奨アクション

### 即座に対応すべき項目 (エラー)
EOF
    
    if [[ $TOTAL_ERRORS -eq 0 ]]; then
        echo "- なし" >> "$REPORT_FILE"
    else
        echo "- 上記のエラー項目をすべて修正してください" >> "$REPORT_FILE"
    fi
    
    cat >> "$REPORT_FILE" << EOF

### 改善を推奨する項目 (警告)
EOF
    
    if [[ $TOTAL_WARNINGS -eq 0 ]]; then
        echo "- なし" >> "$REPORT_FILE"
    else
        echo "- 上記の警告項目の修正を検討してください" >> "$REPORT_FILE"
    fi
    
    cat >> "$REPORT_FILE" << EOF

### 継続的改善

1. **定期的な品質チェック**: 月次でこのスクリプトを実行
2. **自動化の強化**: CI/CDパイプラインに品質チェックを統合
3. **チーム教育**: ドキュメント作成ガイドラインの共有
4. **フィードバック収集**: ユーザーからのドキュメント改善要望の収集

## 次回チェック予定

**推奨実行頻度**: 月次  
**次回実行予定**: $(date -d "+1 month" +%Y-%m-%d)

---

*このレポートは \`scripts/final-quality-check.sh\` により自動生成されました*
EOF
    
    log_success "最終品質レポートを生成しました: $REPORT_FILE"
}

# メイン実行関数
main() {
    echo "🚀 最終品質チェック・統合テスト開始"
    echo "========================================"
    echo ""
    
    # 各チェックの実行
    check_document_structure
    echo ""
    
    check_markdown_format
    echo ""
    
    check_all_links
    echo ""
    
    check_terminology_consistency
    echo ""
    
    check_image_files
    echo ""
    
    check_code_blocks
    echo ""
    
    check_document_completeness
    echo ""
    
    check_implementation_consistency
    echo ""
    
    check_accessibility
    echo ""
    
    generate_final_report
    echo ""
    
    # 最終結果の表示
    log_section "=== 最終結果 ==="
    echo "📊 チェック対象ファイル数: $TOTAL_FILES"
    echo "❌ エラー: $TOTAL_ERRORS 件"
    echo "⚠️  警告: $TOTAL_WARNINGS 件"
    echo ""
    
    if [[ $TOTAL_ERRORS -eq 0 ]]; then
        log_success "🎉 すべての品質チェックが正常に完了しました！"
        echo ""
        echo "📋 次のステップ:"
        echo "1. 生成されたレポートを確認: $REPORT_FILE"
        echo "2. 警告項目の改善を検討"
        echo "3. ドキュメントの公開準備"
        echo "4. ユーザビリティテストの実施"
        return 0
    else
        log_error "❌ $TOTAL_ERRORS 件のエラーが見つかりました"
        echo ""
        echo "🔧 修正が必要な項目:"
        echo "1. 上記のエラーメッセージを確認"
        echo "2. 該当する問題を修正"
        echo "3. 再度このスクリプトを実行"
        echo "4. 詳細は生成されたレポートを参照: $REPORT_FILE"
        return 1
    fi
}

# スクリプトが直接実行された場合
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi