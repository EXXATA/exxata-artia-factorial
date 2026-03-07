import { create } from 'zustand';

export const useEventsStore = create((set) => ({
  events: [],
  selectedEvent: null,
  setEvents: (events) => set({ events }),
  addEvent: (event) => set((state) => ({ 
    events: [...state.events, event] 
  })),
  updateEvent: (id, updatedEvent) => set((state) => ({
    events: state.events.map(e => e.id === id ? { ...e, ...updatedEvent } : e)
  })),
  deleteEvent: (id) => set((state) => ({
    events: state.events.filter(e => e.id !== id)
  })),
  setSelectedEvent: (event) => set({ selectedEvent: event }),
  clearSelectedEvent: () => set({ selectedEvent: null })
}));
