export interface Event {
  id: string;
  start: string;
  end: string;
  day: string;
  project: string;
  activityId: string;
  activityLabel: string;
  notes?: string;
  artiaLaunched: boolean;
  workplace?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEventDTO {
  start: string;
  end: string;
  day: string;
  project: string;
  activity: {
    id?: string;
    label: string;
  };
  notes?: string;
  artiaLaunched?: boolean;
  workplace?: string;
}

export interface UpdateEventDTO {
  start?: string;
  end?: string;
  day?: string;
  project?: string;
  activity?: {
    id?: string;
    label: string;
  };
  notes?: string;
  artiaLaunched?: boolean;
  workplace?: string;
}
