/**
 * 共通バリデーションスキーマ
 * YouTube URL バリデーション改善に対応した柔軟なスキーマ定義
 */

import * as yup from 'yup';

/**
 * YouTube URL バリデーションスキーマ
 * EnhancedURLInputコンポーネントが詳細な検証を行うため、
 * フォームレベルでは基本的な必須チェックのみ実施
 */
export const youtubeUrlSchema = yup
  .string()
  .required('YouTube URLは必須です')
  .min(1, 'YouTube URLを入力してください')
  .test('is-not-empty', 'YouTube URLを入力してください', value =>
    value ? value.trim().length > 0 : false
  );

/**
 * 動画メタデータのバリデーションスキーマ
 */
export const videoMetadataSchema = yup
  .object()
  .shape({
    teamName: yup
      .string()
      .max(100, 'チーム名は100文字以下で入力してください')
      .optional(),
    performanceName: yup
      .string()
      .max(100, '演舞名は100文字以下で入力してください')
      .optional(),
    eventName: yup
      .string()
      .max(100, '大会名は100文字以下で入力してください')
      .optional(),
    year: yup
      .number()
      .nullable()
      .min(1900, '年度は1900年以降で入力してください')
      .max(new Date().getFullYear() + 1, '年度は来年以前で入力してください')
      .optional(),
    location: yup
      .string()
      .max(100, '場所は100文字以下で入力してください')
      .optional(),
  })
  .default({})
  .optional();

/**
 * タグのバリデーションスキーマ
 */
export const tagsSchema = yup
  .array()
  .of(yup.string().max(30, 'タグは30文字以下で入力してください'))
  .max(20, 'タグは20個まで追加できます')
  .optional();

/**
 * 動画登録フォームの完全なバリデーションスキーマ
 */
export const videoRegistrationSchema = yup.object().shape({
  youtubeUrl: youtubeUrlSchema,
  metadata: videoMetadataSchema,
  tags: tagsSchema,
});

/**
 * 緩和されたバリデーションスキーマ（開発・テスト用）
 * より柔軟な検証を行い、ユーザビリティを優先
 */
export const relaxedVideoRegistrationSchema = yup.object().shape({
  youtubeUrl: yup.string().required('YouTube URLは必須です'),
  metadata: yup
    .object()
    .shape({
      teamName: yup.string().max(100).optional(),
      performanceName: yup.string().max(100).optional(),
      eventName: yup.string().max(100).optional(),
      year: yup.number().nullable().optional(),
      location: yup.string().max(100).optional(),
    })
    .optional(),
  tags: yup.array().of(yup.string().max(30)).optional(),
});

/**
 * URL検証のためのカスタムバリデーター
 * EnhancedURLInputと連携して使用
 */
export const createUrlValidator = (
  isUrlValid: boolean,
  errorMessage?: string
) => {
  return yup
    .string()
    .required('YouTube URLは必須です')
    .test(
      'url-validation',
      errorMessage || 'URLの形式が正しくありません',
      () => isUrlValid
    );
};

/**
 * 動的バリデーションスキーマ生成
 * URL検証状態に基づいてスキーマを動的に生成
 */
export const createDynamicVideoRegistrationSchema = (
  isUrlValid: boolean,
  urlErrorMessage?: string
) => {
  return yup.object().shape({
    youtubeUrl: createUrlValidator(isUrlValid, urlErrorMessage),
    metadata: videoMetadataSchema,
    tags: tagsSchema,
  });
};

/**
 * バリデーションエラーメッセージのカスタマイズ
 */
export const validationMessages = {
  required: {
    youtubeUrl: 'YouTube URLは必須です',
    teamName: 'チーム名は必須です',
    performanceName: '演舞名は必須です',
    eventName: '大会名は必須です',
  },
  maxLength: {
    teamName: 'チーム名は100文字以下で入力してください',
    performanceName: '演舞名は100文字以下で入力してください',
    eventName: '大会名は100文字以下で入力してください',
    location: '場所は100文字以下で入力してください',
    tag: 'タグは30文字以下で入力してください',
  },
  format: {
    year: '年度は数値で入力してください',
    url: 'URLの形式が正しくありません',
  },
  range: {
    year: `年度は1900年から${new Date().getFullYear() + 1}年の間で入力してください`,
    tags: 'タグは20個まで追加できます',
  },
};

/**
 * バリデーションスキーマのテストヘルパー
 */
export const validateFormData = async (
  schema: yup.ObjectSchema<any>,
  data: any
): Promise<{ isValid: boolean; errors: Record<string, string> }> => {
  try {
    await schema.validate(data, { abortEarly: false });
    return { isValid: true, errors: {} };
  } catch (error) {
    if (error instanceof yup.ValidationError) {
      const errors: Record<string, string> = {};
      error.inner.forEach(err => {
        if (err.path) {
          errors[err.path] = err.message;
        }
      });
      return { isValid: false, errors };
    }
    return {
      isValid: false,
      errors: { general: 'バリデーションエラーが発生しました' },
    };
  }
};

/**
 * フィールド別バリデーション
 */
export const fieldValidators = {
  youtubeUrl: (value: string, isUrlValid: boolean = true) => {
    try {
      createUrlValidator(isUrlValid).validateSync(value);
      return null;
    } catch (error) {
      return error instanceof yup.ValidationError
        ? error.message
        : 'エラーが発生しました';
    }
  },

  teamName: (value: string) => {
    try {
      yup.string().max(100).validateSync(value);
      return null;
    } catch (error) {
      return error instanceof yup.ValidationError
        ? error.message
        : 'エラーが発生しました';
    }
  },

  year: (value: number | null) => {
    try {
      yup
        .number()
        .nullable()
        .min(1900)
        .max(new Date().getFullYear() + 1)
        .validateSync(value);
      return null;
    } catch (error) {
      return error instanceof yup.ValidationError
        ? error.message
        : 'エラーが発生しました';
    }
  },

  tag: (value: string) => {
    try {
      yup.string().max(30).validateSync(value);
      return null;
    } catch (error) {
      return error instanceof yup.ValidationError
        ? error.message
        : 'エラーが発生しました';
    }
  },
};

export default {
  youtubeUrlSchema,
  videoMetadataSchema,
  tagsSchema,
  videoRegistrationSchema,
  relaxedVideoRegistrationSchema,
  createUrlValidator,
  createDynamicVideoRegistrationSchema,
  validationMessages,
  validateFormData,
  fieldValidators,
};
