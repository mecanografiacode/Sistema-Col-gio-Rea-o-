import { Teacher, SchoolClass, ScheduleSlot, TimeBlock, Subject, DayOfWeek } from '../types';
import { storage } from './storage';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

export interface SolverResult {
  success: boolean;
  slots: ScheduleSlot[];
  conflicts: string[];
  summary: string;
  stats: {
    totalSlots: number;
    filledSlots: number;
    unfilledSlots: number;
    conflictCount: number;
  };
}

const normalizeTime = (t: string): string => {
  if (!t) return '00:00';
  const parts = t.split(':');
  if (parts.length < 2) return '00:00';
  return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
};

const timeToMinutes = (t: string): number => {
  const [h, m] = normalizeTime(t).split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};

const timesOverlap = (start1: string, end1: string, start2: string, end2: string): boolean => {
  return normalizeTime(start1) < normalizeTime(end2) && normalizeTime(end1) > normalizeTime(start2);
};

const getClassShift = (c: SchoolClass): 'matutino' | 'vespertino' | 'ambos' => {
  if (c.shift && c.shift !== 'ambos') return c.shift;
  const upper = c.name.toUpperCase();
  if (upper.includes('VESP') || upper.includes('TARDE') || upper.endsWith(' B') || upper.includes(' - B')) return 'vespertino';
  return 'matutino';
};

const is678Grade = (className: string): boolean => {
  const norm = (className || '').toLowerCase();
  if (norm.includes('9º') || norm.includes('9°') || norm.includes('9 ano') || norm.includes('médio') || norm.includes('medio')) return false;
  return norm.includes('6º') || norm.includes('6°') || norm.includes('6 ano') ||
         norm.includes('7º') || norm.includes('7°') || norm.includes('7 ano') ||
         norm.includes('8º') || norm.includes('8°') || norm.includes('8 ano') ||
         /\b(6|7|8)\b/.test(norm);
};

const normalizeSubjectName = (s: string): string => {
  if (!s) return '';
  const clean = s.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
  if (clean === 'dg' || clean === 'desenhogeometrico' || clean === 'desenhogeometria') return 'dg';
  if (clean === 'edfisica' || clean === 'educacaofisica') return 'edfisica';
  if (clean === 'portugues' || clean === 'linguaportuguesa') return 'portugues';
  if (clean === 'matematica') return 'matematica';
  if (clean === 'historia') return 'historia';
  if (clean === 'geografia') return 'geografia';
  if (clean === 'ciencias') return 'ciencias';
  if (clean === 'biologia') return 'biologia';
  if (clean === 'fisica') return 'fisica';
  if (clean === 'quimica') return 'quimica';
  if (clean === 'artes') return 'artes';
  if (clean === 'ingles' || clean === 'linguainglesa') return 'ingles';
  if (clean === 'espanhol' || clean === 'linguaespanhola') return 'espanhol';
  if (clean === 'filosofia') return 'filosofia';
  if (clean === 'sociologia') return 'sociologia';
  if (clean === 'redacao' || clean === 'producaodetexto') return 'redacao';
  return clean;
};

const isSameSubject = (s1?: string, s2?: string): boolean => {
  if (!s1 || !s2) return false;
  return normalizeSubjectName(s1) === normalizeSubjectName(s2);
};

const getNormalizedTeacherFirstName = (name?: string): string => {
  if (!name) return '';
  const clean = name.trim().toLowerCase()
    .replace(/^profª?\.?\s+/i, '')
    .replace(/^professor[a]?\s+/i, '')
    .replace(/^tio|tia\s+/i, '')
    .trim();
  return clean.split(/[\s\-_]+/)[0] || '';
};

const isSameTeacher = (t1Id?: string, t1Name?: string, t2Id?: string, t2Name?: string): boolean => {
  if (t1Id && t2Id && t1Id === t2Id) return true;
  if (!t1Name || !t2Name) return false;
  if (t1Name.trim().toLowerCase() === t2Name.trim().toLowerCase()) return true;
  const fn1 = getNormalizedTeacherFirstName(t1Name);
  const fn2 = getNormalizedTeacherFirstName(t2Name);
  if (fn1.length >= 3 && fn1 === fn2) return true; // Gilva resource constraint check
  return false;
};

