import { AppLanguage } from '../types/game';

export type ErrorCategory = 'auth' | 'sync' | 'chat' | 'friends' | 'network' | 'gameplay' | 'unknown';

export interface DeveloperErrorLog {
  id: string;
  timestampIso: string;
  category: ErrorCategory;
  operation: string;
  path: string | null;
  code: string;
  rawMessage: string;
  userId: string | null;
  retryable: boolean;
  userMessage: string;
  context?: Record<string, unknown>;
}

const MAX_DEV_LOGS = 100;
const DEDUPE_WINDOW_MS = 8000;

declare global {
  interface Window {
    __midanDevErrorLogs?: DeveloperErrorLog[];
  }
}

class GlobalErrorHandler {
  private devLogs: DeveloperErrorLog[] = [];
  private recentSurfaceTimestamps = new Map<string, number>();

  /**
   * Extracts normalized Firebase / JS error code and raw message for developer diagnostics.
   */
  public extractErrorMeta(error: unknown): { code: string; rawMessage: string; combined: string } {
    const rawMessage = error instanceof Error ? error.message : String(error || '');
    const code =
      typeof error === 'object' && error !== null && 'code' in error
        ? String((error as { code?: unknown }).code || '')
        : '';
    return {
      code,
      rawMessage,
      combined: `${code} ${rawMessage}`.toLowerCase(),
    };
  }

