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

          // 1. available_days
          if (t.available_days && Array.isArray(t.available_days) && t.available_days.length > 0 && !t.available_days.includes(day)) {
            isAvailable = false;
          }

          // 2. availability_shift
          const isMorningSlot = slotNum <= 6;
          if (t.availability_shift === 'matutino' && !isMorningSlot) {
            isAvailable = false;
          } else if (t.availability_shift === 'vespertino' && isMorningSlot) {
            isAvailable = false;
          }

          // 3. available_slots
          if (t.available_slots && Array.isArray(t.available_slots) && t.available_slots.length > 0) {
            if (!t.available_slots.includes(slotNum)) {
              isAvailable = false;
            }
          }

          // 4. availability_grid
          if (t.availability_grid && typeof t.availability_grid === 'object') {
            const keyDash = `${day}-${slotNum}`;
            const keyUnderscore = `${day}_${slotNum}`;
            if (t.availability_grid[keyDash] === false || t.availability_grid[keyUnderscore] === false) {
              isAvailable = false;
            }
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
    if (!dayMap) return false;
    const slotMap = dayMap.get(day);
    if (!slotMap) return false;
    const avail = slotMap.get(slotNumber);
    return avail === true;
  }
}