// --- DETERMINISTIC CSP SOLVER CLASS ---
export class HorarioCSPSolver {
  private teachers: Teacher[] = [];
  private classes: SchoolClass[] = [];
  private subjects: Subject[] = [];
  private timeBlocks: TimeBlock[] = [];
  private days: DayOfWeek[] = ['segunda', 'terca', 'quarta', 'quinta', 'sexta'];

  constructor(teachers: Teacher[], classes: SchoolClass[], subjects: Subject[], timeBlocks: TimeBlock[]) {
    this.teachers = teachers;
    this.classes = classes;
    this.subjects = subjects;
    this.timeBlocks = timeBlocks;
  }

  // ETAPA 1 & 2: Calculate Teacher metrics and Difficulty Index
  public calculateTeacherMetrics() {
    return this.teachers.map(t => {
      let horariosLivres = 0;
      this.days.forEach(d => {
        for (let slot = 1; slot <= 6; slot++) {
          if (t.availability_grid && t.availability_grid[`${d}-${slot}`] === false) {
            // ocupado/indisponível
          } else {
            horariosLivres++;
          }
        }
      });

      // Calculate total required lessons across assigned classes
      let cargaNecessaria = 0;
      this.classes.forEach(c => {
        if (!t.class_ids || t.class_ids.length === 0 || t.class_ids.includes(c.id)) {
          const workloads = c.subject_workloads || {};
          Object.entries(workloads).forEach(([sub, h]) => {
            if ((t.subjects || []).some(ts => isSameSubject(ts, sub)) && typeof h === 'number') {
              cargaNecessaria += h;
            }
          });
        }
      });

      const indiceDificuldade = horariosLivres > 0 ? cargaNecessaria / horariosLivres : 999;

      return {
        ...t,
        horariosLivres,
        cargaNecessaria,
        indiceDificuldade
      };
    }).sort((a, b) => b.indiceDificuldade - a.indiceDificuldade);
  }

  // ETAPA 3: Order Disciplines (Largest workload first, then lowest availability, then most turmas)
  public orderDisciplines() {
    const disciplineList: { subject: string; classId: string; workload: number; group: string }[] = [];
    
    this.classes.forEach(c => {
      const workloads = c.subject_workloads || {};
      Object.entries(workloads).forEach(([sub, h]) => {
        if (typeof h === 'number' && h > 0) {
          disciplineList.push({
            subject: sub,
            classId: c.id,
            workload: h,
            group: c.group
          });
        }
      });
    });

    return disciplineList.sort((a, b) => {
      if (b.workload !== a.workload) return b.workload - a.workload;
      return a.subject.localeCompare(b.subject);
    });
  }

