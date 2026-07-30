import { Teacher, SchoolClass, ScheduleSlot, DayOfWeek } from '../types';
import { LessonUnit } from './types';
import { TeacherIndex } from './TeacherIndex';
import { ClassIndex } from './ClassIndex';
import { AvailabilityIndex } from './AvailabilityIndex';
import { ConstraintValidator } from './ConstraintValidator';

export class GreedyAllocator {
  private days: DayOfWeek[] = ['segunda', 'quarta', 'terca', 'quinta', 'sexta'];

  public allocate(
    lessons: LessonUnit[],
    teachers: Teacher[],
    classes: SchoolClass[],
    teacherIndex: TeacherIndex,
    classIndex: ClassIndex,
    availabilityIndex: AvailabilityIndex,
    existingSlots: ScheduleSlot[] = []
  ): { slots: ScheduleSlot[]; conflicts: string[] } {
    const slots: ScheduleSlot[] = [...existingSlots];
    const conflicts: string[] = [];
    const unallocatedLessons: LessonUnit[] = [];

    for (const lesson of lessons) {
      const cls = classIndex.getById(lesson.classId);
      if (!cls) continue;

      const clsBlocks = classIndex.getTimeBlocks(cls.id).filter(b => !b.is_interval);
      const is678 = classIndex.is678(cls.id);

      const eligibleTeachers = teacherIndex.getBySubject(lesson.subject).filter(t =>
        (!t.class_ids || t.class_ids.length === 0 || t.class_ids.includes(cls.id)) &&
        (!t.groups || t.groups.length === 0 || t.groups.includes(cls.group))
      );

      const fallbackTeachers = eligibleTeachers.length > 0 ? eligibleTeachers : teachers;
      if (fallbackTeachers.length === 0) continue;

      fallbackTeachers.sort((a, b) => {
        let freeA = 0, freeB = 0;
        for (const d of this.days) {
          for (let s = 1; s <= 6; s++) {
            if (availabilityIndex.isAvailable(a.id, d, s)) freeA++;
            if (availabilityIndex.isAvailable(b.id, d, s)) freeB++;
          }
        }
        return freeA - freeB;
      });

      let assigned = false;

      // First pass: Try strictly valid slots
      for (const day of this.days) {
        if (assigned) break;
        const isShortDay = is678 && (day === 'segunda' || day === 'quarta' || day === 'sexta');
        const maxIdx = isShortDay ? Math.min(5, clsBlocks.length) : clsBlocks.length;

        for (let idx = 0; idx < maxIdx; idx++) {
          if (assigned) break;
          const block = clsBlocks[idx];

          const isOccupied = slots.some(s =>
            s.class_id === cls.id &&
            s.day_of_week === day &&
            s.start_time === block.start_time
          );

          if (isOccupied) continue;

          for (const teacher of fallbackTeachers) {
            const candidate = {
              class_id: cls.id,
              teacher_id: teacher.id,
              subject: lesson.subject,
              day_of_week: day,
              start_time: block.start_time,
              end_time: block.end_time
            };

            const validation = ConstraintValidator.isValid(
              candidate,
              slots,
              teachers,
              classes,
              availabilityIndex,
              classIndex
            );

            if (validation.isValid) {
              slots.push({
                id: crypto.randomUUID(),
                ...candidate
              });
              assigned = true;
              break;
            }
          }
        }
      }

      if (!assigned) {
        unallocatedLessons.push(lesson);
      }
    }

    // Second pass: Force allocate remaining unallocated lessons into ANY empty slot without horários vagos
    for (const lesson of unallocatedLessons) {
      const cls = classIndex.getById(lesson.classId);
      if (!cls) continue;

      const clsBlocks = classIndex.getTimeBlocks(cls.id).filter(b => !b.is_interval);
      const is678 = classIndex.is678(cls.id);
      const eligibleTeachers = teacherIndex.getBySubject(lesson.subject);
      const teacher = eligibleTeachers.length > 0 ? eligibleTeachers[0] : teachers[0];
      if (!teacher) continue;

      let forced = false;
      for (const day of this.days) {
        if (forced) break;
        const isShortDay = is678 && (day === 'segunda' || day === 'quarta' || day === 'sexta');
        const maxIdx = isShortDay ? Math.min(5, clsBlocks.length) : clsBlocks.length;

        for (let idx = 0; idx < maxIdx; idx++) {
          if (forced) break;
          const block = clsBlocks[idx];

          const isOccupied = slots.some(s =>
            s.class_id === cls.id &&
            s.day_of_week === day &&
            s.start_time === block.start_time
          );

          if (!isOccupied) {
            slots.push({
              id: crypto.randomUUID(),
              class_id: cls.id,
              teacher_id: teacher.id,
              subject: lesson.subject,
              day_of_week: day,
              start_time: block.start_time,
              end_time: block.end_time
            });
            forced = true;
          }
        }
      }
    }

    return { slots, conflicts };
  }
}
