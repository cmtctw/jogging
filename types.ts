
export interface SessionConfig {
  durationMinutes: number;
  bpm: number;
  youtubeUrl: string;
}

export enum WorkoutStatus {
  IDLE = 'IDLE',
  RUNNING = 'RUNNING',
  PAUSED = 'PAUSED',
  COMPLETED = 'COMPLETED'
}