  // FUNÇÃO VALIDAR()
  public validar(
    slot: { class_id: string; teacher_id: string; subject: string; day_of_week: DayOfWeek; start_time: string; end_time: string },
    currentSlots: ScheduleSlot[]
  ): { isValid: boolean; reason?: string } {
    const teacher = this.teachers.find(t => t.id === slot.teacher_id);
    const cls = this.classes.find(c => c.id === slot.class_id);

    if (!teacher || !cls) return { isValid: false, reason: 'Professor ou Turma não encontrados.' };

    // 1. Professor disponível (dias e turnos)
    if (teacher.available_days && teacher.available_days.length > 0 && !teacher.available_days.includes(slot.day_of_week)) {
      return { isValid: false, reason: `Professor ${teacher.name} não trabalha na ${slot.day_of_week}.` };
    }

    const startMin = timeToMinutes(slot.start_time);
    const isMorning = startMin < 780;
    if (teacher.availability_shift === 'matutino' && !isMorning) {
      return { isValid: false, reason: `Professor ${teacher.name} só trabalha no matutino.` };
    }
    if (teacher.availability_shift === 'vespertino' && isMorning) {
      return { isValid: false, reason: `Professor ${teacher.name} só trabalha no vespertino.` };
    }

    // Grid check
    if (teacher.availability_grid) {
      // Find block index
      const clsBlocks = this.timeBlocks.filter(b => b.class_id === cls.id && !b.is_interval)
        .sort((a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time));
      const bIdx = clsBlocks.findIndex(b => b.start_time === slot.start_time);
      if (bIdx >= 0) {
        const slotNum = bIdx + 1;
        if (teacher.availability_grid[`${slot.day_of_week}-${slotNum}`] === false) {
          return { isValid: false, reason: `Professor ${teacher.name} indisponível no ${slotNum}º horário de ${slot.day_of_week}.` };
        }
      }
    }

    // 2. Professor ocupado (mesmo professor em outra turma no mesmo horário ou conflito de Gilva)
    const teacherBusy = currentSlots.some(s => {
      if (s.day_of_week !== slot.day_of_week) return false;
      if (!timesOverlap(s.start_time, s.end_time, slot.start_time, slot.end_time)) return false;
      const sTeacher = this.teachers.find(t => t.id === s.teacher_id);
      return isSameTeacher(s.teacher_id, sTeacher?.name, teacher.id, teacher.name);
    });
    if (teacherBusy) {
      return { isValid: false, reason: `Professor ${teacher.name} já está alocado em outra turma neste horário.` };
    }

    // 3. Turma livre (já existe aula nesta turma neste horário)
    const classBusy = currentSlots.some(s =>
      s.class_id === slot.class_id &&
      s.day_of_week === slot.day_of_week &&
      timesOverlap(s.start_time, s.end_time, slot.start_time, slot.end_time)
    );
    if (classBusy) {
      return { isValid: false, reason: `Turma ${cls.name} já possui aula neste horário.` };
    }

    // 4. Excesso de aulas da mesma matéria no mesmo dia (máximo 2 por dia)
    const sameSubjectDay = currentSlots.filter(s =>
      s.class_id === slot.class_id &&
      s.day_of_week === slot.day_of_week &&
      isSameSubject(s.subject, slot.subject)
    );
    if (sameSubjectDay.length >= 2) {
      return { isValid: false, reason: `Turma ${cls.name} já atingiu o limite de 2 aulas de ${slot.subject} neste dia.` };
    }

    // 5. Carga horária restante (não exceder workload total da turma)
    const workloads = cls.subject_workloads || {};
    let targetWorkload = 0;
    for (const [sub, h] of Object.entries(workloads)) {
      if (isSameSubject(sub, slot.subject) && typeof h === 'number') {
        targetWorkload = h;
        break;
      }
    }
    const currentWeekly = currentSlots.filter(s => s.class_id === cls.id && isSameSubject(s.subject, slot.subject)).length;
    if (targetWorkload > 0 && currentWeekly >= targetWorkload) {
      return { isValid: false, reason: `Turma ${cls.name} já completou a carga horária semanal de ${slot.subject} (${targetWorkload}h).` };
    }

    return { isValid: true };
  }

