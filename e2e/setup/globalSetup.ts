import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  const { baseURL } = config.projects[0].use;
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  try {
    // Set up test data
    await page.goto(baseURL + '/api/test/setup');
    
    // Create test admin user
    await page.goto(baseURL + '/api/test/create-admin');
    
    // Create test regular user
    await page.goto(baseURL + '/api/test/create-user');
    
  } catch (error) {
    console.error('Failed to set up test environment:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

export default globalSetup;
