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

    for (const lesson of lessons) {
      const cls = classIndex.getById(lesson.classId);
      if (!cls) continue;

      const clsBlocks = classIndex.getTimeBlocks(cls.id).filter(b => !b.is_interval);
      const is678 = classIndex.is678(cls.id);

      const eligibleTeachers = teacherIndex.getBySubject(lesson.subject).filter(t =>
        (!t.class_ids || t.class_ids.length === 0 || t.class_ids.includes(cls.id)) &&
        (!t.groups || t.groups.length === 0 || t.groups.includes(cls.group))
      );

      if (eligibleTeachers.length === 0) {
        const msg = `Turma ${cls.name}: Nenhum professor habilitado para ${lesson.subject}.`;
        if (!conflicts.includes(msg)) conflicts.push(msg);
        continue;
      }

      eligibleTeachers.sort((a, b) => {
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

      for (const day of this.days) {
        if (assigned) break;
        const isShortDay = is678 && (day === 'segunda' || day === 'quarta' || day === 'sexta');
        const maxIdx = isShortDay ? Math.min(5, clsBlocks.length) : clsBlocks.length;

        const blockIndices = Array.from({ length: maxIdx }, (_, i) => i);
        const mixedIndices: number[] = [];
        let left = 0, right = blockIndices.length - 1;
        while (left <= right) {
          if (left === right) {
            mixedIndices.push(blockIndices[left]);
          } else {
            mixedIndices.push(blockIndices[left]);
            mixedIndices.push(blockIndices[right]);
          }
          left++;
          right--;
        }

        for (const idx of mixedIndices) {
          if (assigned) break;
          const block = clsBlocks[idx];

          for (const teacher of eligibleTeachers) {
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
        const msg = `Não foi possível alocar ${lesson.subject} para a turma ${cls.name} (conflito de horários ou indisponibilidade).`;
        if (!conflicts.includes(msg)) conflicts.push(msg);
      }
    }

    return { slots, conflicts };
  }
}
