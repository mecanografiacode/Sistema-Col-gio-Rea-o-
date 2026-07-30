import { ScheduleSolver } from '../solver/ScheduleSolver';
import { Teacher, SchoolClass, ScheduleSlot, TimeBlock, Subject, DayOfWeek } from '../types';

export class HorarioCSPSolver extends ScheduleSolver {
  constructor(teachers: Teacher[], classes: SchoolClass[], subjects: Subject[], timeBlocks: TimeBlock[]) {
    super(teachers, classes, subjects, timeBlocks);
  }
}

export { Exporter as ScheduleExporter } from '../solver/Exporter';
