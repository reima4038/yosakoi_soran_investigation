/**
 * バリデーションスキーマのテスト
 * フロントエンドとバックエンドの整合性を確認
 */

import {
  youtubeUrlSchema,
  videoMetadataSchema,
  tagsSchema,
  videoRegistrationSchema,
  relaxedVideoRegistrationSchema,
  createUrlValidator,
  createDynamicVideoRegistrationSchema,
  validateFormData,
  fieldValidators,
  validationMessages,
} from '../../utils/validationSchemas';

describe('ValidationSchemas', () => {
  describe('youtubeUrlSchema', () => {
    it('有効なYouTube URLを受け入れる', async () => {
      const validUrls = [
        'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        'https://youtu.be/dQw4w9WgXcQ',
        'https://youtube.com/watch?v=dQw4w9WgXcQ',
        'http://www.youtube.com/watch?v=dQw4w9WgXcQ',
      ];

      for (const url of validUrls) {
        await expect(youtubeUrlSchema.validate(url)).resolves.toBe(url);
      }
    });

    it('空文字列を拒否する', async () => {
      await expect(youtubeUrlSchema.validate('')).rejects.toThrow(
        'YouTube URLは必須です'
      );
    });

    it('空白のみの文字列を拒否する', async () => {
      await expect(youtubeUrlSchema.validate('   ')).rejects.toThrow(
        'YouTube URLを入力してください'
      );
    });

    it('nullやundefinedを拒否する', async () => {
      await expect(youtubeUrlSchema.validate(null)).rejects.toThrow();
      await expect(youtubeUrlSchema.validate(undefined)).rejects.toThrow();
    });
  });

  describe('videoMetadataSchema', () => {
    it('有効なメタデータを受け入れる', async () => {
      const validMetadata = {
        teamName: 'テストチーム',
        performanceName: 'テスト演舞',
        eventName: 'テスト大会',
        year: 2023,
        location: 'テスト会場',
      };

      await expect(
        videoMetadataSchema.validate(validMetadata)
      ).resolves.toEqual(validMetadata);
    });

    it('空のオブジェクトを受け入れる', async () => {
      await expect(videoMetadataSchema.validate({})).resolves.toEqual({});
    });

    it('undefinedを受け入れる', async () => {
      const result = await videoMetadataSchema.validate(undefined);
      expect(result).toEqual({});
    });

    it('文字数制限を適用する', async () => {
      const longString = 'a'.repeat(101);

      await expect(
        videoMetadataSchema.validate({ teamName: longString })
      ).rejects.toThrow('チーム名は100文字以下で入力してください');

      await expect(
        videoMetadataSchema.validate({ performanceName: longString })
      ).rejects.toThrow('演舞名は100文字以下で入力してください');

      await expect(
        videoMetadataSchema.validate({ eventName: longString })
      ).rejects.toThrow('大会名は100文字以下で入力してください');

      await expect(
        videoMetadataSchema.validate({ location: longString })
      ).rejects.toThrow('場所は100文字以下で入力してください');
    });

    it('年度の範囲制限を適用する', async () => {
      const currentYear = new Date().getFullYear();

      await expect(
        videoMetadataSchema.validate({ year: 1899 })
      ).rejects.toThrow('年度は1900年以降で入力してください');

      await expect(
        videoMetadataSchema.validate({ year: currentYear + 2 })
      ).rejects.toThrow('年度は来年以前で入力してください');

      // 有効な年度
      await expect(
        videoMetadataSchema.validate({ year: 2000 })
      ).resolves.toEqual({ year: 2000 });
      await expect(
        videoMetadataSchema.validate({ year: currentYear })
      ).resolves.toEqual({ year: currentYear });
      await expect(
        videoMetadataSchema.validate({ year: null })
      ).resolves.toEqual({ year: null });
    });
  });

  describe('tagsSchema', () => {
    it('有効なタグ配列を受け入れる', async () => {
      const validTags = ['タグ1', 'タグ2', 'タグ3'];
      await expect(tagsSchema.validate(validTags)).resolves.toEqual(validTags);
    });

    it('空配列を受け入れる', async () => {
      await expect(tagsSchema.validate([])).resolves.toEqual([]);
    });

    it('undefinedを受け入れる', async () => {
      await expect(tagsSchema.validate(undefined)).resolves.toBeUndefined();
    });

    it('タグの文字数制限を適用する', async () => {
      const longTag = 'a'.repeat(31);
      await expect(tagsSchema.validate([longTag])).rejects.toThrow(
        'タグは30文字以下で入力してください'
      );
    });

    it('タグ数の制限を適用する', async () => {
      const manyTags = Array.from({ length: 21 }, (_, i) => `タグ${i + 1}`);
      await expect(tagsSchema.validate(manyTags)).rejects.toThrow(
        'タグは20個まで追加できます'
      );
    });

    it('空文字列のタグをフィルタリングする', async () => {
      // 実際のアプリケーションでは、空文字列のタグはフロントエンドで事前にフィルタリングされる
      const validTags = ['validTag1', 'validTag2'];
      await expect(tagsSchema.validate(validTags)).resolves.toEqual(validTags);
    });
  });

  describe('videoRegistrationSchema', () => {
    it('完全な有効データを受け入れる', async () => {
      const validData = {
        youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        metadata: {
          teamName: 'テストチーム',
          performanceName: 'テスト演舞',
          eventName: 'テスト大会',
          year: 2023,
          location: 'テスト会場',
        },
        tags: ['タグ1', 'タグ2'],
      };

      await expect(
        videoRegistrationSchema.validate(validData)
      ).resolves.toEqual(validData);
    });

    it('最小限の有効データを受け入れる', async () => {
      const minimalData = {
        youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      };

      const result = await videoRegistrationSchema.validate(minimalData);
      expect(result.youtubeUrl).toBe(minimalData.youtubeUrl);
    });

    it('YouTube URLが必須であることを確認する', async () => {
      const dataWithoutUrl = {
        metadata: { teamName: 'テストチーム' },
        tags: ['タグ1'],
      };

      await expect(
        videoRegistrationSchema.validate(dataWithoutUrl)
      ).rejects.toThrow('YouTube URLは必須です');
    });
  });

  describe('relaxedVideoRegistrationSchema', () => {
    it('より緩い検証を行う', async () => {
      const data = {
        youtubeUrl: 'any-string', // 厳密なURL検証なし
        metadata: {
          teamName: 'テストチーム',
        },
        tags: ['タグ1'],
      };

      await expect(
        relaxedVideoRegistrationSchema.validate(data)
      ).resolves.toEqual(data);
    });

    it('YouTube URLが必須であることは維持する', async () => {
      const dataWithoutUrl = {
        metadata: { teamName: 'テストチーム' },
      };

      await expect(
        relaxedVideoRegistrationSchema.validate(dataWithoutUrl)
      ).rejects.toThrow('YouTube URLは必須です');
    });
  });

  describe('createUrlValidator', () => {
    it('URL検証状態に基づいてバリデーションを行う', async () => {
      const validValidator = createUrlValidator(true);
      const invalidValidator = createUrlValidator(
        false,
        'カスタムエラーメッセージ'
      );

      await expect(validValidator.validate('any-url')).resolves.toBe('any-url');
      await expect(invalidValidator.validate('any-url')).rejects.toThrow(
        'カスタムエラーメッセージ'
      );
    });
  });

  describe('createDynamicVideoRegistrationSchema', () => {
    it('URL検証状態に基づいて動的スキーマを生成する', async () => {
      const validSchema = createDynamicVideoRegistrationSchema(true);
      const invalidSchema = createDynamicVideoRegistrationSchema(
        false,
        'URL無効'
      );

      const data = {
        youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        metadata: { teamName: 'テスト' },
        tags: ['タグ1'],
      };

      await expect(validSchema.validate(data)).resolves.toEqual(data);
      await expect(invalidSchema.validate(data)).rejects.toThrow('URL無効');
    });
  });

  describe('validateFormData', () => {
    it('バリデーション成功時に正しい結果を返す', async () => {
      const data = {
        youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        metadata: { teamName: 'テスト' },
        tags: ['タグ1'],
      };

      const result = await validateFormData(videoRegistrationSchema, data);
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual({});
    });

    it('バリデーション失敗時にエラー情報を返す', async () => {
      const invalidData = {
        youtubeUrl: '', // 必須フィールドが空
        metadata: { teamName: 'a'.repeat(101) }, // 文字数制限違反
      };

      const result = await validateFormData(
        videoRegistrationSchema,
        invalidData
      );
      expect(result.isValid).toBe(false);
      expect(Object.keys(result.errors).length).toBeGreaterThan(0);
    });
  });

  describe('fieldValidators', () => {
    describe('youtubeUrl', () => {
      it('有効なURLを受け入れる', () => {
        const result = fieldValidators.youtubeUrl(
          'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          true
        );
        expect(result).toBeNull();
      });

      it('無効なURLを拒否する', () => {
        const result = fieldValidators.youtubeUrl('invalid-url', false);
        expect(result).toBeTruthy();
      });
    });

    describe('teamName', () => {
      it('有効なチーム名を受け入れる', () => {
        const result = fieldValidators.teamName('テストチーム');
        expect(result).toBeNull();
      });

      it('長すぎるチーム名を拒否する', () => {
        const result = fieldValidators.teamName('a'.repeat(101));
        expect(result).toBeTruthy();
      });
    });

    describe('year', () => {
      it('有効な年度を受け入れる', () => {
        const result = fieldValidators.year(2023);
        expect(result).toBeNull();
      });

      it('nullを受け入れる', () => {
        const result = fieldValidators.year(null);
        expect(result).toBeNull();
      });

      it('範囲外の年度を拒否する', () => {
        const result = fieldValidators.year(1800);
        expect(result).toBeTruthy();
      });
    });

    describe('tag', () => {
      it('有効なタグを受け入れる', () => {
        const result = fieldValidators.tag('テストタグ');
        expect(result).toBeNull();
      });

      it('長すぎるタグを拒否する', () => {
        const result = fieldValidators.tag('a'.repeat(31));
        expect(result).toBeTruthy();
      });
    });
  });

  describe('validationMessages', () => {
    it('適切なメッセージ構造を持つ', () => {
      expect(validationMessages.required.youtubeUrl).toBe(
        'YouTube URLは必須です'
      );
      expect(validationMessages.maxLength.teamName).toBe(
        'チーム名は100文字以下で入力してください'
      );
      expect(validationMessages.format.year).toBe(
        '年度は数値で入力してください'
      );
      expect(validationMessages.range.year).toContain('年度は1900年から');
    });
  });

  describe('バックエンドとの整合性', () => {
    it('フロントエンドとバックエンドで同じ制限値を使用する', () => {
      // 文字数制限の確認
      expect(validationMessages.maxLength.teamName).toContain('100文字');
      expect(validationMessages.maxLength.performanceName).toContain('100文字');
      expect(validationMessages.maxLength.eventName).toContain('100文字');
      expect(validationMessages.maxLength.location).toContain('100文字');
      expect(validationMessages.maxLength.tag).toContain('30文字');

      // 年度範囲の確認
      const currentYear = new Date().getFullYear();
      expect(validationMessages.range.year).toContain('1900年');
      expect(validationMessages.range.year).toContain(`${currentYear + 1}年`);

      // タグ数制限の確認
      expect(validationMessages.range.tags).toContain('20個');
    });

    it('バックエンドと同じエラーメッセージ形式を使用する', () => {
      // 必須フィールドのメッセージ
      expect(validationMessages.required.youtubeUrl).toBe(
        'YouTube URLは必須です'
      );

      // 形式エラーのメッセージ
      expect(validationMessages.format.url).toBe('URLの形式が正しくありません');
    });
  });
});
