// core/indices/TeacherIndex.ts

import { InputData } from '../types';
import { BitSet } from '../BitSet';

export class TeacherIndex {
  private maxDaily: Uint8Array[];       // teacherIndex -> array de máximos (por dia)
  private dailyCounts: Uint8Array[];    // cada Uint8Array tem length = days
  private occupiedSlots: BitSet[];      // cada BitSet cobre todos os slots
  private days: number;
  private periodsPerDay: number;

  // Mapeamento id -> índice interno
  private idToIndex: Map<string, number>;

  constructor(data: InputData) {
    this.days = data.days;
    this.periodsPerDay = data.periodsPerDay;
    const totalSlots = data.days * data.periodsPerDay;
    const n = data.teachers.length;

    this.maxDaily = new Array(n);
    this.dailyCounts = new Array(n);
    this.occupiedSlots = new Array(n);
    this.idToIndex = new Map();

    data.teachers.forEach((t, i) => {
      this.idToIndex.set(t.id, i);
      this.maxDaily[i] = new Uint8Array(data.days);
      this.maxDaily[i].fill(t.maxLessonsPerDay);
      this.dailyCounts[i] = new Uint8Array(data.days);
      this.occupiedSlots[i] = new BitSet(totalSlots);
    });
  }

  private idx(teacherId: string): number {
    return this.idToIndex.get(teacherId)!;
  }

  canAddLesson(teacherId: string, day: number): boolean {
    const i = this.idx(teacherId);
    if (i === undefined) return false;
    return this.dailyCounts[i][day] < this.maxDaily[i][day];
  }

  addLesson(teacherId: string, day: number, slotIndex: number): void {
    const i = this.idx(teacherId);
    if (i === undefined) return;
    this.dailyCounts[i][day]++;
    this.occupiedSlots[i].set(slotIndex);
  }

  removeLesson(teacherId: string, day: number, slotIndex: number): void {
    const i = this.idx(teacherId);
    if (i === undefined) return;
    if (this.dailyCounts[i][day] > 0) this.dailyCounts[i][day]--;
    this.occupiedSlots[i].clear(slotIndex);
  }

  isOccupied(teacherId: string, slotIndex: number): boolean {
    const i = this.idx(teacherId);
    if (i === undefined) return false;
    return this.occupiedSlots[i].has(slotIndex);
  }

  getDailyCount(teacherId: string, day: number): number {
    const i = this.idx(teacherId);
    if (i === undefined) return 0;
    return this.dailyCounts[i][day];
  }

  getAvailableSlots(teacherId: string, baseDomain: BitSet): BitSet {
    const i = this.idx(teacherId);
    if (i === undefined) return new BitSet(baseDomain.size);
    const available = baseDomain.clone();
    available.andNot(this.occupiedSlots[i]);
    return available;
  }
}