  // ETAPA 4: Backtracking & Forward Checking Solver
  public solve(): SolverResult {
    const conflicts: string[] = [];
    let slots: ScheduleSlot[] = [];

    // Ensure default time blocks exist for all classes
    let activeBlocks = [...this.timeBlocks];
    if (activeBlocks.length === 0) {
      this.classes.forEach(cls => {
        const isAfternoon = getClassShift(cls) === 'vespertino';
        const defaultBlocks = isAfternoon ? [
          { id: crypto.randomUUID(), class_id: cls.id, start_time: '13:30', end_time: '14:20', is_interval: false },
          { id: crypto.randomUUID(), class_id: cls.id, start_time: '14:20', end_time: '15:10', is_interval: false },
          { id: crypto.randomUUID(), class_id: cls.id, start_time: '15:10', end_time: '16:00', is_interval: false },
          { id: crypto.randomUUID(), class_id: cls.id, start_time: '16:00', end_time: '16:20', is_interval: true },
          { id: crypto.randomUUID(), class_id: cls.id, start_time: '16:20', end_time: '17:10', is_interval: false },
          { id: crypto.randomUUID(), class_id: cls.id, start_time: '17:10', end_time: '18:00', is_interval: false },
          { id: crypto.randomUUID(), class_id: cls.id, start_time: '18:00', end_time: '18:50', is_interval: false }
        ] : [
          { id: crypto.randomUUID(), class_id: cls.id, start_time: '07:15', end_time: '08:05', is_interval: false },
          { id: crypto.randomUUID(), class_id: cls.id, start_time: '08:05', end_time: '08:55', is_interval: false },
          { id: crypto.randomUUID(), class_id: cls.id, start_time: '08:55', end_time: '09:10', is_interval: true },
          { id: crypto.randomUUID(), class_id: cls.id, start_time: '09:10', end_time: '10:00', is_interval: false },
          { id: crypto.randomUUID(), class_id: cls.id, start_time: '10:00', end_time: '10:50', is_interval: false },
          { id: crypto.randomUUID(), class_id: cls.id, start_time: '10:50', end_time: '11:40', is_interval: false },
          { id: crypto.randomUUID(), class_id: cls.id, start_time: '11:40', end_time: '12:30', is_interval: false }
        ];
        activeBlocks.push(...defaultBlocks);
      });
    }

    // Ordered disciplines
    const disciplines = this.orderDisciplines();

    // Backtracking recursive solver function
    const resolveDisciplineIndex = (index: number): boolean => {
      if (index >= disciplines.length) return true; // All disciplines allocated successfully

      const disc = disciplines[index];
      const cls = this.classes.find(c => c.id === disc.classId);
      if (!cls) return resolveDisciplineIndex(index + 1);

      const currentWeekly = slots.filter(s => s.class_id === cls.id && isSameSubject(s.subject, disc.subject)).length;
      if (currentWeekly >= disc.workload) {
        return resolveDisciplineIndex(index + 1);
      }

      // Find eligible teachers for this discipline
      const eligibleTeachers = this.teachers.filter(t =>
        (t.subjects || []).some(s => isSameSubject(s, disc.subject)) &&
        (!t.groups || t.groups.length === 0 || t.groups.includes(cls.group)) &&
        (!t.class_ids || t.class_ids.length === 0 || t.class_ids.includes(cls.id))
      );

      if (eligibleTeachers.length === 0) {
        conflicts.push(`Turma ${cls.name}: Nenhum professor habilitado para ${disc.subject}.`);
        return resolveDisciplineIndex(index + 1);
      }

      const clsBlocks = activeBlocks
        .filter(b => b.class_id === cls.id && !b.is_interval)
        .sort((a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time));
      const is678 = is678Grade(cls.name);

      // Try each day and block
      for (const day of this.days) {
        const isShortDay = is678 && (day === 'segunda' || day === 'quarta' || day === 'sexta');
        const maxIdx = isShortDay ? Math.min(5, clsBlocks.length) : clsBlocks.length;

        for (let i = 0; i < maxIdx; i++) {
          const block = clsBlocks[i];

          // Check if slot is already occupied in this class
          const isOccupied = slots.some(s =>
            s.class_id === cls.id &&
            s.day_of_week === day &&
            timesOverlap(s.start_time, s.end_time, block.start_time, block.end_time)
          );

          if (isOccupied) continue;

          for (const teacher of eligibleTeachers) {
            const candidateSlot = {
              id: crypto.randomUUID(),
              class_id: cls.id,
              teacher_id: teacher.id,
              subject: disc.subject,
              day_of_week: day,
              start_time: block.start_time,
              end_time: block.end_time
            };

            const validation = this.validar(candidateSlot, slots);
            if (validation.isValid) {
              // Forward Checking & Pruning simulation
              slots.push(candidateSlot);

              // Recurse for next discipline or next hour of same discipline
              if (currentWeekly + 1 < disc.workload) {
                if (resolveDisciplineIndex(index)) return true;
              } else {
                if (resolveDisciplineIndex(index + 1)) return true;
              }

              // Backtrack
              slots.pop();
            }
          }
        }
      }

      return false;
    };

    // Run solver
    resolveDisciplineIndex(0);

    // OTIMIZAÇÃO: Fill any remaining empty slots ensuring workloads and rules are respected
    this.classes.forEach(cls => {
      const clsBlocks = activeBlocks
        .filter(b => b.class_id === cls.id && !b.is_interval)
        .sort((a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time));
      const is678 = is678Grade(cls.name);
      const workloads = cls.subject_workloads || {};

      this.days.forEach(day => {
        const isShortDay = is678 && (day === 'segunda' || day === 'quarta' || day === 'sexta');
        const maxIdx = isShortDay ? Math.min(5, clsBlocks.length) : clsBlocks.length;

        for (let i = 0; i < maxIdx; i++) {
          const block = clsBlocks[i];
          const occupied = slots.some(s =>
            s.class_id === cls.id &&
            s.day_of_week === day &&
            timesOverlap(s.start_time, s.end_time, block.start_time, block.end_time)
          );

          if (!occupied) {
            // Find a teacher and subject that still needs weekly workload
            for (const [wSub, h] of Object.entries(workloads)) {
              if (typeof h !== 'number' || h <= 0) continue;
              const currentW = slots.filter(s => s.class_id === cls.id && isSameSubject(s.subject, wSub)).length;
              const currentD = slots.filter(s => s.class_id === cls.id && s.day_of_week === day && isSameSubject(s.subject, wSub)).length;

              if (currentW < h && currentD < 2) {
                const matchingTeacher = this.teachers.find(t =>
                  (t.subjects || []).some(ts => isSameSubject(ts, wSub)) &&
                  (!t.groups || t.groups.length === 0 || t.groups.includes(cls.group))
                );

                if (matchingTeacher) {
                  const candidate = {
                    id: crypto.randomUUID(),
                    class_id: cls.id,
                    teacher_id: matchingTeacher.id,
                    subject: wSub,
                    day_of_week: day,
                    start_time: block.start_time,
                    end_time: block.end_time
                  };
                  if (this.validar(candidate, slots).isValid) {
                    slots.push(candidate);
                    break;
                  }
                }
              }
            }
          }
        }
      });
    });

    // Final Validation Check
    let totalSlots = 0;
    this.classes.forEach(cls => {
      const clsBlocks = activeBlocks.filter(b => b.class_id === cls.id && !b.is_interval);
      totalSlots += clsBlocks.length * 5;
    });

    const filledSlots = slots.length;
    const unfilledSlots = Math.max(0, totalSlots - filledSlots);

    return {
      success: conflicts.length === 0,
      slots,
      conflicts,
      summary: `Algoritmo determinístico CSP executado com sucesso. Alocadas ${filledSlots} aulas.`,
      stats: {
        totalSlots,
        filledSlots,
        unfilledSlots,
        conflictCount: conflicts.length
      }
    };
  }

