// core/scoring.ts

import { CompleteSchedule, InputData } from './types';
import { BitSet } from './BitSet';

export interface ScoreWeights {
  // Hard constraints (nunca podem ser violadas)
  teacherDoubleBooked: number;
  classDoubleBooked: number;
  teacherUnavailable: number;
  exceedsDailyLimitTeacher: number;
  exceedsDailyLimitClass: number;
  wrongShift: number;
  blockedDay: number;

  // Soft constraints
  teacherWindow: number;
  classWindow: number;
  firstSlot: number;
  lastSlot: number;
  consecutiveLessons: number;       // por aula além do máximo preferido
  singleDayTeacher: number;         // professor com apenas 1 aula no dia
  unevenDistribution: number;       // variância da carga diária
  preferredDayNotMet: number;
  preferredPeriodNotMet: number;
}

export const DEFAULT_WEIGHTS: ScoreWeights = {
  teacherDoubleBooked: 1_000_000,
  classDoubleBooked: 1_000_000,
  teacherUnavailable: 1_000_000,
  exceedsDailyLimitTeacher: 1_000_000,
  exceedsDailyLimitClass: 1_000_000,
  wrongShift: 1_000_000,
  blockedDay: 1_000_000,

  teacherWindow: 50,
  classWindow: 30,
  firstSlot: 5,
  lastSlot: 5,
  consecutiveLessons: 25,
  singleDayTeacher: 20,
  unevenDistribution: 10,
  preferredDayNotMet: 8,
  preferredPeriodNotMet: 4,
};

export class ScoringEngine {
  constructor(private weights: ScoreWeights = DEFAULT_WEIGHTS) {}

  /**
   * Avalia um horário completo.
   * Retorna um objeto com pontuação total e detalhamento.
   */
  evaluate(schedule: CompleteSchedule, data: InputData): { total: number; details: Partial<Record<keyof ScoreWeights, number>> } {
    const details: any = {};
    let total = 0;

    // Estruturas auxiliares
    const totalSlots = data.days * data.periodsPerDay;

    // Mapa professor -> conjunto de slots ocupados
    const teacherSlots = new Map<string, BitSet>();
    // Mapa turma -> conjunto de slots ocupados
    const classSlots = new Map<string, BitSet>();
    // Contagem diária professor/dia
    const teacherDaily = new Map<string, Uint8Array>();
    const classDaily = new Map<string, Uint8Array>();

    // Inicializar BitSets e arrays diários
    for (const t of data.teachers) {
      teacherSlots.set(t.id, new BitSet(totalSlots));
      teacherDaily.set(t.id, new Uint8Array(data.days));
    }
    for (const c of data.classes) {
      classSlots.set(c.id, new BitSet(totalSlots));
      classDaily.set(c.id, new Uint8Array(data.days));
    }

    // Percorrer o horário para contabilizar violações hard
    let teacherDoubleBooked = 0;
    let classDoubleBooked = 0;
    let teacherUnavailable = 0;
    let exceedsDailyLimitTeacher = 0;
    let exceedsDailyLimitClass = 0;

    // Mapeamentos para disponibilidade (pré‑processados)
    const availBits = new Map<string, BitSet>();
    for (const t of data.teachers) {
      const bs = new BitSet(totalSlots);
      if (t.availability) {
        for (const av of t.availability) {
          bs.set(av.day * data.periodsPerDay + av.period);
        }
      }
      availBits.set(t.id, bs);
    }

    for (const entry of schedule) {
      const slot = entry.day * data.periodsPerDay + entry.period;

      // Professor duplicado
      const tSlots = teacherSlots.get(entry.teacherId);
      if (tSlots) {
        if (tSlots.has(slot)) {
          teacherDoubleBooked++;
        }
        tSlots.set(slot);
      }

      // Turma duplicada
      const cSlots = classSlots.get(entry.classId);
      if (cSlots) {
        if (cSlots.has(slot)) {
          classDoubleBooked++;
        }
        cSlots.set(slot);
      }

      // Disponibilidade
      const avail = availBits.get(entry.teacherId);
      if (avail && !avail.has(slot)) {
        teacherUnavailable++;
      }

      // Limites diários
      const tDay = teacherDaily.get(entry.teacherId);
      if (tDay) tDay[entry.day]++;

      const cDay = classDaily.get(entry.classId);
      if (cDay) cDay[entry.day]++;
    }

    // Verificar limites diários após contagem
    for (const t of data.teachers) {
      const dayArr = teacherDaily.get(t.id);
      if (!dayArr) continue;
      for (let d = 0; d < data.days; d++) {
        if (dayArr[d] > t.maxLessonsPerDay) {
          exceedsDailyLimitTeacher += (dayArr[d] - t.maxLessonsPerDay);
        }
      }
    }
    for (const c of data.classes) {
      const dayArr = classDaily.get(c.id);
      if (!dayArr) continue;
      for (let d = 0; d < data.days; d++) {
        if (dayArr[d] > c.maxLessonsPerDay) {
          exceedsDailyLimitClass += (dayArr[d] - c.maxLessonsPerDay);
        }
      }
    }

    total += teacherDoubleBooked * this.weights.teacherDoubleBooked;
    total += classDoubleBooked * this.weights.classDoubleBooked;
    total += teacherUnavailable * this.weights.teacherUnavailable;
    total += exceedsDailyLimitTeacher * this.weights.exceedsDailyLimitTeacher;
    total += exceedsDailyLimitClass * this.weights.exceedsDailyLimitClass;

    details.teacherDoubleBooked = teacherDoubleBooked;
    details.classDoubleBooked = classDoubleBooked;
    details.teacherUnavailable = teacherUnavailable;
    details.exceedsDailyLimitTeacher = exceedsDailyLimitTeacher;
    details.exceedsDailyLimitClass = exceedsDailyLimitClass;

    return { total, details };
  }
}
