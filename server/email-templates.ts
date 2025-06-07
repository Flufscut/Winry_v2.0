/**
 * FILE: email-templates.ts
 * PURPOSE: Advanced email template system with dynamic generation and A/B testing
 * DEPENDENCIES: zod for validation, crypto for template IDs
 * LAST_UPDATED: June 7, 2025
 * 
 * REF: Provides dynamic email template generation and A/B testing capabilities
 * REF: Integrates with prospect research data for personalized templates
 * TODO: Add machine learning for template optimization
 * TODO: Add email deliverability analytics
 */

import { z } from 'zod';
import crypto from 'crypto';

// REF: Email template schema with A/B testing support
export const EmailTemplateSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Template name is required'),
  subject_template: z.string().min(1, 'Subject template is required'),
  body_template: z.string().min(1, 'Body template is required'),
  template_variables: z.array(z.string()).optional().default([]),
  template_type: z.enum(['cold_outreach', 'follow_up', 'warm_introduction', 'value_proposition']).default('cold_outreach'),
  industry_focus: z.array(z.string()).optional().default([]),
  persona_focus: z.array(z.string()).optional().default([]),
  is_active: z.boolean().default(true),
  a_b_test_group: z.enum(['A', 'B', 'control']).optional(),
  conversion_rate: z.number().min(0).max(100).optional(),
  open_rate: z.number().min(0).max(100).optional(),
  reply_rate: z.number().min(0).max(100).optional(),
  created_at: z.date().optional(),
  updated_at: z.date().optional(),
  user_id: z.number(),
  client_id: z.number().optional()
});

export type EmailTemplate = z.infer<typeof EmailTemplateSchema>;

// REF: Template variable replacement schema
export const TemplateVariableSchema = z.object({
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  company: z.string().optional(),
  title: z.string().optional(),
  industry: z.string().optional(),
  location: z.string().optional(),
  pain_points: z.string().optional(),
  business_goals: z.string().optional(),
  competitive_analysis: z.string().optional(),
  personalization: z.string().optional(),
  sender_name: z.string().optional(),
  sender_company: z.string().optional(),
  sender_title: z.string().optional()
});

export type TemplateVariables = z.infer<typeof TemplateVariableSchema>;

// REF: A/B test configuration schema
export const ABTestConfigSchema = z.object({
  test_name: z.string().min(1, 'Test name is required'),
  template_a_id: z.string(),
  template_b_id: z.string(),
  traffic_split: z.number().min(0).max(100).default(50),
  start_date: z.date(),
  end_date: z.date().optional(),
  is_active: z.boolean().default(true),
  significance_threshold: z.number().min(0).max(1).default(0.05),
  minimum_sample_size: z.number().min(1).default(100)
});

export type ABTestConfig = z.infer<typeof ABTestConfigSchema>;

/**
 * REF: Email template service class
 * PURPOSE: Manage email templates, A/B testing, and dynamic generation
 */
export class EmailTemplateService {
  private templates: Map<string, EmailTemplate> = new Map();
  private abTests: Map<string, ABTestConfig> = new Map();

  /**
   * REF: Generate template ID
   * PURPOSE: Create unique identifier for templates
   */
  private generateTemplateId(): string {
    return `template_${crypto.randomUUID().substring(0, 8)}`;
  }

  /**
   * REF: Create new email template
   * PURPOSE: Store template with validation and metadata
   */
  async createTemplate(templateData: Omit<EmailTemplate, 'id' | 'created_at' | 'updated_at'>): Promise<EmailTemplate> {
    const template: EmailTemplate = {
      ...templateData,
      id: this.generateTemplateId(),
      created_at: new Date(),
      updated_at: new Date()
    };

    // REF: Validate template data
    const validatedTemplate = EmailTemplateSchema.parse(template);
    
    // REF: Store template
    this.templates.set(validatedTemplate.id!, validatedTemplate);
    
    return validatedTemplate;
  }

  /**
   * REF: Get template by ID
   * PURPOSE: Retrieve specific template with error handling
   */
  async getTemplate(templateId: string): Promise<EmailTemplate | null> {
    return this.templates.get(templateId) || null;
  }

  /**
   * REF: Get templates by user and client
   * PURPOSE: Retrieve templates with multi-tenant filtering
   */
  async getTemplatesByUser(userId: number, clientId?: number): Promise<EmailTemplate[]> {
    const userTemplates = Array.from(this.templates.values()).filter(template => {
      const matchesUser = template.user_id === userId;
      const matchesClient = clientId ? template.client_id === clientId : true;
      return matchesUser && matchesClient;
    });

    return userTemplates;
  }

