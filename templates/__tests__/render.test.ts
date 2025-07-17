import { EmailTemplateRenderer } from '../render';
import * as path from 'path';

describe('EmailTemplateRenderer', () => {
  let renderer: EmailTemplateRenderer;

  beforeEach(() => {
    renderer = new EmailTemplateRenderer(
      path.join(__dirname, '../emails/aws-cost-optimization.yaml')
    );
  });

  it('should render template with valid variables', () => {
    const email = renderer.render({
      sender_name: 'John Doe',
      sender_title: 'Cloud Architect',
      sender_department: 'IT Infrastructure'
    });

    expect(email).toContain('Subject: AWS Infrastructure Cost Optimization Summary');
    expect(email).toContain('Hi Brian');
    expect(email).toContain('$702 to $302');
    expect(email).toContain('John Doe');
  });

  it('should throw error for missing required variables', () => {
    expect(() => {
      renderer.render({
        sender_title: 'Cloud Architect'
      });
    }).toThrow('Required field sender_name is missing');
  });

  it('should validate email format', () => {
    expect(() => {
      renderer.render({
        sender_name: 'John Doe',
        recipient_email: 'invalid-email'
      });
    }).toThrow('Field recipient_email must be a valid email address');
  });

  it('should format lists correctly', () => {
    const email = renderer.render({
      sender_name: 'John Doe'
    });

    expect(email).toContain('  • Computing: $245 → $145');
    expect(email).toContain('  • No upfront costs');
  });
});
