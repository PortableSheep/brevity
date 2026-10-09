export class HttpError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    if (!Number.isInteger(status) || status < 400 || status > 599) {
      throw new RangeError("HTTP error status must be between 400 and 599");
    }
    this.name = "HttpError";
  }
}
