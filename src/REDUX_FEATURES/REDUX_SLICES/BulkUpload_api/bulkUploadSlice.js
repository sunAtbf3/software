import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  // Step machine
  step: "upload", // 'upload' | 'preview' | 'zip' | 'importing' | 'result'
  imageMode: null, // 'csv_only' | 'zip'

  // File metadata (actual File objects stay in component ref)
  csvFileMeta: null, // { name, size }
  zipFileMeta: null, // { name, size }

  // Preview
  previewing: false,
  previewData: null, // { valid, invalid, rows[] }
  csvPct: 0,
  csvError: null,

  // Import
  importing: false,
  importPct: 0,
  result: null, // { created, failed[], warnings[] }
  importError: null,
  
  // UI state
  expandedRow: null,
  resultTab: "all",
};

const bulkUploadSlice = createSlice({
  name: "bulkUpload",
  initialState,
  reducers: {
    setStep: (state, action) => {
      state.step = action.payload;
    },
    setImageMode: (state, action) => {
      state.imageMode = action.payload;
    },
    setCsvFileMeta: (state, action) => {
      state.csvFileMeta = action.payload;
    },
    setZipFileMeta: (state, action) => {
      state.zipFileMeta = action.payload;
    },
    setPreviewing: (state, action) => {
      state.previewing = action.payload;
    },
    setPreviewData: (state, action) => {
      state.previewData = action.payload;
    },
    setCsvPct: (state, action) => {
      state.csvPct = action.payload;
    },
    setCsvError: (state, action) => {
      state.csvError = action.payload;
    },
    setImporting: (state, action) => {
      state.importing = action.payload;
    },
    setImportPct: (state, action) => {
      state.importPct = action.payload;
    },
    setResult: (state, action) => {
      state.result = action.payload;
    },
    setImportError: (state, action) => {
      state.importError = action.payload;
    },
    setExpandedRow: (state, action) => {
      state.expandedRow = action.payload;
    },
    setResultTab: (state, action) => {
      state.resultTab = action.payload;
    },
    resetBulkUpload: () => initialState,
  },
});

export const {
  setStep,
  setImageMode,
  setCsvFileMeta,
  setZipFileMeta,
  setPreviewing,
  setPreviewData,
  setCsvPct,
  setCsvError,
  setImporting,
  setImportPct,
  setResult,
  setImportError,
  setExpandedRow,
  setResultTab,
  resetBulkUpload,
} = bulkUploadSlice.actions;

export default bulkUploadSlice.reducer;

// import { createSlice } from "@reduxjs/toolkit";

// const initialState = {
//   // Step machine
//   step: "upload", // 'upload' | 'preview' | 'zip' | 'importing' | 'result'
//   imageMode: null, // 'csv_only' | 'zip'

//   // File metadata (actual File objects stay in component ref)
//   csvFileMeta: null, // { name, size }
//   zipFileMeta: null, // { name, size }

//   // Preview
//   previewing: false,
//   previewData: null, // { valid, invalid, rows[] }
//   csvPct: 0,
//   csvError: null,

//   // Import
//   importing: false,
//   importPct: 0,
//   result: null, // { created, failed[], warnings[] }
//   importError: null,
// };

// const bulkUploadSlice = createSlice({
//   name: "bulkUpload",
//   initialState,
//   reducers: {
//     setStep: (state, action) => {
//       state.step = action.payload;
//     },
//     setImageMode: (state, action) => {
//       state.imageMode = action.payload;
//     },
//     setCsvFileMeta: (state, action) => {
//       state.csvFileMeta = action.payload;
//     },
//     setZipFileMeta: (state, action) => {
//       state.zipFileMeta = action.payload;
//     },
//     setPreviewing: (state, action) => {
//       state.previewing = action.payload;
//     },
//     setPreviewData: (state, action) => {
//       state.previewData = action.payload;
//     },
//     setCsvPct: (state, action) => {
//       state.csvPct = action.payload;
//     },
//     setCsvError: (state, action) => {
//       state.csvError = action.payload;
//     },
//     setImporting: (state, action) => {
//       state.importing = action.payload;
//     },
//     setImportPct: (state, action) => {
//       state.importPct = action.payload;
//     },
//     setResult: (state, action) => {
//       state.result = action.payload;
//     },
//     setImportError: (state, action) => {
//       state.importError = action.payload;
//     },
//     resetBulkUpload: () => initialState,
//   },
// });

// export const {
//   setStep,
//   setImageMode,
//   setCsvFileMeta,
//   setZipFileMeta,
//   setPreviewing,
//   setPreviewData,
//   setCsvPct,
//   setCsvError,
//   setImporting,
//   setImportPct,
//   setResult,
//   setImportError,
//   resetBulkUpload,
// } = bulkUploadSlice.actions;

// export default bulkUploadSlice.reducer;