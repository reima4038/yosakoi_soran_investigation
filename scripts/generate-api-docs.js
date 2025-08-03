#!/usr/bin/env node

/**
 * API仕様自動生成スクリプト
 * 
 * このスクリプトは以下の機能を提供します：
 * 1. バックエンドのルートファイルからエンドポイントを抽出
 * 2. JSDocコメントからAPI仕様を生成
 * 3. OpenAPI 3.0形式での出力
 * 4. Markdownドキュメントの更新
 */

const fs = require('fs');
const path = require('path');

class ApiDocGenerator {
  constructor() {
    this.backendPath = path.join(__dirname, '../backend');
    this.docsPath = path.join(__dirname, '../docs');
    this.routesPath = path.join(this.backendPath, 'src/routes');
    this.controllersPath = path.join(this.backendPath, 'src/controllers');
    
    this.apiSpec = {
      openapi: '3.0.0',
      info: {
        title: 'よさこいパフォーマンス評価システム API',
        version: '1.0.0',
        description: 'YouTube動画を活用したよさこいソーラン演舞の評価・分析API'
      },
      servers: [
        {
          url: 'http://localhost:3001',
          description: '開発環境'
        },
        {
          url: 'https://api.yosakoi-eval.com',
          description: '本番環境'
        }
      ],
      paths: {},
      components: {
        schemas: {},
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT'
          }
        }
      }
    };
  }

  /**
   * ルートファイルからエンドポイント情報を抽出
   */
  extractRoutes() {
    console.log('🔍 Extracting routes from backend...');
    
    if (!fs.existsSync(this.routesPath)) {
      console.warn(`⚠️  Routes directory not found: ${this.routesPath}`);
      return;
    }

    const routeFiles = fs.readdirSync(this.routesPath)
      .filter(file => file.endsWith('.js') || file.endsWith('.ts'));

    routeFiles.forEach(file => {
      const filePath = path.join(this.routesPath, file);
      const content = fs.readFileSync(filePath, 'utf8');
      
      // 簡単なルート抽出（実際の実装では、より詳細な解析が必要）
      const routeMatches = content.match(/router\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/g);
      
      if (routeMatches) {
        console.log(`📄 Processing ${file}:`);
        routeMatches.forEach(match => {
          const [, method, path] = match.match(/router\.(\w+)\s*\(\s*['"`]([^'"`]+)['"`]/);
          console.log(`  ${method.toUpperCase()} ${path}`);
          
          // OpenAPI仕様に追加（基本的な構造のみ）
          if (!this.apiSpec.paths[path]) {
            this.apiSpec.paths[path] = {};
          }
          
          this.apiSpec.paths[path][method.toLowerCase()] = {
            summary: `${method.toUpperCase()} ${path}`,
            description: 'API endpoint description (要実装)',
            responses: {
              '200': {
                description: 'Success',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        status: { type: 'string', example: 'success' },
                        data: { type: 'object' }
                      }
                    }
                  }
                }
              },
              '400': {
                description: 'Bad Request'
              },
              '401': {
                description: 'Unauthorized'
              },
              '500': {
                description: 'Internal Server Error'
              }
            }
          };
          
          // 認証が必要なエンドポイントの場合
          if (!path.includes('/auth/login') && !path.includes('/auth/register')) {
            this.apiSpec.paths[path][method.toLowerCase()].security = [
              { bearerAuth: [] }
            ];
          }
        });
      }
    });
  }

  /**
   * コントローラーからJSDocコメントを抽出
   */
  extractControllerDocs() {
    console.log('📚 Extracting JSDoc comments from controllers...');
    
    if (!fs.existsSync(this.controllersPath)) {
      console.warn(`⚠️  Controllers directory not found: ${this.controllersPath}`);
      return;
    }

    const controllerFiles = fs.readdirSync(this.controllersPath)
      .filter(file => file.endsWith('.js') || file.endsWith('.ts'));

    controllerFiles.forEach(file => {
      const filePath = path.join(this.controllersPath, file);
      const content = fs.readFileSync(filePath, 'utf8');
      
      // JSDocコメントの抽出（簡単な実装）
      const jsdocMatches = content.match(/\/\*\*[\s\S]*?\*\//g);
      
      if (jsdocMatches) {
        console.log(`📝 Found JSDoc comments in ${file}: ${jsdocMatches.length}`);
        // 実際の実装では、JSDocコメントを解析してAPI仕様に反映
      }
    });
  }

  /**
   * OpenAPI仕様をファイルに出力
   */
  generateOpenApiSpec() {
    console.log('📄 Generating OpenAPI specification...');
    
    const outputPath = path.join(this.docsPath, 'openapi.yaml');
    const yamlContent = this.convertToYaml(this.apiSpec);
    
    fs.writeFileSync(outputPath, yamlContent);
    console.log(`✅ OpenAPI specification generated: ${outputPath}`);
  }

  /**
   * オブジェクトをYAML形式に変換（簡単な実装）
   */
  convertToYaml(obj, indent = 0) {
    const spaces = '  '.repeat(indent);
    let yaml = '';
    
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        yaml += `${spaces}${key}:\n`;
        yaml += this.convertToYaml(value, indent + 1);
      } else if (Array.isArray(value)) {
        yaml += `${spaces}${key}:\n`;
        value.forEach(item => {
          if (typeof item === 'object') {
            yaml += `${spaces}  -\n`;
            yaml += this.convertToYaml(item, indent + 2);
          } else {
            yaml += `${spaces}  - ${item}\n`;
          }
        });
      } else {
        const valueStr = typeof value === 'string' ? `"${value}"` : value;
        yaml += `${spaces}${key}: ${valueStr}\n`;
      }
    }
    
    return yaml;
  }

  /**
   * Markdownドキュメントを更新
   */
  updateMarkdownDocs() {
    console.log('📝 Updating Markdown documentation...');
    
    const apiDocPath = path.join(this.docsPath, 'api-documentation.md');
    
    if (!fs.existsSync(apiDocPath)) {
      console.warn(`⚠️  API documentation file not found: ${apiDocPath}`);
      return;
    }

    // 自動生成セクションの追加
    const autoGeneratedSection = `
## 自動生成API仕様

このセクションは \`scripts/generate-api-docs.js\` により自動生成されます。

### 利用可能なエンドポイント

${Object.keys(this.apiSpec.paths).map(path => {
  const methods = Object.keys(this.apiSpec.paths[path]);
  return `- \`${path}\` - ${methods.map(m => m.toUpperCase()).join(', ')}`;
}).join('\n')}

### OpenAPI仕様

詳細なAPI仕様は [openapi.yaml](./openapi.yaml) を参照してください。

### Swagger UI

開発環境では以下のURLでSwagger UIにアクセスできます：
- http://localhost:3001/api-docs

`;

    // 既存のドキュメントに自動生成セクションを追加
    let content = fs.readFileSync(apiDocPath, 'utf8');
    
    // 既存の自動生成セクションを削除
    content = content.replace(/## 自動生成API仕様[\s\S]*?(?=##|$)/m, '');
    
    // 新しい自動生成セクションを追加
    content += autoGeneratedSection;
    
    fs.writeFileSync(apiDocPath, content);
    console.log('✅ API documentation updated');
  }

  /**
   * 統計情報を生成
   */
  generateStats() {
    const stats = {
      totalEndpoints: Object.keys(this.apiSpec.paths).length,
      endpointsByMethod: {},
      timestamp: new Date().toISOString()
    };

    Object.values(this.apiSpec.paths).forEach(pathObj => {
      Object.keys(pathObj).forEach(method => {
        stats.endpointsByMethod[method.toUpperCase()] = 
          (stats.endpointsByMethod[method.toUpperCase()] || 0) + 1;
      });
    });

    console.log('\n📊 API Statistics:');
    console.log(`Total endpoints: ${stats.totalEndpoints}`);
    console.log('Endpoints by method:');
    Object.entries(stats.endpointsByMethod).forEach(([method, count]) => {
      console.log(`  ${method}: ${count}`);
    });

    return stats;
  }

  /**
   * メイン実行関数
   */
  async run() {
    console.log('🚀 Starting API documentation generation...\n');
    
    try {
      this.extractRoutes();
      this.extractControllerDocs();
      this.generateOpenApiSpec();
      this.updateMarkdownDocs();
      
      const stats = this.generateStats();
      
      console.log('\n✅ API documentation generation completed successfully!');
      
      // 統計情報をファイルに保存
      const statsPath = path.join(this.docsPath, 'api-stats.json');
      fs.writeFileSync(statsPath, JSON.stringify(stats, null, 2));
      console.log(`📊 Statistics saved to: ${statsPath}`);
      
    } catch (error) {
      console.error('❌ Error generating API documentation:', error);
      process.exit(1);
    }
  }
}

// スクリプトが直接実行された場合
if (require.main === module) {
  const generator = new ApiDocGenerator();
  generator.run();
}

module.exports = ApiDocGenerator;