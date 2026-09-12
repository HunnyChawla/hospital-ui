import { apiClient } from "./api";
import { getTenantIdForApi } from "@/utils/auth";

export type ServiceChargeStatus = "ACTIVE" | "CANCELLED" | "PENDING";

export type ChargeType =
  | "ROOM"
  | "DOCTOR_VISIT"
  | "LAB"
  | "PHARMACY"
  | "PROCEDURE"
  | "SURGERY"
  | "NURSING"
  | "CONSUMABLE"
  | "ADMISSION_FEE"
  | "OTHER";

export type SourceType =
  | "MANUAL"
  | "BED_OCCUPANCY"
  | "LAB_ORDER"
  | "PHARMACY_SALE"
  | "DOCTOR_VISIT"
  | "SURGERY"
  | "ADMISSION_FEE"
  | "PROCEDURE";

export type BillingAccountStatus =
  | "OPEN"
  | "FROZEN_FOR_DISCHARGE"
  | "SETTLED"
  | "CANCELLED";

export type TpaPreAuthStatus =
  | "NONE"
  | "PRE_AUTH_REQUESTED"
  | "PRE_AUTH_APPROVED"
  | "CLAIM_SUBMITTED"
  | "CLAIM_APPROVED"
  | "CLAIM_REJECTED"
  | "SETTLED";

export interface ServiceCharge {
  charge_id: string;
  tenant_id: string;
  admission_id: string;
  service_id: string | null;
  service_name: string;
  service_category: string | null;
  charge_type: ChargeType;
  source_type: SourceType;
  source_id: string | null;
  quantity: number;
  unit_price: string | number;
  gross_amount: string | number;
  discount: string | number;
  tax_amount: string | number;
  total_amount: string | number;
  net_amount: string | number;
  notes: string | null;
  performed_at: string;
  status: ServiceChargeStatus;
  created_by: string | null;
  cancelled_by: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateServiceChargeRequest {
  service_id?: string | null;
  service_name?: string | null;
  service_category?: string | null;
  charge_type?: ChargeType;
  quantity: number;
  unit_price?: number | null;
  discount?: number;
  tax_amount?: number;
  source_type?: SourceType;
  source_id?: string | null;
  notes?: string | null;
}

export interface IpdPaymentItem {
  id: string;
  payment_number: string;
  amount: number;
  payment_method: string;
  payment_reference: string | null;
  payment_date: string;
  status: string;
  notes: string | null;
  created_at: string;
  created_by: string | null;
}

export interface IpdCategoryBreakdown {
  charge_type: ChargeType | string;
  category_name: string;
  item_count: number;
  gross_amount: number;
  discount_amount: number;
  tax_amount: number;
  net_amount: number;
}

export interface IpdBillingAccountSummary {
  gross_charges: number;
  total_discounts: number;
  total_tax: number;
  net_charges: number;
  total_paid: number;
  total_refunded: number;
  net_paid: number;
  outstanding_balance: number;
  is_refund_due: boolean;
  refund_due_amount: number;
  tpa_approved_amount: number | null;
  patient_payable: number;
  patient_outstanding: number;
  billing_account_status: BillingAccountStatus;
  billing_notes: string | null;
}

export interface UpdateTpaInsuranceRequest {
  tpa_provider?: string | null;
  tpa_policy_number?: string | null;
  tpa_pre_auth_status: TpaPreAuthStatus;
  tpa_approved_amount?: number | null;
  tpa_notes?: string | null;
}

export interface RoomChargeCalculationPeriod {
  bed_id: string | null;
  bed_number: string;
  ward_name: string;
  start_date: string;
  end_date: string;
  days: number;
  daily_rate: number;
  total_amount: number;
  is_already_charged: boolean;
}

export interface CalculateRoomChargesRequest {
  through_date?: string | null;
  apply_to_account: boolean;
}

export interface CalculateRoomChargesResponse {
  admission_id: string;
  periods: RoomChargeCalculationPeriod[];
  total_days: number;
  total_room_charges: number;
  charges_applied: ServiceCharge[];
}

export interface IpdBillingAccountResponse {
  admission_id: string;
  admission_number: string;
  patient_id: string;
  patient_name: string | null;
  patient_uhid: string | null;
  patient_mobile: string | null;
  doctor_id: string;
  doctor_name: string | null;
  bed_id: string | null;
  bed_number: string | null;
  ward_name: string | null;
  admission_date: string;
  admission_time: string;
  discharge_date: string | null;
  discharge_time: string | null;
  admission_status: string;
  patient_status: string | null;
  care_status: string | null;
  invoice_id: string | null;
  invoice_number: string | null;
  summary: IpdBillingAccountSummary;
  categories: IpdCategoryBreakdown[];
  charges: ServiceCharge[];
  payments: IpdPaymentItem[];
  refunds: IpdPaymentItem[];
  tpa: UpdateTpaInsuranceRequest | null;
}

export interface CreateAdvancePaymentRequest {
  amount: number;
  payment_method: string;
  payment_reference?: string | null;
  payment_date?: string | null;
  notes?: string | null;
}

export interface CreateIpdRefundRequest {
  amount: number;
  payment_method: string;
  payment_reference?: string | null;
  reason: string;
  original_payment_id?: string | null;
}

export const serviceChargesApi = {
  async getBillingAccount(
    admissionId: string,
    tenantId?: string
  ): Promise<IpdBillingAccountResponse> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params = apiTenantId ? { tenant_id: apiTenantId } : {};
    const response = await apiClient.get<IpdBillingAccountResponse>(
      `/admissions/${admissionId}/billing-account`,
      { params }
    );
    return response.data;
  },

