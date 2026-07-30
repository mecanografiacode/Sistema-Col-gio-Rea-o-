import { Teacher, SchoolClass, ScheduleSlot, DayOfWeek } from '../types';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { getClassShift, timeToMinutes } from './types';

export class Exporter {
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
