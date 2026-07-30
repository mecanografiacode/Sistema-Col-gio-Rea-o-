import { Teacher } from '../types';
import { normalizeSubjectName } from './types';

export class TeacherIndex {
  private teachersMap = new Map<string, Teacher>();
  private bySubject = new Map<string, Teacher[]>();
  private byClass = new Map<string, Teacher[]>();
  private byShift = new Map<string, Teacher[]>();

  constructor(teachers: Teacher[]) {
    for (const t of teachers) {
      this.teachersMap.set(t.id, t);

      // Index by subjects
      if (t.subjects && Array.isArray(t.subjects)) {
        for (const sub of t.subjects) {
          const normSub = normalizeSubjectName(sub);
          if (!this.bySubject.has(normSub)) {
            this.bySubject.set(normSub, []);
          }
          this.bySubject.get(normSub)!.push(t);
        }
      }

      // Index by class IDs
      if (t.class_ids && Array.isArray(t.class_ids)) {
        for (const cid of t.class_ids) {
          if (!this.byClass.has(cid)) {
            this.byClass.set(cid, []);
          }
          this.byClass.get(cid)!.push(t);
        }
      }

      // Index by shift
      const shift = t.availability_shift || 'ambos';
      if (!this.byShift.has(shift)) {
        this.byShift.set(shift, []);
      }
      this.byShift.get(shift)!.push(t);
      if (shift !== 'ambos') {
        if (!this.byShift.has('ambos')) {
          this.byShift.set('ambos', []);
        }
        this.byShift.get('ambos')!.push(t);
      }
    }
  }

  public getById(id: string): Teacher | undefined {
    return this.teachersMap.get(id);
  }

  public getAll(): Teacher[] {
    return Array.from(this.teachersMap.values());
  }

  public getBySubject(subject: string): Teacher[] {
    const norm = normalizeSubjectName(subject);
    const direct = this.bySubject.get(norm) || [];
    if (direct.length > 0) return direct;

    const results: Teacher[] = [];
    for (const [subKey, teachers] of this.bySubject.entries()) {
      if (subKey.includes(norm) || norm.includes(subKey)) {
        results.push(...teachers);
      }
    }
    return Array.from(new Set(results));
  }

  public getByClass(classId: string): Teacher[] {
    return this.byClass.get(classId) || [];
  }

  public getByShift(shift: string): Teacher[] {
    return this.byShift.get(shift) || this.getAll();
  }
}
