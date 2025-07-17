import { test, expect } from '@playwright/test';
import {
  login,
  createTestPost,
  setupTestEnvironment,
  teardownTestEnvironment,
  TEST_USERS,
  waitForResponse,
  getLocalStorageItem,
  mockApiResponse,
} from './utils/test-utils';

test.describe('Security and Reliability E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await setupTestEnvironment(page);
  });

  test.afterEach(async ({ page }) => {
    await teardownTestEnvironment(page);
  });

  test('complete secret rotation flow', async ({ page, request }) => {
    // Login as admin
    await login(page, TEST_USERS.admin.username, TEST_USERS.admin.password);

    // Navigate to secret management
    await page.goto('/admin/secrets');
    
    // Mock successful rotation response
    await mockApiResponse(page, '**/api/admin/secrets/rotate', {
      success: true,
      message: 'Rotation successful'
    });
    
    // Initiate secret rotation
    await page.click('[data-testid="rotate-jwt-secret"]');
    
    // Verify rotation success
    await expect(page.locator('[data-testid="rotation-status"]'))
      .toContainText('Rotation successful');

    // Verify old sessions are still valid
    const oldToken = await getLocalStorageItem(page, 'token');
    const response = await request.get('/api/protected', {
      headers: { Authorization: `Bearer ${oldToken}` }
    });
    expect(response.ok()).toBeTruthy();

    // Verify new tokens are issued with new secret
    await page.reload();
    const newToken = await getLocalStorageItem(page, 'token');
    expect(newToken).not.toBe(oldToken);
  });

  test('backup and restore flow', async ({ page }) => {
    // Login as admin
    await login(page, TEST_USERS.admin.username, TEST_USERS.admin.password);

    // Create test data
    await createTestPost(page, 'Test post for backup');

    // Mock backup responses
    await mockApiResponse(page, '**/api/admin/backups/create', {
      success: true,
      message: 'Backup created successfully'
    });

    await mockApiResponse(page, '**/api/admin/backups/verify', {
      success: true,
      message: 'Verification successful'
    });

    await mockApiResponse(page, '**/api/admin/backups/restore', {
      success: true,
      message: 'Restoration successful'
    });

    // Navigate to backup management
    await page.goto('/admin/backups');
    
    // Initiate backup
    await page.click('[data-testid="create-backup"]');
    
    // Verify backup creation
    await expect(page.locator('[data-testid="backup-status"]'))
      .toContainText('Backup created successfully');

    // Verify backup integrity
    await page.click('[data-testid="verify-backup"]');
    await expect(page.locator('[data-testid="verification-status"]'))
      .toContainText('Verification successful');

    // Simulate system failure
    await teardownTestEnvironment(page);

    // Restore from backup
    await page.click('[data-testid="restore-backup"]');
    await expect(page.locator('[data-testid="restore-status"]'))
      .toContainText('Restoration successful');

    // Verify data integrity
    await page.goto('/posts');
    await expect(page.locator('[data-testid="post-content"]'))
      .toContainText('Test post for backup');
  });

  test('error tracking and correlation', async ({ page, context }) => {
    // Mock error tracking
    const errorLogs: any[] = [];
    await page.exposeFunction('logError', (error: any) => {
      errorLogs.push(error);
    });

    // Enable error monitoring
    await context.route('**/*', route => {
      if (route.request().url().includes('invalid-id')) {
        route.fulfill({
          status: 404,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Post not found' })
        });
      } else {
        route.continue();
      }
    });

    // Create test error scenario
    await page.goto('/posts/invalid-id');
    
    // Wait for error to be logged
    await page.waitForFunction(() => (window as any).errorLogs?.length > 0);
    
    // Verify error is tracked
    const logs = await page.evaluate(() => (window as any).errorLogs);
    expect(logs[0]).toMatchObject({
      correlationId: expect.any(String),
      path: '/posts/invalid-id'
    });

    // Mock error chain response
    await mockApiResponse(page, '**/api/admin/errors/**', {
      chain: [
        { id: 1, correlationId: logs[0].correlationId },
        { id: 2, parentErrorId: 1 }
      ],
      related: [
        { id: 3, similarTo: 1 },
        { id: 4, similarTo: 1 }
      ]
    });

    // Verify error correlation in API
    await page.goto(`/admin/errors/${logs[0].correlationId}`);
    
    await expect(page.locator('[data-testid="error-chain"]'))
      .toBeVisible();
    
    // Verify related errors are linked
    await expect(page.locator('[data-testid="related-errors"]'))
      .toHaveCount(2);
  });

  test('system recovery after failure', async ({ page }) => {
    // Login and create test data
    await login(page, TEST_USERS.user.username, TEST_USERS.user.password);

    // Create multiple posts
    for (let i = 0; i < 5; i++) {
      await createTestPost(page, `Test post ${i}`);
    }

    // Mock system health check
    await mockApiResponse(page, '**/api/health', {
      status: 'healthy',
      checks: {
        database: true,
        cache: true,
        storage: true
      }
    });

    // Simulate system crash
    await teardownTestEnvironment(page);

    // Verify automatic recovery
    await page.reload();
    
    // Check data persistence
    await page.goto('/posts');
    for (let i = 0; i < 5; i++) {
      await expect(page.locator(`[data-testid="post-${i}"]`))
        .toContainText(`Test post ${i}`);
    }

    // Verify system health
    await page.goto('/admin/health');
    await expect(page.locator('[data-testid="system-status"]'))
      .toContainText('Healthy');
  });

  test('security measures under load', async ({ page, context }) => {
    // Mock rate limiting response
    await mockApiResponse(page, '**/api/auth/login', (route) => {
      const requestCount = parseInt(route.request().headers()['x-request-count'] || '0');
      if (requestCount > 5) {
        route.fulfill({
          status: 429,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'Too many login attempts',
            retryAfter: 900 // 15 minutes
          })
        });
      } else {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            token: 'test-token',
            user: { id: 1, username: 'test' }
          })
        });
      }
    });

    // Create multiple browser contexts for concurrent users
    const contexts = await Promise.all(
      Array(5).fill(0).map(() => context.browser()?.newContext())
    );

    // Simulate concurrent login attempts
    await Promise.all(contexts.map(async (ctx, i) => {
      if (!ctx) return;
      const page = await ctx.newPage();
      await page.goto('/login');
      await page.fill('[data-testid="username"]', `user${i}`);
      await page.fill('[data-testid="password"]', 'password');
      await page.click('[data-testid="login-button"]');
    }));

    // Verify rate limiting
    const lastContext = await context.browser()?.newContext();
    if (lastContext) {
      const lastPage = await lastContext.newPage();
      await lastPage.goto('/login');
      await lastPage.fill('[data-testid="username"]', 'lastuser');
      await lastPage.fill('[data-testid="password"]', 'password');
      await lastPage.click('[data-testid="login-button"]');

      await expect(lastPage.locator('[data-testid="error-message"]'))
        .toContainText('Too many login attempts');

      // Clean up
      await lastContext.close();
    }

    // Clean up other contexts
    await Promise.all(contexts.map(ctx => ctx?.close()));
  });
});
