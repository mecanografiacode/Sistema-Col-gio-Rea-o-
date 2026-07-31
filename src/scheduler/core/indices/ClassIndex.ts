// core/indices/ClassIndex.ts

import { InputData } from '../types';
import { BitSet } from '../BitSet';

export class ClassIndex {
  private maxDaily: Uint8Array[];
  private dailyCounts: Uint8Array[];
  private occupiedSlots: BitSet[];
  private days: number;
  private idToIndex: Map<string, number>;

  constructor(data: InputData) {
    this.days = data.days;
    const totalSlots = data.days * data.periodsPerDay;
    const n = data.classes.length;

    this.maxDaily = new Array(n);
    this.dailyCounts = new Array(n);
    this.occupiedSlots = new Array(n);
    this.idToIndex = new Map();

    data.classes.forEach((c, i) => {
      this.idToIndex.set(c.id, i);
      this.maxDaily[i] = new Uint8Array(data.days);
      this.maxDaily[i].fill(c.maxLessonsPerDay);
      this.dailyCounts[i] = new Uint8Array(data.days);
      this.occupiedSlots[i] = new BitSet(totalSlots);
    });
  }

  private idx(classId: string): number {
    return this.idToIndex.get(classId)!;
  }

  canAddLesson(classId: string, day: number): boolean {
    const i = this.idx(classId);
    if (i === undefined) return false;
    return this.dailyCounts[i][day] < this.maxDaily[i][day];
  }

  addLesson(classId: string, day: number, slotIndex: number): void {
    const i = this.idx(classId);
    if (i === undefined) return;
    this.dailyCounts[i][day]++;
    this.occupiedSlots[i].set(slotIndex);
  }

  removeLesson(classId: string, day: number, slotIndex: number): void {
    const i = this.idx(classId);
    if (i === undefined) return;
    if (this.dailyCounts[i][day] > 0) this.dailyCounts[i][day]--;
    this.occupiedSlots[i].clear(slotIndex);
  }

  isOccupied(classId: string, slotIndex: number): boolean {
    const i = this.idx(classId);
    if (i === undefined) return false;
    return this.occupiedSlots[i].has(slotIndex);
  }

  getDailyCount(classId: string, day: number): number {
    const i = this.idx(classId);
    if (i === undefined) return 0;
    return this.dailyCounts[i][day];
  }
}
