import { EmailNotAllowedError } from "./errors";

export function assertEmailAllowed(isAllowed: boolean): void {
  if (!isAllowed) {
    throw new EmailNotAllowedError();
  }
}
