// core/types.ts

export interface Teacher {
  id: string;
  name: string;
  maxLessonsPerDay: number;
  shift: 'morning' | 'afternoon' | 'night' | 'all';
  blockedDays: number[];          // 0‑indexed
  availability: TimeSlot[];       // slots em que está disponível
  preferences?: TeacherPreferences;
}

export interface Class {
  id: string;
  name: string;
  shift: 'morning' | 'afternoon' | 'night' | 'all';
  maxLessonsPerDay: number;
  blockedDays: number[];
}

export interface Subject {
  id: string;
  name: string;
}

export interface LessonRequirement {
  teacherId: string;
  classId: string;
  subjectId: string;
  weeklyCount: number;
}

export interface InputData {
  days: number;                   // quantidade de dias letivos (ex: 5)
  periodsPerDay: number;          // quantidade de períodos por dia (ex: 10)
  teachers: Teacher[];
  classes: Class[];
  subjects: Subject[];
  lessonRequirements: LessonRequirement[];
}

export interface TimeSlot {
  day: number;
  period: number;
}

export interface Task {
  id: number;                     // índice único
  teacherId: string;
  classId: string;
  subjectId: string;
}

export interface ScheduleEntry {
  day: number;
  period: number;
  classId: string;
  teacherId: string;
  subjectId: string;
}

export type CompleteSchedule = ScheduleEntry[];

// Preferências de professor (soft constraints)
export interface TeacherPreferences {
  avoidFirstSlot?: boolean;
  avoidLastSlot?: boolean;
  maxConsecutive?: number;        // máximo de aulas seguidas (padrão 2)
  preferredDays?: number[];       // 0=segunda, etc.
  preferredPeriods?: number[];    // índices dos períodos favoritos
  avoidDays?: number[];
  avoidPeriods?: number[];
}
