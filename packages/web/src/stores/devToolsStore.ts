import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface DevToolsStore {
  /** When true, data-fetching pages show skeleton/loading state instead of content. */
  simulateLoading: boolean;
  setSimulateLoading: (value: boolean) => void;
}

export const useDevToolsStore = create<DevToolsStore>()(
  persist(
    (set) => ({
      simulateLoading: false,
      setSimulateLoading: (value) => set({ simulateLoading: value }),
    }),
    { name: 'dev-tools' }
  )
);
