// validator/InputValidator.ts

import { InputData } from '../core/types';

export class InputValidator {
  validate(data: InputData): string[] {
    const errors: string[] = [];
    if (data.days <= 0) errors.push('Número de dias deve ser positivo.');
    if (data.periodsPerDay <= 0) errors.push('Número de períodos por dia deve ser positivo.');

    const teacherIds = new Set(data.teachers.map(t => t.id));
    const classIds = new Set(data.classes.map(c => c.id));
    const subjectIds = new Set(data.subjects.map(s => s.id));

    for (const req of data.lessonRequirements) {
      if (!teacherIds.has(req.teacherId)) errors.push(`Professor ${req.teacherId} não encontrado.`);
      if (!classIds.has(req.classId)) errors.push(`Turma ${req.classId} não encontrada.`);
      if (!subjectIds.has(req.subjectId)) errors.push(`Disciplina ${req.subjectId} não encontrada.`);
      if (req.weeklyCount <= 0) errors.push(`Carga horária inválida para ${req.subjectId} na turma ${req.classId}.`);
    }

    return errors;
  }
}
