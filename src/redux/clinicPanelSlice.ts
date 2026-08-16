import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export type ClinicPanelMode = "examine" | "prescribe";

interface ClinicPanelState {
  selectedPatientId: string | null;
  selectedVisitId: string | null;
  activeComponentKey: string;
  mode: ClinicPanelMode;
}

const initialState: ClinicPanelState = {
  selectedPatientId: null,
  selectedVisitId: null,
  activeComponentKey: "vitals",
  mode: "examine",
};

const clinicPanelSlice = createSlice({
  name: "clinicPanel",
  initialState,
  reducers: {
    selectClinicPatient: (
      state,
      action: PayloadAction<{ patientId: string | null; visitId: string | null }>
    ) => {
      state.selectedPatientId = action.payload.patientId;
      state.selectedVisitId = action.payload.visitId;
    },
    setActiveComponentKey: (state, action: PayloadAction<string>) => {
      state.activeComponentKey = action.payload;
    },
    setClinicPanelMode: (state, action: PayloadAction<ClinicPanelMode>) => {
      state.mode = action.payload;
    },
    resetClinicPanel: () => initialState,
  },
});

export const {
  selectClinicPatient,
  setActiveComponentKey,
  setClinicPanelMode,
  resetClinicPanel,
} = clinicPanelSlice.actions;

export default clinicPanelSlice.reducer;
