/**
 * Batch Processor - Processa arrays em lotes para otimizar performance
 */

export interface BatchResult<T, I = T> {
  successful: T[];
  failed: Array<{ item: I; error: any }>;
  total: number;
  successCount: number;
  failureCount: number;
}

export interface BatchOptions {
  batchSize: number;
  parallel?: boolean;
  maxParallel?: number;
  retryAttempts?: number;
  retryDelay?: number;
}

/**
 * Processa um array em lotes
 */
export async function processBatch<T, R>(
  items: T[],
  processor: (batch: T[]) => Promise<R[]>,
  options: BatchOptions
): Promise<BatchResult<R, T>> {
  const {
    batchSize,
    parallel = false,
    maxParallel = 5,
    retryAttempts = 3,
    retryDelay = 1000,
  } = options;

  const successful: R[] = [];
  const failed: Array<{ item: T; error: any }> = [];
  const batches: T[][] = [];

  // Dividir em lotes
  for (let i = 0; i < items.length; i += batchSize) {
    batches.push(items.slice(i, i + batchSize));
  }

  // Processar lotes
  if (parallel) {
    // Processamento paralelo com limite
    for (let i = 0; i < batches.length; i += maxParallel) {
      const parallelBatches = batches.slice(i, i + maxParallel);
      const results = await Promise.allSettled(
        parallelBatches.map((batch) => processWithRetry(batch, processor, retryAttempts, retryDelay))
      );

      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          successful.push(...result.value);
        } else {
          const batch = parallelBatches[index];
          batch.forEach((item) => {
            failed.push({ item, error: result.reason });
          });
        }
      });
    }
  } else {
    // Processamento sequencial
    for (const batch of batches) {
      try {
        const result = await processWithRetry(batch, processor, retryAttempts, retryDelay);
        successful.push(...result);
      } catch (error) {
        batch.forEach((item) => {
          failed.push({ item, error });
        });
      }
    }
  }

  return {
    successful,
    failed,
    total: items.length,
    successCount: successful.length,
    failureCount: failed.length,
  };
}

/**
 * Processa com retry e backoff exponencial
 */
async function processWithRetry<T, R>(
  batch: T[],
  processor: (batch: T[]) => Promise<R[]>,
  retryAttempts: number,
  retryDelay: number
): Promise<R[]> {
  let lastError: any;

  for (let attempt = 0; attempt <= retryAttempts; attempt++) {
    try {
      return await processor(batch);
    } catch (error) {
      lastError = error;

      if (attempt < retryAttempts) {
        // Backoff exponencial: 1s, 2s, 4s
        const delay = retryDelay * Math.pow(2, attempt);
        await sleep(delay);
      }
    }
  }

  throw lastError;
}

/**
 * Sleep helper
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Processa itens individualmente com controle de falhas
 */
export async function processIndividually<T, R>(
  items: T[],
  processor: (item: T) => Promise<R>,
  options: { continueOnError?: boolean; retryAttempts?: number } = {}
): Promise<BatchResult<R, T>> {
  const { continueOnError = true, retryAttempts = 3 } = options;
  const successful: R[] = [];
  const failed: Array<{ item: T; error: any }> = [];

  for (const item of items) {
    try {
      const result = await processWithRetry(
        [item],
        async (batch) => {
          const processed = await processor(batch[0]);
          return [processed];
        },
        retryAttempts,
        1000
      );
      successful.push(...result);
    } catch (error) {
      failed.push({ item, error });

      if (!continueOnError) {
        throw error;
      }
    }
  }

  return {
    successful,
    failed,
    total: items.length,
    successCount: successful.length,
    failureCount: failed.length,
  };
}
