import { ScheduleSlot, Teacher, SchoolClass, DayOfWeek } from '../types';
import { ConstraintValidator } from './ConstraintValidator';
import { AvailabilityIndex } from './AvailabilityIndex';
import { ClassIndex } from './ClassIndex';

export class LocalSearchOptimizer {
  private static days: DayOfWeek[] = ['segunda', 'terca', 'quarta', 'quinta', 'sexta'];

  public static optimize(
    slots: ScheduleSlot[],
    teachers: Teacher[],
    classes: SchoolClass[],
    availabilityIndex: AvailabilityIndex,
    classIndex: ClassIndex
  ): ScheduleSlot[] {
    let improved = true;
    let iterations = 0;
    const maxIterations = 50;

    while (improved && iterations < maxIterations) {
      improved = false;
      iterations++;

      // Standard compaction / move within same class
      for (let i = 0; i < slots.length; i++) {
        const slot = slots[i];
        const clsBlocks = classIndex.getTimeBlocks(slot.class_id).filter(b => !b.is_interval);

        for (const block of clsBlocks) {
          const isOccupied = slots.some(s =>
            s.class_id === slot.class_id &&
            s.day_of_week === slot.day_of_week &&
            s.start_time === block.start_time
          );

          if (!isOccupied) {
            const originalStart = slot.start_time;
            const originalEnd = slot.end_time;

            slot.start_time = block.start_time;
            slot.end_time = block.end_time;

            const otherSlots = slots.filter((_, idx) => idx !== i);
            const validation = ConstraintValidator.isValid(
              slot,
              otherSlots,
              teachers,
              classes,
              availabilityIndex,
              classIndex
            );

            if (validation.isValid) {
              improved = true;
              break;
            } else {
              slot.start_time = originalStart;
              slot.end_time = originalEnd;
            }
          }
        }
        if (improved) break;
      }
    }

    return slots;
  }
}
