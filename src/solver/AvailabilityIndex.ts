import { Teacher, DayOfWeek, TimeBlock } from '../types';

export class AvailabilityIndex {
  private matrix = new Map<string, Map<DayOfWeek, Map<number, boolean>>>();
  private days: DayOfWeek[] = ['segunda', 'terca', 'quarta', 'quinta', 'sexta'];

  constructor(teachers: Teacher[], timeBlocksMap: (classId: string) => TimeBlock[]) {
    for (const t of teachers) {
      const dayMap = new Map<DayOfWeek, Map<number, boolean>>();
      
      for (const day of this.days) {
        const slotMap = new Map<number, boolean>();
        for (let slotNum = 1; slotNum <= 10; slotNum++) {
          let isAvailable = true;

          if (t.available_days && t.available_days.length > 0 && !t.available_days.includes(day)) {
            isAvailable = false;
          }

          if (t.availability_grid && t.availability_grid[`${day}-${slotNum}`] === false) {
            isAvailable = false;
          }

          slotMap.set(slotNum, isAvailable);
        }
        dayMap.set(day, slotMap);
      }
      this.matrix.set(t.id, dayMap);
    }
  }

  public isAvailable(teacherId: string, day: DayOfWeek, slotNumber: number): boolean {
    const dayMap = this.matrix.get(teacherId);
    if (!dayMap) return true;
    const slotMap = dayMap.get(day);
    if (!slotMap) return true;
    const avail = slotMap.get(slotNumber);
    return avail !== undefined ? avail : true;
  }
}
