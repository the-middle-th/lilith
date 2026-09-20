import type { ApiErrorCode } from "../shared/contracts.js";
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: ApiErrorCode,
  ) {
    super(code);
  }
}
export function invariant(
  condition: unknown,
  code: ApiErrorCode,
  status = 409,
): asserts condition {
  if (!condition) throw new ApiError(status, code);
}
