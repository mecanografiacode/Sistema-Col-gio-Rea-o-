import { ScheduleSlot, Teacher, SchoolClass, DayOfWeek } from '../types';
import { isSameTeacher, timeToMinutes, timesOverlap } from './types';
import { AvailabilityIndex } from './AvailabilityIndex';
import { ClassIndex } from './ClassIndex';

export class ConstraintValidator {
  public static isValid(
    candidate: { class_id: string; teacher_id: string; subject: string; day_of_week: DayOfWeek; start_time: string; end_time: string },
    currentSlots: ScheduleSlot[],
    teachers: Teacher[],
    classes: SchoolClass[],
    availabilityIndex: AvailabilityIndex,
    classIndex: ClassIndex
  ): { isValid: boolean; reason?: string } {
    const teacher = teachers.find(t => t.id === candidate.teacher_id);
    const cls = classes.find(c => c.id === candidate.class_id);

    if (!teacher || !cls) {
      return { isValid: false, reason: 'Professor ou Turma não encontrados.' };
    }

    if (teacher.available_days && teacher.available_days.length > 0 && !teacher.available_days.includes(candidate.day_of_week)) {
      return { isValid: false, reason: `Professor indisponível na ${candidate.day_of_week}.` };
    }

    const clsBlocks = classIndex.getTimeBlocks(cls.id);
    const bIdx = clsBlocks.findIndex(b => b.start_time === candidate.start_time && !b.is_interval);
    if (bIdx >= 0) {
      const slotNum = bIdx + 1;
      if (!availabilityIndex.isAvailable(teacher.id, candidate.day_of_week, slotNum)) {
        return { isValid: false, reason: 'Professor indisponível neste horário (Grid).' };
      }
    }

    const startMin = timeToMinutes(candidate.start_time);
    const isMorning = startMin < 780;
    if (teacher.availability_shift === 'matutino' && !isMorning) {
      return { isValid: false, reason: 'Turno matutino obrigatório para o professor.' };
    }
    if (teacher.availability_shift === 'vespertino' && isMorning) {
      return { isValid: false, reason: 'Turno vespertino obrigatório para o professor.' };
    }

    const teacherBusy = currentSlots.some(s => {
      if (s.day_of_week !== candidate.day_of_week) return false;
      if (!timesOverlap(s.start_time, s.end_time, candidate.start_time, candidate.end_time)) return false;
      const sTeacher = teachers.find(t => t.id === s.teacher_id);
      return isSameTeacher(s.teacher_id, sTeacher?.name, teacher.id, teacher.name);
    });
    if (teacherBusy) {
      return { isValid: false, reason: 'Professor já alocado em outra turma neste horário.' };
    }

    const classBusy = currentSlots.some(s =>
      s.class_id === candidate.class_id &&
      s.day_of_week === candidate.day_of_week &&
      timesOverlap(s.start_time, s.end_time, candidate.start_time, candidate.end_time)
    );
    if (classBusy) {
      return { isValid: false, reason: 'Turma já possui aula neste horário.' };
    }

    const sameSubjectDay = currentSlots.filter(s =>
      s.class_id === candidate.class_id &&
      s.day_of_week === candidate.day_of_week &&
      s.subject.toLowerCase() === candidate.subject.toLowerCase()
    );
    if (sameSubjectDay.length >= 2) {
      return { isValid: false, reason: 'Máximo de 2 aulas da mesma disciplina por dia atingido.' };
    }

    const workloads = cls.subject_workloads || {};
    if (Object.keys(workloads).length > 0) {
      let targetWorkload = 0;
      for (const [sub, h] of Object.entries(workloads)) {
        if (sub.toLowerCase() === candidate.subject.toLowerCase() && typeof h === 'number') {
          targetWorkload = h;
          break;
        }
      }
      const currentWeekly = currentSlots.filter(s => s.class_id === cls.id && s.subject.toLowerCase() === candidate.subject.toLowerCase()).length;
      if (targetWorkload === 0 || currentWeekly >= targetWorkload) {
        return { isValid: false, reason: 'Carga horária semanal da disciplina na turma já preenchida ou disciplina não vinculada à turma.' };
      }
    }

    return { isValid: true };
  }
}
