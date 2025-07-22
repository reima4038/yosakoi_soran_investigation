// Redux store configuration
import { configureStore, createSlice } from '@reduxjs/toolkit';

// Temporary placeholder slice to avoid empty reducer error
const placeholderSlice = createSlice({
  name: 'placeholder',
  initialState: { initialized: true },
  reducers: {},
});

// Reducers will be added in subsequent tasks
export const store = configureStore({
  reducer: {
    placeholder: placeholderSlice.reducer,
    // Additional reducers will be added here
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
