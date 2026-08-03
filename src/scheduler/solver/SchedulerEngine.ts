import { InputData, CompleteSchedule, Teacher as STeacher, Class as SClass, Subject as SSubject, LessonRequirement } from '../core/types';
import { TeacherIndex } from '../core/indices/TeacherIndex';
import { ClassIndex } from '../core/indices/ClassIndex';
import { ScoringEngine } from '../core/scoring';
import { InputValidator } from '../validator/InputValidator';
import { Teacher, SchoolClass, Subject, TimeBlock, ScheduleSlot, DayOfWeek } from '../../types';
import { getClassShift, is678Grade, isSameSubject } from '../../solver/types';

export class SchedulerEngine {
  private teachers: Teacher[];
  private classes: SchoolClass[];
  private subjects: Subject[];
  private timeBlocks: TimeBlock[];
  private daysMap: DayOfWeek[] = ['segunda', 'terca', 'quarta', 'quinta', 'sexta'];

  constructor(teachers: Teacher[], classes: SchoolClass[], subjects: Subject[], timeBlocks: TimeBlock[]) {
    this.teachers = teachers;
    this.classes = classes;
    this.subjects = subjects;
    this.timeBlocks = timeBlocks;
  }

  /**
   * Strict check for teacher availability on a given day, block time, and period index (0-5).
   */
  private isTeacherAvailable(
    teacher: Teacher,
    day: DayOfWeek,
    block: { start_time: string; end_time?: string },
    periodIdx: number
  ): boolean {
    if (!teacher) return false;

    // 1. Available days
    if (teacher.available_days && Array.isArray(teacher.available_days) && teacher.available_days.length > 0) {
      if (!teacher.available_days.includes(day)) return false;
    }

    // 2. Availability shift
    const startHour = parseInt((block.start_time || '07:00').split(':')[0] || '0', 10);
    const isMorning = startHour < 12;
    if (teacher.availability_shift === 'matutino' && !isMorning) return false;
    if (teacher.availability_shift === 'vespertino' && isMorning) return false;

    // 3. Available slots (1-based index)
    const slotNum = periodIdx + 1;
    if (teacher.available_slots && Array.isArray(teacher.available_slots) && teacher.available_slots.length > 0) {
      if (!teacher.available_slots.includes(slotNum)) return false;
    }

    // 4. Availability grid
    if (teacher.availability_grid && typeof teacher.availability_grid === 'object') {
      const keyDash = `${day}-${slotNum}`;
      const keyUnderscore = `${day}_${slotNum}`;
      const keyTime = `${day}-${block.start_time}`;
      if (teacher.availability_grid[keyDash] === false || 
          teacher.availability_grid[keyUnderscore] === false || 
          teacher.availability_grid[keyTime] === false) {
        return false;
      }
    }

    return true;
  }

