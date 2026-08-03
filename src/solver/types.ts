import { Teacher, SchoolClass, ScheduleSlot, TimeBlock, Subject, DayOfWeek } from '../types';

export interface SolverResult {
  success: boolean;
  slots: ScheduleSlot[];
  conflicts: string[];
  summary: string;
  stats: {
    totalSlots: number;
    filledSlots: number;
    unfilledSlots: number;
    conflictCount: number;
  };
}

export interface LessonUnit {
  id: string;
  classId: string;
  className: string;
  subject: string;
  workload: number;
  priorityScore: number;
}

export const normalizeTime = (t: string): string => {
  if (!t) return '00:00';
  const parts = t.split(':');
  if (parts.length < 2) return '00:00';
  return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
};

export const timeToMinutes = (t: string): number => {
  const [h, m] = normalizeTime(t).split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};

export const timesOverlap = (start1: string, end1: string, start2: string, end2: string): boolean => {
  return normalizeTime(start1) < normalizeTime(end2) && normalizeTime(end1) > normalizeTime(start2);
};

export const getClassShift = (c: SchoolClass): 'matutino' | 'vespertino' | 'ambos' => {
  if (c.shift && c.shift !== 'ambos') return c.shift;
  const upper = (c.name || '').toUpperCase().trim();
  if (upper.includes('VESP') || upper.includes('TARDE') || upper.includes('VESPERTINO')) return 'vespertino';
  if (upper.includes('MAT') || upper.includes('MANHÃ') || upper.includes('MATUTINO')) return 'matutino';
  if (upper.endsWith('B') || upper.includes(' B ') || upper.endsWith('-B') || upper.endsWith(' B')) return 'vespertino';
  if (upper.endsWith('A') || upper.includes(' A ') || upper.endsWith('-A') || upper.endsWith(' A')) return 'matutino';
  return c.shift || 'matutino';
};

export const is678Grade = (className: string): boolean => {
  const norm = (className || '').toLowerCase();
  if (norm.includes('9º') || norm.includes('9°') || norm.includes('9 ano') || norm.includes('médio') || norm.includes('medio')) return false;
  return norm.includes('6º') || norm.includes('6°') || norm.includes('6 ano') ||
         norm.includes('7º') || norm.includes('7°') || norm.includes('7 ano') ||
         norm.includes('8º') || norm.includes('8°') || norm.includes('8 ano') ||
         /\b(6|7|8)\b/.test(norm);
};

export const normalizeSubjectName = (s: string): string => {
  if (!s) return '';
  const clean = s.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
  if (clean === 'dg' || clean === 'desenhogeometrico' || clean === 'desenhogeometria') return 'dg';
  if (clean === 'edfisica' || clean === 'educacaofisica') return 'edfisica';
  if (clean === 'portugues' || clean === 'linguaportuguesa') return 'portugues';
  if (clean === 'matematica') return 'matematica';
  if (clean === 'historia') return 'historia';
  if (clean === 'geografia') return 'geografia';
  if (clean === 'ciencias') return 'ciencias';
  if (clean === 'biologia') return 'biologia';
  if (clean === 'fisica') return 'fisica';
  if (clean === 'quimica') return 'quimica';
  if (clean === 'artes') return 'artes';
  if (clean === 'ingles' || clean === 'linguainglesa') return 'ingles';
  if (clean === 'espanhol' || clean === 'linguaespanhola') return 'espanhol';
  if (clean === 'filosofia') return 'filosofia';
  if (clean === 'sociologia') return 'sociologia';
  if (clean === 'redacao' || clean === 'producaodetexto') return 'redacao';
  return clean;
};

export const isSameSubject = (s1?: string, s2?: string): boolean => {
  if (!s1 || !s2) return false;
  return normalizeSubjectName(s1) === normalizeSubjectName(s2);
};

export const getNormalizedTeacherFirstName = (name?: string): string => {
  if (!name) return '';
  const clean = name.trim().toLowerCase()
    .replace(/^profª?\.?\s+/i, '')
    .replace(/^professor[a]?\s+/i, '')
    .replace(/^tio|tia\s+/i, '')
    .trim();
  return clean.split(/[\s\-_]+/)[0] || '';
};

export const isSameTeacher = (t1Id?: string, t1Name?: string, t2Id?: string, t2Name?: string): boolean => {
  if (t1Id && t2Id && t1Id === t2Id) return true;
  if (!t1Name || !t2Name) return false;
  if (t1Name.trim().toLowerCase() === t2Name.trim().toLowerCase()) return true;
  const fn1 = getNormalizedTeacherFirstName(t1Name);
  const fn2 = getNormalizedTeacherFirstName(t2Name);
  if (fn1.length >= 3 && fn1 === fn2) return true; // Gilva resource constraint
  return false;
};
