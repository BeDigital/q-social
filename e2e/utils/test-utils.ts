import { Page } from '@playwright/test';

export async function login(page: Page, username: string, password: string) {
  await page.goto('/login');
  await page.fill('[data-testid="username"]', username);
  await page.fill('[data-testid="password"]', password);
  await page.click('[data-testid="login-button"]');
  await page.waitForURL('/**/');
}

export async function createTestPost(page: Page, content: string) {
  await page.goto('/posts/new');
  await page.fill('[data-testid="post-content"]', content);
  await page.click('[data-testid="submit-post"]');
  await page.waitForSelector('[data-testid="post-success"]');
}

export async function clearTestData(page: Page) {
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
    indexedDB.deleteDatabase('app-db');
  });
}

export async function waitForResponse(page: Page, urlPattern: RegExp | string) {
  return page.waitForResponse(urlPattern);
}

export async function interceptRequests(page: Page, urlPattern: RegExp | string, handler: (route: any) => void) {
  await page.route(urlPattern, handler);
}

export async function mockApiResponse(page: Page, urlPattern: RegExp | string, response: any) {
  await page.route(urlPattern, (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(response),
    });
  });
}

export async function waitForNetworkIdle(page: Page) {
  await page.waitForLoadState('networkidle');
}

export async function getLocalStorageItem(page: Page, key: string) {
  return page.evaluate((k) => localStorage.getItem(k), key);
}

export async function setLocalStorageItem(page: Page, key: string, value: string) {
  await page.evaluate(
    ([k, v]) => localStorage.setItem(k, v),
    [key, value]
  );
}

export async function mockWebSocket(page: Page) {
  await page.addInitScript(() => {
    window.WebSocket = class MockWebSocket {
      constructor(url: string) {
        setTimeout(() => {
          if (this.onopen) this.onopen({} as Event);
        }, 100);
      }
      send() {}
      close() {}
      onmessage?: (event: MessageEvent) => void;
      onclose?: (event: CloseEvent) => void;
      onopen?: (event: Event) => void;
    };
  });
}

export async function setupTestEnvironment(page: Page) {
  await clearTestData(page);
  await mockWebSocket(page);
}

export async function teardownTestEnvironment(page: Page) {
  await clearTestData(page);
}

export const TEST_USERS = {
  admin: {
    username: 'admin',
    password: 'admin-password',
  },
  user: {
    username: 'testuser',
    password: 'password',
  },
};

export const TEST_DATA = {
  posts: [
    { content: 'Test post 1' },
    { content: 'Test post 2' },
    { content: 'Test post 3' },
  ],
  comments: [
    { content: 'Test comment 1' },
    { content: 'Test comment 2' },
  ],
};
