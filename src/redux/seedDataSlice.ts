import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import {
    seedDataApi,
    SeedJobResponse,
    CreateSeedJobRequest,
    ListJobsParams
} from "@/services/seedDataApi";

interface SeedDataState {
    jobs: SeedJobResponse[];
    selectedJob: SeedJobResponse | null;
    loading: boolean;
    creatingJob: boolean;
    error: string | null;
    lastQuery: ListJobsParams | null;
}

const initialState: SeedDataState = {
    jobs: [],
    selectedJob: null,
    loading: false,
    creatingJob: false,
    error: null,
    lastQuery: null,
};

export const fetchJobs = createAsyncThunk(
    "seedData/fetchJobs",
    async (params: ListJobsParams) => {
        const response = await seedDataApi.listJobs(params);
        // Sort by created_at desc (if api doesn't already, but api doc says it does)
        return { response, params };
    }
);

export const createImportJob = createAsyncThunk(
    "seedData/createImportJob",
    async (request: CreateSeedJobRequest) => {
        return await seedDataApi.createImportJob(request);
    }
);

export const fetchJob = createAsyncThunk(
    "seedData/fetchJob",
    async (jobId: string) => {
        return await seedDataApi.getJobStatus(jobId);
    }
);

const seedDataSlice = createSlice({
    name: "seedData",
    initialState,
    reducers: {
        clearError: (state) => {
            state.error = null;
        },
        setSelectedJob: (state, action: PayloadAction<SeedJobResponse | null>) => {
            state.selectedJob = action.payload;
        },
        updateJobInList: (state, action: PayloadAction<SeedJobResponse>) => {
            const index = state.jobs.findIndex(j => j.id === action.payload.id);
            if (index !== -1) {
                state.jobs[index] = action.payload;
            } else {
                state.jobs.unshift(action.payload);
            }

            // Also update selectedJob if it matches
            if (state.selectedJob && state.selectedJob.id === action.payload.id) {
                state.selectedJob = action.payload;
            }
        }
    },
    extraReducers: (builder) => {
        builder
            // Fetch Jobs
            .addCase(fetchJobs.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchJobs.fulfilled, (state, action) => {
                state.loading = false;
                state.jobs = action.payload.response;
                state.lastQuery = action.payload.params;
            })
            .addCase(fetchJobs.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message || "Failed to fetch jobs";
            })

            // Create Job
            .addCase(createImportJob.pending, (state) => {
                state.creatingJob = true;
                state.error = null;
            })
            .addCase(createImportJob.fulfilled, (state, action) => {
                state.creatingJob = false;
                state.jobs.unshift(action.payload);
            })
            .addCase(createImportJob.rejected, (state, action) => {
                state.creatingJob = false;
                state.error = action.error.message || "Failed to create import job";
            })

            // Fetch Single Job
            .addCase(fetchJob.fulfilled, (state, action) => {
                const index = state.jobs.findIndex(j => j.id === action.payload.id);
                if (index !== -1) {
                    state.jobs[index] = action.payload;
                }
                if (state.selectedJob && state.selectedJob.id === action.payload.id) {
                    state.selectedJob = action.payload;
                }
            });
    },
});

export const { clearError, setSelectedJob, updateJobInList } = seedDataSlice.actions;
export default seedDataSlice.reducer;
