import { test as base, expect } from "@playwright/test";
/** Each browser test blocks and records non-loopback application traffic. */
export const test = base.extend<{ egressGuard: void }>({
  egressGuard: [
    async ({ context }, use) => {
      const external: string[] = [];
      await context.route("**/*", async (route) => {
        const url = new URL(route.request().url());
        if (
          url.protocol === "http:" &&
          url.hostname === "127.0.0.1" &&
          url.port === "3217"
        )
          await route.continue();
        else {
          external.push(url.origin);
          await route.abort();
        }
      });
      await use();
      expect(external, "Application must make zero external requests").toEqual(
        [],
      );
    },
    { auto: true },
  ],
});
export { expect };
