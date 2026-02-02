import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import {
  clinicalNotesApi,
  CreateClinicalNoteRequest,
  UpdateClinicalNoteRequest,
  ClinicalNotesListParams,
} from "@/services/clinicalNotesApi";
import { ClinicalNote } from "@/types";

type ClinicalNotesState = {
  notes: ClinicalNote[];
  selectedNote: ClinicalNote | null;
  loading: boolean;
  error: string | null;
};

const initialState: ClinicalNotesState = {
  notes: [],
  selectedNote: null,
  loading: false,
  error: null,
};

export const fetchNotesForPatient = createAsyncThunk(
  "clinicalNotes/fetchForPatient",
  async (params: ClinicalNotesListParams, { rejectWithValue }) => {
    try {
      const result = await clinicalNotesApi.list(params);
      return result.items;
    } catch (error: any) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

export const addNote = createAsyncThunk(
  "clinicalNotes/add",
  async (data: CreateClinicalNoteRequest, { rejectWithValue }) => {
    try {
      const note = await clinicalNotesApi.create(data);
      return note;
    } catch (error: any) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

export const updateNote = createAsyncThunk(
  "clinicalNotes/update",
  async (
    payload: { id: string; data: UpdateClinicalNoteRequest },
    { rejectWithValue }
  ) => {
    try {
      const updated = await clinicalNotesApi.update(payload.id, payload.data);
      return updated;
    } catch (error: any) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

export const deleteNote = createAsyncThunk(
  "clinicalNotes/delete",
  async (id: string, { rejectWithValue }) => {
    try {
      await clinicalNotesApi.delete(id);
      return id;
    } catch (error: any) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

const clinicalNotesSlice = createSlice({
  name: "clinicalNotes",
  initialState,
  reducers: {
    setSelectedNote: (state, action: PayloadAction<ClinicalNote | null>) => {
      state.selectedNote = action.payload;
    },
    clearNotes: (state) => {
      state.notes = [];
      state.selectedNote = null;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch notes for patient
      .addCase(fetchNotesForPatient.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchNotesForPatient.fulfilled, (state, action) => {
        state.loading = false;
        state.notes = action.payload;
        state.error = null;
      })
      .addCase(fetchNotesForPatient.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string || "Failed to fetch notes";
      })
      // Add note
      .addCase(addNote.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addNote.fulfilled, (state, action) => {
        state.loading = false;
        state.notes.unshift(action.payload);
        state.error = null;
      })
      .addCase(addNote.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string || "Failed to add note";
      })
      // Update note
      .addCase(updateNote.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateNote.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.notes.findIndex((n) => n.id === action.payload.id);
        if (index !== -1) {
          state.notes[index] = action.payload;
        }
        state.error = null;
      })
      .addCase(updateNote.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string || "Failed to update note";
      })
      // Delete note
      .addCase(deleteNote.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteNote.fulfilled, (state, action) => {
        state.loading = false;
        state.notes = state.notes.filter((n) => n.id !== action.payload);
        state.error = null;
      })
      .addCase(deleteNote.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string || "Failed to delete note";
      });
  },
});

export const { setSelectedNote, clearNotes } = clinicalNotesSlice.actions;
export default clinicalNotesSlice.reducer;
