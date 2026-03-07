import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useThemeStore = create(
  persist(
    (set) => ({
      theme: 'dark',
      toggleTheme: () => set((state) => ({ 
        theme: state.theme === 'dark' ? 'light' : 'dark' 
      }))
    }),
    {
      name: 'theme-storage'
    }
  )
);

export const useViewStore = create((set) => ({
  currentView: 'calendar',
  setView: (view) => set({ currentView: view }),
  weekStart: new Date(),
  setWeekStart: (date) => set({ weekStart: date })
}));
