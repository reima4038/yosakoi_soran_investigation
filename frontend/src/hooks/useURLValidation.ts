/**
 * YouTube URL検証用Reactカスタムフック
 * リアルタイムバリデーションとデバウンス機能を提供
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  YouTubeURLNormalizer, 
  DebouncedValidator, 
  ValidationResult,
  URLValidationState
} from '../utils/urlNormalizer';

export interface UseURLValidationOptions {
  debounceDelay?: number;
  validateOnMount?: boolean;
  initialUrl?: string;
}

export interface UseURLValidationResult {
  validationResult: ValidationResult | null;
  isValidating: boolean;
  inputState: 'empty' | 'typing' | 'valid' | 'invalid';
  hint: string | null;
  validate: (url: string) => void;
  validateImmediate: (url: string) => void;
  clear: () => void;
}

/**
 * URL検証用カスタムフック
 */
export function useURLValidation(options: UseURLValidationOptions = {}): UseURLValidationResult {
  const {
    debounceDelay = 300,
    validateOnMount = false,
    initialUrl = ''
  } = options;

  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [currentUrl, setCurrentUrl] = useState(initialUrl);
  
  const validatorRef = useRef<DebouncedValidator | null>(null);
  
  // バリデーターの初期化
  useEffect(() => {
    validatorRef.current = new DebouncedValidator(debounceDelay);
    
    return () => {
      if (validatorRef.current) {
        validatorRef.current.clear();
      }
    };
  }, [debounceDelay]);

  const validate = useCallback((url: string) => {
    if (!validatorRef.current) return;

    setCurrentUrl(url);
    setIsValidating(true);

    validatorRef.current.validate(url, (result) => {
      setValidationResult(result);
      setIsValidating(false);
    });
  }, []);

  const validateImmediate = useCallback((url: string) => {
    if (!validatorRef.current) return;

    setCurrentUrl(url);
    setIsValidating(true);

    validatorRef.current.validateImmediate(url, (result) => {
      setValidationResult(result);
      setIsValidating(false);
    });
  }, []);

  // 初期URL検証
  useEffect(() => {
    if (validateOnMount && initialUrl) {
      validateImmediate(initialUrl);
    }
  }, [validateOnMount, initialUrl, validateImmediate]);

  const clear = useCallback(() => {
    if (validatorRef.current) {
      validatorRef.current.clear();
    }
    setValidationResult(null);
    setIsValidating(false);
    setCurrentUrl('');
  }, []);

  // 入力状態とヒントの計算
  const inputState = YouTubeURLNormalizer.getInputState(currentUrl);
  const hint = YouTubeURLNormalizer.getURLHint(currentUrl);

  return {
    validationResult,
    isValidating,
    inputState,
    hint,
    validate,
    validateImmediate,
    clear
  };
}

/**
 * 複数URL検証用カスタムフック
 */
export interface UseMultipleURLValidationOptions {
  debounceDelay?: number;
}

export interface UseMultipleURLValidationResult {
  validationResults: Map<string, ValidationResult>;
  isValidating: boolean;
  validateURL: (id: string, url: string) => void;
  validateURLImmediate: (id: string, url: string) => void;
  removeURL: (id: string) => void;
  clear: () => void;
  getValidURLs: () => Array<{ id: string; url: string; normalizedUrl: any }>;
}