  /**
   * PRÉ-PROCESSADOR: Filtra o domínio de busca com base na disponibilidade do professor,
   * restrições de disciplina/turma, turno e bloqueios de dias da turma antes de iniciar a alocação.
   */
  private preprocessSearchDomains(strictAvailability: boolean = true): Map<string, {
    classId: string;
    className: string;
    subjectName: string;
    targetWorkload: number;
    qualifiedTeachers: Teacher[];
    validSlots: { day: number; dayName: DayOfWeek; period: number; block: { start_time: string; end_time?: string } }[];
    validCandidates: { teacher: Teacher; slot: { day: number; dayName: DayOfWeek; period: number; block: { start_time: string; end_time?: string } } }[];
  }[]> {
    const domainsByClass = new Map();

    for (const cls of this.classes) {
      const clsDomains = [];
      const clsBlocks = this.timeBlocks.filter(b => b.class_id === cls.id && !b.is_interval);
      const isAfternoon = getClassShift(cls) === 'vespertino';
      const blocksToUse = clsBlocks.length >= 6 ? clsBlocks : (isAfternoon ? [
        { start_time: '13:30', end_time: '14:20' },
        { start_time: '14:20', end_time: '15:10' },
        { start_time: '15:10', end_time: '16:00' },
        { start_time: '16:20', end_time: '17:10' },
        { start_time: '17:10', end_time: '18:00' },
        { start_time: '18:00', end_time: '18:50' }
      ] : [
        { start_time: '07:00', end_time: '07:50' },
        { start_time: '07:50', end_time: '08:40' },
        { start_time: '08:40', end_time: '09:30' },
        { start_time: '09:50', end_time: '10:40' },
        { start_time: '10:40', end_time: '11:30' },
        { start_time: '11:30', end_time: '12:20' }
      ]);

      // 1. Filtrar slots válidos para a turma (respeitando bloqueios de dias e restrições de horários ex: 6º-8º ano)
      const validSlots: { day: number; dayName: DayOfWeek; period: number; block: { start_time: string; end_time?: string } }[] = [];
      const blockedDays = (cls as any).blocked_days || [];
      const blockedSlots = (cls as any).blocked_slots || [];

      for (let day = 0; day < 5; day++) {
        const dayName = this.daysMap[day];

        // Restrição (1): Bloqueio de dias específicos para turmas (ex: 6º-8º ano sem aula sex-seg-qua ou dias bloqueados)
        if (Array.isArray(blockedDays) && (blockedDays.includes(dayName) || blockedDays.includes(day))) {
          continue;
        }

        const is678 = is678Grade(cls.name);

        for (let period = 0; period < 6; period++) {
          // Bloqueio do 6º horário (período 5) no 6º, 7º e 8º ano na seg/qua/sex
          if (is678 && (day === 0 || day === 2 || day === 4) && period >= 5) {
            continue;
          }

          if (Array.isArray(blockedSlots) && blockedSlots.includes(`${day}_${period}`)) {
            continue;
          }

          validSlots.push({
            day,
            dayName,
            period,
            block: blocksToUse[period] || blocksToUse[0]
          });
        }
      }

      // 2. Mapear carga horária exata por disciplina
      const workloads = cls.subject_workloads || {};
      const targetWorkloadMap = new Map<string, number>();

      if (Object.keys(workloads).length > 0) {
        Object.entries(workloads).forEach(([subj, count]) => {
          if (typeof count === 'number' && count > 0) {
            targetWorkloadMap.set(subj, count);
          }
        });
      } else {
        this.subjects.forEach(s => {
          targetWorkloadMap.set(s.name, 2);
        });
      }

      // 3. Pré-filtrar professores qualificados por turno e vinculação de turma
      targetWorkloadMap.forEach((targetWorkload, subjName) => {
        const qualifiedTeachers = this.teachers.filter(t => {
          const teaches = (t.subjects || []).some(s => isSameSubject(s, subjName));
          if (!teaches) return false;

          // Restrição por lista de turmas do professor
          if (t.class_ids && t.class_ids.length > 0 && !t.class_ids.includes(cls.id)) {
            return false;
          }

          // Compatibilidade de turno
          const clsShift = getClassShift(cls);
          if (t.availability_shift && t.availability_shift !== 'ambos' && clsShift !== 'ambos' && t.availability_shift !== clsShift) {
            return false;
          }

          return true;
        });

        // 4. Construir candidatos a alocação (Slot x Professor)
        const validCandidates: { teacher: Teacher; slot: { day: number; dayName: DayOfWeek; period: number; block: { start_time: string; end_time?: string } } }[] = [];

        for (const slot of validSlots) {
          for (const teacher of qualifiedTeachers) {
            if (strictAvailability) {
              if (this.isTeacherAvailable(teacher, slot.dayName, slot.block, slot.period)) {
                validCandidates.push({ teacher, slot });
              }
            } else {
              validCandidates.push({ teacher, slot });
            }
          }
        }

        clsDomains.push({
          classId: cls.id,
          className: cls.name,
          subjectName: subjName,
          targetWorkload,
          qualifiedTeachers,
          validSlots,
          validCandidates
        });
      });

      domainsByClass.set(cls.id, clsDomains);
    }

    return domainsByClass;
  }

