// Mock patient data for testing optometry panel

export interface MockPatient {
  id: string;
  name: string;
  age: number;
  gender: "male" | "female" | "other";
  mobile: string;
  health_id: string;
  visit_id: string;
  appointment_time: string;
  status: "waiting" | "in_progress" | "completed";
  chief_complaint?: string;
}

export interface MockOptometristSchedule {
  optometrist_id: string;
  optometrist_name: string;
  date: string;
  patients: MockPatient[];
  stats: {
    total: number;
    waiting: number;
    in_progress: number;
    completed: number;
  };
}

// Today's date formatted
const today = new Date().toISOString().split("T")[0];

// Mock patients for today's schedule
export const mockTodaySchedule: MockOptometristSchedule = {
  optometrist_id: "optom_001",
  optometrist_name: "Dr. Emily Chen",
  date: today,
  patients: [
    {
      id: "patient_001",
      name: "John Smith",
      age: 28,
      gender: "male",
      mobile: "9876543210",
      health_id: "HID-2025-001",
      visit_id: "visit_001",
      appointment_time: "09:00",
      status: "completed",
      chief_complaint: "Blurred distance vision",
    },
    {
      id: "patient_002",
      name: "Mary Johnson",
      age: 52,
      gender: "female",
      mobile: "9876543211",
      health_id: "HID-2025-002",
      visit_id: "visit_002",
      appointment_time: "09:30",
      status: "in_progress",
      chief_complaint: "Difficulty reading",
    },
    {
      id: "patient_003",
      name: "Robert Williams",
      age: 35,
      gender: "male",
      mobile: "9876543212",
      health_id: "HID-2025-003",
      visit_id: "visit_003",
      appointment_time: "10:00",
      status: "waiting",
      chief_complaint: "Eye strain with computer",
    },
    {
      id: "patient_004",
      name: "Sarah Davis",
      age: 24,
      gender: "female",
      mobile: "9876543213",
      health_id: "HID-2025-004",
      visit_id: "visit_004",
      appointment_time: "10:30",
      status: "waiting",
      chief_complaint: "Routine checkup",
    },
    {
      id: "patient_005",
      name: "Michael Brown",
      age: 45,
      gender: "male",
      mobile: "9876543214",
      health_id: "HID-2025-005",
      visit_id: "visit_005",
      appointment_time: "11:00",
      status: "waiting",
      chief_complaint: "Headache after reading",
    },
    {
      id: "patient_006",
      name: "Jennifer Wilson",
      age: 62,
      gender: "female",
      mobile: "9876543215",
      health_id: "HID-2025-006",
      visit_id: "visit_006",
      appointment_time: "11:30",
      status: "waiting",
      chief_complaint: "Dry eyes",
    },
    {
      id: "patient_007",
      name: "David Lee",
      age: 18,
      gender: "male",
      mobile: "9876543216",
      health_id: "HID-2025-007",
      visit_id: "visit_007",
      appointment_time: "12:00",
      status: "waiting",
      chief_complaint: "New glasses needed",
    },
    {
      id: "patient_008",
      name: "Lisa Anderson",
      age: 38,
      gender: "female",
      mobile: "9876543217",
      health_id: "HID-2025-008",
      visit_id: "visit_008",
      appointment_time: "14:00",
      status: "waiting",
      chief_complaint: "Contact lens fitting",
    },
  ],
  stats: {
    total: 8,
    waiting: 6,
    in_progress: 1,
    completed: 1,
  },
};

// Helper function to get patient by ID
export function getMockPatientById(patientId: string): MockPatient | undefined {
  return mockTodaySchedule.patients.find((p) => p.id === patientId);
}

// Helper function to get patients by status
export function getMockPatientsByStatus(
  status: "waiting" | "in_progress" | "completed"
): MockPatient[] {
  return mockTodaySchedule.patients.filter((p) => p.status === status);
}

// Helper to simulate updating patient status
export function updateMockPatientStatus(
  patientId: string,
  status: "waiting" | "in_progress" | "completed"
): MockOptometristSchedule {
  const patient = mockTodaySchedule.patients.find((p) => p.id === patientId);
  if (patient) {
    const oldStatus = patient.status;
    patient.status = status;

    // Update stats
    if (oldStatus !== status) {
      mockTodaySchedule.stats[oldStatus]--;
      mockTodaySchedule.stats[status]++;
    }
  }
  return mockTodaySchedule;
}
