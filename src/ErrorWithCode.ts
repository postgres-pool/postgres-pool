export class ErrorWithCode extends Error {
  public code: string;

  public constructor(message: string, code: string) {
    super(message);

    this.code = code;
  }
}
