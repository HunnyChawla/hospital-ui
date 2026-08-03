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
  tenant_id: string;
  line_items: QuoteLineItemRequest[];
  valid_until?: string; // YYYY-MM-DD
  tax_rate?: number; // GST percentage
  notes?: string;
  custom_terms?: string;
}

export interface UpdateQuoteRequest {
  line_items?: QuoteLineItemRequest[];
  valid_until?: string;
  tax_rate?: number;
  notes?: string;
  custom_terms?: string;
}

export interface Quote {
  id: string;
  quote_number: string;
  tenant_id: string;
  tenant_name: string;
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
  tenant_id: string;
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
  tenant_id: string;
  tenant_name: string;
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
  line_items: InvoiceLineItemResponse[];
}

export interface CreateReceiptRequest {
  platform_invoice_id: string;
  tenant_id: string;
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