export function useMultipleURLValidation(
  options: UseMultipleURLValidationOptions = {}
): UseMultipleURLValidationResult {
  const { debounceDelay = 300 } = options;
  
  const [validationResults, setValidationResults] = useState<Map<string, ValidationResult>>(new Map());
  const [isValidating, setIsValidating] = useState(false);
  const [validatingCount, setValidatingCount] = useState(0);
  
  const validatorsRef = useRef<Map<string, DebouncedValidator>>(new Map());

  // バリデーション中の状態管理
  useEffect(() => {
    setIsValidating(validatingCount > 0);
  }, [validatingCount]);

  const validateURL = useCallback((id: string, url: string) => {
    let validator = validatorsRef.current.get(id);
    if (!validator) {
      validator = new DebouncedValidator(debounceDelay);
      validatorsRef.current.set(id, validator);
    }

    setValidatingCount(prev => prev + 1);

    validator.validate(url, (result) => {
      setValidationResults(prev => new Map(prev.set(id, result)));
      setValidatingCount(prev => prev - 1);
    });
  }, [debounceDelay]);

  const validateURLImmediate = useCallback((id: string, url: string) => {
    let validator = validatorsRef.current.get(id);
    if (!validator) {
      validator = new DebouncedValidator(debounceDelay);
      validatorsRef.current.set(id, validator);
    }

    setValidatingCount(prev => prev + 1);

    validator.validateImmediate(url, (result) => {
      setValidationResults(prev => new Map(prev.set(id, result)));
      setValidatingCount(prev => prev - 1);
    });
  }, [debounceDelay]);

  const removeURL = useCallback((id: string) => {
    const validator = validatorsRef.current.get(id);
    if (validator) {
      validator.clear();
      validatorsRef.current.delete(id);
    }

    setValidationResults(prev => {
      const newMap = new Map(prev);
      newMap.delete(id);
      return newMap;
    });
  }, []);

  const clear = useCallback(() => {
    validatorsRef.current.forEach(validator => validator.clear());
    validatorsRef.current.clear();
    setValidationResults(new Map());
    setValidatingCount(0);
  }, []);

  const getValidURLs = useCallback(() => {
    const validURLs: Array<{ id: string; url: string; normalizedUrl: any }> = [];
    
    validationResults.forEach((result, id) => {
      if (result.isValid && result.normalizedUrl) {
        validURLs.push({
          id,
          url: result.normalizedUrl.original,
          normalizedUrl: result.normalizedUrl
        });
      }
    });

    return validURLs;
  }, [validationResults]);

  // クリーンアップ
  useEffect(() => {
    return () => {
      validatorsRef.current.forEach(validator => validator.clear());
    };
  }, []);

  return {
    validationResults,
    isValidating,
    validateURL,
    validateURLImmediate,
    removeURL,
    clear,
    getValidURLs
  };
}

/**
 * URL入力フィールド用カスタムフック
 */
export interface UseURLInputOptions extends UseURLValidationOptions {
  onValidationChange?: (result: ValidationResult | null) => void;
  onValidURL?: (normalizedUrl: any) => void;
  onInvalidURL?: (error: any) => void;
}

export interface UseURLInputResult extends UseURLValidationResult {
  inputProps: {
    onChange: (value: string) => void;
    onBlur: () => void;
    onFocus: () => void;
  };
  isFocused: boolean;
}

export function useURLInput(options: UseURLInputOptions = {}): UseURLInputResult {
  const {
    onValidationChange,
    onValidURL,
    onInvalidURL,
    ...validationOptions
  } = options;

  const [isFocused, setIsFocused] = useState(false);
  const validation = useURLValidation(validationOptions);

  // バリデーション結果の変更を監視
  useEffect(() => {
    if (onValidationChange) {
      onValidationChange(validation.validationResult);
    }

    if (validation.validationResult) {
      if (validation.validationResult.isValid && onValidURL) {
        onValidURL(validation.validationResult.normalizedUrl);
      } else if (!validation.validationResult.isValid && onInvalidURL) {
        onInvalidURL(validation.validationResult.error);
      }
    }
  }, [validation.validationResult, onValidationChange, onValidURL, onInvalidURL]);

  const inputProps = {
    onChange: validation.validate,
    onBlur: () => setIsFocused(false),
    onFocus: () => setIsFocused(true)
  };

  return {
    ...validation,
    inputProps,
    isFocused
  };
}

/**
 * バッチURL検証用カスタムフック
 */
export interface UseBatchURLValidationOptions {
  batchSize?: number;
  delay?: number;
}

export interface UseBatchURLValidationResult {
  validateBatch: (urls: string[]) => Promise<ValidationResult[]>;
  isValidating: boolean;
  progress: number;
  results: ValidationResult[];
  cancel: () => void;
}

export function useBatchURLValidation(
  options: UseBatchURLValidationOptions = {}
): UseBatchURLValidationResult {
  const { batchSize = 5, delay = 100 } = options;
  
  const [isValidating, setIsValidating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<ValidationResult[]>([]);
  const cancelRef = useRef<boolean>(false);

  const validateBatch = useCallback(async (urls: string[]): Promise<ValidationResult[]> => {
    setIsValidating(true);
    setProgress(0);
    setResults([]);
    cancelRef.current = false;

    const allResults: ValidationResult[] = [];

    for (let i = 0; i < urls.length; i += batchSize) {
      if (cancelRef.current) break;

      const batch = urls.slice(i, i + batchSize);
      const batchResults = batch.map(url => YouTubeURLNormalizer.validateQuick(url));
      
      allResults.push(...batchResults);
      setResults([...allResults]);
      setProgress((i + batch.length) / urls.length);

      if (i + batchSize < urls.length && delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    setIsValidating(false);
    setProgress(1);
    
    return allResults;
  }, [batchSize, delay]);

  const cancel = useCallback(() => {
    cancelRef.current = true;
    setIsValidating(false);
  }, []);

  return {
    validateBatch,
    isValidating,
    progress,
    results,
    cancel
  };
}