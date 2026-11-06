export type QuoteStatus = "draft" | "sent" | "accepted" | "rejected" | "expired";
export type PlatformInvoiceStatus = "draft" | "sent" | "paid" | "overdue" | "cancelled";
export type AgreementStatus = "draft" | "shared" | "signed";
export type PaymentMethod = "cash" | "bank_transfer" | "cheque" | "upi" | "online";

export interface QuoteLineItemRequest {
  description: string;
  quantity: number;
  unit_price: number;
  sort_order?: number;
}

export interface QuoteLineItemResponse {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  sort_order: number;
}

export interface CreateQuoteRequest {
  tenant_id?: string | null;
  hospital_name?: string;
  hospital_address?: string;
  hospital_email?: string;
  hospital_phone?: string;
  gst_number?: string;
  line_items: QuoteLineItemRequest[];
  valid_until?: string; // YYYY-MM-DD
  tax_rate?: number; // GST percentage
  notes?: string;
  custom_terms?: string;
}

export interface UpdateQuoteRequest {
  tenant_id?: string | null;
  hospital_name?: string;
  hospital_address?: string;
  hospital_email?: string;
  hospital_phone?: string;
  gst_number?: string;
  line_items?: QuoteLineItemRequest[];
  valid_until?: string;
  tax_rate?: number;
  notes?: string;
  custom_terms?: string;
}

export interface Quote {
  id: string;
  quote_number: string;
  tenant_id: string | null;
  tenant_name: string;
  hospital_name?: string | null;
  hospital_address?: string | null;
  hospital_email?: string | null;
  hospital_phone?: string | null;
  gst_number?: string | null;
  status: QuoteStatus;
  valid_until: string;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total_amount: number;
  notes: string | null;
  terms_and_conditions: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
  sent_to_email?: string | null;
  last_sent_at?: string | null;
  line_items: QuoteLineItemResponse[];
}

export interface InvoiceLineItemRequest {
  description: string;
  quantity: number;
  unit_price: number;
  sort_order?: number;
}

export interface InvoiceLineItemResponse {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  sort_order: number;
}

export interface CreatePlatformInvoiceRequest {
  tenant_id?: string | null;
  hospital_name?: string;
  hospital_address?: string;
  hospital_email?: string;
  hospital_phone?: string;
  quote_id?: string | null;
  line_items: InvoiceLineItemRequest[];
  invoice_date?: string;
  due_date: string;
  tax_rate?: number;
  gst_number?: string;
  notes?: string;
  custom_terms?: string;
}

export interface UpdatePlatformInvoiceRequest {
  hospital_name?: string;
  hospital_address?: string;
  hospital_email?: string;
  hospital_phone?: string;
  line_items?: InvoiceLineItemRequest[];
  due_date?: string;
  tax_rate?: number;
  gst_number?: string;
  notes?: string;
  custom_terms?: string;
}

export interface PlatformInvoice {
  id: string;
  invoice_number: string;
  tenant_id: string | null;
  tenant_name: string;
  hospital_name?: string | null;
  hospital_address?: string | null;
  hospital_email?: string | null;
  hospital_phone?: string | null;
  quote_id: string | null;
  status: PlatformInvoiceStatus;
  invoice_date: string;
  due_date: string;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total_amount: number;
  paid_amount: number;
  gst_number: string | null;
  notes: string | null;
  terms_and_conditions: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
  sent_to_email?: string | null;
  last_sent_at?: string | null;
  line_items: InvoiceLineItemResponse[];
}

export interface CreateReceiptRequest {
  platform_invoice_id: string;
  tenant_id?: string | null;
  amount: number;
  payment_method: PaymentMethod;
  payment_date?: string;
  transaction_reference?: string;
  notes?: string;
  custom_terms?: string;
}

export interface Receipt {
  id: string;
  receipt_number: string;
  platform_invoice_id: string;
  platform_invoice_number: string;
  tenant_id: string;
  tenant_name: string;
  amount: number;
  payment_method: PaymentMethod;
  payment_date: string;
  transaction_reference: string | null;
  notes: string | null;
  terms_and_conditions: string;
  created_at: string;
  created_by: string | null;
}

export interface AgreementClause {
  title: string;
  content: string;
  sort_order: number;
}

export interface CreateAgreementRequest {
  tenant_id: string;
  title: string;
  clauses: AgreementClause[];
  custom_terms?: string;
  notes?: string;
}

export interface UpdateAgreementRequest {
  title?: string;
  clauses?: AgreementClause[];
  custom_terms?: string;
  notes?: string;
}

export interface Agreement {
  id: string;
  agreement_number: string;
  tenant_id: string;
  tenant_name: string;
  title: string;
  status: AgreementStatus;
  clauses: AgreementClause[];
  terms_and_conditions: string;
  signed_document_path: string | null;
  signed_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

export interface PlatformEmailSettings {
  id: string;
  smtp_host: string | null;
  smtp_port: number;
  smtp_username: string | null;
  is_password_set: boolean;
  use_tls: boolean;
  use_ssl: boolean;
  from_email: string;
  from_name: string;
  reply_to: string | null;
  bcc_all: string | null;
  updated_at?: string | null;
  updated_by?: string | null;
}

export interface UpdatePlatformEmailSettingsRequest {
  smtp_host?: string;
  smtp_port?: number;
  smtp_username?: string;
  smtp_password?: string;
  use_tls?: boolean;
  use_ssl?: boolean;
  from_email?: string;
  from_name?: string;
  reply_to?: string;
  bcc_all?: string;
}

export interface TestEmailResponse {
  success: boolean;
  message: string;
}

export interface PlatformEmailTemplate {
  id: string;
  name: string;
  template_type: "quote" | "invoice" | "receipt" | "custom";
  subject: string;
  body_html: string;
  body_text?: string | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
  updated_by?: string | null;
}

export interface CreateEmailTemplateRequest {
  name: string;
  template_type: string;
  subject: string;
  body_html: string;
  body_text?: string;
  is_default?: boolean;
}

export interface UpdateEmailTemplateRequest {
  name?: string;
  template_type?: string;
  subject?: string;
  body_html?: string;
  body_text?: string;
  is_default?: boolean;
}

export interface SendBillingEmailRequest {
  recipient_email: string;
  cc_emails?: string[];
  subject?: string;
  template_id?: string;
  custom_message?: string;
  attach_pdf: boolean;
}

export interface EmailPreviewRequest {
  template_id?: string;
  custom_message?: string;
}

export interface EmailPreviewResponse {
  subject: string;
  html_content: string;
  text_content: string;
}
