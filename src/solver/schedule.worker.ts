import { ScheduleSolver } from './ScheduleSolver';
import { Teacher, SchoolClass, Subject, TimeBlock } from '../types';

self.onmessage = (event: MessageEvent) => {
  const { teachers, classes, subjects, timeBlocks } = event.data;

  try {
    const solver = new ScheduleSolver(teachers, classes, subjects, timeBlocks);
    
    const result = solver.solve((progress, message) => {
      self.postMessage({ type: 'progress', progress, message });
    });

    self.postMessage({ type: 'complete', result });
  } catch (error: any) {
    self.postMessage({ type: 'error', message: error?.message || 'Erro desconhecido no Web Worker' });
  }
};
