#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class SecurityAuditor {
  constructor() {
    this.results = {
      vulnerabilities: [],
      warnings: [],
      recommendations: [],
      score: 0
    };
  }

  // 依存関係の脆弱性チェック
  async checkDependencies() {
    console.log('🔍 依存関係の脆弱性をチェック中...');
    
    try {
      // npm audit
      const backendAudit = execSync('cd backend && npm audit --json', { encoding: 'utf8' });
      const frontendAudit = execSync('cd frontend && npm audit --json', { encoding: 'utf8' });
      
      const backendResults = JSON.parse(backendAudit);
      const frontendResults = JSON.parse(frontendAudit);
      
      this.processDependencyResults('backend', backendResults);
      this.processDependencyResults('frontend', frontendResults);
      
    } catch (error) {
      this.results.warnings.push({
        category: 'dependency',
        message: 'npm audit の実行に失敗しました',
        details: error.message
      });
    }
  }

  processDependencyResults(project, auditResults) {
    if (auditResults.vulnerabilities) {
      Object.entries(auditResults.vulnerabilities).forEach(([pkg, vuln]) => {
        if (vuln.severity === 'high' || vuln.severity === 'critical') {
          this.results.vulnerabilities.push({
            category: 'dependency',
            project,
            package: pkg,
            severity: vuln.severity,
            title: vuln.title,
            recommendation: `${pkg} を更新してください`
          });
        }
      });
    }
  }

  // 設定ファイルのセキュリティチェック
  checkConfiguration() {
    console.log('⚙️  設定ファイルをチェック中...');
    
    // 環境変数ファイルのチェック
    this.checkEnvFiles();
    
    // Docker設定のチェック
    this.checkDockerConfig();
    
    // Nginx設定のチェック
    this.checkNginxConfig();
  }

  checkEnvFiles() {
    const envFiles = ['.env', '.env.production', '.env.local'];
    
    envFiles.forEach(file => {
      if (fs.existsSync(file)) {
        this.results.warnings.push({
          category: 'configuration',
          message: `環境変数ファイル ${file} が存在します`,
          recommendation: 'Git に含めないよう .gitignore に追加してください'
        });
      }
    });

    // .env.example の存在チェック
    if (!fs.existsSync('.env.production.example')) {
      this.results.recommendations.push({
        category: 'configuration',
        message: '環境変数のテンプレートファイルがありません',
        recommendation: '.env.production.example を作成してください'
      });
    }
  }

  checkDockerConfig() {
    const dockerCompose = 'docker-compose.prod.yml';
    
    if (fs.existsSync(dockerCompose)) {
      const content = fs.readFileSync(dockerCompose, 'utf8');
      
      // ハードコードされたパスワードのチェック
      if (content.includes('password:') && !content.includes('${')) {
        this.results.vulnerabilities.push({
          category: 'configuration',
          message: 'Docker Compose にハードコードされたパスワードが含まれています',
          recommendation: '環境変数を使用してください'
        });
      }
      
      // rootユーザーの使用チェック
      if (content.includes('user: root')) {
        this.results.warnings.push({
          category: 'configuration',
          message: 'Docker コンテナで root ユーザーが使用されています',
          recommendation: '非特権ユーザーを使用してください'
        });
      }
    }
  }

  checkNginxConfig() {
    const nginxConfig = 'frontend/nginx.conf';
    
    if (fs.existsSync(nginxConfig)) {
      const content = fs.readFileSync(nginxConfig, 'utf8');
      
      // SSL設定のチェック
      if (!content.includes('ssl_protocols')) {
        this.results.warnings.push({
          category: 'configuration',
          message: 'SSL プロトコルが設定されていません',
          recommendation: 'TLS 1.2 以上を設定してください'
        });
      }
      
      // セキュリティヘッダーのチェック
      const securityHeaders = [
        'X-Frame-Options',
        'X-Content-Type-Options',
        'X-XSS-Protection',
        'Strict-Transport-Security'
      ];
      
      securityHeaders.forEach(header => {
        if (!content.includes(header)) {
          this.results.recommendations.push({
            category: 'configuration',
            message: `セキュリティヘッダー ${header} が設定されていません`,
            recommendation: `${header} ヘッダーを追加してください`
          });
        }
      });
    }
  }

  // コードの静的解析
  checkCodeSecurity() {
    console.log('🔒 コードのセキュリティをチェック中...');
    
    this.checkJavaScriptSecurity();
    this.checkSQLInjection();
    this.checkXSS();
  }

  checkJavaScriptSecurity() {
    const jsFiles = this.findFiles(['backend/src', 'frontend/src'], /\.js$|\.ts$|\.jsx$|\.tsx$/);
    
    jsFiles.forEach(file => {
      const content = fs.readFileSync(file, 'utf8');
      
      // eval() の使用チェック
      if (content.includes('eval(')) {
        this.results.vulnerabilities.push({
          category: 'code',
          file,
          message: 'eval() の使用が検出されました',
          recommendation: 'eval() の使用を避けてください'
        });
      }
      
      // innerHTML の使用チェック
      if (content.includes('innerHTML')) {
        this.results.warnings.push({
          category: 'code',
          file,
          message: 'innerHTML の使用が検出されました',
          recommendation: 'textContent または適切なサニタイゼーションを使用してください'
        });
      }
      
      // ハードコードされたシークレットのチェック
      const secretPatterns = [
        /password\s*=\s*['"][^'"]+['"]/i,
        /secret\s*=\s*['"][^'"]+['"]/i,
        /api[_-]?key\s*=\s*['"][^'"]+['"]/i,
        /token\s*=\s*['"][^'"]+['"]/i
      ];
      
      secretPatterns.forEach(pattern => {
        if (pattern.test(content)) {
          this.results.vulnerabilities.push({
            category: 'code',
            file,
            message: 'ハードコードされたシークレットが検出されました',
            recommendation: '環境変数を使用してください'
          });
        }
      });
    });
  }

  checkSQLInjection() {
    const jsFiles = this.findFiles(['backend/src'], /\.js$|\.ts$/);
    
    jsFiles.forEach(file => {
      const content = fs.readFileSync(file, 'utf8');
      
      // 動的クエリ構築のチェック
      if (content.includes('$where') || content.includes('eval')) {
        this.results.vulnerabilities.push({
          category: 'code',
          file,
          message: 'NoSQL インジェクションの脆弱性が検出されました',
          recommendation: 'パラメータ化クエリを使用してください'
        });
      }
    });
  }

  checkXSS() {
    const reactFiles = this.findFiles(['frontend/src'], /\.jsx$|\.tsx$/);
    
    reactFiles.forEach(file => {
      const content = fs.readFileSync(file, 'utf8');
      
      // dangerouslySetInnerHTML の使用チェック
      if (content.includes('dangerouslySetInnerHTML')) {
        this.results.warnings.push({
          category: 'code',
          file,
          message: 'dangerouslySetInnerHTML の使用が検出されました',
          recommendation: '適切なサニタイゼーションを実装してください'
        });
      }
    });
  }

  // ファイル検索ヘルパー
  findFiles(directories, pattern) {
    const files = [];
    
    directories.forEach(dir => {
      if (fs.existsSync(dir)) {
        this.walkDirectory(dir, pattern, files);
      }
    });
    
    return files;
  }

  walkDirectory(dir, pattern, files) {
    const items = fs.readdirSync(dir);
    
    items.forEach(item => {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
        this.walkDirectory(fullPath, pattern, files);
      } else if (stat.isFile() && pattern.test(item)) {
        files.push(fullPath);
      }
    });
  }

  // スコア計算
  calculateScore() {
    const vulnerabilityWeight = -10;
    const warningWeight = -3;
    const recommendationWeight = -1;
    
    const score = 100 + 
      (this.results.vulnerabilities.length * vulnerabilityWeight) +
      (this.results.warnings.length * warningWeight) +
      (this.results.recommendations.length * recommendationWeight);
    
    this.results.score = Math.max(0, score);
  }

  // レポート生成
  generateReport() {
    this.calculateScore();
    
    console.log('\n📊 セキュリティ監査レポート');
    console.log('='.repeat(50));
    console.log(`スコア: ${this.results.score}/100`);
    
    if (this.results.vulnerabilities.length > 0) {
      console.log('\n🚨 脆弱性:');
      this.results.vulnerabilities.forEach((vuln, index) => {
        console.log(`${index + 1}. [${vuln.category}] ${vuln.message}`);
        if (vuln.file) console.log(`   ファイル: ${vuln.file}`);
        console.log(`   推奨: ${vuln.recommendation}\n`);
      });
    }
    
    if (this.results.warnings.length > 0) {
      console.log('\n⚠️  警告:');
      this.results.warnings.forEach((warning, index) => {
        console.log(`${index + 1}. [${warning.category}] ${warning.message}`);
        if (warning.file) console.log(`   ファイル: ${warning.file}`);
        console.log(`   推奨: ${warning.recommendation}\n`);
      });
    }
    
    if (this.results.recommendations.length > 0) {
      console.log('\n💡 推奨事項:');
      this.results.recommendations.forEach((rec, index) => {
        console.log(`${index + 1}. [${rec.category}] ${rec.message}`);
        console.log(`   推奨: ${rec.recommendation}\n`);
      });
    }
    
    // JSON レポートの保存
    fs.writeFileSync('security-audit-report.json', JSON.stringify(this.results, null, 2));
    console.log('📄 詳細レポートが security-audit-report.json に保存されました');
  }

  // メイン実行
  async run() {
    console.log('🔐 セキュリティ監査を開始します...\n');
    
    await this.checkDependencies();
    this.checkConfiguration();
    this.checkCodeSecurity();
    
    this.generateReport();
  }
}

// スクリプトとして実行された場合
if (require.main === module) {
  const auditor = new SecurityAuditor();
  auditor.run().catch(console.error);
}

module.exports = SecurityAuditor;