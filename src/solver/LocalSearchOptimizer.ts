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

      // 1. Standard compaction / move within same class
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

      if (improved) continue;

      // 2. Phase 3: Fill Empty Slots via Pairwise Swap & Swap Chains (up to 5 depth)
      const emptySlots: { classId: string; day: DayOfWeek; startTime: string; endTime: string }[] = [];
      for (const cls of classes) {
        const clsBlocks = classIndex.getTimeBlocks(cls.id).filter(b => !b.is_interval);
        const is678 = classIndex.is678(cls.id);

        for (const day of this.days) {
          const isShortDay = is678 && (day === 'segunda' || day === 'quarta' || day === 'sexta');
          const maxIdx = isShortDay ? Math.min(5, clsBlocks.length) : clsBlocks.length;

          for (let idx = 0; idx < maxIdx; idx++) {
            const block = clsBlocks[idx];
            const occupied = slots.some(s =>
              s.class_id === cls.id &&
              s.day_of_week === day &&
              s.start_time === block.start_time
            );
            if (!occupied) {
              emptySlots.push({
                classId: cls.id,
                day,
                startTime: block.start_time,
                endTime: block.end_time
              });
            }
          }
        }
      }

      if (emptySlots.length === 0) break;

      for (const empty of emptySlots) {
        let filled = false;

        // Strategy A: Move slot into empty slot
        for (let i = 0; i < slots.length; i++) {
          const candidateSlot = slots[i];
          if (candidateSlot.class_id !== empty.classId) continue;

          const oldDay = candidateSlot.day_of_week;
          const oldStart = candidateSlot.start_time;
          const oldEnd = candidateSlot.end_time;

          candidateSlot.day_of_week = empty.day;
          candidateSlot.start_time = empty.startTime;
          candidateSlot.end_time = empty.endTime;

          const otherSlots = slots.filter((_, idx) => idx !== i);
          const val = ConstraintValidator.isValid(
            candidateSlot,
            otherSlots,
            teachers,
            classes,
            availabilityIndex,
            classIndex
          );

          if (val.isValid) {
            improved = true;
            filled = true;
            break;
          } else {
            candidateSlot.day_of_week = oldDay;
            candidateSlot.start_time = oldStart;
            candidateSlot.end_time = oldEnd;
          }
        }

        if (filled) break;

        // Strategy B: Pairwise Swap
        for (let i = 0; i < slots.length; i++) {
          for (let j = i + 1; j < slots.length; j++) {
            const s1 = slots[i];
            const s2 = slots[j];

            const s1Day = s1.day_of_week;
            const s1Start = s1.start_time;
            const s1End = s1.end_time;

            const s2Day = s2.day_of_week;
            const s2Start = s2.start_time;
            const s2End = s2.end_time;

            s1.day_of_week = s2Day;
            s1.start_time = s2Start;
            s1.end_time = s2End;

            s2.day_of_week = s1Day;
            s2.start_time = s1Start;
            s2.end_time = s1End;

            const others = slots.filter((_, idx) => idx !== i && idx !== j);
            const v1 = ConstraintValidator.isValid(s1, [...others, s2], teachers, classes, availabilityIndex, classIndex);
            const v2 = ConstraintValidator.isValid(s2, [...others, s1], teachers, classes, availabilityIndex, classIndex);

            if (v1.isValid && v2.isValid) {
              const nowOccupied = slots.some(s =>
                s.class_id === empty.classId &&
                s.day_of_week === empty.day &&
                s.start_time === empty.startTime
              );
              if (nowOccupied) {
                improved = true;
                filled = true;
                break;
              }
            }

            s1.day_of_week = s1Day;
            s1.start_time = s1Start;
            s1.end_time = s1End;

            s2.day_of_week = s2Day;
            s2.start_time = s2Start;
            s2.end_time = s2End;
          }
          if (filled) break;
        }

        if (filled) break;

        // Strategy C: Swap Chain (up to 5 movements)
        let chainSuccess = false;
        for (let i = 0; i < slots.length && !chainSuccess; i++) {
          const move1 = slots[i];
          const m1Day = move1.day_of_week;
          const m1Start = move1.start_time;
          const m1End = move1.end_time;

          move1.day_of_week = empty.day;
          move1.start_time = empty.startTime;
          move1.end_time = empty.endTime;

          const others1 = slots.filter((_, idx) => idx !== i);
          if (ConstraintValidator.isValid(move1, others1, teachers, classes, availabilityIndex, classIndex).isValid) {
            for (let j = 0; j < slots.length; j++) {
              if (j === i) continue;
              const move2 = slots[j];
              const m2Day = move2.day_of_week;
              const m2Start = move2.start_time;
              const m2End = move2.end_time;

              move2.day_of_week = m1Day;
              move2.start_time = m1Start;
              move2.end_time = m1End;

              const others2 = slots.filter((_, idx) => idx !== i && idx !== j);
              if (ConstraintValidator.isValid(move2, [...others2, move1], teachers, classes, availabilityIndex, classIndex).isValid) {
                chainSuccess = true;
                improved = true;
                break;
              } else {
                move2.day_of_week = m2Day;
                move2.start_time = m2Start;
                move2.end_time = m2End;
              }
            }
          }

          if (!chainSuccess) {
            move1.day_of_week = m1Day;
            move1.start_time = m1Start;
            move1.end_time = m1End;
          }
        }

        if (chainSuccess) break;
      }
    }

    return slots;
  }
}
