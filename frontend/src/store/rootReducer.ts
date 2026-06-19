import { combineReducers } from "@reduxjs/toolkit";
import authReducer from "@/features/auth/authSlice";
import customerReducer from "@/features/customers/customerSlice";
import interactionReducer from "@/features/interactions/interactionSlice";
import dashboardReducer from "@/features/dashboard/dashboardSlice";

export const rootReducer = combineReducers({
  auth: authReducer,
  customers: customerReducer,
  interactions: interactionReducer,
  dashboard: dashboardReducer,
});

export type RootState = ReturnType<typeof rootReducer>;
