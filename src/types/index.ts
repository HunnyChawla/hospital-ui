export type Patient = {
  id: string;
  name: string;
  age: number;
  gender: "Male" | "Female" | "Other";
  mobile: string;
  healthId: string;
  doctor: string;
  lastVisit: string;
  outstanding: number;
  status: "Active" | "Admitted" | "Discharged";
  wardType?: "ICU" | "General" | "Private";
  bedNumber?: string;
  admissionDate?: string;
};

export type Admission = {
  id: string;
  patientId: string;
  doctor: string;
  reason: string;
  wardType: "ICU" | "General" | "Private";
  bedNumber: string;
  admittedAt: string;
  dischargeAt?: string;
  summary?: string;
  billingEstimate?: number;
};

export type OpdSlip = {
  id: string;
  patientId: string;
  doctor: string;
  symptoms: string;
  visitReason: string;
  createdAt: string;
};

export type BedStatus = {
  ward: "ICU" | "General" | "Private";
  total: number;
  occupied: number;
};

export type BillingItem = {
  id: string;
  label: string;
  amount: number;
  category: "Consultation" | "Test" | "Medicine" | "Bed" | "Other";
};

export type BillingRecord = {
  id: string;
  patientId: string;
  items: BillingItem[];
  total: number;
  status: "Pending" | "Paid";
  updatedAt: string;
};

export type TestOrder = {
  id: string;
  patientName: string;
  testName: string;
  status: "Pending" | "In Progress" | "Completed";
  orderedBy: string;
};

export type QueueEntry = {
  token: number;
  patientName: string;
  status: "Waiting" | "In Consultation" | "Completed";
  etaMinutes: number;
};

