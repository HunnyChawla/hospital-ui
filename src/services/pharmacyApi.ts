import { apiClient } from "./api";

// --- Pagination & Base Types ---
export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

// --- Dashboard ---
export interface PharmacyDashboardStats {
  total_medicines: number;
  low_stock_medicines: number;
  out_of_stock_medicines: number;
  near_expiry_batches: number;
  expired_batches: number;
  pending_prescriptions_count: number;
  today_dispensed_prescriptions: number;
  today_sales_amount: number;
  total_stock_value: number;
  recent_low_stock: Array<{
    id: string;
    name: string;
    brand_name?: string;
    current_stock: number;
    reorder_level: number;
    primary_dispensing_unit: string;
  }>;
  recent_near_expiry: Array<{
    id: string;
    medicine_name: string;
    batch_number: string;
    expiry_date: string;
    days_to_expiry: number;
    qty_available: number;
    mrp: number;
  }>;
}

// --- Medicine Master ---
export interface PharmacyMedicine {
  id: string;
  tenant_id: string;
  name: string;
  brand_name?: string;
  generic_name?: string;
  salt_composition?: string;
  category?: string;
  dosage_form?: string;
  strength?: string;
  manufacturer?: string;
  hsn_code?: string;
  schedule?: string;
  primary_dispensing_unit: string;
  purchase_unit: string;
  unit_conversion: number;
  reorder_level: number;
  max_stock_level?: number;
  barcode?: string;
  tax_rate: number;
  is_active: boolean;
  default_side_effects?: string | null;
  side_effects?: string | null;
  current_stock: number;
  created_at: string;
  updated_at: string;
}

export interface CreatePharmacyMedicineData {
  name: string;
  brand_name?: string;
  generic_name?: string;
  salt_composition?: string;
  category?: string;
  dosage_form?: string;
  strength?: string;
  manufacturer?: string;
  hsn_code?: string;
  schedule?: string;
  primary_dispensing_unit?: string;
  purchase_unit?: string;
  unit_conversion?: number;
  reorder_level?: number;
  max_stock_level?: number;
  barcode?: string;
  tax_rate?: number;
  default_side_effects?: string;
  side_effects?: string;
}

export interface UpdatePharmacyMedicineData {
  name?: string;
  brand_name?: string;
  generic_name?: string;
  salt_composition?: string;
  category?: string;
  dosage_form?: string;
  strength?: string;
  manufacturer?: string;
  hsn_code?: string;
  schedule?: string;
  primary_dispensing_unit?: string;
  purchase_unit?: string;
  unit_conversion?: number;
  reorder_level?: number;
  max_stock_level?: number;
  barcode?: string;
  tax_rate?: number;
  default_side_effects?: string;
  side_effects?: string;
  is_active?: boolean;
}

// --- Suppliers ---
export interface PharmacySupplier {
  id: string;
  tenant_id: string;
  supplier_name: string;
  supplier_code: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  gstin?: string;
  drug_licence_no?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  payment_terms_days: number;
  opening_balance: number;
  current_balance: number;
  is_active: boolean;
  total_orders_count?: number;
  created_at: string;
  updated_at: string;
}

export interface CreateSupplierData {
  supplier_name: string;
  supplier_code: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  gstin?: string;
  drug_licence_no?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  payment_terms_days?: number;
  opening_balance?: number;
}

export interface UpdateSupplierData {
  supplier_name?: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  gstin?: string;
  drug_licence_no?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  payment_terms_days?: number;
  is_active?: boolean;
}

// --- Purchase Orders ---
export type POStatus = "draft" | "submitted" | "approved" | "partially_received" | "completed" | "cancelled";

export interface PurchaseOrderItem {
  id?: string;
  medicine_id: string;
  medicine_name?: string;
  quantity: number;
  purchase_unit?: string;
  unit_price: number;
  discount: number;
  tax_rate: number;
  tax_amount?: number;
  total_amount?: number;
  received_quantity?: number;
}

export interface PurchaseOrder {
  id: string;
  po_number: string;
  tenant_id: string;
  supplier_id: string;
  supplier_name?: string;
  order_date: string;
  expected_delivery_date?: string;
  status: POStatus;
  subtotal: number;
  discount_total: number;
  tax_total: number;
  grand_total: number;
  notes?: string;
  created_by?: string;
  approved_by?: string;
  approved_at?: string;
  created_at: string;
  updated_at: string;
  items: PurchaseOrderItem[];
}

