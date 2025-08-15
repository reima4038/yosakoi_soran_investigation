import { apiClient } from '../utils/api';

export enum CriterionType {
  NUMERIC = 'numeric',
  SCALE = 'scale',
  BOOLEAN = 'boolean',
}

export interface Criterion {
  id: string;
  name: string;
  description: string;
  type: CriterionType;
  minValue: number;
  maxValue: number;
  weight: number;
  allowComments?: boolean;
}

export interface Category {
  id: string;
  name: string;
  description: string;
  weight: number;
  criteria: Criterion[];
  allowComments?: boolean;
}

export interface Template {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  creatorId: string;
  categories: Category[];
  allowGeneralComments?: boolean;
  isPublic: boolean;
}

export interface CreateTemplateRequest {
  name: string;
  description: string;
  categories: Category[];
  allowGeneralComments?: boolean;
  isPublic?: boolean;
}

export interface TemplateResponse {
  status: string;
  data: Template;
  message?: string;
}

export interface TemplateListResponse {
  status: string;
  data: Template[];
}

class TemplateService {
  private readonly MAX_RETRY_ATTEMPTS = 3;
  private readonly RETRY_DELAY = 1000; // 1秒

  // 再試行機能付きのAPIリクエスト
  private async retryRequest<T>(
    requestFn: () => Promise<T>,
    maxAttempts: number = this.MAX_RETRY_ATTEMPTS
  ): Promise<T> {
    let lastError: any;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await requestFn();
      } catch (error: any) {
        lastError = error;

        // ネットワークエラーまたは5xxエラーの場合のみ再試行
        const shouldRetry =
          !error.response ||
          (error.response.status >= 500 && error.response.status < 600);

        if (!shouldRetry || attempt === maxAttempts) {
          throw error;
        }

        // 指数バックオフで待機
        const delay = this.RETRY_DELAY * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError;
  }
  // テンプレート一覧取得
  async getTemplates(): Promise<Template[]> {
    try {
      return await this.retryRequest(async () => {
        const response =
          await apiClient.get<TemplateListResponse>('/templates');
        return response.data.data;
      });
    } catch (error: any) {
      // ネットワークエラーの場合
      if (!error.response) {
        throw new Error(
          'ネットワークエラーが発生しました。インターネット接続を確認してください。'
        );
      }

      // サーバーエラーの場合
      if (error.response.status >= 500) {
        throw new Error(
          'サーバーエラーが発生しました。しばらく待ってから再試行してください。'
        );
      }

      // 認証エラーの場合
      if (error.response.status === 401) {
        throw new Error('認証が必要です。ログインしてください。');
      }

      const message =
        error.response?.data?.message || 'テンプレート一覧の取得に失敗しました';
      throw new Error(message);
    }
  }

  // テンプレート詳細取得
  async getTemplate(id: string): Promise<Template> {
    try {
      return await this.retryRequest(async () => {
        const response = await apiClient.get<TemplateResponse>(
          `/templates/${id}`
        );
        return response.data.data;
      });
    } catch (error: any) {
      // ネットワークエラーの場合
      if (!error.response) {
        throw new Error(
          'ネットワークエラーが発生しました。インターネット接続を確認してください。'
        );
      }

      // 404エラーの場合
      if (error.response.status === 404) {
        throw new Error('指定されたテンプレートが見つかりません。');
      }

      // 403エラーの場合
      if (error.response.status === 403) {
        throw new Error('このテンプレートにアクセスする権限がありません。');
      }

      // 認証エラーの場合
      if (error.response.status === 401) {
        throw new Error('認証が必要です。ログインしてください。');
      }

      const message =
        error.response?.data?.message || 'テンプレート詳細の取得に失敗しました';
      throw new Error(message);
    }
  }

  // テンプレート作成
  async createTemplate(templateData: CreateTemplateRequest): Promise<Template> {
    try {
      const response = await apiClient.post<TemplateResponse>(
        '/templates',
        templateData
      );
      return response.data.data;
    } catch (error: any) {
      // ネットワークエラーの場合
      if (!error.response) {
        throw new Error(
          'ネットワークエラーが発生しました。インターネット接続を確認してください。'
        );
      }

      // バリデーションエラーの場合
      if (error.response.status === 400) {
        const errors = error.response.data?.errors;
        if (errors && Array.isArray(errors)) {
          throw new Error(`入力データに問題があります: ${errors.join(', ')}`);
        }
      }

      // 認証エラーの場合
      if (error.response.status === 401) {
        throw new Error('認証が必要です。ログインしてください。');
      }

      const message =
        error.response?.data?.message || 'テンプレートの作成に失敗しました';
      throw new Error(message);
    }
  }

