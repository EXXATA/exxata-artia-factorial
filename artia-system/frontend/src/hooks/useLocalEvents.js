import { useState, useEffect } from 'react';
import { eventService } from '../services/api/eventService';

export function useLocalEvents() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    setLoading(true);

    try {
      const response = await eventService.getAll();
      setEvents(response?.data || []);
    } finally {
      setLoading(false);
    }
  };

  const addEvent = async (event) => {
    const payload = normalizeEventPayload(event);
    const response = await eventService.create(payload);
    const createdEvent = response?.data;

    if (createdEvent) {
      setEvents(prev => [...prev, createdEvent]);
    }

    return createdEvent;
  };

  const updateEvent = async (eventId, updatedData) => {
    const payload = normalizeEventPayload(updatedData);
    const response = await eventService.update(eventId, payload);
    const updatedEvent = response?.data;

    if (updatedEvent) {
      setEvents(prev => prev.map(event => (
        event.id === eventId ? updatedEvent : event
      )));
    }
  };

  const deleteEvent = async (eventId) => {
    await eventService.delete(eventId);
    setEvents(prev => prev.filter(event => event.id !== eventId));
  };

  const clearAllEvents = async () => {
    if (window.confirm('Tem certeza que deseja limpar todos os eventos? Esta ação não pode ser desfeita.')) {
      await Promise.all(events.map(event => eventService.delete(event.id)));
      setEvents([]);
    }
  };

  const getEventsByDay = (day) => {
    return events.filter(e => e.day === day);
  };

  const getEventsByDateRange = (startDate, endDate) => {
    return events.filter(e => {
      const eventDate = new Date(e.day);
      return eventDate >= new Date(startDate) && eventDate <= new Date(endDate);
    });
  };

  return {
    events,
    loading,
    addEvent,
    updateEvent,
    deleteEvent,
    clearAllEvents,
    getEventsByDay,
    getEventsByDateRange,
    refresh: loadEvents
  };
}

function normalizeEventPayload(event) {
  return {
    start: event.start,
    end: event.end,
    day: event.day,
    project: event.project,
    activity: event.activity || {
      id: event.activityId || '',
      label: event.activityLabel || ''
    },
    notes: event.notes || '',
    artiaLaunched: Boolean(event.artiaLaunched),
    workplace: event.workplace || null
  };
}
