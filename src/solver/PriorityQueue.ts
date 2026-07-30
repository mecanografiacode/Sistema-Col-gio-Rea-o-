import { Teacher, SchoolClass, DayOfWeek } from '../types';
import { LessonUnit, isSameSubject } from './types';
import { TeacherIndex } from './TeacherIndex';
import { AvailabilityIndex } from './AvailabilityIndex';

export class PriorityQueue {
  public static computeAndSort(
    classes: SchoolClass[],
    teachers: Teacher[],
    teacherIndex: TeacherIndex,
    availabilityIndex: AvailabilityIndex,
    days: DayOfWeek[]
  ): LessonUnit[] {
    const lessons: LessonUnit[] = [];

    const teacherDifficulty = new Map<string, number>();
    for (const t of teachers) {
      let freeSlots = 0;
      for (const d of days) {
        for (let s = 1; s <= 6; s++) {
          if (availabilityIndex.isAvailable(t.id, d, s)) freeSlots++;
        }
      }
      let neededWorkload = 0;
      for (const c of classes) {
        if (!t.class_ids || t.class_ids.length === 0 || t.class_ids.includes(c.id)) {
          const workloads = c.subject_workloads || {};
          for (const [sub, h] of Object.entries(workloads)) {
            if ((t.subjects || []).some(ts => isSameSubject(ts, sub)) && typeof h === 'number') {
              neededWorkload += h;
            }
          }
        }
      }
      const difficulty = freeSlots > 0 ? neededWorkload / freeSlots : 999;
      teacherDifficulty.set(t.id, difficulty);
    }

    for (const cls of classes) {
      const workloads = cls.subject_workloads || {};
      for (const [sub, h] of Object.entries(workloads)) {
        if (typeof h === 'number' && h > 0) {
          const eligibleTeachers = teacherIndex.getBySubject(sub).filter(t =>
            (!t.class_ids || t.class_ids.length === 0 || t.class_ids.includes(cls.id)) &&
            (!t.groups || t.groups.length === 0 || t.groups.includes(cls.group))
          );
          const teacherCount = eligibleTeachers.length;
          const maxDiff = eligibleTeachers.reduce((max, t) => Math.max(max, teacherDifficulty.get(t.id) || 1), 1);

          const priorityScore = (h * 10) + ((5 / Math.max(1, teacherCount)) * 15) + (maxDiff * 20);

          for (let i = 0; i < h; i++) {
            lessons.push({
              id: crypto.randomUUID(),
              classId: cls.id,
              className: cls.name,
              subject: sub,
              workload: h,
              priorityScore
            });
          }
        }
      }
    }

    lessons.sort((a, b) => b.priorityScore - a.priorityScore);
    return lessons;
  }
}