  // テンプレート更新
  async updateTemplate(
    id: string,
    templateData: CreateTemplateRequest
  ): Promise<Template> {
    try {
      const response = await apiClient.put<TemplateResponse>(
        `/templates/${id}`,
        templateData
      );
      return response.data.data;
    } catch (error: any) {
      // ネットワークエラーの場合
      if (!error.response) {
        throw new Error(
          'ネットワークエラーが発生しました。インターネット接続を確認してください。'
        );
      }

      // 404エラーの場合
      if (error.response.status === 404) {
        throw new Error('指定されたテンプレートが見つかりません。');
      }

      // 403エラーの場合
      if (error.response.status === 403) {
        throw new Error('このテンプレートを編集する権限がありません。');
      }

      // バリデーションエラーの場合
      if (error.response.status === 400) {
        const errors = error.response.data?.errors;
        if (errors && Array.isArray(errors)) {
          throw new Error(`入力データに問題があります: ${errors.join(', ')}`);
        }
      }

      // 認証エラーの場合
      if (error.response.status === 401) {
        throw new Error('認証が必要です。ログインしてください。');
      }

      const message =
        error.response?.data?.message || 'テンプレートの更新に失敗しました';
      throw new Error(message);
    }
  }

  // テンプレート削除
  async deleteTemplate(id: string): Promise<void> {
    try {
      await apiClient.delete(`/templates/${id}`);
    } catch (error: any) {
      // ネットワークエラーの場合
      if (!error.response) {
        throw new Error(
          'ネットワークエラーが発生しました。インターネット接続を確認してください。'
        );
      }

      // 404エラーの場合
      if (error.response.status === 404) {
        throw new Error('指定されたテンプレートが見つかりません。');
      }

      // 403エラーの場合
      if (error.response.status === 403) {
        throw new Error('このテンプレートを削除する権限がありません。');
      }

      // 認証エラーの場合
      if (error.response.status === 401) {
        throw new Error('認証が必要です。ログインしてください。');
      }

      const message =
        error.response?.data?.message || 'テンプレートの削除に失敗しました';
      throw new Error(message);
    }
  }

  // テンプレート複製
  async duplicateTemplate(id: string): Promise<Template> {
    try {
      const response = await apiClient.post<TemplateResponse>(
        `/templates/${id}/duplicate`
      );
      return response.data.data;
    } catch (error: any) {
      // ネットワークエラーの場合
      if (!error.response) {
        throw new Error(
          'ネットワークエラーが発生しました。インターネット接続を確認してください。'
        );
      }

      // 404エラーの場合
      if (error.response.status === 404) {
        throw new Error('指定されたテンプレートが見つかりません。');
      }

      // 403エラーの場合
      if (error.response.status === 403) {
        throw new Error('このテンプレートを複製する権限がありません。');
      }

      // 409エラー（重複）の場合
      if (error.response.status === 409) {
        throw new Error('テンプレート名が重複しています。再試行してください。');
      }

      // 503エラー（サービス利用不可）の場合
      if (error.response.status === 503) {
        throw new Error(
          'データベース接続エラーが発生しました。しばらく待ってから再試行してください。'
        );
      }

      // 認証エラーの場合
      if (error.response.status === 401) {
        throw new Error('認証が必要です。ログインしてください。');
      }

      const message =
        error.response?.data?.message || 'テンプレートの複製に失敗しました';
      throw new Error(message);
    }
  }

  // テンプレート可視性切り替え
  async toggleTemplateVisibility(
    id: string,
    isPublic: boolean
  ): Promise<Template> {
    try {
      const response = await apiClient.put<TemplateResponse>(
        `/templates/${id}/visibility`,
        { isPublic }
      );
      return response.data.data;
    } catch (error: any) {
      const message =
        error.response?.data?.message ||
        'テンプレートの可視性変更に失敗しました';
      throw new Error(message);
    }
  }

  // 新しいカテゴリを作成
  createNewCategory(): Category {
    return {
      id: this.generateId(),
      name: '',
      description: '',
      weight: 0,
      criteria: [],
      allowComments: false,
    };
  }

  // 新しい評価基準を作成
  createNewCriterion(): Criterion {
    return {
      id: this.generateId(),
      name: '',
      description: '',
      type: CriterionType.SCALE,
      minValue: 1,
      maxValue: 5,
      weight: 0,
      allowComments: false,
    };
  }

