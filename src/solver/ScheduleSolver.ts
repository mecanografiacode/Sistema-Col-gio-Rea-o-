import { Teacher, SchoolClass, ScheduleSlot, TimeBlock, Subject, DayOfWeek } from '../types';
import { SolverResult } from './types';
import { TeacherIndex } from './TeacherIndex';
import { ClassIndex } from './ClassIndex';
import { AvailabilityIndex } from './AvailabilityIndex';
import { SubjectIndex } from './SubjectIndex';
import { PriorityQueue } from './PriorityQueue';
import { GreedyAllocator } from './GreedyAllocator';
import { LocalSearchOptimizer } from './LocalSearchOptimizer';
import { Exporter } from './Exporter';

export class ScheduleSolver {
  private teachers: Teacher[];
  private classes: SchoolClass[];
  private subjects: Subject[];
  private timeBlocks: TimeBlock[];
  private days: DayOfWeek[] = ['segunda', 'terca', 'quarta', 'quinta', 'sexta'];

  constructor(teachers: Teacher[], classes: SchoolClass[], subjects: Subject[], timeBlocks: TimeBlock[]) {
    this.teachers = teachers;
    this.classes = classes;
    this.subjects = subjects;
    this.timeBlocks = timeBlocks;
  }

  public async solveAsync(onProgress?: (progress: number, message: string) => Promise<void> | void): Promise<SolverResult> {
    const startTime = performance.now();

    await onProgress?.(10, 'Carregando índices de professores, turmas e disponibilidades...');
    await new Promise(r => setTimeout(r, 10));

    const teacherIndex = new TeacherIndex(this.teachers);
    const classIndex = new ClassIndex(this.classes, this.timeBlocks);
    const availabilityIndex = new AvailabilityIndex(this.teachers, (cid) => classIndex.getTimeBlocks(cid));
    const subjectIndex = new SubjectIndex(this.subjects, this.teachers);

    await onProgress?.(25, 'Calculando prioridades e ordem de alocação de disciplinas...');
    await new Promise(r => setTimeout(r, 10));

    const lessons = PriorityQueue.computeAndSort(
      this.classes,
      this.teachers,
      teacherIndex,
      availabilityIndex,
      this.days
    );

    await onProgress?.(40, 'Executando alocação inteligente (Greedy Allocator)...');
    await new Promise(r => setTimeout(r, 15));

    const allocator = new GreedyAllocator();
    const { slots: allocatedSlots, conflicts } = allocator.allocate(
      lessons,
      this.teachers,
      this.classes,
      teacherIndex,
      classIndex,
      availabilityIndex
    );

    await onProgress?.(60, 'Executando otimização por busca local e eliminação de janelas...');
    await new Promise(r => setTimeout(r, 15));

    const optimizedSlots = LocalSearchOptimizer.optimize(
      allocatedSlots,
      this.teachers,
      this.classes,
      availabilityIndex,
      classIndex
    );

    await onProgress?.(80, 'Validando restrições finais e integridade da grade...');
    await new Promise(r => setTimeout(r, 10));

    let totalSlots = 0;
    for (const cls of this.classes) {
      const clsBlocks = classIndex.getTimeBlocks(cls.id).filter(b => !b.is_interval);
      const is678 = classIndex.is678(cls.id);
      for (const day of this.days) {
        const maxIdx = (is678 && (day === 'segunda' || day === 'quarta' || day === 'sexta')) ? Math.min(5, clsBlocks.length) : clsBlocks.length;
        totalSlots += maxIdx;
      }
    }

    const filledSlots = optimizedSlots.length;
    const unfilledSlots = Math.max(0, totalSlots - filledSlots);

    await onProgress?.(100, 'Geração de horário concluída com sucesso!');

    return {
      success: conflicts.length === 0 && unfilledSlots === 0,
      slots: optimizedSlots,
      conflicts,
      summary: `Motor CSP profissional executado em ${(performance.now() - startTime).toFixed(1)}ms. ${filledSlots}/${totalSlots} aulas alocadas.`,
      stats: {
        totalSlots,
        filledSlots,
        unfilledSlots,
        conflictCount: conflicts.length
      }
    };
  }

  public solve(onProgress?: (progress: number, message: string) => void): SolverResult {
    const startTime = performance.now();
    onProgress?.(10, 'Carregando índices...');
    const teacherIndex = new TeacherIndex(this.teachers);
    const classIndex = new ClassIndex(this.classes, this.timeBlocks);
    const availabilityIndex = new AvailabilityIndex(this.teachers, (cid) => classIndex.getTimeBlocks(cid));

    onProgress?.(25, 'Calculando prioridades...');
    const lessons = PriorityQueue.computeAndSort(this.classes, this.teachers, teacherIndex, availabilityIndex, this.days);

    onProgress?.(40, 'Alocando aulas...');
    const allocator = new GreedyAllocator();
    const { slots: allocatedSlots, conflicts } = allocator.allocate(lessons, this.teachers, this.classes, teacherIndex, classIndex, availabilityIndex);

    onProgress?.(60, 'Otimizando...');
    const optimizedSlots = LocalSearchOptimizer.optimize(allocatedSlots, this.teachers, this.classes, availabilityIndex, classIndex);

    onProgress?.(80, 'Validando...');
    let totalSlots = 0;
    for (const cls of this.classes) {
      const clsBlocks = classIndex.getTimeBlocks(cls.id).filter(b => !b.is_interval);
      const is678 = classIndex.is678(cls.id);
      for (const day of this.days) {
        const maxIdx = (is678 && (day === 'segunda' || day === 'quarta' || day === 'sexta')) ? Math.min(5, clsBlocks.length) : clsBlocks.length;
        totalSlots += maxIdx;
      }
    }

    const filledSlots = optimizedSlots.length;
    const unfilledSlots = Math.max(0, totalSlots - filledSlots);

    onProgress?.(100, 'Concluído!');

    return {
      success: conflicts.length === 0 && unfilledSlots === 0,
      slots: optimizedSlots,
      conflicts,
      summary: `Motor CSP executado em ${(performance.now() - startTime).toFixed(1)}ms.`,
      stats: { totalSlots, filledSlots, unfilledSlots, conflictCount: conflicts.length }
    };
  }

  public static exportGeneralSchedulePDF = Exporter.exportGeneralSchedulePDF;
  public static exportTeacherSchedulePDF = Exporter.exportTeacherSchedulePDF;
  public static exportClassSchedulePDF = Exporter.exportClassSchedulePDF;
  public static exportScheduleExcel = Exporter.exportScheduleExcel;
}