  /**
   * REF: Generate personalized email from template
   * PURPOSE: Replace template variables with prospect data
   */
  async generateEmail(templateId: string, variables: TemplateVariables): Promise<{
    subject: string;
    body: string;
    template_id: string;
    generated_at: Date;
  } | null> {
    const template = await this.getTemplate(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    // REF: Replace variables in subject
    let subject = template.subject_template;
    let body = template.body_template;

    // REF: Replace all available variables
    Object.entries(variables).forEach(([key, value]) => {
      if (value) {
        const placeholder = `{{${key}}}`;
        subject = subject.replace(new RegExp(placeholder, 'g'), value);
        body = body.replace(new RegExp(placeholder, 'g'), value);
      }
    });

    return {
      subject,
      body,
      template_id: templateId,
      generated_at: new Date()
    };
  }

  /**
   * REF: A/B testing template selection
   * PURPOSE: Randomly select template A or B based on traffic split
   */
  async selectTemplateForABTest(testName: string): Promise<string | null> {
    const abTest = this.abTests.get(testName);
    if (!abTest || !abTest.is_active) {
      return null;
    }

    // REF: Check if test is within date range
    const now = new Date();
    if (now < abTest.start_date || (abTest.end_date && now > abTest.end_date)) {
      return null;
    }

    // REF: Random selection based on traffic split
    const random = Math.random() * 100;
    return random < abTest.traffic_split ? abTest.template_a_id : abTest.template_b_id;
  }

  /**
   * REF: Get default templates for different use cases
   * PURPOSE: Provide built-in templates for common scenarios
   */
  getDefaultTemplates(): Omit<EmailTemplate, 'id' | 'created_at' | 'updated_at' | 'user_id'>[] {
    return [
      {
        name: 'AI-Powered Cold Outreach',
        subject_template: 'Quick question about {{company}}\'s {{pain_points}}',
        body_template: `Hi {{first_name}},

I noticed {{company}} is {{business_goals}}. Many companies in {{industry}} are facing similar challenges with {{pain_points}}.

{{personalization}}

I'd love to share how we've helped similar companies achieve their goals. Would you be open to a brief 15-minute conversation this week?

Best regards,
{{sender_name}}
{{sender_title}} at {{sender_company}}`,
        template_variables: ['first_name', 'company', 'pain_points', 'business_goals', 'industry', 'personalization', 'sender_name', 'sender_title', 'sender_company'],
        template_type: 'cold_outreach' as const,
        is_active: true
      },
      {
        name: 'Value Proposition Follow-up',
        subject_template: 'Following up on {{company}}\'s growth initiatives',
        body_template: `Hi {{first_name}},

I wanted to follow up on my previous message about {{company}}'s {{business_goals}}.

Based on my research, {{competitive_analysis}}

This presents a unique opportunity for {{company}} to leverage our solution for {{pain_points}}.

Would you be interested in a quick call to discuss how we can help?

Best,
{{sender_name}}`,
        template_variables: ['first_name', 'company', 'business_goals', 'competitive_analysis', 'pain_points', 'sender_name'],
        template_type: 'follow_up' as const,
        is_active: true
      },
      {
        name: 'Industry-Specific Warm Introduction',
        subject_template: 'Helping {{industry}} companies like {{company}}',
        body_template: `Hi {{first_name}},

I hope this message finds you well. I specialize in helping {{industry}} companies overcome challenges with {{pain_points}}.

{{personalization}}

I'd love to share some insights that could be valuable for {{company}}'s {{business_goals}}.

Are you available for a brief conversation next week?

Warm regards,
{{sender_name}}
{{sender_title}} at {{sender_company}}`,
        template_variables: ['first_name', 'industry', 'company', 'pain_points', 'personalization', 'business_goals', 'sender_name', 'sender_title', 'sender_company'],
        template_type: 'warm_introduction' as const,
        is_active: true
      }
    ];
  }

  /**
   * REF: Analytics for template performance
   * PURPOSE: Calculate template performance metrics
   */
  async getTemplateAnalytics(templateId: string): Promise<{
    template_id: string;
    total_sent: number;
    open_rate: number;
    reply_rate: number;
    conversion_rate: number;
    last_updated: Date;
  } | null> {
    const template = await this.getTemplate(templateId);
    if (!template) {
      return null;
    }

    // REF: In production, this would query actual email metrics
    return {
      template_id: templateId,
      total_sent: 0, // TODO: Query from email sending logs
      open_rate: template.open_rate || 0,
      reply_rate: template.reply_rate || 0,
      conversion_rate: template.conversion_rate || 0,
      last_updated: new Date()
    };
  }

  /**
   * REF: Create A/B test configuration
   * PURPOSE: Set up A/B testing between two templates
   */
  async createABTest(testConfig: Omit<ABTestConfig, 'is_active'>): Promise<ABTestConfig> {
    const abTest: ABTestConfig = {
      ...testConfig,
      is_active: true
    };

    // REF: Validate A/B test configuration
    const validatedTest = ABTestConfigSchema.parse(abTest);
    
    // REF: Store A/B test
    this.abTests.set(validatedTest.test_name, validatedTest);
    
    return validatedTest;
  }

  /**
   * REF: Get A/B test results
   * PURPOSE: Calculate statistical significance of A/B tests
   */
  async getABTestResults(testName: string): Promise<{
    test_name: string;
    template_a_metrics: any;
    template_b_metrics: any;
    statistical_significance: boolean;
    confidence_level: number;
    winner?: 'A' | 'B' | 'inconclusive';
  } | null> {
    const abTest = this.abTests.get(testName);
    if (!abTest) {
      return null;
    }

    // REF: Get metrics for both templates
    const templateAMetrics = await this.getTemplateAnalytics(abTest.template_a_id);
    const templateBMetrics = await this.getTemplateAnalytics(abTest.template_b_id);

    // REF: Simplified statistical significance calculation
    // TODO: Implement proper statistical analysis
    const isSignificant = false; // Placeholder
    const confidenceLevel = 0; // Placeholder

    return {
      test_name: testName,
      template_a_metrics: templateAMetrics,
      template_b_metrics: templateBMetrics,
      statistical_significance: isSignificant,
      confidence_level: confidenceLevel,
      winner: 'inconclusive'
    };
  }
}

// REF: Global email template service instance
export const emailTemplateService = new EmailTemplateService(); 