import { nanoid } from "@reduxjs/toolkit";
import {
  Admission,
  BillingRecord,
  BillingItem,
  Patient,
  QueueEntry,
  TestOrder,
} from "@/types";
import { mockCall } from "./api";

const today = new Date().toISOString();

let patients: Patient[] = [
  {
    id: "P-10231",
    name: "Aarav Sharma",
    age: 32,
    gender: "Male",
    mobile: "9876543210",
    healthId: "IND-8891-0021",
    doctor: "Dr. Mehta",
    lastVisit: today,
    outstanding: 2400,
    status: "Active",
    wardType: "General",
  },
  {
    id: "P-10232",
    name: "Neha Kapoor",
    age: 41,
    gender: "Female",
    mobile: "9988776655",
    healthId: "IND-8891-0022",
    doctor: "Dr. Bose",
    lastVisit: today,
    outstanding: 0,
    status: "Admitted",
    wardType: "Private",
    bedNumber: "PR-204",
    admissionDate: today,
  },
  {
    id: "P-10233",
    name: "Kabir Singh",
    age: 27,
    gender: "Male",
    mobile: "9123456780",
    healthId: "IND-8891-0023",
    doctor: "Dr. Rao",
    lastVisit: today,
    outstanding: 800,
    status: "Active",
  },
];

let admissions: Admission[] = [
  {
    id: "ADM-01",
    patientId: "P-10232",
    doctor: "Dr. Bose",
    reason: "Post-op observation",
    wardType: "Private",
    bedNumber: "PR-204",
    admittedAt: today,
    billingEstimate: 12500,
  },
];

let billing: BillingRecord[] = [
  {
    id: "BILL-01",
    patientId: "P-10232",
    items: [
      { id: "BI-1", label: "Consultation", amount: 1200, category: "Consultation" },
      { id: "BI-2", label: "MRI", amount: 5200, category: "Test" },
    ],
    total: 6400,
    status: "Pending",
    updatedAt: today,
  },
];

let tests: TestOrder[] = [
  {
    id: "T-101",
    patientName: "Neha Kapoor",
    testName: "CBC + ESR",
    orderedBy: "Dr. Bose",
    status: "In Progress",
  },
  {
    id: "T-102",
    patientName: "Kabir Singh",
    testName: "Chest X-Ray",
    orderedBy: "Dr. Rao",
    status: "Pending",
  },
];

let queue: QueueEntry[] = [
  { token: 21, patientName: "Aarav Sharma", status: "Waiting", etaMinutes: 5 },
  { token: 22, patientName: "Kabir Singh", status: "In Consultation", etaMinutes: 0 },
  { token: 23, patientName: "Neha Kapoor", status: "Completed", etaMinutes: 0 },
];

export const mockPatientApi = {
  async list() {
    return mockCall("/patients", patients);
  },
  async search(term: string) {
    const lower = term.toLowerCase();
    const data = patients.filter(
      (p) =>
        p.name.toLowerCase().includes(lower) ||
        p.mobile.includes(term) ||
        p.healthId.toLowerCase().includes(lower)
    );
    return mockCall("/patients/search", data);
  },
  async add(payload: Omit<Patient, "id" | "lastVisit" | "status">) {
    const newPatient: Patient = {
      ...payload,
      id: `P-${Math.floor(Math.random() * 90000) + 10000}`,
      lastVisit: new Date().toISOString(),
      status: "Active",
    };
    patients = [newPatient, ...patients];
    return mockCall("/patients", newPatient);
  },
  async update(payload: Patient) {
    patients = patients.map((p) => (p.id === payload.id ? payload : p));
    return mockCall(`/patients/${payload.id}`, payload);
  },
  async remove(id: string) {
    patients = patients.filter((p) => p.id !== id);
    return mockCall(`/patients/${id}`, { id });
  },
};

export const mockAdmissionApi = {
  async list() {
    return mockCall("/admissions", admissions);
  },
  async admit(payload: Admission) {
    admissions = [payload, ...admissions];
    patients = patients.map((p) =>
      p.id === payload.patientId
        ? {
            ...p,
            status: "Admitted",
            wardType: payload.wardType,
            bedNumber: payload.bedNumber,
            admissionDate: payload.admittedAt,
          }
        : p
    );
    return mockCall("/admissions", payload);
  },
  async discharge(admissionId: string, summary: string) {
    const admission = admissions.find((a) => a.id === admissionId);
    admissions = admissions.map((a) =>
      a.id === admissionId
        ? { ...a, dischargeAt: new Date().toISOString(), summary }
        : a
    );
    if (admission) {
      patients = patients.map((p) =>
        p.id === admission.patientId
          ? {
              ...p,
              status: "Discharged",
              wardType: undefined,
              bedNumber: undefined,
              admissionDate: undefined,
            }
          : p
      );
    }
    return mockCall(`/admissions/${admissionId}/discharge`, { admissionId, summary });
  },
};

export const mockQueueApi = {
  async list() {
    return mockCall("/queue", queue);
  },
  async updateStatus(token: number, status: QueueEntry["status"]) {
    queue = queue.map((q) => (q.token === token ? { ...q, status } : q));
    return mockCall(`/queue/${token}`, queue);
  },
};

export const mockBillingApi = {
  async list() {
    return mockCall("/billing", billing);
  },
  async addCharge(recordId: string, item: BillingItem) {
    billing = billing.map((b) =>
      b.id === recordId
        ? {
            ...b,
            items: [...b.items, item],
            total: b.total + item.amount,
            updatedAt: new Date().toISOString(),
          }
        : b
    );
    return mockCall(`/billing/${recordId}`, billing.find((b) => b.id === recordId));
  },
  async create(patientId: string, items: BillingItem[]) {
    const total = items.reduce((sum, item) => sum + item.amount, 0);
    const newRecord: BillingRecord = {
      id: `BILL-${Date.now()}`,
      patientId,
      items,
      total,
      status: "Pending",
      updatedAt: new Date().toISOString(),
    };
    billing = [newRecord, ...billing];
    return mockCall("/billing", newRecord);
  },
};

export const mockTestsApi = {
  async list() {
    return mockCall("/tests", tests);
  },
  async updateStatus(id: string, status: TestOrder["status"]) {
    tests = tests.map((t) => (t.id === id ? { ...t, status } : t));
    return mockCall(`/tests/${id}`, tests);
  },
};

export const mockOpdApi = {
  async createSlip(patientId: string, doctor: string, symptoms: string) {
    const slipId = nanoid();
    const data = {
      id: slipId,
      patientId,
      doctor,
      symptoms,
      visitReason: symptoms,
      createdAt: new Date().toISOString(),
    };
    return mockCall("/opd", data);
  },
};