  // 重みの正規化
  normalizeWeights(items: { weight: number }[]): { weight: number }[] {
    const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
    if (totalWeight === 0) {
      // 全て0の場合は均等に分配
      const equalWeight = 1 / items.length;
      return items.map(item => ({ ...item, weight: equalWeight }));
    }
    // 合計が1になるように正規化
    return items.map(item => ({ ...item, weight: item.weight / totalWeight }));
  }

  // テンプレートのバリデーション
  validateTemplate(template: CreateTemplateRequest): string[] {
    const errors: string[] = [];

    if (!template.name.trim()) {
      errors.push('テンプレート名は必須です');
    }

    if (!template.description.trim()) {
      errors.push('テンプレートの説明は必須です');
    }

    if (template.categories.length === 0) {
      errors.push('少なくとも1つのカテゴリが必要です');
    }

    // カテゴリの重みの合計チェック
    const categoryWeightSum = template.categories.reduce(
      (sum, category) => sum + category.weight,
      0
    );
    if (Math.abs(categoryWeightSum - 1) > 0.001) {
      errors.push('カテゴリの重みの合計は100%である必要があります');
    }

    template.categories.forEach((category, categoryIndex) => {
      if (!category.name.trim()) {
        errors.push(`カテゴリ ${categoryIndex + 1}: 名前は必須です`);
      }

      if (category.criteria.length === 0) {
        errors.push(
          `カテゴリ「${category.name}」: 少なくとも1つの評価基準が必要です`
        );
      }

      // 評価基準の重みの合計チェック
      const criteriaWeightSum = category.criteria.reduce(
        (sum, criterion) => sum + criterion.weight,
        0
      );
      if (Math.abs(criteriaWeightSum - 1) > 0.001) {
        errors.push(
          `カテゴリ「${category.name}」: 評価基準の重みの合計は100%である必要があります`
        );
      }

      category.criteria.forEach((criterion, criterionIndex) => {
        if (!criterion.name.trim()) {
          errors.push(
            `カテゴリ「${category.name}」の評価基準 ${criterionIndex + 1}: 名前は必須です`
          );
        }

        if (criterion.maxValue <= criterion.minValue) {
          errors.push(
            `評価基準「${criterion.name}」: 最大値は最小値より大きい必要があります`
          );
        }

        if (criterion.weight < 0 || criterion.weight > 1) {
          errors.push(
            `評価基準「${criterion.name}」: 重みは0から1の間である必要があります`
          );
        }
      });
    });

    return errors;
  }

  // テンプレートのエクスポート（JSON形式）
  exportTemplate(template: Template): void {
    const exportData = {
      name: template.name,
      description: template.description,
      categories: template.categories,
      allowGeneralComments: template.allowGeneralComments,
      isPublic: template.isPublic,
      exportedAt: new Date().toISOString(),
      version: '1.0',
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `${template.name.replace(/[^a-zA-Z0-9]/g, '_')}_template.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // テンプレートのインポート（JSON形式）
  async importTemplate(file: File): Promise<CreateTemplateRequest> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = e => {
        try {
          const content = e.target?.result as string;
          const importData = JSON.parse(content);

          // バリデーション
          if (
            !importData.name ||
            !importData.description ||
            !importData.categories
          ) {
            throw new Error('無効なテンプレートファイルです');
          }

          // インポートデータを CreateTemplateRequest 形式に変換
          const templateData: CreateTemplateRequest = {
            name: `${importData.name} (インポート)`,
            description: importData.description,
            categories: importData.categories.map((category: any) => ({
              ...category,
              id: this.generateId(), // 新しいIDを生成
              criteria: category.criteria.map((criterion: any) => ({
                ...criterion,
                id: this.generateId(), // 新しいIDを生成
              })),
            })),
            allowGeneralComments: importData.allowGeneralComments ?? true,
            isPublic: importData.isPublic ?? true,
          };

          resolve(templateData);
        } catch (error) {
          reject(new Error('テンプレートファイルの読み込みに失敗しました'));
        }
      };

      reader.onerror = () => {
        reject(new Error('ファイルの読み込みに失敗しました'));
      };

      reader.readAsText(file);
    });
  }

  // 複数テンプレートのエクスポート
  exportMultipleTemplates(templates: Template[]): void {
    const exportData = {
      templates: templates.map(template => ({
        name: template.name,
        description: template.description,
        categories: template.categories,
        allowGeneralComments: template.allowGeneralComments,
        isPublic: template.isPublic,
      })),
      exportedAt: new Date().toISOString(),
      version: '1.0',
      count: templates.length,
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `templates_export_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2, 11);
  }
}

export const templateService = new TemplateService();
