import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import { QueueEntry } from "@/types";
import { queueApi } from "@/services/queueApi";
import { opdVisitsApi, VisitStatus } from "@/services/opdVisitsApi";

type QueueState = {
  entries: QueueEntry[];
  loading: boolean;
  doctorId: string | null;
};

const initialState: QueueState = {
  entries: [],
  loading: false,
  doctorId: null,
};

export const fetchQueue = createAsyncThunk(
  "queue/fetch",
  async (payload: { doctorId: string; tenantId?: string }) => {
    const visits = await queueApi.getDoctorQueue(payload.doctorId, {
      tenantId: payload.tenantId,
    });

    // Map visits to QueueEntry format with visitId
    return visits.map((visit) => ({
      token: visit.token_number || 0,
      patientName: visit.patient_name || "Unknown",
      status: mapVisitStatusToQueueStatus(visit.status),
      etaMinutes: calculateETA(visit),
      visitId: visit.id, // Store visit ID for status updates
      visit_type: visit.visit_type, // Include visit type for emergency highlighting
    }));
  }
);

export const fetchCombinedQueue = createAsyncThunk(
  "queue/fetchCombined",
  async (payload: {
    doctorId: string;
    queueDate?: string;
    appointmentsOnly?: boolean;
    tenantId?: string;
  }) => {
    const items = await queueApi.getCombinedQueue(payload.doctorId, {
      queueDate: payload.queueDate,
      appointmentsOnly: payload.appointmentsOnly,
      tenantId: payload.tenantId,
    });

    // Map to QueueEntry format
    return items.map((item) => ({
      token: item.token_number,
      patientName: item.patient_name,
      status: mapStatusToQueueStatus(item.status),
      etaMinutes: 0, // Calculate based on position in queue
      visitId: item.type === "visit" ? item.id : undefined, // Only visits have visitId
      appointmentId: item.type === "appointment" ? item.id : undefined,
      visit_type: item.visit_type as "walk_in" | "appointment" | "emergency" | undefined, // Include visit type for emergency highlighting
    }));
  }
);

export const updateQueueStatus = createAsyncThunk(
  "queue/updateStatus",
  async (payload: {
    visitId: string;
    newStatus: VisitStatus;
    tenantId?: string;
  }) => {
    await opdVisitsApi.updateStatus(payload.visitId, payload.newStatus, payload.tenantId);
    // Return the updated status for local state update
    return { visitId: payload.visitId, status: payload.newStatus };
  }
);

export const completeAndAdvanceVisit = createAsyncThunk(
  "queue/completeAndAdvance",
  async (payload: {
    visitId: string;
    tenantId?: string;
  }) => {
    const response = await opdVisitsApi.completeAndAdvance(payload.visitId, payload.tenantId);
    return response;
  }
);

// Helper functions
function mapVisitStatusToQueueStatus(status: string): QueueEntry["status"] {
  switch (status) {
    // Waiting statuses
    case "checked_in":
    case "checked_in_opd":
    case "awaiting_optometrist":
    case "optometrist_assigned":
    case "awaiting_doctor":
    case "doctor_assigned":
    case "dilation_in_progress":
    case "dilation_completed":
      return "Waiting";
    // In Consultation statuses
    case "in_consultation":
    case "consultation_in_progress":
    case "optometrist_investigation_in_progress":
    case "optometrist_investigation_completed":
      return "In Consultation";
    // Completed statuses
    case "completed":
    case "consultation_completed":
    case "cancelled":
      return "Completed";
    default:
      return "Waiting";
  }
}

function mapStatusToQueueStatus(status: string): QueueEntry["status"] {
  if (status === "scheduled" || status === "confirmed") {
    return "Waiting";
  }
  return mapVisitStatusToQueueStatus(status);
}

function calculateETA(visit: any): number {
  // Simple ETA calculation - can be enhanced
  return 15; // Default 15 minutes
}

const queueSlice = createSlice({
  name: "queue",
  initialState,
  reducers: {
    reorder(state, action: PayloadAction<QueueEntry[]>) {
      state.entries = action.payload;
    },
    setDoctorId(state, action: PayloadAction<string | null>) {
      state.doctorId = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchQueue.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchQueue.fulfilled, (state, action) => {
        state.loading = false;
        state.entries = action.payload;
      })
      .addCase(fetchQueue.rejected, (state) => {
        state.loading = false;
      })
      .addCase(fetchCombinedQueue.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchCombinedQueue.fulfilled, (state, action) => {
        state.loading = false;
        state.entries = action.payload;
      })
      .addCase(fetchCombinedQueue.rejected, (state) => {
        state.loading = false;
      })
      .addCase(updateQueueStatus.fulfilled, (state, action) => {
        // Note: We need to refetch the queue to get updated status
        // For now, we'll just mark that an update happened
        // The component should refetch after status update
      });
  },
});

export const { reorder, setDoctorId } = queueSlice.actions;
export default queueSlice.reducer;