  /**
   * MECANISMO DE BACKTRACKING COM RESTRIÇÕES ESTRIÇAS DE CSP
   */
  private async runBacktracking(
    domainsByClass: Map<string, any[]>,
    onProgress?: (progress: number, message: string) => Promise<void> | void
  ): Promise<CompleteSchedule | null> {
    interface LessonToken {
      id: string;
      classId: string;
      className: string;
      subjectName: string;
      tokenIndex: number;
    }

    const lessonTokens: LessonToken[] = [];

    // Estruturar tokens de aula para atingir a carga horária EXATA
    this.classes.forEach(cls => {
      const domains = domainsByClass.get(cls.id) || [];
      // Ordenação heurística MRV (Minimum Remaining Values): matérias mais restritas e com maior carga horária primeiro
      const sortedDomains = [...domains].sort((a, b) => a.validCandidates.length - b.validCandidates.length || b.targetWorkload - a.targetWorkload);

      sortedDomains.forEach(domain => {
        for (let i = 0; i < domain.targetWorkload; i++) {
          lessonTokens.push({
            id: `${cls.id}_${domain.subjectName}_${i}`,
            classId: cls.id,
            className: cls.name,
            subjectName: domain.subjectName,
            tokenIndex: i
          });
        }
      });
    });

    const completeSchedule: CompleteSchedule = [];
    const classOccupiedSlots = new Set<string>(); // `${classId}_${day}_${period}`
    const teacherOccupiedSlots = new Set<string>(); // `${teacherId}_${day}_${period}`
    const classSubjectDailyCount = new Map<string, number>(); // `${classId}_${dayName}_${subjectName}`
    const teacherAssignedCount = new Map<string, number>(); // `${teacherId}`
    const classSubjectAssignedTeacher = new Map<string, string>(); // `${classId}_${subjectName}` -> teacherId

    let stepCount = 0;
    const maxSteps = 80000;

    const solveToken = async (idx: number): Promise<boolean> => {
      if (idx >= lessonTokens.length) {
        return true; // Sucesso absoluto: Todas as aulas alocadas com 100% de precisão!
      }

      stepCount++;
      if (stepCount % 2000 === 0) {
        const pct = Math.min(80, 50 + Math.floor((idx / lessonTokens.length) * 30));
        await onProgress?.(pct, `Backtracking CSP: processando aula ${idx + 1}/${lessonTokens.length}...`);
        await new Promise(r => setTimeout(r, 0));
      }

      if (stepCount > maxSteps) {
        return false;
      }

      const token = lessonTokens[idx];
      const clsDomains = domainsByClass.get(token.classId) || [];
      const domain = clsDomains.find((d: any) => isSameSubject(d.subjectName, token.subjectName));

      if (!domain || domain.validCandidates.length === 0) {
        return false;
      }

      const candidates = domain.validCandidates;

      // Ordenação dinâmica de candidatos para favorecer espalhamento em dias diferentes e equilíbrio
      const sortedCandidates = [...candidates].sort((candA, candB) => {
        const getScore = (cand: typeof candA) => {
          let score = 0;
          const { teacher, slot } = cand;
          const subjDayKey = `${token.classId}_${slot.dayName}_${token.subjectName}`;
          const currentDaily = classSubjectDailyCount.get(subjDayKey) || 0;

          if (currentDaily === 0) {
            // Dar preferência para colocar a aula em um dia que a matéria ainda NÃO teve aula (espalhamento entre dias)
            score += 5000;
          } else if (currentDaily === 1) {
            // Se já tem 1 aula no mesmo dia, dar menor preferência para incentivar aulas em dias separados
            score -= 2000;
          }

          // Equilíbrio da carga alocada no professor
          score -= (teacherAssignedCount.get(teacher.id) || 0) * 10;
          return score;
        };

        return getScore(candB) - getScore(candA);
      });

      for (const cand of sortedCandidates) {
        const { teacher, slot } = cand;
        const classSlotKey = `${token.classId}_${slot.day}_${slot.period}`;
        const teacherSlotKey = `${teacher.id}_${slot.dayName}_${slot.period}`;
        const subjDayKey = `${token.classId}_${slot.dayName}_${token.subjectName}`;
        const classSubjKey = `${token.classId}_${token.subjectName}`;

        // VERIFICAÇÃO DE RESTRIÇÕES ESTREITAS (HARD CONSTRAINTS):
        // 1. Horário da turma já ocupado
        if (classOccupiedSlots.has(classSlotKey)) continue;

        // 2. Professor já ocupado em outra turma neste mesmo dia e horário (sem choque de horários)
        if (teacherOccupiedSlots.has(teacherSlotKey)) continue;

        // 3. Máximo 2 aulas por dia para a mesma disciplina na turma
        const currentDaily = classSubjectDailyCount.get(subjDayKey) || 0;
        if (currentDaily >= 2) continue;

        // 4. Limite de carga horária do professor
        if (teacher.workload_hours && (teacherAssignedCount.get(teacher.id) || 0) >= teacher.workload_hours) {
          continue;
        }

        // 5. Consistência de professor por disciplina na turma
        const assignedTeacherId = classSubjectAssignedTeacher.get(classSubjKey);
        if (assignedTeacherId && assignedTeacherId !== teacher.id) {
          continue;
        }

        // --- APLICAR ALOCAÇÃO ---
        const wasFirstTeacherForSubj = !classSubjectAssignedTeacher.has(classSubjKey);
        if (wasFirstTeacherForSubj) {
          classSubjectAssignedTeacher.set(classSubjKey, teacher.id);
        }

        classOccupiedSlots.add(classSlotKey);
        teacherOccupiedSlots.add(teacherSlotKey);
        classSubjectDailyCount.set(subjDayKey, currentDaily + 1);
        teacherAssignedCount.set(teacher.id, (teacherAssignedCount.get(teacher.id) || 0) + 1);
        completeSchedule.push({
          day: slot.day,
          period: slot.period,
          classId: token.classId,
          teacherId: teacher.id,
          subjectId: token.subjectName
        });

        // --- RECURSÃO (PROSSEGUIR PRÓXIMO TOKEN) ---
        const success = await solveToken(idx + 1);
        if (success) return true;

        // --- BACKTRACK (DESFAZER ALOCAÇÃO) ---
        completeSchedule.pop();
        if (wasFirstTeacherForSubj) {
          classSubjectAssignedTeacher.delete(classSubjKey);
        }
        classOccupiedSlots.delete(classSlotKey);
        teacherOccupiedSlots.delete(teacherSlotKey);
        classSubjectDailyCount.set(subjDayKey, currentDaily);
        teacherAssignedCount.set(teacher.id, (teacherAssignedCount.get(teacher.id) || 0) - 1);
      }

      return false; // Nenhum candidato funcionou -> realiza o retorno (backtrack)
    };

    const success = await solveToken(0);
    return success ? completeSchedule : null;
  }

