import { SchoolClass, TimeBlock } from '../types';
import { getClassShift, is678Grade, timeToMinutes } from './types';

export class ClassIndex {
  private classesMap = new Map<string, SchoolClass>();
  private shiftMap = new Map<string, SchoolClass[]>();
  private timeBlocksMap = new Map<string, TimeBlock[]>();
  private activeBlocks: TimeBlock[] = [];

  constructor(classes: SchoolClass[], timeBlocks: TimeBlock[]) {
    for (const c of classes) {
      this.classesMap.set(c.id, c);
      const shift = getClassShift(c);
      if (!this.shiftMap.has(shift)) {
        this.shiftMap.set(shift, []);
      }
      this.shiftMap.get(shift)!.push(c);
    }

    this.activeBlocks = [...timeBlocks];
    if (this.activeBlocks.length === 0) {
      for (const c of classes) {
        const isAfternoon = getClassShift(c) === 'vespertino';
        const defaultBlocks: TimeBlock[] = isAfternoon ? [
          { id: crypto.randomUUID(), class_id: c.id, start_time: '13:30', end_time: '14:20', is_interval: false },
          { id: crypto.randomUUID(), class_id: c.id, start_time: '14:20', end_time: '15:10', is_interval: false },
          { id: crypto.randomUUID(), class_id: c.id, start_time: '15:10', end_time: '16:00', is_interval: false },
          { id: crypto.randomUUID(), class_id: c.id, start_time: '16:00', end_time: '16:20', is_interval: true },
          { id: crypto.randomUUID(), class_id: c.id, start_time: '16:20', end_time: '17:10', is_interval: false },
          { id: crypto.randomUUID(), class_id: c.id, start_time: '17:10', end_time: '18:00', is_interval: false },
          { id: crypto.randomUUID(), class_id: c.id, start_time: '18:00', end_time: '18:50', is_interval: false }
        ] : [
          { id: crypto.randomUUID(), class_id: c.id, start_time: '07:15', end_time: '08:05', is_interval: false },
          { id: crypto.randomUUID(), class_id: c.id, start_time: '08:05', end_time: '08:55', is_interval: false },
          { id: crypto.randomUUID(), class_id: c.id, start_time: '08:55', end_time: '09:10', is_interval: true },
          { id: crypto.randomUUID(), class_id: c.id, start_time: '09:10', end_time: '10:00', is_interval: false },
          { id: crypto.randomUUID(), class_id: c.id, start_time: '10:00', end_time: '10:50', is_interval: false },
          { id: crypto.randomUUID(), class_id: c.id, start_time: '10:50', end_time: '11:40', is_interval: false },
          { id: crypto.randomUUID(), class_id: c.id, start_time: '11:40', end_time: '12:30', is_interval: false }
        ];
        this.activeBlocks.push(...defaultBlocks);
      }
    }

    for (const b of this.activeBlocks) {
      if (!this.timeBlocksMap.has(b.class_id)) {
        this.timeBlocksMap.set(b.class_id, []);
      }
      this.timeBlocksMap.get(b.class_id)!.push(b);
    }

    for (const [cid, blocks] of this.timeBlocksMap.entries()) {
      blocks.sort((a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time));
    }
  }

  public getById(id: string): SchoolClass | undefined {
    return this.classesMap.get(id);
  }

  public getAll(): SchoolClass[] {
    return Array.from(this.classesMap.values());
  }

  public getTimeBlocks(classId: string): TimeBlock[] {
    return this.timeBlocksMap.get(classId) || [];
  }

  public is678(classId: string): boolean {
    const c = this.getById(classId);
    return c ? is678Grade(c.name) : false;
  }
}