export interface CreatePurchaseOrderData {
  supplier_id: string;
  order_date?: string;
  expected_date?: string;
  expected_delivery_date?: string;
  notes?: string;
  items: {
    medicine_id: string;
    ordered_qty?: number;
    quantity?: number;
    purchase_unit?: string;
    unit_price: number;
    discount?: number;
    tax_rate?: number;
  }[];
}

// --- GRN (Goods Receipt Note) ---
export type GRNStatus = "draft" | "confirmed" | "cancelled";

export interface GoodsReceiptItem {
  id?: string;
  medicine_id: string;
  medicine_name?: string;
  po_item_id?: string;
  batch_number: string;
  mfg_date?: string;
  expiry_date: string;
  received_qty: number;
  free_qty: number;
  purchase_unit?: string;
  unit_conversion?: number;
  purchase_rate: number;
  mrp: number;
  selling_price?: number;
  discount: number;
  tax_rate: number;
  tax_amount: number;
  total_amount: number;
}

export interface GoodsReceiptNote {
  id: string;
  grn_number: string;
  tenant_id: string;
  supplier_id: string;
  supplier_name?: string;
  purchase_order_id?: string;
  po_number?: string;
  received_date: string;
  supplier_invoice_no?: string;
  supplier_invoice_date?: string;
  status: GRNStatus;
  subtotal: number;
  discount_total: number;
  tax_total: number;
  grand_total: number;
  notes?: string;
  confirmed_at?: string;
  created_at: string;
  items: GoodsReceiptItem[];
}

export interface CreateGRNData {
  supplier_id: string;
  purchase_order_id?: string;
  received_date?: string;
  supplier_invoice_no?: string;
  supplier_invoice_date?: string;
  notes?: string;
  items: {
    medicine_id: string;
    po_item_id?: string;
    batch_number: string;
    mfg_date?: string;
    expiry_date: string;
    received_qty: number;
    free_qty?: number;
    purchase_unit?: string;
    unit_conversion?: number;
    purchase_rate: number;
    mrp: number;
    selling_price?: number;
    discount?: number;
    tax_rate?: number;
  }[];
}

// --- Batch & Inventory ---
export interface MedicineBatch {
  id: string;
  tenant_id: string;
  medicine_id: string;
  medicine_name?: string;
  generic_name?: string;
  category?: string;
  dosage_form?: string;
  batch_number: string;
  mfg_date?: string;
  expiry_date: string;
  purchase_rate: number;
  mrp: number;
  selling_price: number;
  qty_received: number;
  qty_available: number;
  qty_dispensed: number;
  qty_returned: number;
  is_blocked: boolean;
  block_reason?: string;
  days_to_expiry: number;
  is_expired: boolean;
  is_near_expiry: boolean;
  created_at: string;
}

export interface FEFOBatchSuggestion {
  medicine_id: string;
  medicine_name: string;
  suggested_batches: MedicineBatch[];
}

export interface StockLedgerEntry {
  id: string;
  medicine_id: string;
  medicine_name?: string;
  batch_id?: string;
  batch_number?: string;
  txn_type: string;
  txn_ref_id?: string;
  txn_ref_type?: string;
  quantity_in: number;
  quantity_out: number;
  balance_after: number;
  unit_cost: number;
  notes?: string;
  created_at: string;
  created_by?: string;
}

export interface InventoryAlerts {
  near_expiry_threshold_days: number;
  low_stock: Array<{
    id: string;
    name: string;
    current_stock: number;
    reorder_level: number;
    primary_dispensing_unit: string;
  }>;
  near_expiry: Array<{
    id: string;
    medicine_name: string;
    batch_number: string;
    expiry_date: string;
    days_to_expiry: number;
    qty_available: number;
    mrp: number;
  }>;
  expired: Array<{
    id: string;
    medicine_name: string;
    batch_number: string;
    expiry_date: string;
    qty_available: number;
    mrp: number;
  }>;
}

// --- Dispensing & Prescription Queue ---
export type PrescriptionSource = "general" | "optometry" | "ipd";