  /**
   * Detects whether an error is a transient network/connectivity or temporary service hiccup
   * that is safe to retry automatically.
   */
  public isRetryableError(error: unknown): boolean {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      return true;
    }
    const { combined } = this.extractErrorMeta(error);
    return (
      combined.includes('network-request-failed') ||
      combined.includes('client is offline') ||
      combined.includes('the client is offline') ||
      combined.includes('unavailable') ||
      combined.includes('deadline-exceeded') ||
      combined.includes('aborted') ||
      combined.includes('failed to fetch') ||
      combined.includes('networkerror') ||
      combined.includes('connection_timeout') ||
      combined.includes('err_internet_disconnected')
    );
  }

  /**
   * Translates any technical Auth/Firestore/Network/Runtime error into a clear, calm,
   * professional user-facing message with zero technical jargon.
   */
  public toUserMessage(
    error: unknown,
    lang: AppLanguage = 'ar',
    category: ErrorCategory = 'unknown'
  ): string {
    const { combined } = this.extractErrorMeta(error);

    if (combined.includes('auth/email-already-in-use')) {
      return lang === 'en'
        ? 'This email or phone number is already registered. Please switch to "Sign In" and enter your password.'
        : 'هذا البريد الإلكتروني أو رقم الجوال مسجّل لدينا بالفعل. يرجى الانتقال إلى «تسجيل الدخول» وإدخال كلمة المرور.';
    }

    if (
      combined.includes('auth/invalid-credential') ||
      combined.includes('auth/wrong-password') ||
      combined.includes('auth/user-not-found')
    ) {
      return lang === 'en'
        ? 'Incorrect login details or password. Please check your information and try again.'
        : 'بيانات الدخول أو كلمة المرور غير صحيحة. يرجى التأكد والمحاولة مجدداً.';
    }

    if (combined.includes('auth/weak-password')) {
      return lang === 'en'
        ? 'Please choose a stronger password with at least 6 characters.'
        : 'كلمة المرور قصيرة جداً؛ يرجى إدخال 6 أحرف أو أرقام على الأقل.';
    }

    if (combined.includes('auth/invalid-email')) {
      return lang === 'en'
        ? 'Please enter a valid email address.'
        : 'صيغة البريد الإلكتروني غير صحيحة، يرجى التحقق منها.';
    }

    if (combined.includes('auth/too-many-requests')) {
      return lang === 'en'
        ? 'Too many attempts. Please wait a short moment and try again.'
        : 'تم إجراء عدة محاولات متتالية. يرجى الانتظار قليلاً ثم المحاولة مجدداً.';
    }

    if (
      combined.includes('auth/operation-not-allowed') ||
      combined.includes('configuration-not-found')
    ) {
      return lang === 'en'
        ? 'Sign-in is temporarily unavailable right now. Please try again shortly.'
        : 'خدمة تسجيل الدخول غير متاحة مؤقتاً في الوقت الحالي. يرجى المحاولة بعد قليل.';
    }

    if (this.isRetryableError(error)) {
      return lang === 'en'
        ? 'Connection seems weak or interrupted. Please check your internet and try again.'
        : 'الاتصال بالإنترنت ضعيف أو متقطع حالياً. يرجى التحقق من الشبكة والمحاولة مجدداً.';
    }

    if (
      combined.includes('permission-denied') ||
      combined.includes('missing or insufficient permissions') ||
      combined.includes('unauthorized') ||
      combined.includes('unauthenticated')
    ) {
      if (category === 'chat') {
        return lang === 'en'
          ? 'Unable to deliver the message right now. Please try again in a moment.'
          : 'تعذر إرسال الرسالة في هذه اللحظة. يرجى المحاولة مرة أخرى بعد قليل.';
      }
      if (category === 'friends') {
        return lang === 'en'
          ? 'Could not complete the friend action right now. Please try again shortly.'
          : 'تعذر إتمام عملية الصداقة حالياً. يرجى المحاولة مرة أخرى بعد قليل.';
      }
      if (category === 'auth') {
        return lang === 'en'
          ? 'Could not complete sign-in. Please try again.'
          : 'تعذر إتمام تسجيل الدخول حالياً. يرجى المحاولة مجدداً.';
      }
      return lang === 'en'
        ? 'Your progress is being saved automatically. Please try again in a moment if needed.'
        : 'تعذر تحديث البيانات لحظياً، سيتم إعادة المحاولة تلقائياً للحفاظ على تقدمك.';
    }

    if (category === 'auth') {
      return lang === 'en'
        ? 'Unable to sign in right now. Please try again.'
        : 'تعذر تسجيل الدخول، يرجى المحاولة مجدداً.';
    }

    if (category === 'chat') {
      return lang === 'en'
        ? 'Could not send the message right now. Please try again.'
        : 'تعذر إرسال الرسالة حالياً، يرجى المحاولة مجدداً.';
    }

    if (category === 'friends') {
      return lang === 'en'
        ? 'Could not complete this request right now. Please try again.'
        : 'تعذر تنفيذ الطلب حالياً، يرجى المحاولة مجدداً.';
    }

    return lang === 'en'
      ? 'Something unexpected happened. Please try again in a moment.'
      : 'حدث خلل مؤقت غير متوقع، يرجى المحاولة مجدداً بعد قليل.';
  }

  /**
   * Prevents duplicate identical error alerts from spamming the user within the cooldown window.
   */
  public shouldSurfaceToUser(dedupeKey: string, cooldownMs = DEDUPE_WINDOW_MS): boolean {
    const now = Date.now();
    const lastSeen = this.recentSurfaceTimestamps.get(dedupeKey) || 0;
    if (now - lastSeen < cooldownMs) {
      return false;
    }
    this.recentSurfaceTimestamps.set(dedupeKey, now);
    if (this.recentSurfaceTimestamps.size > 100) {
      const cutoff = now - cooldownMs * 2;
      for (const [k, ts] of this.recentSurfaceTimestamps.entries()) {
        if (ts < cutoff) this.recentSurfaceTimestamps.delete(k);
      }
    }
    return true;
  }

  /**
   * Records full technical diagnostics for the developer (console + in-memory ring buffer)
   * and returns a sanitized, friendly user message.
   */
  public recordAndFormat(params: {
    error: unknown;
    category: ErrorCategory;
    operation: string;
    path?: string | null;
    userId?: string | null;
    lang?: AppLanguage;
    context?: Record<string, unknown>;
  }): { userMessage: string; retryable: boolean; shouldSurface: boolean; logEntry: DeveloperErrorLog } {
    const { code, rawMessage } = this.extractErrorMeta(params.error);
    const retryable = this.isRetryableError(params.error);
    const lang = params.lang || 'ar';
    const userMessage = this.toUserMessage(params.error, lang, params.category);

    const logEntry: DeveloperErrorLog = {
      id: `err_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      timestampIso: new Date().toISOString(),
      category: params.category,
      operation: params.operation,
      path: params.path ?? null,
      code: code || 'unknown',
      rawMessage,
      userId: params.userId ?? null,
      retryable,
      userMessage,
      context: params.context,
    };

    this.devLogs.unshift(logEntry);
    if (this.devLogs.length > MAX_DEV_LOGS) {
      this.devLogs.length = MAX_DEV_LOGS;
    }
    if (typeof window !== 'undefined') {
      window.__midanDevErrorLogs = this.devLogs;
    }

    // Always emit full technical diagnostics to the developer console (never hidden from dev logs)
    console.warn('[AppDiagnostics]', {
      category: logEntry.category,
      operation: logEntry.operation,
      path: logEntry.path,
      code: logEntry.code,
      rawMessage: logEntry.rawMessage,
      userId: logEntry.userId,
      retryable: logEntry.retryable,
      ...(logEntry.context ? { context: logEntry.context } : {}),
    });

    const dedupeKey = `${params.category}:${params.operation}:${logEntry.code}`;
    const shouldSurface = this.shouldSurfaceToUser(dedupeKey);

    // Forward structured diagnostics asynchronously to our backend logging endpoint
    // (throttled per error signature, fail-open so logging never impacts gameplay)
    if (shouldSurface || logEntry.code.toLowerCase().includes('permission')) {
      this.forwardToServerLogger(logEntry);
    }

    return { userMessage, retryable, shouldSurface, logEntry };
  }

  /**
   * Sends a sanitized diagnostic log entry to `POST /api/diagnostics/log` in the background.
   * Uses `keepalive: true` and swallows any transport errors so player UX is never disrupted.
   */
  private forwardToServerLogger(logEntry: DeveloperErrorLog): void {
    if (typeof window === 'undefined' || typeof fetch !== 'function') {
      return;
    }
    const maybeCap = (window as Window & { Capacitor?: { isNativePlatform?: () => boolean } })
      .Capacitor;
    if (maybeCap?.isNativePlatform?.()) {
      // Native Capacitor Android bundles static dist/ without a local Express /api server
      return;
    }
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      return;
    }

    const payload = {
      id: logEntry.id,
      timestampIso: logEntry.timestampIso,
      category: logEntry.category,
      operation: logEntry.operation,
      path: logEntry.path,
      code: logEntry.code,
      rawMessage: logEntry.rawMessage.slice(0, 600),
      userId: logEntry.userId,
      retryable: logEntry.retryable,
      context: logEntry.context,
    };

    try {
      void fetch('/api/diagnostics/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true,
      }).catch(() => {
        // Silently ignore transport failures to keep client UX unaffected
      });
    } catch {
      // Ignore any synchronous fetch/serialization issue
    }
  }

  /**
   * Returns a shallow copy of recent structured developer error logs for inspection.
   */
  public getDeveloperLogs(): DeveloperErrorLog[] {
    return [...this.devLogs];
  }

  /**
   * Executes an async operation with safe exponential backoff retries ONLY when the error
   * is transient/retryable (never retries permanent validation or auth errors).
   */
  public async withSafeRetry<T>(
    operation: () => Promise<T>,
    options?: { maxRetries?: number; baseDelayMs?: number }
  ): Promise<T> {
    const maxRetries = options?.maxRetries ?? 2;
    const baseDelayMs = options?.baseDelayMs ?? 600;
    let attempt = 0;

    while (true) {
      try {
        return await operation();
      } catch (err) {
        if (attempt >= maxRetries || !this.isRetryableError(err)) {
          throw err;
        }
        attempt += 1;
        const delayMs = baseDelayMs * Math.pow(2, attempt - 1);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }
}

export const globalErrorHandler = new GlobalErrorHandler();
