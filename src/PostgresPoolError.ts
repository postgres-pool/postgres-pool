export class PostgresPoolError extends Error {
  public code: string;

  public constructor(message: string, code: string) {
    super(message);

    this.name = 'PostgresPoolError';
    this.code = code;

    Object.setPrototypeOf(this, PostgresPoolError.prototype);
  }
}