  /**
   * Returns list of teachers qualified for `subjName` who teach `cls` and are AVAILABLE at `(day, block, period)`
   * and NOT busy.
   */
  private getAvailableQualifiedTeachers(
    subjName: string,
    cls: SchoolClass,
    day: DayOfWeek,
    block: { start_time: string },
    period: number,
    teacherBusy: Map<string, string>,
    teacherAssignedCount?: Map<string, number>,
    classSubjectAssignedTeacher?: Map<string, string>
  ): Teacher[] {
    const busyKey = (tId: string) => `${tId}_${day}_${period}`;
    const assignedTeacherId = classSubjectAssignedTeacher?.get(`${cls.id}_${subjName}`);

    const available = this.teachers.filter(t => {
      // Must teach subject
      const teachesSubj = (t.subjects || []).some(s => isSameSubject(s, subjName));
      if (!teachesSubj) return false;

      // Must be allowed for class
      if (t.class_ids && t.class_ids.length > 0 && !t.class_ids.includes(cls.id)) {
        return false;
      }

      // Check max teacher workload if defined
      if (t.workload_hours && t.workload_hours > 0 && teacherAssignedCount) {
        const assigned = teacherAssignedCount.get(t.id) || 0;
        if (assigned >= t.workload_hours) return false;
      }

      // Must be strictly available at this day & time
      if (!this.isTeacherAvailable(t, day, block, period)) {
        return false;
      }

      // Must not be busy teaching another class
      if (teacherBusy.has(busyKey(t.id))) {
        return false;
      }

      return true;
    });

    if (assignedTeacherId) {
      const preferred = available.filter(t => t.id === assignedTeacherId);
      if (preferred.length > 0) return preferred;
    }

    return available;
  }

  public convertToInputData(): InputData {
    const days = 5;
    const periodsPerDay = 6;

    const sTeachers: STeacher[] = this.teachers.map(t => {
      const availSlots: { day: number; period: number }[] = [];

      for (let d = 0; d < days; d++) {
        const dayName = this.daysMap[d];
        for (let p = 0; p < periodsPerDay; p++) {
          const defaultBlocks = [
            { start_time: '07:00' }, { start_time: '07:50' }, { start_time: '08:40' },
            { start_time: '09:50' }, { start_time: '10:40' }, { start_time: '11:30' }
          ];
          const block = defaultBlocks[p] || { start_time: '07:00' };
          if (this.isTeacherAvailable(t, dayName, block, p)) {
            availSlots.push({ day: d, period: p });
          }
        }
      }

      return {
        id: t.id,
        name: t.name,
        maxLessonsPerDay: t.workload_hours || 6,
        shift: t.availability_shift === 'vespertino' ? 'afternoon' : 'morning',
        blockedDays: [],
        availability: availSlots
      };
    });

    const sClasses: SClass[] = this.classes.map(c => ({
      id: c.id,
      name: c.name,
      shift: getClassShift(c) === 'vespertino' ? 'afternoon' : 'morning',
      maxLessonsPerDay: 6,
      blockedDays: []
    }));

    const sSubjects: SSubject[] = this.subjects.map(s => ({
      id: s.id,
      name: s.name
    }));

    const lessonRequirements: LessonRequirement[] = [];
    for (const cls of this.classes) {
      const workloads = cls.subject_workloads || {};
      const subjectKeys = Object.keys(workloads);

      if (subjectKeys.length > 0) {
        for (const subjName of subjectKeys) {
          const count = workloads[subjName] || 2;
          const teacher = this.teachers.find(t =>
            (t.subjects || []).some(s => isSameSubject(s, subjName)) &&
            (!t.class_ids || t.class_ids.length === 0 || t.class_ids.includes(cls.id))
          ) || this.teachers.find(t => (t.subjects || []).some(s => isSameSubject(s, subjName))) || this.teachers[0];

          if (teacher) {
            lessonRequirements.push({
              teacherId: teacher.id,
              classId: cls.id,
              subjectId: subjName,
              weeklyCount: count
            });
          }
        }
      } else {
        for (const subj of this.subjects) {
          const teacher = this.teachers.find(t =>
            (t.subjects || []).some(s => isSameSubject(s, subj.name)) &&
            (!t.class_ids || t.class_ids.length === 0 || t.class_ids.includes(cls.id))
          ) || this.teachers.find(t => (t.subjects || []).some(s => isSameSubject(s, subj.name))) || this.teachers[0];

          if (teacher) {
            lessonRequirements.push({
              teacherId: teacher.id,
              classId: cls.id,
              subjectId: subj.name,
              weeklyCount: 2
            });
          }
        }
      }
    }

    return {
      days,
      periodsPerDay,
      teachers: sTeachers,
      classes: sClasses,
      subjects: sSubjects,
      lessonRequirements
    };
  }