  async list(admissionId: string, tenantId?: string): Promise<ServiceCharge[]> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params = apiTenantId ? { tenant_id: apiTenantId } : {};
    const response = await apiClient.get<ServiceCharge[]>(
      `/admissions/${admissionId}/charges`,
      { params }
    );
    return response.data;
  },

  async create(
    admissionId: string,
    charge: CreateServiceChargeRequest,
    tenantId?: string
  ): Promise<ServiceCharge> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params = apiTenantId ? { tenant_id: apiTenantId } : {};
    const response = await apiClient.post<ServiceCharge>(
      `/admissions/${admissionId}/charges`,
      charge,
      { params }
    );
    return response.data;
  },

  async cancel(chargeId: string, tenantId?: string): Promise<ServiceCharge> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params = apiTenantId ? { tenant_id: apiTenantId } : {};
    const response = await apiClient.put<ServiceCharge>(
      `/admission-charges/${chargeId}/cancel`,
      {},
      { params }
    );
    return response.data;
  },

  async receiveAdvance(
    admissionId: string,
    data: CreateAdvancePaymentRequest,
    tenantId?: string
  ): Promise<IpdPaymentItem> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params = apiTenantId ? { tenant_id: apiTenantId } : {};
    const response = await apiClient.post<IpdPaymentItem>(
      `/admissions/${admissionId}/payments`,
      data,
      { params }
    );
    return response.data;
  },

  async issueRefund(
    admissionId: string,
    data: CreateIpdRefundRequest,
    tenantId?: string
  ): Promise<IpdPaymentItem> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params = apiTenantId ? { tenant_id: apiTenantId } : {};
    const response = await apiClient.post<IpdPaymentItem>(
      `/admissions/${admissionId}/refunds`,
      data,
      { params }
    );
    return response.data;
  },

  async calculateRoomCharges(
    admissionId: string,
    request: CalculateRoomChargesRequest,
    tenantId?: string
  ): Promise<CalculateRoomChargesResponse> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params = apiTenantId ? { tenant_id: apiTenantId } : {};
    const response = await apiClient.post<CalculateRoomChargesResponse>(
      `/admissions/${admissionId}/calculate-room-charges`,
      request,
      { params }
    );
    return response.data;
  },

  async updateTpa(
    admissionId: string,
    data: UpdateTpaInsuranceRequest,
    tenantId?: string
  ): Promise<UpdateTpaInsuranceRequest> {
    const apiTenantId = getTenantIdForApi(tenantId);
    const params = apiTenantId ? { tenant_id: apiTenantId } : {};
    const response = await apiClient.patch<UpdateTpaInsuranceRequest>(
      `/admissions/${admissionId}/tpa-insurance`,
      data,
      { params }
    );
    return response.data;
  },
};
