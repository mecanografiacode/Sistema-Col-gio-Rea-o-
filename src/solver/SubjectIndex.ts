import { Subject, SchoolClass, Teacher } from '../types';
import { normalizeSubjectName } from './types';

export class SubjectIndex {
  private subjectsMap = new Map<string, Subject>();
  private teachersBySubject = new Map<string, string[]>();

  constructor(subjects: Subject[], teachers: Teacher[]) {
    for (const sub of subjects) {
      this.subjectsMap.set(normalizeSubjectName(sub.name), sub);
    }
    for (const t of teachers) {
      if (t.subjects) {
        for (const subName of t.subjects) {
          const norm = normalizeSubjectName(subName);
          if (!this.teachersBySubject.has(norm)) {
            this.teachersBySubject.set(norm, []);
          }
          this.teachersBySubject.get(norm)!.push(t.id);
        }
      }
    }
  }

  public getTeachersForSubject(subjectName: string): string[] {
    const norm = normalizeSubjectName(subjectName);
    return this.teachersBySubject.get(norm) || [];
  }
}