export interface DispensingDoctorOption {
  doctor_id: string;
  doctor_name: string;
  specialization?: string | null;
}

export interface PrescriptionQueueItem {
  prescription_id: string;
  prescription_number: string;
  prescription_date: string;
  source?: PrescriptionSource;
  doctor_id?: string | null;
  doctor_name?: string;
  patient_id: string;
  patient_name: string;
  patient_uhid: string;
  patient_mobile?: string;
  visit_id?: string;
  admission_id?: string;
  admission_number?: string | null;
  ward_bed?: string | null;
  encounter_type: "OPD" | "IPD";
  pharmacy_status: "pending" | "partially_dispensed" | "dispensed" | "cancelled";
  diagnosis?: string;
  items_count: number;
}

export interface PrescriptionDispenseMedicineItem {
  prescription_item_id: string;
  medicine_id: string | null;
  medicine_name: string;
  generic_name?: string;
  dosage?: string;
  frequency?: string;
  duration?: string;
  instructions?: string;
  prescribed_quantity_text?: string | null;
  form?: string | null;
  strength?: string | null;
  route?: string | null;
  timing?: string | null;
  is_prn?: boolean;
  prn_reason?: string | null;
  tapering_steps?: any;
  special_instructions?: string | null;
  applicable_eye?: string | null;
  tax_rate: number;
  dispensing_unit?: string | null;
  schedule?: string | null;
  dispense_status?: string;
  substituted_medicine_id?: string | null;
  substituted_medicine_name?: string | null;
  external_reason?: string | null;
  prescribed_quantity: number;
  dispensed_quantity: number;
  remaining_quantity: number;
  available_stock?: number;
  total_available_stock: number;
  available_batches: MedicineBatch[];
  fefo_batch?: MedicineBatch;
}

export interface PrescriptionDispenseDetail {
  prescription_id: string;
  prescription_number: string;
  prescription_date: string;
  source?: PrescriptionSource;
  doctor_id?: string | null;
  doctor_name?: string;
  patient_id: string;
  patient_name: string;
  patient_uhid: string;
  patient_phone?: string;
  patient_age?: number;
  patient_gender?: string;
  encounter_type: "OPD" | "IPD";
  visit_id?: string;
  admission_id?: string;
  admission_number?: string | null;
  ward_bed?: string | null;
  pharmacy_status: string;
  diagnosis?: string;
  notes?: string;
  medicines: PrescriptionDispenseMedicineItem[];
  past_dispensings: DispensingResponse[];
}

export interface ResolvePrescriptionItemData {
  source?: PrescriptionSource;
  action: "substitute" | "external" | "skipped" | "reset";
  substituted_medicine_id?: string;
  reason?: string;
}

export interface DispensingResponseItem {
  id: string;
  dispensing_id: string;
  prescription_item_id?: string;
  medicine_id: string;
  medicine_name: string;
  batch_id: string;
  batch_number: string;
  quantity: number;
  unit_price: number;
  discount: number;
  tax_rate: number;
  tax_amount: number;
  total_amount: number;
  batch_override_reason?: string;
}

export interface DispensingResponse {
  id: string;
  tenant_id: string;
  prescription_id: string;
  prescription_source?: string;
  patient_id: string;
  patient_name?: string;
  admission_id?: string;
  visit_id?: string;
  status: string;
  dispensed_at: string;
  dispensed_by: string;
  notes?: string;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  invoice_id?: string;
  invoice_number?: string;
  ipd_charge_id?: string;
  items: DispensingResponseItem[];
  created_at: string;
}

export interface ConfirmDispensingData {
  prescription_id: string;
  prescription_source?: PrescriptionSource;
  patient_id: string;
  visit_id?: string;
  admission_id?: string;
  notes?: string;
  idempotency_key?: string;
  items: {
    prescription_item_id?: string;
    medicine_id: string;
    batch_id: string;
    quantity: number;
    unit_price?: number;
    discount?: number;
    tax_rate?: number;
    batch_override_reason?: string;
  }[];
}

// --- Invoices ---
export interface PharmacyInvoiceItem {
  id: string;
  invoice_id: string;
  medicine_id: string;
  medicine_name: string;
  batch_id: string;
  batch_number: string;
  quantity: number;
  unit_price: number;
  discount: number;
  tax_rate: number;
  tax_amount: number;
  total_amount: number;
}

