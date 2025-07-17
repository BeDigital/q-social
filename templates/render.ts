import * as fs from 'fs';
import * as yaml from 'js-yaml';
import * as Mustache from 'mustache';

interface TemplateVariables {
  sender_name: string;
  sender_title?: string;
  sender_department?: string;
  [key: string]: any;
}

interface EmailTemplate {
  template: {
    name: string;
    type: string;
    version: string;
    category: string;
    style: string;
  };
  metadata: {
    subject: string;
    sender: string;
    recipient: string;
  };
  content: {
    greeting: string;
    opening_paragraph: string;
    main_content: string;
    cost_breakdown: {
      title: string;
      items: string[];
    };
    benefits: {
      intro: string;
      items: string[];
    };
    call_to_action: string;
    closing: {
      salutation: string;
      signature: string;
    };
  };
  styling: {
    format: string;
    paragraphs: {
      spacing: string;
    };
    lists: {
      style: string;
      indent: number;
    };
  };
  validation: {
    rules: Array<{
      field: string;
      required: boolean;
      min_length?: number;
      format?: string;
    }>;
  };
}

export class EmailTemplateRenderer {
  private template: EmailTemplate;

  constructor(templatePath: string) {
    const templateContent = fs.readFileSync(templatePath, 'utf8');
    this.template = yaml.load(templateContent) as EmailTemplate;
  }

  private validateVariables(variables: TemplateVariables): void {
    for (const rule of this.template.validation.rules) {
      if (rule.required && !variables[rule.field]) {
        throw new Error(`Required field ${rule.field} is missing`);
      }
      if (rule.min_length && variables[rule.field]?.length < rule.min_length) {
        throw new Error(`Field ${rule.field} must be at least ${rule.min_length} characters long`);
      }
      if (rule.format === 'email' && !this.validateEmail(variables[rule.field])) {
        throw new Error(`Field ${rule.field} must be a valid email address`);
      }
    }
  }

  private validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private formatList(items: string[]): string {
    const indent = ' '.repeat(this.template.styling.lists.indent);
    return items.map(item => `${indent}• ${item}`).join('\n');
  }

  public render(variables: TemplateVariables): string {
    this.validateVariables(variables);

    const templateData = {
      ...this.template.metadata,
      ...this.template.content,
      cost_breakdown_items: this.formatList(this.template.content.cost_breakdown.items),
      benefits_items: this.formatList(this.template.content.benefits.items),
      ...variables,
    };

    const emailTemplate = `
Subject: ${this.template.metadata.subject}

${this.template.content.greeting}

${this.template.content.opening_paragraph}

${this.template.content.main_content}

${this.template.content.cost_breakdown.title}:
${templateData.cost_breakdown_items}

${this.template.content.benefits.intro}
${templateData.benefits_items}

${this.template.content.call_to_action}

${this.template.content.closing.salutation}
${Mustache.render(this.template.content.closing.signature, variables)}
`;

    return emailTemplate.trim();
  }
}

// Example usage:
/*
const renderer = new EmailTemplateRenderer('./emails/aws-cost-optimization.yaml');
const email = renderer.render({
  sender_name: 'John Doe',
  sender_title: 'Cloud Architect',
  sender_department: 'IT Infrastructure'
});
console.log(email);
*/
