import { Teacher, SchoolClass, ScheduleSlot, TimeBlock, Subject, DayOfWeek } from '../types';
import { SolverResult } from './types';
import { SchedulerEngine } from '../scheduler/solver/SchedulerEngine';
import { Exporter } from './Exporter';

export class ScheduleSolver {
  private engine: SchedulerEngine;

  constructor(teachers: Teacher[], classes: SchoolClass[], subjects: Subject[], timeBlocks: TimeBlock[]) {
    this.engine = new SchedulerEngine(teachers, classes, subjects, timeBlocks);
  }

  public async solveAsync(onProgress?: (progress: number, message: string) => Promise<void> | void): Promise<SolverResult> {
    return await this.engine.solveAsync(onProgress);
  }

  public solve(onProgress?: (progress: number, message: string) => void): SolverResult {
    let resultSync: SolverResult = {
      success: true,
      slots: [],
      conflicts: [],
      summary: 'Executado',
      stats: { totalSlots: 0, filledSlots: 0, unfilledSlots: 0, conflictCount: 0 }
    };

    this.engine.solveAsync((progress, message) => {
      onProgress?.(progress, message);
    }).then(res => {
      resultSync = res;
    });

    return resultSync;
  }

  public static exportGeneralSchedulePDF = Exporter.exportGeneralSchedulePDF;
  public static exportTeacherSchedulePDF = Exporter.exportTeacherSchedulePDF;
  public static exportClassSchedulePDF = Exporter.exportClassSchedulePDF;
  public static exportScheduleExcel = Exporter.exportScheduleExcel;
}
