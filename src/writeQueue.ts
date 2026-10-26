export type WriteOperation<T> = (generation: number) => Promise<T> | T;

type Waiter = {
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
};

type Job = {
  coalesceKey?: string;
  operation: WriteOperation<unknown>;
  waiters: Waiter[];
};

export class SerializedWriteQueue {
  private readonly jobs: Job[] = [];
  private running = false;
  private generation = 0;
  private idleWaiters: Array<() => void> = [];

  enqueue<T>(
    operation: WriteOperation<T>,
    options: { coalesceKey?: string } = {},
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const waiter: Waiter = {
        resolve: (value) => resolve(value as T),
        reject,
      };
      const pending = options.coalesceKey
        ? [...this.jobs].reverse().find((job) => job.coalesceKey === options.coalesceKey)
        : undefined;
      if (pending) {
        pending.operation = operation as WriteOperation<unknown>;
        pending.waiters.push(waiter);
      } else {
        this.jobs.push({
          coalesceKey: options.coalesceKey,
          operation: operation as WriteOperation<unknown>,
          waiters: [waiter],
        });
      }
      void this.drain();
    });
  }

  idle(): Promise<void> {
    if (!this.running && this.jobs.length === 0) {
      return Promise.resolve();
    }
    return new Promise((resolve) => this.idleWaiters.push(resolve));
  }

  private async drain(): Promise<void> {
    if (this.running) {
      return;
    }
    this.running = true;
    while (this.jobs.length > 0) {
      const job = this.jobs.shift()!;
      const generation = ++this.generation;
      try {
        const result = await job.operation(generation);
        for (const waiter of job.waiters) {
          waiter.resolve(result);
        }
      } catch (error) {
        for (const waiter of job.waiters) {
          waiter.reject(error);
        }
      }
    }
    this.running = false;
    const idleWaiters = this.idleWaiters;
    this.idleWaiters = [];
    for (const resolve of idleWaiters) {
      resolve();
    }
  }
}
