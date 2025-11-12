/**
 * Response Template Types
 * Used for canned replies in ticket system
 */

export enum TemplateCategory {
  TECHNICAL = 'technical',
  BILLING = 'billing',
  GENERAL = 'general',
  URGENT = 'urgent',
  ESCALATION = 'escalation',
  CLOSING = 'closing',
  ACKNOWLEDGMENT = 'acknowledgment',
}

export interface ResponseTemplate {
  id: string;
  title: string;
  content: string;
  category: TemplateCategory;
  is_default: boolean;
  usage_count: number;
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by?: string;
}

export interface TemplateListResponse {
  items: ResponseTemplate[];
  total: number;
  page: number;
  page_size: number;
  has_more: boolean;
}

export interface CreateTemplateRequest {
  title: string;
  content: string;
  category: TemplateCategory;
  is_default?: boolean;
}

export interface UpdateTemplateRequest {
  title?: string;
  content?: string;
  category?: TemplateCategory;
  is_default?: boolean;
}

export interface TemplateVariableReference {
  name: string;
  description: string;
  example: string;
  type: 'system' | 'custom';
}

export interface TemplatePreviewRequest {
  content: string;
  variables?: Record<string, string>;
}

export interface TemplatePreviewResponse {
  rendered_content: string;
  variables_used: string[];
  invalid_variables: string[];
}

export interface TemplateFilters {
  search?: string;
  category?: TemplateCategory;
  is_default?: boolean;
  page: number;
  page_size: number;
}

// Sample data for variable preview
export const SAMPLE_VARIABLES: Record<string, string> = {
  customer_name: 'John Doe',
  customer_email: 'john@example.com',
  ticket_id: 'TKT-12345',
  ticket_subject: 'Unable to login',
  ticket_status: 'open',
  ticket_priority: 'high',
  agent_name: 'Support Agent',
  agent_email: 'support@company.com',
  current_date: new Date().toLocaleDateString(),
  current_time: new Date().toLocaleTimeString(),
  company_name: 'CloudManager Inc.',
  support_email: 'support@cloudmanager.com',
  phone_number: '+1-800-SUPPORT',
  website_url: 'https://cloudmanager.com',
};

export const SYSTEM_VARIABLES: TemplateVariableReference[] = [
  {
    name: '{{customer_name}}',
    description: 'Customer full name',
    example: 'John Doe',
    type: 'system',
  },
  {
    name: '{{customer_email}}',
    description: 'Customer email address',
    example: 'john@example.com',
    type: 'system',
  },
  {
    name: '{{ticket_id}}',
    description: 'Support ticket ID',
    example: 'TKT-12345',
    type: 'system',
  },
  {
    name: '{{ticket_subject}}',
    description: 'Ticket subject line',
    example: 'Unable to login',
    type: 'system',
  },
  {
    name: '{{ticket_status}}',
    description: 'Current ticket status',
    example: 'open',
    type: 'system',
  },
  {
    name: '{{ticket_priority}}',
    description: 'Ticket priority level',
    example: 'high',
    type: 'system',
  },
  {
    name: '{{agent_name}}',
    description: 'Support agent name',
    example: 'Support Agent',
    type: 'system',
  },
  {
    name: '{{agent_email}}',
    description: 'Support agent email',
    example: 'support@company.com',
    type: 'system',
  },
  {
    name: '{{current_date}}',
    description: 'Today date',
    example: new Date().toLocaleDateString(),
    type: 'system',
  },
  {
    name: '{{current_time}}',
    description: 'Current time',
    example: new Date().toLocaleTimeString(),
    type: 'system',
  },
];

export const CUSTOM_VARIABLES: TemplateVariableReference[] = [
  {
    name: '{{company_name}}',
    description: 'Your company name',
    example: 'CloudManager Inc.',
    type: 'custom',
  },
  {
    name: '{{support_email}}',
    description: 'Support team email',
    example: 'support@company.com',
    type: 'custom',
  },
  {
    name: '{{phone_number}}',
    description: 'Support phone number',
    example: '+1-800-SUPPORT',
    type: 'custom',
  },
  {
    name: '{{website_url}}',
    description: 'Company website URL',
    example: 'https://company.com',
    type: 'custom',
  },
];

export const ALL_VARIABLES = [...SYSTEM_VARIABLES, ...CUSTOM_VARIABLES];