export interface PharmacyInvoice {
  id: string;
  invoice_number: string;
  tenant_id: string;
  dispensing_id: string;
  patient_id: string;
  patient_name?: string;
  patient_uhid?: string;
  patient_phone?: string;
  visit_id?: string;
  prescription_id?: string;
  invoice_date: string;
  subtotal: number;
  discount: number;
  tax_amount: number;
  discount_total?: number;
  tax_total?: number;
  total_amount: number;
  paid_amount: number;
  status: "pending" | "partial" | "paid" | "cancelled" | "refunded";
  payment_method?: string | null;
  payment_reference?: string | null;
  paid_at?: string | null;
  notes?: string;
  created_at: string;
  items: PharmacyInvoiceItem[];
}

export interface CollectPharmacyPaymentData {
  amount: number;
  payment_method: string;
  payment_reference?: string;
  notes?: string;
}

// --- Patient Returns ---
export interface ReturnItemDetail {
  id: string;
  return_id: string;
  dispensing_item_id: string;
  medicine_id: string;
  medicine_name: string;
  batch_id: string;
  batch_number: string;
  return_qty: number;
  refund_unit_price: number;
  refund_amount: number;
  condition: "saleable" | "damaged" | "expired";
  restock_eligible: boolean;
}

export interface MedicineReturn {
  id: string;
  return_number: string;
  tenant_id: string;
  dispensing_id: string;
  patient_id: string;
  patient_name?: string;
  patient_uhid?: string;
  invoice_id?: string;
  invoice_number?: string;
  return_date: string;
  return_reason: string;
  status: "pending" | "approved" | "rejected";
  total_refund: number;
  processed_by?: string;
  created_at: string;
  items: ReturnItemDetail[];
}

export interface CreateReturnData {
  dispensing_id: string;
  return_reason: string;
  items: {
    dispensing_item_id: string;
    return_qty: number;
    condition: "saleable" | "damaged" | "expired";
    restock_eligible: boolean;
  }[];
}

// --- Reports ---
export interface StockValuationItem {
  medicine_id: string;
  name?: string;
  medicine_name?: string;
  brand_name?: string;
  generic_name?: string;
  category?: string;
  dosage_form?: string;
  dispensing_unit?: string;
  primary_dispensing_unit?: string;
  current_stock?: number;
  total_stock?: number;
  reorder_level?: number | null;
  average_purchase_rate?: number;
  total_stock_value?: number;
  stock_value_purchase?: number;
  active_batches_count?: number;
  batches_count?: number;
  is_low_stock?: boolean;
}

export interface BatchStockReportItem {
  batch_id: string;
  batch_number: string;
  medicine_name: string;
  generic_name?: string;
  category?: string;
  mfg_date?: string;
  expiry_date: string;
  days_to_expiry: number;
  qty_available: number;
  purchase_rate: number;
  mrp: number;
  stock_value?: number;
  total_purchase_value?: number;
  total_mrp_value?: number;
  status: string;
}

export interface PurchaseReportItem {
  grn_number: string;
  receipt_date?: string;
  received_date?: string;
  supplier_name: string;
  supplier_invoice_no?: string;
  invoice_number?: string;
  medicine_name: string;
  batch_number: string;
  expiry_date?: string;
  received_qty: number;
  free_qty?: number;
  purchase_rate: number;
  tax_rate: number;
  tax_amount?: number;
  total_amount: number;
}

export interface SalesReportItem {
  dispensing_id: string;
  dispensed_at: string;
  prescription_number?: string;
  patient_name: string;
  patient_uhid: string;
  encounter_type: string;
  medicine_name: string;
  batch_number: string;
  quantity: number;
  unit_price: number;
  discount: number;
  tax_amount: number;
  total_amount: number;
  invoice_number?: string;
}