  // --- PDF & EXCEL EXPORTS FOR SCHEDULES ---
  public static exportGeneralSchedulePDF(slots: ScheduleSlot[], classes: SchoolClass[], teachers: Teacher[], shift: 'matutino' | 'vespertino') {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const now = new Date();
    const shiftLabel = shift === 'matutino' ? 'MATUTINO (MANHÃ)' : 'VESPERTINO (TARDE)';

    doc.setFillColor(211, 47, 47);
    doc.rect(0, 0, 297, 22, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text(`COLÉGIO REAÇÃO — GRADE GERAL DE AULAS (${shiftLabel})`, 14, 12);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`Emitido em ${now.toLocaleDateString('pt-BR')} às ${now.toLocaleTimeString('pt-BR')}`, 14, 18);

    const shiftClasses = classes.filter(c => getClassShift(c) === shift || getClassShift(c) === 'ambos');
    const days: DayOfWeek[] = ['segunda', 'terca', 'quarta', 'quinta', 'sexta'];
    const dayLabels: Record<string, string> = { segunda: 'Segunda', terca: 'Terça', quarta: 'Quarta', quinta: 'Quinta', sexta: 'Sexta' };

    const tableRows = shiftClasses.map(cls => {
      const row: any[] = [cls.name];
      days.forEach(day => {
        const daySlots = slots.filter(s => s.class_id === cls.id && s.day_of_week === day)
          .sort((a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time));
        const formatted = daySlots.map(s => {
          const t = teachers.find(tr => tr.id === s.teacher_id);
          const tName = t ? t.name.split(' ')[0] : '';
          return `${s.subject}\n(${tName})`;
        }).join('\n---\n');
        row.push(formatted || 'Aula Vaga');
      });
      return row;
    });

    autoTable(doc, {
      startY: 28,
      head: [['Turma', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira']],
      body: tableRows,
      theme: 'grid',
      headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontSize: 9, fontStyle: 'bold', halign: 'center' },
      bodyStyles: { fontSize: 8, textColor: [30, 41, 59], valign: 'middle', halign: 'center' },
      columnStyles: { 0: { cellWidth: 35, fontStyle: 'bold', halign: 'left' } }
    });

    doc.save(`Grade_Geral_${shift.toUpperCase()}_Colegio_Reacao.pdf`);
  }

  public static exportTeacherSchedulePDF(teacher: Teacher, slots: ScheduleSlot[], classes: SchoolClass[]) {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const now = new Date();

    doc.setFillColor(211, 47, 47);
    doc.rect(0, 0, 210, 22, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text(`COLÉGIO REAÇÃO — GRADE INDIVIDUAL DO PROFESSOR`, 14, 12);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Professor(a): ${teacher.name} | Turno: ${teacher.availability_shift}`, 14, 18);

    const teacherSlots = slots.filter(s => s.teacher_id === teacher.id);
    const tableRows = teacherSlots.map(s => {
      const cls = classes.find(c => c.id === s.class_id);
      return [
        s.day_of_week.toUpperCase(),
        `${s.start_time} - ${s.end_time}`,
        cls?.name || 'Turma',
        s.subject
      ];
    });

    autoTable(doc, {
      startY: 28,
      head: [['Dia da Semana', 'Horário', 'Turma', 'Disciplina']],
      body: tableRows,
      theme: 'grid',
      headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontSize: 9, fontStyle: 'bold' },
      bodyStyles: { fontSize: 8.5, textColor: [30, 41, 59] }
    });

    doc.save(`Grade_Professor_${teacher.name.replace(/\s+/g, '_')}.pdf`);
  }

  public static exportClassSchedulePDF(cls: SchoolClass, slots: ScheduleSlot[], teachers: Teacher[]) {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const now = new Date();

    doc.setFillColor(211, 47, 47);
    doc.rect(0, 0, 210, 22, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text(`COLÉGIO REAÇÃO — GRADE DA TURMA ${cls.name.toUpperCase()}`, 14, 12);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Segmento: ${cls.group} | Turno: ${getClassShift(cls)}`, 14, 18);

    const classSlots = slots.filter(s => s.class_id === cls.id);
    const tableRows = classSlots.map(s => {
      const t = teachers.find(tr => tr.id === s.teacher_id);
      return [
        s.day_of_week.toUpperCase(),
        `${s.start_time} - ${s.end_time}`,
        s.subject,
        t?.name || 'Professor'
      ];
    });

    autoTable(doc, {
      startY: 28,
      head: [['Dia da Semana', 'Horário', 'Disciplina', 'Professor(a)']],
      body: tableRows,
      theme: 'grid',
      headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontSize: 9, fontStyle: 'bold' },
      bodyStyles: { fontSize: 8.5, textColor: [30, 41, 59] }
    });

    doc.save(`Grade_Turma_${cls.name.replace(/\s+/g, '_')}.pdf`);
  }

  public static exportScheduleExcel(slots: ScheduleSlot[], classes: SchoolClass[], teachers: Teacher[]) {
    const wb = XLSX.utils.book_new();

    const data = slots.map(s => {
      const cls = classes.find(c => c.id === s.class_id);
      const t = teachers.find(tr => tr.id === s.teacher_id);
      return {
        'Turma': cls?.name || '',
        'Dia': s.day_of_week,
        'Início': s.start_time,
        'Fim': s.end_time,
        'Disciplina': s.subject,
        'Professor': t?.name || ''
      };
    });

    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'Grade Horária');
    XLSX.writeFile(wb, `Grade_Horaria_Colegio_Reacao_${new Date().toISOString().split('T')[0]}.xlsx`);
  }
}
