import { format, formatDistanceToNow, isValid, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';

/**
 * 안전하게 날짜를 파싱하는 함수
 */
export function safeParseDateString(dateString: string | null | undefined): Date | null {
  if (!dateString) return null;

  try {
    // ISO 문자열 파싱 시도
    const date = parseISO(dateString);
    if (isValid(date)) {
      return date;
    }

    // 일반적인 Date 생성자 시도
    const fallbackDate = new Date(dateString);
    if (isValid(fallbackDate)) {
      return fallbackDate;
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * 안전한 formatDistanceToNow 함수
 */
export function safeFormatDistanceToNow(
  dateString: string | null | undefined,
  options?: {
    addSuffix?: boolean;
    locale?: typeof ko;
  }
): string {
  const date = safeParseDateString(dateString);

  if (!date) {
    return '날짜 없음';
  }

  try {
    return formatDistanceToNow(date, {
      addSuffix: true,
      locale: ko,
      ...options
    });
  } catch {
    return '날짜 형식 오류';
  }
}

/**
 * 안전한 format 함수
 */
export function safeFormat(
  dateString: string | null | undefined,
  formatString: string,
  options?: {
    locale?: typeof ko;
  }
): string {
  const date = safeParseDateString(dateString);

  if (!date) {
    return '날짜 없음';
  }

  try {
    return format(date, formatString, {
      locale: ko,
      ...options
    });
  } catch {
    return '날짜 형식 오류';
  }
}

/**
 * 안전한 날짜 정렬을 위한 타임스탬프 반환
 */
export function safeGetTime(dateString: string | null | undefined): number {
  const date = safeParseDateString(dateString);
  return date ? date.getTime() : 0;
}

/**
 * 날짜 문자열 유효성 검사
 */
export function isValidDateString(dateString: string | null | undefined): boolean {
  return safeParseDateString(dateString) !== null;
}

/**
 * 안전한 toLocaleDateString
 */
export function safeToLocaleDateString(
  dateString: string | null | undefined,
  locale?: string,
  options?: Intl.DateTimeFormatOptions
): string {
  const date = safeParseDateString(dateString);

  if (!date) {
    return '날짜 없음';
  }

  try {
    return date.toLocaleDateString(locale || 'ko-KR', options);
  } catch {
    return '날짜 형식 오류';
  }
}

/**
 * 안전한 toLocaleString
 */
export function safeToLocaleString(
  dateString: string | null | undefined,
  locale?: string,
  options?: Intl.DateTimeFormatOptions
): string {
  const date = safeParseDateString(dateString);

  if (!date) {
    return '날짜 없음';
  }

  try {
    return date.toLocaleString(locale || 'ko-KR', options);
  } catch {
    return '날짜 형식 오류';
  }
}