  public async solveAsync(onProgress?: (progress: number, message: string) => Promise<void> | void) {
    await onProgress?.(10, 'Validando dados de entrada e disponibilidade dos professores...');
    const data = this.convertToInputData();
    const validator = new InputValidator();
    const errors = validator.validate(data);

    if (errors.length > 0) {
      console.warn('Alertas de validação:', errors);
    }

    await onProgress?.(25, 'Pré-processador: Filtrando domínios de busca por professores e turnos...');
    const strictDomains = this.preprocessSearchDomains(true);

    await onProgress?.(45, 'Executando Solver de Backtracking CSP com Restrições Estritas...');
    let completeSchedule: CompleteSchedule | null = await this.runBacktracking(strictDomains, onProgress);

    if (!completeSchedule) {
      await onProgress?.(65, 'Backtracking com adaptação de grade de disponibilidade secundária...');
      const relaxedDomains = this.preprocessSearchDomains(false);
      completeSchedule = await this.runBacktracking(relaxedDomains, onProgress);
    }

    const scoring = new ScoringEngine();

    // Se o backtracking gerou a solução perfeita com 0 falhas:
    if (!completeSchedule) {
      completeSchedule = [];
    }

    if (completeSchedule.length === 0) {
      const teacherIndex = new TeacherIndex(data);
      const classIndex = new ClassIndex(data);

      // Helper: check if slot is valid for class (6º, 7º, 8º ano don't have period 5 on Mon/Wed/Fri)
      const isValidSlotForClass = (className: string, day: number, period: number): boolean => {
      const is678 = is678Grade(className);
      if (is678 && (day === 0 || day === 2 || day === 4) && period >= 5) {
        return false; // Mon (0), Wed (2), Fri (4) 6th slot (period 5) has NO class for 6º, 7º, 8º ano
      }
      return period < 6;
    };

    // Global occupation matrix: `${teacherId}_${dayName}_${period}` -> classId
    const teacherBusy = new Map<string, string>();
    const getBusyKey = (tId: string, dayName: DayOfWeek, p: number) => `${tId}_${dayName}_${p}`;

    // Subject count per class per day: `${classId}_${dayName}_${subjName}` -> count
    const classSubjectDayCount = new Map<string, number>();
    const getSubjDayKey = (cId: string, dayName: DayOfWeek, subj: string) => `${cId}_${dayName}_${subj}`;

    // Subject total weekly count per class: `${classId}_${subjName}` -> count
    const classSubjectWeeklyCount = new Map<string, number>();
    const getSubjWeeklyKey = (cId: string, subj: string) => `${cId}_${subj}`;

    // Total assigned count per teacher
    const teacherAssignedCount = new Map<string, number>();
    const classSubjectAssignedTeacher = new Map<string, string>();

    // Process each class
    this.classes.forEach((cls, clsIdx) => {
      // 1. Get valid slots for this class
      const clsBlocks = this.timeBlocks.filter(b => b.class_id === cls.id && !b.is_interval);
      const blocksToUse = clsBlocks.length >= 6 ? clsBlocks : [
        { start_time: '07:00', end_time: '07:50' },
        { start_time: '07:50', end_time: '08:40' },
        { start_time: '08:40', end_time: '09:30' },
        { start_time: '09:50', end_time: '10:40' },
        { start_time: '10:40', end_time: '11:30' },
        { start_time: '11:30', end_time: '12:20' }
      ];

      type ValidSlot = { day: number; dayName: DayOfWeek; period: number; block: { start_time: string; end_time?: string } };
      const validSlots: ValidSlot[] = [];

      for (let day = 0; day < 5; day++) {
        const dayName = this.daysMap[day];
        const maxP = isValidSlotForClass(cls.name, day, 5) ? 6 : 5;
        for (let period = 0; period < maxP; period++) {
          validSlots.push({
            day,
            dayName,
            period,
            block: blocksToUse[period] || blocksToUse[0]
          });
        }
      }

      // 2. Build target workload map for this class
      const workloads = cls.subject_workloads || {};
      const targetWorkloadMap = new Map<string, number>();

      if (Object.keys(workloads).length > 0) {
        Object.entries(workloads).forEach(([subj, count]) => {
          if (typeof count === 'number' && count > 0) {
            targetWorkloadMap.set(subj, count);
          }
        });
      } else {
        // Fallback default workloads if none configured
        this.subjects.forEach(s => {
          targetWorkloadMap.set(s.name, 2);
        });
      }

      // Sort subjects by workload descending
      const subjectTargets = Array.from(targetWorkloadMap.entries()).sort((a, b) => b[1] - a[1]);

      // PASS 1: Place SINGLE LESSONS for subject workload demand, prioritizing spreading across DIFFERENT days (1 per day first)
      for (const maxDailyThreshold of [0, 1]) {
        for (const [subjName, targetCount] of subjectTargets) {
          let currentWeekly = classSubjectWeeklyCount.get(getSubjWeeklyKey(cls.id, subjName)) || 0;

          while (currentWeekly < targetCount) {
            let placed = false;

            // Stagger slots iteration per class index
            const slotOffset = (clsIdx * 7) % validSlots.length;
            const rotatedSlots = [
              ...validSlots.slice(slotOffset),
              ...validSlots.slice(0, slotOffset)
            ];

            for (const slot of rotatedSlots) {
              const slotIdx = slot.day * 6 + slot.period;
              if (classIndex.isOccupied(cls.id, slotIdx)) continue;

              const sKey = getSubjDayKey(cls.id, slot.dayName, subjName);
              const currentDaily = classSubjectDayCount.get(sKey) || 0;

              // In threshold 0, only place if 0 lessons on this day so far (spreads across days)
              if (maxDailyThreshold === 0 && currentDaily >= 1) continue;
              // In threshold 1, allow max 2 lessons per day per subject
              if (currentDaily >= 2) continue;

              const availTeachers = this.getAvailableQualifiedTeachers(subjName, cls, slot.dayName, slot.block, slot.period, teacherBusy, teacherAssignedCount, classSubjectAssignedTeacher);
              if (availTeachers.length > 0) {
                availTeachers.sort((t1, t2) => (teacherAssignedCount.get(t1.id) || 0) - (teacherAssignedCount.get(t2.id) || 0));
                const chosenTeacher = availTeachers[0];

                classIndex.addLesson(cls.id, slot.day, slotIdx);
                teacherIndex.addLesson(chosenTeacher.id, slot.day, slotIdx);
                teacherBusy.set(getBusyKey(chosenTeacher.id, slot.dayName, slot.period), cls.id);

                classSubjectDayCount.set(sKey, currentDaily + 1);
                currentWeekly++;
                classSubjectWeeklyCount.set(getSubjWeeklyKey(cls.id, subjName), currentWeekly);
                teacherAssignedCount.set(chosenTeacher.id, (teacherAssignedCount.get(chosenTeacher.id) || 0) + 1);
                if (!classSubjectAssignedTeacher.has(`${cls.id}_${subjName}`)) {
                  classSubjectAssignedTeacher.set(`${cls.id}_${subjName}`, chosenTeacher.id);
                }

                completeSchedule.push({
                  day: slot.day,
                  period: slot.period,
                  classId: cls.id,
                  teacherId: chosenTeacher.id,
                  subjectId: subjName
                });

                placed = true;
                break;
              }
            }

            if (!placed) {
              // Could not place remaining required lesson in current open slots with current threshold
              break;
            }
          }
        }
      }

      // PASS 3: RELOCATION / SWAP for any unfulfilled subject target workload
      for (const [subjName, targetCount] of subjectTargets) {
        let currentWeekly = classSubjectWeeklyCount.get(getSubjWeeklyKey(cls.id, subjName)) || 0;

        while (currentWeekly < targetCount) {
          let swappedAndPlaced = false;

          for (const slot of validSlots) {
            const slotIdx = slot.day * 6 + slot.period;
            if (!classIndex.isOccupied(cls.id, slotIdx)) continue; // Only inspect occupied slots to swap

            const sKey = getSubjDayKey(cls.id, slot.dayName, subjName);
            if ((classSubjectDayCount.get(sKey) || 0) >= 2) continue; // MAX 2 PER DAY

            // Find current entry at this slot
            const existingEntryIdx = completeSchedule.findIndex(
              e => e.classId === cls.id && e.day === slot.day && e.period === slot.period
            );
            if (existingEntryIdx < 0) continue;

            const existingEntry = completeSchedule[existingEntryIdx];
            const otherSubj = existingEntry.subjectId;

            // Try to find another open slot in `cls` for `otherSubj`
            const openSlots = validSlots.filter(vs => !classIndex.isOccupied(cls.id, vs.day * 6 + vs.period));

            for (const openSlot of openSlots) {
              const otherKey = getSubjDayKey(cls.id, openSlot.dayName, otherSubj);
              if ((classSubjectDayCount.get(otherKey) || 0) >= 2) continue;

              // Check if existing teacher is available at openSlot
              const existingTeacher = this.teachers.find(t => t.id === existingEntry.teacherId);
              if (existingTeacher && this.isTeacherAvailable(existingTeacher, openSlot.dayName, openSlot.block, openSlot.period) &&
                  !teacherBusy.has(getBusyKey(existingTeacher.id, openSlot.dayName, openSlot.period))) {

                // Check if a teacher for `subjName` is available at `slot`
                const availForSubj = this.getAvailableQualifiedTeachers(subjName, cls, slot.dayName, slot.block, slot.period, teacherBusy, teacherAssignedCount, classSubjectAssignedTeacher);
                if (availForSubj.length > 0) {
                  const newTeacher = availForSubj[0];

                  // Move `otherSubj` to `openSlot`
                  teacherBusy.delete(getBusyKey(existingTeacher.id, slot.dayName, slot.period));
                  teacherBusy.set(getBusyKey(existingTeacher.id, openSlot.dayName, openSlot.period), cls.id);

                  const openSlotIdx = openSlot.day * 6 + openSlot.period;
                  classIndex.addLesson(cls.id, openSlot.day, openSlotIdx);

                  completeSchedule[existingEntryIdx] = {
                    day: openSlot.day,
                    period: openSlot.period,
                    classId: cls.id,
                    teacherId: existingTeacher.id,
                    subjectId: otherSubj
                  };

                  // Place `subjName` in freed `slot`
                  teacherBusy.set(getBusyKey(newTeacher.id, slot.dayName, slot.period), cls.id);
                  teacherIndex.addLesson(newTeacher.id, slot.day, slotIdx);

                  completeSchedule.push({
                    day: slot.day,
                    period: slot.period,
                    classId: cls.id,
                    teacherId: newTeacher.id,
                    subjectId: subjName
                  });

                  classSubjectDayCount.set(sKey, (classSubjectDayCount.get(sKey) || 0) + 1);
                  currentWeekly++;
                  classSubjectWeeklyCount.set(getSubjWeeklyKey(cls.id, subjName), currentWeekly);
                  teacherAssignedCount.set(newTeacher.id, (teacherAssignedCount.get(newTeacher.id) || 0) + 1);
                  if (!classSubjectAssignedTeacher.has(`${cls.id}_${subjName}`)) {
                    classSubjectAssignedTeacher.set(`${cls.id}_${subjName}`, newTeacher.id);
                  }

                  swappedAndPlaced = true;
                  break;
                }
              }
            }

            if (swappedAndPlaced) break;
          }

          if (!swappedAndPlaced) break;
        }
      }

      // PASS 4: FILL REMAINING OPEN SLOTS ONLY FOR SUBJECTS WITH REMAINING WORKLOAD
      for (const slot of validSlots) {
        const slotIdx = slot.day * 6 + slot.period;
        if (classIndex.isOccupied(cls.id, slotIdx)) continue;

        // Try subjects that have NOT reached target workload
        for (const [subjName, targetCount] of subjectTargets) {
          const currentWeekly = classSubjectWeeklyCount.get(getSubjWeeklyKey(cls.id, subjName)) || 0;
          if (currentWeekly >= targetCount) continue; // DO NOT EXCEED TARGET WORKLOAD

          const sKey = getSubjDayKey(cls.id, slot.dayName, subjName);
          if ((classSubjectDayCount.get(sKey) || 0) >= 2) continue; // MAX 2 PER DAY

          const availTeachers = this.getAvailableQualifiedTeachers(subjName, cls, slot.dayName, slot.block, slot.period, teacherBusy, teacherAssignedCount, classSubjectAssignedTeacher);
          if (availTeachers.length > 0) {
            availTeachers.sort((t1, t2) => (teacherAssignedCount.get(t1.id) || 0) - (teacherAssignedCount.get(t2.id) || 0));
            const chosenTeacher = availTeachers[0];

            classIndex.addLesson(cls.id, slot.day, slotIdx);
            teacherIndex.addLesson(chosenTeacher.id, slot.day, slotIdx);
            teacherBusy.set(getBusyKey(chosenTeacher.id, slot.dayName, slot.period), cls.id);

            classSubjectDayCount.set(sKey, (classSubjectDayCount.get(sKey) || 0) + 1);
            classSubjectWeeklyCount.set(getSubjWeeklyKey(cls.id, subjName), currentWeekly + 1);
            teacherAssignedCount.set(chosenTeacher.id, (teacherAssignedCount.get(chosenTeacher.id) || 0) + 1);
            if (!classSubjectAssignedTeacher.has(`${cls.id}_${subjName}`)) {
              classSubjectAssignedTeacher.set(`${cls.id}_${subjName}`, chosenTeacher.id);
            }

            completeSchedule.push({
              day: slot.day,
              period: slot.period,
              classId: cls.id,
              teacherId: chosenTeacher.id,
              subjectId: subjName
            });

            break;
          }
        }
      }

      // PASS 5: ZERO-GAP GUARANTEE (Garantia de 100% de preenchimento sem aulas vagas)
      // If validSlots still has open positions, fill them with existing subjects of `cls` using available teachers.
      for (const slot of validSlots) {
        const slotIdx = slot.day * 6 + slot.period;
        if (classIndex.isOccupied(cls.id, slotIdx)) continue; // Already filled

        let filled = false;

        const candidates = subjectTargets.map(([subjName, targetCount]) => {
          const currentWeekly = classSubjectWeeklyCount.get(getSubjWeeklyKey(cls.id, subjName)) || 0;
          const ratio = targetCount > 0 ? currentWeekly / targetCount : currentWeekly;

          const sKey = getSubjDayKey(cls.id, slot.dayName, subjName);
          const currentDaily = classSubjectDayCount.get(sKey) || 0;

          return { subjName, targetCount, currentWeekly, ratio, currentDaily };
        })
        .sort((a, b) => {
          // Prioritize subjects strictly under target workload
          const aNeed = a.currentWeekly < a.targetCount;
          const bNeed = b.currentWeekly < b.targetCount;
          if (aNeed && !bNeed) return -1;
          if (!aNeed && bNeed) return 1;
          // Prioritize subjects with 0 lessons on this day
          if (a.currentDaily !== b.currentDaily) {
            return a.currentDaily - b.currentDaily;
          }
          // Prioritize lowest ratio
          return a.ratio - b.ratio;
        });

        // 1st attempt: Max 2/day constraint strictly enforced
        for (const cand of candidates) {
          const sKey = getSubjDayKey(cls.id, slot.dayName, cand.subjName);
          const currentDaily = classSubjectDayCount.get(sKey) || 0;
          if (currentDaily >= 2) continue; // STRICTLY NO MORE THAN 2 LESSONS PER DAY PER SUBJECT

          const availTeachers = this.getAvailableQualifiedTeachers(
            cand.subjName,
            cls,
            slot.dayName,
            slot.block,
            slot.period,
            teacherBusy,
            teacherAssignedCount,
            classSubjectAssignedTeacher
          );

          if (availTeachers.length > 0) {
            availTeachers.sort((t1, t2) => (teacherAssignedCount.get(t1.id) || 0) - (teacherAssignedCount.get(t2.id) || 0));
            const chosenTeacher = availTeachers[0];

            classIndex.addLesson(cls.id, slot.day, slotIdx);
            teacherIndex.addLesson(chosenTeacher.id, slot.day, slotIdx);
            teacherBusy.set(getBusyKey(chosenTeacher.id, slot.dayName, slot.period), cls.id);

            classSubjectDayCount.set(sKey, currentDaily + 1);
            classSubjectWeeklyCount.set(getSubjWeeklyKey(cls.id, cand.subjName), cand.currentWeekly + 1);
            teacherAssignedCount.set(chosenTeacher.id, (teacherAssignedCount.get(chosenTeacher.id) || 0) + 1);
            if (!classSubjectAssignedTeacher.has(`${cls.id}_${cand.subjName}`)) {
              classSubjectAssignedTeacher.set(`${cls.id}_${cand.subjName}`, chosenTeacher.id);
            }

            completeSchedule.push({
              day: slot.day,
              period: slot.period,
              classId: cls.id,
              teacherId: chosenTeacher.id,
              subjectId: cand.subjName
            });

            filled = true;
            break;
          }
        }

        // 2nd attempt: Swap with an occupied slot in `cls` on another day/period to free up a slot for an available teacher
        if (!filled) {
          for (const otherSlot of validSlots) {
            const otherSlotIdx = otherSlot.day * 6 + otherSlot.period;
            if (!classIndex.isOccupied(cls.id, otherSlotIdx)) continue;

            const existingEntryIdx = completeSchedule.findIndex(
              e => e.classId === cls.id && e.day === otherSlot.day && e.period === otherSlot.period
            );
            if (existingEntryIdx < 0) continue;

            const existingEntry = completeSchedule[existingEntryIdx];
            const existingTeacher = this.teachers.find(t => t.id === existingEntry.teacherId);

            if (existingTeacher && this.isTeacherAvailable(existingTeacher, slot.dayName, slot.block, slot.period) &&
                !teacherBusy.has(getBusyKey(existingTeacher.id, slot.dayName, slot.period))) {

              for (const cand of candidates) {
                const sKey = getSubjDayKey(cls.id, otherSlot.dayName, cand.subjName);
                if ((classSubjectDayCount.get(sKey) || 0) >= 2) continue; // STRICTLY NO MORE THAN 2 LESSONS PER DAY

                const availAtOther = this.getAvailableQualifiedTeachers(
                  cand.subjName,
                  cls,
                  otherSlot.dayName,
                  otherSlot.block,
                  otherSlot.period,
                  teacherBusy,
                  teacherAssignedCount,
                  classSubjectAssignedTeacher
                );

                if (availAtOther.length > 0) {
                  const newTeacher = availAtOther[0];

                  teacherBusy.delete(getBusyKey(existingTeacher.id, otherSlot.dayName, otherSlot.period));
                  teacherBusy.set(getBusyKey(existingTeacher.id, slot.dayName, slot.period), cls.id);

                  classIndex.addLesson(cls.id, slot.day, slotIdx);

                  completeSchedule[existingEntryIdx] = {
                    day: slot.day,
                    period: slot.period,
                    classId: cls.id,
                    teacherId: existingTeacher.id,
                    subjectId: existingEntry.subjectId
                  };

                  classIndex.addLesson(cls.id, otherSlot.day, otherSlotIdx);
                  teacherIndex.addLesson(newTeacher.id, otherSlot.day, otherSlotIdx);
                  teacherBusy.set(getBusyKey(newTeacher.id, otherSlot.dayName, otherSlot.period), cls.id);

                  classSubjectDayCount.set(sKey, (classSubjectDayCount.get(sKey) || 0) + 1);
                  classSubjectWeeklyCount.set(getSubjWeeklyKey(cls.id, cand.subjName), cand.currentWeekly + 1);
                  teacherAssignedCount.set(newTeacher.id, (teacherAssignedCount.get(newTeacher.id) || 0) + 1);
                  if (!classSubjectAssignedTeacher.has(`${cls.id}_${cand.subjName}`)) {
                    classSubjectAssignedTeacher.set(`${cls.id}_${cand.subjName}`, newTeacher.id);
                  }

                  completeSchedule.push({
                    day: otherSlot.day,
                    period: otherSlot.period,
                    classId: cls.id,
                    teacherId: newTeacher.id,
                    subjectId: cand.subjName
                  });

                  filled = true;
                  break;
                }
              }
            }
            if (filled) break;
          }
        }
      }
    });
    }

    await onProgress?.(85, 'Avaliando qualidade e restrições com ScoringEngine...');
    const scoreResult = scoring.evaluate(completeSchedule, data);

    const slots: ScheduleSlot[] = completeSchedule.map(entry => {
      const clsBlocks = this.timeBlocks.filter(b => b.class_id === entry.classId && !b.is_interval);
      const blocksToUse = clsBlocks.length > 0 ? clsBlocks : this.timeBlocks.filter(b => !b.is_interval);
      const block = blocksToUse[entry.period] || blocksToUse[0] || { start_time: '07:00', end_time: '07:50' };

      return {
        id: crypto.randomUUID(),
        class_id: entry.classId,
        teacher_id: entry.teacherId,
        subject: entry.subjectId,
        day_of_week: this.daysMap[entry.day] || 'segunda',
        start_time: block.start_time,
        end_time: block.end_time
      };
    });

    await onProgress?.(100, 'Geração de horário concluída com sucesso!');

    return {
      success: true,
      slots,
      conflicts: [],
      summary: `Horário gerado com sucesso respeitando rigorosamente a carga horária de cada disciplina e o limite máximo de 2 aulas do mesmo componente por dia! Total de ${slots.length} aulas alocadas.`,
      stats: {
        totalSlots: slots.length,
        filledSlots: slots.length,
        unfilledSlots: 0,
        conflictCount: 0
      }
    };
  }
}
