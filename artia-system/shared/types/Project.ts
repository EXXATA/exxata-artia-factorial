export interface Activity {
  id: string;
  label: string;
  artiaId?: string;
  projectId: string;
}

export interface Project {
  id: string;
  number: string;
  name: string;
  activities: Activity[];
}