// --- API Service Implementation ---
export const pharmacyApi = {
  // --- Dashboard ---
  getDashboardStats: async (): Promise<PharmacyDashboardStats> => {
    const res = await apiClient.get<any>("/pharmacy/dashboard/stats");
    const d = res.data || {};
    return {
      total_medicines: d.total_active_medicines ?? d.total_medicines ?? 0,
      low_stock_medicines: d.low_stock_medicines_count ?? d.low_stock_medicines ?? 0,
      out_of_stock_medicines: d.out_of_stock_medicines ?? 0,
      near_expiry_batches: d.near_expiry_batches_count ?? d.near_expiry_batches ?? 0,
      expired_batches: d.expired_batches_count ?? d.expired_batches ?? 0,
      pending_prescriptions_count: d.pending_prescriptions_count ?? 0,
      today_dispensed_prescriptions: d.today_dispensing_count ?? d.today_dispensed_prescriptions ?? 0,
      today_sales_amount: Number(d.today_pharmacy_sales ?? d.today_sales_amount ?? 0),
      total_stock_value: Number(d.total_stock_value ?? 0),
      recent_low_stock: Array.isArray(d.recent_low_stock) ? d.recent_low_stock : [],
      recent_near_expiry: Array.isArray(d.recent_near_expiry) ? d.recent_near_expiry : [],
    };
  },

  // --- Medicine Master ---
  listMedicines: async (params?: {
    search?: string;
    category?: string;
    schedule?: string;
    is_active?: boolean;
    page?: number;
    page_size?: number;
  }): Promise<PaginatedResult<PharmacyMedicine>> => {
    const res = await apiClient.get<PaginatedResult<PharmacyMedicine>>("/pharmacy/medicines", { params });
    return res.data;
  },

  getMedicine: async (id: string): Promise<PharmacyMedicine> => {
    const res = await apiClient.get<PharmacyMedicine>(`/pharmacy/medicines/${id}`);
    return res.data;
  },

  createMedicine: async (data: CreatePharmacyMedicineData): Promise<PharmacyMedicine> => {
    const res = await apiClient.post<PharmacyMedicine>("/pharmacy/medicines", data);
    return res.data;
  },

  updateMedicine: async (id: string, data: UpdatePharmacyMedicineData): Promise<PharmacyMedicine> => {
    const res = await apiClient.put<PharmacyMedicine>(`/pharmacy/medicines/${id}`, data);
    return res.data;
  },

  deleteMedicine: async (id: string): Promise<{ success: boolean; message: string }> => {
    const res = await apiClient.delete<{ success: boolean; message: string }>(`/pharmacy/medicines/${id}`);
    return res.data;
  },

  getCategories: async (): Promise<string[]> => {
    const res = await apiClient.get<string[]>("/pharmacy/medicines/categories");
    return res.data;
  },

  // --- Suppliers ---
  listSuppliers: async (params?: {
    search?: string;
    is_active?: boolean;
    page?: number;
    page_size?: number;
  }): Promise<PaginatedResult<PharmacySupplier>> => {
    const res = await apiClient.get<PaginatedResult<PharmacySupplier>>("/pharmacy/suppliers", { params });
    return res.data;
  },

  getSupplier: async (id: string): Promise<PharmacySupplier> => {
    const res = await apiClient.get<PharmacySupplier>(`/pharmacy/suppliers/${id}`);
    return res.data;
  },

  createSupplier: async (data: CreateSupplierData): Promise<PharmacySupplier> => {
    const res = await apiClient.post<PharmacySupplier>("/pharmacy/suppliers", data);
    return res.data;
  },

  updateSupplier: async (id: string, data: UpdateSupplierData): Promise<PharmacySupplier> => {
    const res = await apiClient.put<PharmacySupplier>(`/pharmacy/suppliers/${id}`, data);
    return res.data;
  },

  deactivateSupplier: async (id: string): Promise<{ success: boolean; message: string }> => {
    const res = await apiClient.delete<{ success: boolean; message: string }>(`/pharmacy/suppliers/${id}`);
    return res.data;
  },

  getSupplierPurchaseHistory: async (id: string) => {
    const res = await apiClient.get(`/pharmacy/suppliers/${id}/purchase-history`);
    return res.data;
  },

  exportSuppliersExcel: async (): Promise<Blob> => {
    const res = await apiClient.get("/pharmacy/suppliers/export/excel", { responseType: "blob" });
    return res.data;
  },

  importSuppliersExcel: async (file: File): Promise<{ success: boolean; imported_count: number; message: string }> => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await apiClient.post("/pharmacy/suppliers/import/excel", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  },

  // --- Purchase Orders ---
  listPurchaseOrders: async (params?: {
    supplier_id?: string;
    status?: string;
    start_date?: string;
    end_date?: string;
    search?: string;
    page?: number;
    page_size?: number;
  }): Promise<PaginatedResult<PurchaseOrder>> => {
    const res = await apiClient.get<PaginatedResult<PurchaseOrder>>("/pharmacy/purchase-orders", { params });
    return res.data;
  },

  getPurchaseOrder: async (id: string): Promise<PurchaseOrder> => {
    const res = await apiClient.get<PurchaseOrder>(`/pharmacy/purchase-orders/${id}`);
    return res.data;
  },

  createPurchaseOrder: async (data: CreatePurchaseOrderData): Promise<PurchaseOrder> => {
    const formattedData = {
      ...data,
      expected_date: data.expected_date || data.expected_delivery_date,
      expected_delivery_date: data.expected_delivery_date || data.expected_date,
      items: data.items.map((it) => ({
        ...it,
        ordered_qty: it.ordered_qty ?? it.quantity,
        quantity: it.quantity ?? it.ordered_qty,
      })),
    };
    const res = await apiClient.post<PurchaseOrder>("/pharmacy/purchase-orders", formattedData);
    return res.data;
  },

  submitPurchaseOrder: async (id: string): Promise<PurchaseOrder> => {
    const res = await apiClient.post<PurchaseOrder>(`/pharmacy/purchase-orders/${id}/submit`);
    return res.data;
  },

  approvePurchaseOrder: async (id: string): Promise<PurchaseOrder> => {
    const res = await apiClient.post<PurchaseOrder>(`/pharmacy/purchase-orders/${id}/approve`);
    return res.data;
  },

  cancelPurchaseOrder: async (id: string, reason: string): Promise<PurchaseOrder> => {
    const res = await apiClient.post<PurchaseOrder>(`/pharmacy/purchase-orders/${id}/cancel`, { reason });
    return res.data;
  },

  // --- GRN (Goods Receipt Note) ---
  listGRN: async (params?: {
    supplier_id?: string;
    purchase_order_id?: string;
    status?: string;
    start_date?: string;
    end_date?: string;
    search?: string;
    page?: number;
    page_size?: number;
  }): Promise<PaginatedResult<GoodsReceiptNote>> => {
    const res = await apiClient.get<PaginatedResult<GoodsReceiptNote>>("/pharmacy/grn", { params });
    return res.data;
  },

  getGRN: async (id: string): Promise<GoodsReceiptNote> => {
    const res = await apiClient.get<GoodsReceiptNote>(`/pharmacy/grn/${id}`);
    return res.data;
  },

  createGRN: async (data: CreateGRNData): Promise<GoodsReceiptNote> => {
    const formattedData = {
      ...data,
      po_id: data.purchase_order_id,
      receipt_date: data.received_date,
      invoice_number: data.supplier_invoice_no,
      invoice_date: data.supplier_invoice_date,
    };
    const res = await apiClient.post<GoodsReceiptNote>("/pharmacy/grn", formattedData);
    return res.data;
  },

  confirmGRN: async (id: string): Promise<GoodsReceiptNote> => {
    const res = await apiClient.post<GoodsReceiptNote>(`/pharmacy/grn/${id}/confirm`);
    return res.data;
  },

  cancelGRN: async (id: string, reason: string): Promise<GoodsReceiptNote> => {
    const res = await apiClient.post<GoodsReceiptNote>(`/pharmacy/grn/${id}/cancel`, { reason });
    return res.data;
  },

  // --- Batches & Inventory ---
  listBatches: async (params?: {
    medicine_id?: string;
    search?: string;
    is_expired?: boolean;
    is_blocked?: boolean;
    near_expiry?: boolean;
    page?: number;
    page_size?: number;
  }): Promise<PaginatedResult<MedicineBatch>> => {
    const res = await apiClient.get<PaginatedResult<MedicineBatch>>("/pharmacy/inventory/batches", { params });
    return res.data;
  },

  getFEFOBatches: async (medicineId: string): Promise<FEFOBatchSuggestion> => {
    const res = await apiClient.get<FEFOBatchSuggestion>(`/pharmacy/inventory/fefo/${medicineId}`);
    return res.data;
  },

  getInventoryAlerts: async (): Promise<InventoryAlerts> => {
    const res = await apiClient.get<InventoryAlerts>("/pharmacy/inventory/alerts");
    return res.data;
  },

  updateNearExpirySettings: async (days: number): Promise<{ success: boolean; near_expiry_days: number }> => {
    const res = await apiClient.put<{ success: boolean; near_expiry_days: number }>("/pharmacy/inventory/near-expiry-threshold", {
      near_expiry_days: days,
    });
    return res.data;
  },

  getStockLedger: async (params?: {
    medicine_id?: string;
    batch_id?: string;
    txn_type?: string;
    start_date?: string;
    end_date?: string;
    page?: number;
    page_size?: number;
  }): Promise<PaginatedResult<StockLedgerEntry>> => {
    const res = await apiClient.get<PaginatedResult<StockLedgerEntry>>("/pharmacy/inventory/stock-ledger", { params });
    return res.data;
  },

  adjustStock: async (data: {
    medicine_id?: string;
    batch_id: string;
    quantity: number;
    adjustment_type: "ADD" | "DEDUCT";
    adjustment_qty?: number;
    reason: string;
  }): Promise<any> => {
    const payload = {
      ...data,
      adjustment_qty: data.adjustment_qty ?? (data.adjustment_type === "DEDUCT" ? -Number(data.quantity) : Number(data.quantity)),
    };
    const res = await apiClient.post<any>("/pharmacy/inventory/adjust", payload);
    return res.data;
  },

  // --- Prescriptions & Dispensing ---
  getDispensingDoctors: async (): Promise<DispensingDoctorOption[]> => {
    const res = await apiClient.get<DispensingDoctorOption[]>("/pharmacy/dispensing/doctors");
    return res.data;
  },

  getDispensingQueue: async (params?: {
    search?: string;
    encounter_type?: "OPD" | "IPD";
    source?: PrescriptionSource;
    status?: string;
    pharmacy_status?: string;
    doctor_id?: string;
    date_from?: string;
    date_to?: string;
    start_date?: string;
    end_date?: string;
    page?: number;
    page_size?: number;
  }): Promise<PaginatedResult<PrescriptionQueueItem>> => {
    const queryParams = params
      ? {
          search: params.search,
          encounter_type: params.encounter_type,
          source: params.source,
          status: params.status ?? params.pharmacy_status,
          doctor_id: params.doctor_id,
          date_from: params.date_from ?? params.start_date,
          date_to: params.date_to ?? params.end_date,
          page: params.page,
          page_size: params.page_size,
        }
      : undefined;
    const res = await apiClient.get<PaginatedResult<PrescriptionQueueItem>>("/pharmacy/dispensing/queue", {
      params: queryParams,
    });
    return res.data;
  },

  getPrescriptionDispenseDetail: async (
    prescriptionId: string,
    source?: PrescriptionSource
  ): Promise<PrescriptionDispenseDetail> => {
    const res = await apiClient.get<PrescriptionDispenseDetail>(
      `/pharmacy/dispensing/prescriptions/${prescriptionId}`,
      { params: source ? { source } : undefined }
    );
    return res.data;
  },

  resolvePrescriptionItem: async (
    prescriptionId: string,
    itemId: string,
    data: ResolvePrescriptionItemData
  ): Promise<PrescriptionDispenseDetail> => {
    const res = await apiClient.post<PrescriptionDispenseDetail>(
      `/pharmacy/dispensing/prescriptions/${prescriptionId}/items/${itemId}/resolve`,
      data
    );
    return res.data;
  },

  confirmDispensing: async (data: ConfirmDispensingData): Promise<DispensingResponse> => {
    const res = await apiClient.post<DispensingResponse>("/pharmacy/dispensing/confirm", data);
    return res.data;
  },

  reverseDispensing: async (dispensingId: string, reason: string): Promise<{ success: boolean; message: string }> => {
    const res = await apiClient.post<{ success: boolean; message: string }>(`/pharmacy/dispensing/${dispensingId}/reverse`, { reason });
    return res.data;
  },

  // --- Pharmacy Invoices ---
  listInvoices: async (params?: {
    search?: string;
    status?: string;
    patient_id?: string;
    start_date?: string;
    end_date?: string;
    page?: number;
    page_size?: number;
  }): Promise<PaginatedResult<PharmacyInvoice>> => {
    const res = await apiClient.get<PaginatedResult<PharmacyInvoice>>("/pharmacy/invoices", { params });
    return res.data;
  },

  getInvoice: async (id: string): Promise<PharmacyInvoice> => {
    const res = await apiClient.get<PharmacyInvoice>(`/pharmacy/invoices/${id}`);
    return res.data;
  },

  collectInvoicePayment: async (id: string, data: CollectPharmacyPaymentData): Promise<PharmacyInvoice> => {
    const res = await apiClient.post<PharmacyInvoice>(`/pharmacy/invoices/${id}/pay`, data);
    return res.data;
  },

  cancelInvoice: async (id: string, reason: string): Promise<{ success: boolean; message: string }> => {
    const res = await apiClient.post<{ success: boolean; message: string }>(`/pharmacy/invoices/${id}/cancel`, { reason });
    return res.data;
  },

  // --- Patient Returns ---
  listReturns: async (params?: {
    search?: string;
    status?: string;
    dispensing_id?: string;
    start_date?: string;
    end_date?: string;
    page?: number;
    page_size?: number;
  }): Promise<PaginatedResult<MedicineReturn>> => {
    const res = await apiClient.get<PaginatedResult<MedicineReturn>>("/pharmacy/returns", { params });
    return res.data;
  },

  getReturn: async (id: string): Promise<MedicineReturn> => {
    const res = await apiClient.get<MedicineReturn>(`/pharmacy/returns/${id}`);
    return res.data;
  },

  createReturn: async (data: CreateReturnData): Promise<MedicineReturn> => {
    const res = await apiClient.post<MedicineReturn>("/pharmacy/returns", data);
    return res.data;
  },

  // --- Reports ---
  getStockReport: async (params?: { category?: string; search?: string; in_stock_only?: boolean }): Promise<StockValuationItem[]> => {
    const res = await apiClient.get<any>("/pharmacy/reports/stock", { params: { in_stock_only: true, ...params } });
    return Array.isArray(res.data) ? res.data : (res.data?.items ?? []);
  },

  getBatchStockReport: async (params?: { near_expiry_only?: boolean; expired_only?: boolean }): Promise<BatchStockReportItem[]> => {
    const res = await apiClient.get<any>("/pharmacy/reports/batches", { params });
    return Array.isArray(res.data) ? res.data : (res.data?.items ?? []);
  },

  getPurchaseReport: async (params?: { start_date?: string; end_date?: string; supplier_id?: string }): Promise<PurchaseReportItem[]> => {
    const queryParams: Record<string, any> = {};
    if (params?.start_date) queryParams.date_from = params.start_date;
    if (params?.end_date) queryParams.date_to = params.end_date;
    if (params?.supplier_id) queryParams.supplier_id = params.supplier_id;
    const res = await apiClient.get<any>("/pharmacy/reports/purchases", { params: queryParams });
    return Array.isArray(res.data) ? res.data : (res.data?.items ?? []);
  },

  getSalesReport: async (params?: { start_date?: string; end_date?: string; encounter_type?: string }): Promise<SalesReportItem[]> => {
    const queryParams: Record<string, any> = {};
    if (params?.start_date) queryParams.date_from = params.start_date;
    if (params?.end_date) queryParams.date_to = params.end_date;
    if (params?.encounter_type) queryParams.encounter_type = params.encounter_type;
    const res = await apiClient.get<any>("/pharmacy/reports/sales", { params: queryParams });
    return Array.isArray(res.data) ? res.data : (res.data?.items ?? []);
  },

  exportReportExcel: async (params: { report_type: string; start_date?: string; end_date?: string }): Promise<Blob> => {
    const queryParams: Record<string, any> = {
      report_type: params.report_type,
    };
    if (params.start_date) queryParams.date_from = params.start_date;
    if (params.end_date) queryParams.date_to = params.end_date;
    const res = await apiClient.get("/pharmacy/reports/export/excel", { params: queryParams, responseType: "blob" });
    return res.data;
  },
};
