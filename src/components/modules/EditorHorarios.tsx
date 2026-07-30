import React, { useState, useEffect, useMemo } from 'react';
import { UserProfile, Teacher, SchoolClass, ScheduleSlot, EducationalGroup, DayOfWeek, TimeBlock, Subject } from '../../types';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Plus, Trash2, Edit2, AlertCircle, Save, Download, CalendarClock, Wand2, Eye, Pencil, X, Check } from 'lucide-react';
import { storage } from '../../lib/storage';

const normalizeTime = (t: string): string => {
  if (!t) return '00:00';
  const parts = t.split(':');
  if (parts.length < 2) return '00:00';
  const h = parts[0].padStart(2, '0');
  const m = parts[1].padStart(2, '0');
  return `${h}:${m}`;
};

const timesOverlap = (start1: string, end1: string, start2: string, end2: string): boolean => {
  return normalizeTime(start1) < normalizeTime(end2) && normalizeTime(end1) > normalizeTime(start2);
};

const getClassShift = (c: SchoolClass): 'matutino' | 'vespertino' | 'ambos' => {
  if (c.shift && c.shift !== 'ambos') return c.shift;
  const upperName = c.name.toUpperCase().trim();
  if (upperName.includes('VESP') || upperName.includes('TARDE') || upperName.includes('VESPERTINO')) {
    return 'vespertino';
  }
  if (upperName.includes('MAT') || upperName.includes('MANHÃ') || upperName.includes('MATUTINO')) {
    return 'matutino';
  }
  if (upperName.endsWith('B') || upperName.includes(' B ') || upperName.endsWith('-B')) {
    return 'vespertino';
  }
  if (upperName.endsWith('A') || upperName.includes(' A ') || upperName.endsWith('-A')) {
    return 'matutino';
  }
  return c.shift || 'matutino';
};

const extractBaseGrade = (className: string): string => {
  if (!className) return '';
  const normalized = className.trim().toUpperCase()
    .replace(/°/g, 'º')
    .replace(/SERIE/g, 'SÉRIE');

  // Match pattern like "6º ANO", "7º ANO", "8º ANO", "9º ANO", "1ª SÉRIE", "2ª SÉRIE", "3ª SÉRIE"
  const matchGrade = normalized.match(/(\d+[\sºª]*(?:ANO|SÉRIE))/i);
  if (matchGrade) {
    return matchGrade[1].replace(/\s+/g, ' ');
  }

  // Fallback: strip ending letter/shift suffix like " A", " B", " - MATUTINO", " - VESPERTINO"
  return normalized
    .replace(/[\s\-_]+(MATUTINO|VESPERTINO|AMBOS|[A-Z])$/i, '')
    .trim();
};

const DEFAULT_INFANTIL_WORKLOAD = {};

const DEFAULT_INICIAIS_WORKLOAD = {};

const DEFAULT_FINAIS_WORKLOAD = {};

const DEFAULT_MEDIO_WORKLOAD = {};

const DEFAULT_CLASSES: SchoolClass[] = [];

const DEFAULT_TEACHERS: Teacher[] = [];

const is678Grade = (className: string) => {
  const norm = className.toLowerCase();
  if (norm.includes('9º') || norm.includes('9°') || norm.includes('9 ano') || norm.includes('médio') || norm.includes('medio') || norm.includes('9a') || norm.includes('9b')) {
    return false;
  }
  return norm.includes('6º') || norm.includes('6°') || norm.includes('6 ano') || norm.includes('6a') || norm.includes('6b') ||
         norm.includes('7º') || norm.includes('7°') || norm.includes('7 ano') || norm.includes('7a') || norm.includes('7b') ||
         norm.includes('8º') || norm.includes('8°') || norm.includes('8 ano') || norm.includes('8a') || norm.includes('8b') ||
         /\b(6|7|8)\b/.test(norm);
};

const getNormalizedTeacherFirstName = (name?: string): string => {
  if (!name) return '';
  const clean = name.trim().toLowerCase()
    .replace(/^profª?\.?\s+/i, '')
    .replace(/^professor[a]?\s+/i, '')
    .replace(/^tio|tia\s+/i, '')
    .trim();
  const firstWord = clean.split(/[\s\-_]+/)[0] || '';
  return firstWord;
};

const isSameTeacher = (t1Id?: string, t1Name?: string, t2Id?: string, t2Name?: string): boolean => {
  if (t1Id && t2Id && t1Id === t2Id) return true;
  if (!t1Name || !t2Name) return false;

  const clean1 = t1Name.trim().toLowerCase();
  const clean2 = t2Name.trim().toLowerCase();
  if (clean1 === clean2) return true;

  const fn1 = getNormalizedTeacherFirstName(t1Name);
  const fn2 = getNormalizedTeacherFirstName(t2Name);

  if (fn1.length >= 3 && fn1 === fn2) {
    return true; // Recognizes "Gilva Matemática" and "Gilva DG" as the same physical teacher
  }

  return false;
};

const normalizeSubjectName = (s: string): string => {
  if (!s) return '';
  const clean = s.trim().toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
  
  if (clean === 'dg' || clean === 'desenhogeometrico' || clean === 'desenhogeometria' || clean === 'desgeometria') return 'dg';
  if (clean === 'edfisica' || clean === 'educacaofisica' || clean === 'edfis' || clean === 'educacaofis') return 'edfisica';
  if (clean === 'portugues' || clean === 'linguaportuguesa' || clean === 'port' || clean === 'lportuguesa') return 'portugues';
  if (clean === 'matematica' || clean === 'mat') return 'matematica';
  if (clean === 'historia' || clean === 'hist') return 'historia';
  if (clean === 'geografia' || clean === 'geo') return 'geografia';
  if (clean === 'ciencias' || clean === 'cien') return 'ciencias';
  if (clean === 'biologia' || clean === 'bio') return 'biologia';
  if (clean === 'fisica' || clean === 'fis') return 'fisica';
  if (clean === 'quimica' || clean === 'quim') return 'quimica';
  if (clean === 'artes' || clean === 'arte') return 'artes';
  if (clean === 'ingles' || clean === 'linguainglesa' || clean === 'linginglesa') return 'ingles';
  if (clean === 'espanhol' || clean === 'linguaespanhola' || clean === 'lingespanhola') return 'espanhol';
  if (clean === 'filosofia' || clean === 'filo') return 'filosofia';
  if (clean === 'sociologia' || clean === 'soc') return 'sociologia';
  if (clean === 'redacao' || clean === 'producaodetexto' || clean === 'prod' || clean === 'prodtexto') return 'redacao';
  return clean;
};

const isSameSubject = (s1?: string, s2?: string): boolean => {
  if (!s1 || !s2) return false;
  return normalizeSubjectName(s1) === normalizeSubjectName(s2);
};

const countWeeklySlotsForSubject = (classId: string, subject: string, slotsList: ScheduleSlot[]): number => {
  return slotsList.filter(s => s.class_id === classId && isSameSubject(s.subject, subject)).length;
};

const countDaySlotsForSubject = (classId: string, day: string, subject: string, slotsList: ScheduleSlot[]): number => {
  return slotsList.filter(s => s.class_id === classId && s.day_of_week === day && isSameSubject(s.subject, subject)).length;
};

interface EditorHorariosProps {
  currentUser: UserProfile;
}

export const EditorHorarios: React.FC<EditorHorariosProps> = ({ currentUser }) => {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [scheduleSlots, setScheduleSlots] = useState<ScheduleSlot[]>([]);
  const [timeBlocks, setTimeBlocks] = useState<TimeBlock[]>([]);
  const [activeTab, setActiveTab] = useState<'grade' | 'professores' | 'turmas' | 'disciplinas'>('grade');
  const [isLoading, setIsLoading] = useState(true);

  // Load from storage (with Supabase fallback)
  useEffect(() => {
    const loadData = async () => {
      try {
        const dbTeachers = await storage.getTeachers();
        setTeachers(dbTeachers || []);

        const dbClasses = await storage.getClasses();
        setClasses(dbClasses || []);

        const dbSubjects = await storage.getSubjects();
        setSubjects(dbSubjects || []);

        const dbSlots = await storage.getScheduleSlots();
        setScheduleSlots(dbSlots || []);

        const dbBlocks = await storage.getTimeBlocks();
        setTimeBlocks(dbBlocks || []);
      } catch (err) {
        console.error('Error loading schedule data from storage:', err);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  // Save to storage whenever state changes (guarded by isLoading flag)
  useEffect(() => {
    if (!isLoading) {
      storage.saveTeachers(teachers);
    }
  }, [teachers, isLoading]);

  useEffect(() => {
    if (!isLoading) {
      storage.saveClasses(classes);
    }
  }, [classes, isLoading]);

  useEffect(() => {
    if (!isLoading) {
      storage.saveSubjects(subjects);
    }
  }, [subjects, isLoading]);

  useEffect(() => {
    if (!isLoading) {
      storage.saveScheduleSlots(scheduleSlots);
    }
  }, [scheduleSlots, isLoading]);

  useEffect(() => {
    if (!isLoading) {
      storage.saveTimeBlocks(timeBlocks);
    }
  }, [timeBlocks, isLoading]);

  const isAdmin = currentUser.role === 'admin' || currentUser.role === 'super_admin';

  const handleResetAllData = async () => {
    if (!confirm('Atenção: Deseja apagar TODOS os dados do Editor de Horários (professores, turmas, disciplinas, horários agendados e blocos de tempo)? Esta ação excluirá os registros de teste no Supabase e no armazenamento local.')) {
      return;
    }
    setIsLoading(true);
    try {
      await storage.clearAllScheduleData();
      setTeachers([]);
      setClasses([]);
      setSubjects([]);
      setScheduleSlots([]);
      setTimeBlocks([]);
      alert('Todos os dados de teste foram apagados com sucesso! O sistema está pronto do zero.');
    } catch (err) {
      console.error('Erro ao resetar dados:', err);
      alert('Erro ao apagar dados.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 font-serif-editorial">Editor de Horários</h2>
          <p className="text-sm text-slate-500 mt-1">
            Visualização e gestão da grade horária
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={handleResetAllData}
            className="self-start sm:self-auto bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-700 text-xs font-bold px-3 py-2 rounded-xl border border-slate-200 hover:border-red-200 flex items-center gap-1.5 transition-all shadow-2xs"
            title="Limpar todos os dados e horários de teste do banco de dados"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Limpar Dados de Teste (Zerar Sistema)
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 border-b border-slate-200 overflow-x-auto">
        {(isAdmin ? ['grade', 'professores', 'turmas', 'disciplinas'] : ['grade']).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={`px-4 py-2 text-sm font-semibold capitalize border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab
                ? 'border-red-600 text-red-700'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            {tab === 'grade' ? 'Grade Horária' : tab}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 min-h-[500px]">
        {activeTab === 'professores' && (
          <TeacherManager teachers={teachers} setTeachers={setTeachers} subjects={subjects} classes={classes} />
        )}
        {activeTab === 'turmas' && (
          <ClassManager classes={classes} setClasses={setClasses} subjects={subjects} />
        )}
        {activeTab === 'disciplinas' && (
          <SubjectManager subjects={subjects} setSubjects={setSubjects} />
        )}
        {activeTab === 'grade' && (
          <ScheduleManager
            teachers={teachers}
            classes={classes}
            subjects={subjects}
            scheduleSlots={scheduleSlots}
            setScheduleSlots={setScheduleSlots}
            timeBlocks={timeBlocks}
            setTimeBlocks={setTimeBlocks}
            isAdmin={isAdmin}
          />
        )}
      </div>
    </div>
  );
};

// --- Teacher Manager ---
function TeacherManager({ 
  teachers, 
  setTeachers, 
  subjects, 
  classes 
}: { 
  teachers: Teacher[], 
  setTeachers: React.Dispatch<React.SetStateAction<Teacher[]>>, 
  subjects: Subject[],
  classes: SchoolClass[] 
}) {
  const [editingTeacherId, setEditingTeacherId] = useState<string | null>(null);
  const [viewingTeacher, setViewingTeacher] = useState<Teacher | null>(null);

  const [newTeacherName, setNewTeacherName] = useState('');
  const [newTeacherSubjects, setNewTeacherSubjects] = useState<string[]>([]);
  const [newTeacherShift, setNewTeacherShift] = useState<'matutino' | 'vespertino' | 'ambos'>('ambos');
  const [newTeacherGroups, setNewTeacherGroups] = useState<EducationalGroup[]>(['anos_finais', 'ensino_medio']);
  const [newTeacherClassIds, setNewTeacherClassIds] = useState<string[]>([]);

  const daysList: { id: DayOfWeek; label: string; short: string }[] = [
    { id: 'segunda', label: 'Segunda-feira', short: 'Seg' },
    { id: 'terca', label: 'Terça-feira', short: 'Ter' },
    { id: 'quarta', label: 'Quarta-feira', short: 'Qua' },
    { id: 'quinta', label: 'Quinta-feira', short: 'Qui' },
    { id: 'sexta', label: 'Sexta-feira', short: 'Sex' }
  ];
  const slotsList = [1, 2, 3, 4, 5, 6];

  const createDefaultGrid = () => {
    const grid: { [key: string]: boolean } = {};
    daysList.forEach(d => {
      slotsList.forEach(s => {
        grid[`${d.id}-${s}`] = true;
      });
    });
    return grid;
  };

  const [availabilityGrid, setAvailabilityGrid] = useState<{ [key: string]: boolean }>(createDefaultGrid());

  // Segmentos restritos apenas a Anos Finais e Ensino Médio
  const allGroups: { id: EducationalGroup, label: string }[] = [
    { id: 'anos_finais', label: 'Anos Finais' },
    { id: 'ensino_medio', label: 'Ensino Médio' }
  ];

  const startEditing = (teacher: Teacher) => {
    setEditingTeacherId(teacher.id);
    setNewTeacherName(teacher.name);
    setNewTeacherSubjects(teacher.subjects || []);
    setNewTeacherShift(teacher.availability_shift || 'ambos');
    setNewTeacherGroups(teacher.groups || ['anos_finais', 'ensino_medio']);
    setNewTeacherClassIds(teacher.class_ids || []);
    
    // Grid recovery
    let grid = createDefaultGrid();
    if (teacher.availability_grid && Object.keys(teacher.availability_grid).length > 0) {
      grid = { ...grid, ...teacher.availability_grid };
    }
    setAvailabilityGrid(grid);

    // Scroll to form smoothly
    document.getElementById('teacher-form-header')?.scrollIntoView({ behavior: 'smooth' });
  };

  const cancelEditing = () => {
    setEditingTeacherId(null);
    setNewTeacherName('');
    setNewTeacherSubjects([]);
    setNewTeacherShift('ambos');
    setNewTeacherGroups(['anos_finais', 'ensino_medio']);
    setNewTeacherClassIds([]);
    setAvailabilityGrid(createDefaultGrid());
  };

  const toggleGridCell = (day: DayOfWeek, slot: number) => {
    const key = `${day}-${slot}`;
    setAvailabilityGrid(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const setAllGridCells = (val: boolean) => {
    const updated: { [key: string]: boolean } = {};
    daysList.forEach(d => {
      slotsList.forEach(s => {
        updated[`${d.id}-${s}`] = val;
      });
    });
    setAvailabilityGrid(updated);
  };

  const invertGridCells = () => {
    setAvailabilityGrid(prev => {
      const updated: { [key: string]: boolean } = {};
      daysList.forEach(d => {
        slotsList.forEach(s => {
          updated[`${d.id}-${s}`] = !prev[`${d.id}-${s}`];
        });
      });
      return updated;
    });
  };

  const totalAvailableCount = Object.values(availabilityGrid).filter(Boolean).length;

  const toggleSubject = (subjectName: string) => {
    if (newTeacherSubjects.includes(subjectName)) {
      setNewTeacherSubjects(newTeacherSubjects.filter(s => s !== subjectName));
    } else {
      setNewTeacherSubjects([...newTeacherSubjects, subjectName]);
    }
  };

  const toggleClass = (classId: string) => {
    if (newTeacherClassIds.includes(classId)) {
      setNewTeacherClassIds(newTeacherClassIds.filter(id => id !== classId));
    } else {
      setNewTeacherClassIds([...newTeacherClassIds, classId]);
    }
  };

  // Filter classes according to selected shift and educational group(s)
  const filteredClasses = classes.filter(c => {
    const cShift = getClassShift(c);
    const matchShift = newTeacherShift === 'ambos' || cShift === 'ambos' || cShift === newTeacherShift;
    const matchGroup = newTeacherGroups.length === 0 || newTeacherGroups.includes(c.group);
    return matchShift && matchGroup;
  });

  const toggleAllClasses = () => {
    const filteredIds = filteredClasses.map(c => c.id);
    const allFilteredSelected = filteredIds.length > 0 && filteredIds.every(id => newTeacherClassIds.includes(id));

    if (allFilteredSelected) {
      setNewTeacherClassIds(prev => prev.filter(id => !filteredIds.includes(id)));
    } else {
      setNewTeacherClassIds(prev => Array.from(new Set([...prev, ...filteredIds])));
    }
  };

  const toggleGroup = (group: EducationalGroup) => {
    if (newTeacherGroups.includes(group)) {
      setNewTeacherGroups(newTeacherGroups.filter(g => g !== group));
    } else {
      setNewTeacherGroups([...newTeacherGroups, group]);
    }
  };

  const saveTeacher = () => {
    if (!newTeacherName.trim() || newTeacherSubjects.length === 0 || newTeacherGroups.length === 0) return;

    const derivedDays = daysList.map(d => d.id).filter(dayId => 
      slotsList.some(s => availabilityGrid[`${dayId}-${s}`] !== false)
    );

    const derivedSlots = slotsList.filter(s => 
      daysList.some(d => availabilityGrid[`${d.id}-${s}`] !== false)
    );

    if (editingTeacherId) {
      // Update existing
      setTeachers(teachers.map(t => {
        if (t.id === editingTeacherId) {
          return {
            ...t,
            name: newTeacherName.trim(),
            subjects: newTeacherSubjects,
            groups: newTeacherGroups,
            class_ids: newTeacherClassIds,
            available_days: derivedDays.length > 0 ? derivedDays : ['segunda', 'terca', 'quarta', 'quinta', 'sexta'],
            availability_shift: newTeacherShift,
            available_slots: derivedSlots.length > 0 ? derivedSlots : [1, 2, 3, 4, 5, 6],
            availability_grid: availabilityGrid
          };
        }
        return t;
      }));
      cancelEditing();
    } else {
      // Create new
      setTeachers([
        ...teachers,
        {
          id: crypto.randomUUID(),
          name: newTeacherName.trim(),
          subjects: newTeacherSubjects,
          groups: newTeacherGroups,
          class_ids: newTeacherClassIds,
          available_days: derivedDays.length > 0 ? derivedDays : ['segunda', 'terca', 'quarta', 'quinta', 'sexta'],
          availability_shift: newTeacherShift,
          available_slots: derivedSlots.length > 0 ? derivedSlots : [1, 2, 3, 4, 5, 6],
          availability_grid: availabilityGrid,
          created_at: new Date().toISOString()
        }
      ]);
      cancelEditing();
    }
  };

  const removeTeacher = async (id: string) => {
    try {
      await storage.deleteTeacher(id);
      setTeachers(teachers.filter(t => t.id !== id));
      if (editingTeacherId === id) cancelEditing();
      if (viewingTeacher?.id === id) setViewingTeacher(null);
    } catch (err: any) {
      console.error('Erro retornado pelo Supabase ao deletar professor:', err?.message || err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Container de Cadastro / Edição de Professor */}
      <div id="teacher-form-header" className={`p-5 rounded-2xl border flex flex-col gap-5 shadow-sm transition-all ${
        editingTeacherId ? 'bg-amber-50/50 border-amber-300' : 'bg-emerald-50/40 border-emerald-200/80'
      }`}>
        <div className="flex items-center justify-between border-b pb-3 border-slate-200/80">
          <div>
            <h3 className={`text-lg font-bold font-serif-editorial flex items-center gap-2 ${
              editingTeacherId ? 'text-amber-900' : 'text-emerald-900'
            }`}>
              <span className={`w-2.5 h-2.5 rounded-full inline-block ${
                editingTeacherId ? 'bg-amber-600 animate-pulse' : 'bg-emerald-600'
              }`}></span>
              {editingTeacherId ? `Editando Professor: ${newTeacherName || 'Sem nome'}` : 'Cadastro de Professor'}
            </h3>
            <p className="text-xs text-slate-600 mt-0.5">
              {editingTeacherId 
                ? 'Altere os campos abaixo e clique em "Salvar Alterações"' 
                : 'Defina o nome, disciplinas, turno, turmas e a grade de disponibilidade horária'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {editingTeacherId && (
              <button
                type="button"
                onClick={cancelEditing}
                className="bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
                Cancelar Edição
              </button>
            )}
            <span className={`text-white text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider ${
              editingTeacherId ? 'bg-amber-600' : 'bg-emerald-600'
            }`}>
              {editingTeacherId ? 'Edição' : 'Novo'}
            </span>
          </div>
        </div>

        {/* Linha 1: Nome do Professor, Turno & Segmentos */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-start">
          <div className="sm:col-span-5">
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nome do Professor <span className="text-red-500">*</span></label>
            <input
              type="text"
              className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm font-medium"
              placeholder="Ex: GEOMETRIA 6º e 7º / Carlos Silva"
              value={newTeacherName}
              onChange={(e) => setNewTeacherName(e.target.value)}
            />
          </div>

          <div className="sm:col-span-3">
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Turno <span className="text-red-500">*</span></label>
            <select
              className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm font-medium"
              value={newTeacherShift}
              onChange={(e) => setNewTeacherShift(e.target.value as 'matutino' | 'vespertino' | 'ambos')}
            >
              <option value="matutino">Matutino</option>
              <option value="vespertino">Vespertino</option>
              <option value="ambos">Ambos (Manhã e Tarde)</option>
            </select>
          </div>

          <div className="sm:col-span-4">
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Segmentos de Atuação <span className="text-red-500">*</span></label>
            <div className="flex flex-wrap gap-2">
              {allGroups.map(group => (
                <button
                  key={group.id}
                  type="button"
                  onClick={() => toggleGroup(group.id)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all ${
                    newTeacherGroups.includes(group.id)
                      ? 'bg-emerald-600 border-emerald-700 text-white shadow-sm'
                      : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                  }`}
                >
                  {group.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Linha 2: Disciplinas & Turmas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Disciplinas que Leciona <span className="text-red-500">*</span></label>
            <div className="flex flex-wrap gap-1.5 bg-white p-2.5 rounded-lg border border-slate-200 min-h-[42px] max-h-[120px] overflow-y-auto">
              {subjects.map(subject => (
                <button
                  key={subject.id}
                  type="button"
                  onClick={() => toggleSubject(subject.name)}
                  className={`px-2.5 py-1 text-xs font-bold rounded-md border transition-colors ${
                    newTeacherSubjects.includes(subject.name)
                      ? 'bg-emerald-100 border-emerald-300 text-emerald-800'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {subject.name}
                </button>
              ))}
              {subjects.length === 0 && (
                <span className="text-xs text-slate-400 italic">Nenhuma disciplina cadastrada. Vá na aba Disciplinas.</span>
              )}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-slate-700 uppercase">
                Turmas Atendidas
              </label>
              <button
                type="button"
                onClick={toggleAllClasses}
                className="text-[11px] font-bold text-emerald-700 hover:underline"
              >
                {filteredClasses.length > 0 && filteredClasses.every(c => newTeacherClassIds.includes(c.id)) ? 'Desmarcar Visíveis' : 'Marcar Visíveis'}
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5 bg-white p-2.5 rounded-lg border border-slate-200 min-h-[42px] max-h-[120px] overflow-y-auto">
              {filteredClasses.map(c => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => toggleClass(c.id)}
                  className={`px-2.5 py-1 text-xs font-bold rounded-md border transition-colors ${
                    newTeacherClassIds.includes(c.id)
                      ? 'bg-blue-100 border-blue-300 text-blue-800'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {c.name}
                </button>
              ))}
              {filteredClasses.length === 0 && (
                <span className="text-xs text-slate-400 italic">
                  {classes.length === 0 ? 'Nenhuma turma cadastrada. Vá na aba Turmas.' : 'Nenhuma turma encontrada para o turno e segmento(s) selecionados.'}
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-400 mt-1">Se nenhuma turma for selecionada, o professor ficará disponível para todas as turmas dos seus segmentos.</p>
          </div>
        </div>

        {/* Linha 3: Matriz de Disponibilidade */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col md:flex-row gap-6">
          {/* Lado Esquerdo: Opções e Dicas */}
          <div className="w-full md:w-5/12 flex flex-col justify-between space-y-4">
            <div>
              <fieldset className="border border-slate-200 p-3 rounded-lg bg-slate-50/50">
                <legend className="text-xs font-bold text-slate-700 px-1 uppercase">Opções de Preenchimento</legend>
                <div className="space-y-2 text-xs">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setAllGridCells(true)}
                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-bold transition-colors"
                    >
                      Disponível em Todos
                    </button>
                    <button
                      type="button"
                      onClick={() => setAllGridCells(false)}
                      className="px-2.5 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded text-[11px] font-bold transition-colors"
                    >
                      Desmarcar Todos
                    </button>
                    <button
                      type="button"
                      onClick={invertGridCells}
                      className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded text-[11px] font-bold transition-colors"
                    >
                      Inverter
                    </button>
                  </div>
                </div>
              </fieldset>

              <div className="mt-3 p-2.5 bg-emerald-700 text-white rounded-lg text-xs font-semibold leading-relaxed">
                O professor pode dar apenas uma aula por dia para cada turma.
              </div>

              <div className="mt-3 flex items-center justify-between text-xs font-bold text-emerald-800">
                <span>Total de horários disponíveis:</span>
                <span className="text-sm bg-emerald-100 px-2.5 py-0.5 rounded border border-emerald-300">{totalAvailableCount} de 30</span>
              </div>
            </div>

            <div className="space-y-1.5 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
              <span className="font-bold text-slate-700 block text-[11px] uppercase">Legenda da Disponibilidade:</span>
              <div className="flex items-center space-x-2">
                <span className="w-4 h-4 rounded bg-white border border-slate-300 inline-block shadow-xs"></span>
                <span>Está disponível</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-4 h-4 rounded bg-slate-300 border border-slate-400 text-[10px] flex items-center justify-center font-bold text-slate-600">---</span>
                <span>Não está disponível</span>
              </div>
            </div>
          </div>

          {/* Lado Direito: Grade Tabela Hor x Seg, Ter, Qua, Qui, Sex */}
          <div className="flex-1 overflow-x-auto">
            <table className="w-full border-collapse border border-slate-300 text-center text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-bold uppercase text-[11px]">
                  <th className="border border-slate-300 px-2 py-1.5 w-12 bg-slate-200/80">Hor</th>
                  {daysList.map(d => (
                    <th key={d.id} className="border border-slate-300 px-2 py-1.5">{d.short}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {slotsList.map(slot => (
                  <tr key={slot}>
                    <td className="border border-slate-300 px-1 py-1 font-bold bg-slate-100 text-slate-700 text-[11px]">
                      0{slot}º
                    </td>
                    {daysList.map(d => {
                      const isAvailable = availabilityGrid[`${d.id}-${slot}`] !== false;
                      return (
                        <td
                          key={d.id}
                          onClick={() => toggleGridCell(d.id, slot)}
                          className={`border border-slate-300 p-1.5 cursor-pointer font-bold select-none transition-colors text-[11px] ${
                            isAvailable
                              ? 'bg-white hover:bg-emerald-50 text-emerald-700'
                              : 'bg-slate-200 text-slate-500 hover:bg-slate-300'
                          }`}
                          title={`${d.label} - ${slot}º Horário: ${isAvailable ? 'Disponível' : 'Não disponível'}`}
                        >
                          {isAvailable ? '' : '---'}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-[10px] text-slate-400 italic text-center mt-1.5">Clique na célula da tabela para alternar a disponibilidade do professor.</p>
          </div>
        </div>

        {/* Botão Salvar / Alterar Professor */}
        <div className="flex justify-end gap-2 pt-1">
          {editingTeacherId && (
            <button
              type="button"
              onClick={cancelEditing}
              className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-4 py-2.5 rounded-xl font-bold transition-all text-sm"
            >
              Cancelar
            </button>
          )}
          <button
            onClick={saveTeacher}
            disabled={!newTeacherName.trim() || newTeacherSubjects.length === 0 || newTeacherGroups.length === 0}
            className={`text-white px-6 py-2.5 rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center shadow-sm text-sm ${
              editingTeacherId ? 'bg-amber-600 hover:bg-amber-700' : 'bg-emerald-600 hover:bg-emerald-700'
            }`}
          >
            {editingTeacherId ? (
              <>
                <Check className="w-4 h-4 mr-2" />
                Salvar Alterações
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 mr-2" />
                Cadastrar Professor
              </>
            )}
          </button>
        </div>
      </div>

      {/* Lista de Professores Cadastrados */}
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
            <tr>
              <th className="px-4 py-3">Nome do Professor</th>
              <th className="px-4 py-3">Segmentos</th>
              <th className="px-4 py-3">Disciplinas</th>
              <th className="px-4 py-3">Turmas Atendidas</th>
              <th className="px-4 py-3">Disponibilidade</th>
              <th className="px-4 py-3 w-28 text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {teachers.map(teacher => {
              const assignedClasses = classes.filter(c => teacher.class_ids?.includes(c.id));
              const availCount = teacher.availability_grid 
                ? Object.values(teacher.availability_grid).filter(Boolean).length 
                : 30;

              return (
                <tr key={teacher.id} className="hover:bg-slate-50/80 transition-colors group">
                  <td 
                    onClick={() => setViewingTeacher(teacher)}
                    className="px-4 py-3 font-semibold text-slate-800 cursor-pointer group-hover:text-emerald-700 flex items-center gap-2"
                  >
                    <span>{teacher.name}</span>
                    <Eye className="w-3.5 h-3.5 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </td>
                  <td className="px-4 py-3 cursor-pointer" onClick={() => setViewingTeacher(teacher)}>
                    <div className="flex flex-wrap gap-1">
                      {teacher.groups?.map((g, i) => {
                        const groupLabel = allGroups.find(ag => ag.id === g)?.label || g;
                        return (
                          <span key={i} className="bg-emerald-50 text-emerald-800 text-[10px] px-2 py-0.5 rounded-full font-bold border border-emerald-100">
                            {groupLabel}
                          </span>
                        );
                      })}
                    </div>
                  </td>
                  <td className="px-4 py-3 cursor-pointer" onClick={() => setViewingTeacher(teacher)}>
                    <div className="flex flex-wrap gap-1">
                      {teacher.subjects.map((sub, i) => (
                        <span key={i} className="bg-slate-100 text-slate-700 text-[10px] px-2 py-0.5 rounded-full font-bold">
                          {sub}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 cursor-pointer" onClick={() => setViewingTeacher(teacher)}>
                    {assignedClasses.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {assignedClasses.map(c => (
                          <span key={c.id} className="bg-blue-50 text-blue-700 text-[10px] px-2 py-0.5 rounded-full font-bold border border-blue-100">
                            {c.name}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400 italic">Todas as turmas dos segmentos</span>
                    )}
                  </td>
                  <td className="px-4 py-3 cursor-pointer" onClick={() => setViewingTeacher(teacher)}>
                    <div className="flex flex-col space-y-0.5">
                      <span className="text-xs text-slate-600 capitalize"><span className="font-bold">Turno:</span> {teacher.availability_shift}</span>
                      <span className="text-[11px] font-bold text-emerald-700">{availCount} / 30 horários disponíveis</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 align-middle text-center">
                    <div className="flex items-center justify-center space-x-1">
                      <button 
                        onClick={() => setViewingTeacher(teacher)} 
                        className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors" 
                        title="Visualizar Grade e Detalhes"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => startEditing(teacher)} 
                        className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" 
                        title="Editar Professor"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => removeTeacher(teacher.id)} 
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" 
                        title="Excluir Professor"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {teachers.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500">Nenhum professor cadastrado ainda.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal de Visualização de Professor */}
      {viewingTeacher && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-2xl w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b pb-4 border-slate-200">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200">
                  Ficha do Professor
                </span>
                <h3 className="text-xl font-bold text-slate-900 mt-1">{viewingTeacher.name}</h3>
                <p className="text-xs text-slate-500">Turno: <span className="font-semibold text-slate-700 capitalize">{viewingTeacher.availability_shift}</span></p>
              </div>
              <button 
                onClick={() => setViewingTeacher(null)} 
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="font-bold text-slate-700 uppercase block mb-1">Segmentos de Atuação</span>
                <div className="flex flex-wrap gap-1">
                  {viewingTeacher.groups?.map((g, i) => (
                    <span key={i} className="bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded">
                      {allGroups.find(ag => ag.id === g)?.label || g}
                    </span>
                  ))}
                </div>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="font-bold text-slate-700 uppercase block mb-1">Disciplinas</span>
                <div className="flex flex-wrap gap-1">
                  {viewingTeacher.subjects?.map((sub, i) => (
                    <span key={i} className="bg-slate-200 text-slate-800 font-bold px-2 py-0.5 rounded">
                      {sub}
                    </span>
                  ))}
                </div>
              </div>

              <div className="sm:col-span-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="font-bold text-slate-700 uppercase block mb-1">Turmas Atendidas</span>
                <div className="flex flex-wrap gap-1">
                  {classes.filter(c => viewingTeacher.class_ids?.includes(c.id)).map(c => (
                    <span key={c.id} className="bg-blue-100 text-blue-800 font-bold px-2.5 py-0.5 rounded">
                      {c.name}
                    </span>
                  ))}
                  {(!viewingTeacher.class_ids || viewingTeacher.class_ids.length === 0) && (
                    <span className="text-slate-500 italic">Disponível para todas as turmas dos segmentos.</span>
                  )}
                </div>
              </div>
            </div>

            {/* Matriz de Disponibilidade */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase text-slate-700">Grade Horária de Disponibilidade</span>
                <span className="text-xs font-bold text-emerald-700">
                  {viewingTeacher.availability_grid 
                    ? Object.values(viewingTeacher.availability_grid).filter(Boolean).length 
                    : 30} / 30 horários disponíveis
                </span>
              </div>
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full border-collapse text-center text-xs">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px]">
                      <th className="border border-slate-200 px-2 py-1.5 w-12 bg-slate-200/80">Hor</th>
                      {daysList.map(d => (
                        <th key={d.id} className="border border-slate-200 px-2 py-1.5">{d.short}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {slotsList.map(slot => (
                      <tr key={slot}>
                        <td className="border border-slate-200 px-1 py-1 font-bold bg-slate-50 text-slate-700 text-[10px]">
                          0{slot}º
                        </td>
                        {daysList.map(d => {
                          const grid = viewingTeacher.availability_grid || {};
                          const isAvailable = grid[`${d.id}-${slot}`] !== false;
                          return (
                            <td
                              key={d.id}
                              className={`border border-slate-200 p-1.5 font-bold text-[10px] ${
                                isAvailable
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : 'bg-slate-200 text-slate-400'
                              }`}
                            >
                              {isAvailable ? 'SIM' : '---'}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => {
                  const t = viewingTeacher;
                  setViewingTeacher(null);
                  startEditing(t);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 transition-colors"
              >
                <Pencil className="w-3.5 h-3.5" />
                Editar este Professor
              </button>
              <button
                type="button"
                onClick={() => setViewingTeacher(null)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-4 py-2 rounded-xl transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- Class Manager ---
function ClassManager({ classes, setClasses, subjects }: { classes: SchoolClass[], setClasses: React.Dispatch<React.SetStateAction<SchoolClass[]>>, subjects: Subject[] }) {
  const [newClassName, setNewClassName] = useState('');
  const [newClassGroup, setNewClassGroup] = useState<EducationalGroup>('anos_iniciais');
  const [newClassShift, setNewClassShift] = useState<'matutino' | 'vespertino' | 'ambos'>('ambos');
  const [editingClassId, setEditingClassId] = useState<string | null>(null);
  const [editingWorkloads, setEditingWorkloads] = useState<{ [subject: string]: number }>({});
  const [syncSameGrade, setSyncSameGrade] = useState(true);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newSubjectHours, setNewSubjectHours] = useState<number>(2);

  const addClass = () => {
    if (!newClassName.trim()) return;

    const baseGrade = extractBaseGrade(newClassName);
    const existingSameGradeClass = classes.find(c => extractBaseGrade(c.name) === baseGrade && c.subject_workloads && Object.keys(c.subject_workloads).length > 0);

    let defaultWorkload = newClassGroup === 'infantil' ? DEFAULT_INFANTIL_WORKLOAD :
                            newClassGroup === 'anos_iniciais' ? DEFAULT_INICIAIS_WORKLOAD :
                            newClassGroup === 'anos_finais' ? DEFAULT_FINAIS_WORKLOAD : DEFAULT_MEDIO_WORKLOAD;

    if (existingSameGradeClass) {
      defaultWorkload = { ...existingSameGradeClass.subject_workloads };
    }
    
    setClasses([
      ...classes,
      {
        id: crypto.randomUUID(),
        name: newClassName,
        group: newClassGroup,
        subject_workloads: { ...defaultWorkload },
        shift: newClassShift,
        created_at: new Date().toISOString()
      }
    ]);
    setNewClassName('');
  };

  const removeClass = async (id: string) => {
    try {
      await storage.deleteClass(id);
      setClasses(classes.filter(c => c.id !== id));
      if (editingClassId === id) {
        setEditingClassId(null);
      }
    } catch (err: any) {
      console.error('Erro retornado pelo Supabase ao deletar turma:', err?.message || err);
    }
  };

  const groupLabels: Record<EducationalGroup, string> = {
    infantil: 'Educação Infantil',
    anos_iniciais: 'Anos Iniciais',
    anos_finais: 'Anos Finais',
    ensino_medio: 'Ensino Médio'
  };

  const startEditingWorkloads = (cls: SchoolClass) => {
    setEditingClassId(cls.id);
    let currentWorkloads = cls.subject_workloads;
    if (!currentWorkloads || Object.keys(currentWorkloads).length === 0) {
      currentWorkloads = cls.group === 'infantil' ? DEFAULT_INFANTIL_WORKLOAD :
                         cls.group === 'anos_iniciais' ? DEFAULT_INICIAIS_WORKLOAD :
                         cls.group === 'anos_finais' ? DEFAULT_FINAIS_WORKLOAD : DEFAULT_MEDIO_WORKLOAD;
    }
    setEditingWorkloads({ ...currentWorkloads });
    setNewSubjectName('');
    setNewSubjectHours(2);
  };

  const updateSubjectHours = (subject: string, hours: number) => {
    if (hours < 0) return;
    setEditingWorkloads(prev => ({
      ...prev,
      [subject]: hours
    }));
  };

  const deleteSubject = (subject: string) => {
    setEditingWorkloads(prev => {
      const updated = { ...prev };
      delete updated[subject];
      return updated;
    });
  };

  const addSubject = () => {
    if (!newSubjectName.trim()) return;
    setEditingWorkloads(prev => ({
      ...prev,
      [newSubjectName.trim()]: newSubjectHours
    }));
    setNewSubjectName('');
    setNewSubjectHours(2);
  };

  const saveWorkloads = () => {
    if (!editingClassId) return;
    const currentClass = classes.find(c => c.id === editingClassId);
    if (!currentClass) return;

    const baseGrade = extractBaseGrade(currentClass.name);

    setClasses(prev => prev.map(c => {
      if (c.id === editingClassId) {
        return {
          ...c,
          subject_workloads: { ...editingWorkloads }
        };
      }

      if (syncSameGrade && baseGrade) {
        const otherBase = extractBaseGrade(c.name);
        if (otherBase === baseGrade) {
          return {
            ...c,
            subject_workloads: { ...editingWorkloads }
          };
        }
      }

      return c;
    }));
    setEditingClassId(null);
  };

  const selectedClassForEdit = classes.find(c => c.id === editingClassId);

  return (
    <div className="space-y-6">
      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row gap-4 items-end">
        <div className="flex-1 w-full">
          <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nome da Turma</label>
          <input
            type="text"
            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none"
            placeholder="Ex: 6º Ano A"
            value={newClassName}
            onChange={(e) => setNewClassName(e.target.value)}
          />
        </div>
        <div className="flex-1 w-full">
          <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Segmento</label>
          <select
            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none"
            value={newClassGroup}
            onChange={(e) => setNewClassGroup(e.target.value as EducationalGroup)}
          >
            <option value="infantil">Educação Infantil</option>
            <option value="anos_iniciais">Anos Iniciais</option>
            <option value="anos_finais">Anos Finais</option>
            <option value="ensino_medio">Ensino Médio</option>
          </select>
        </div>
        <div className="flex-1 w-full">
          <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Turno</label>
          <select
            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none"
            value={newClassShift}
            onChange={(e) => setNewClassShift(e.target.value as 'matutino' | 'vespertino' | 'ambos')}
          >
            <option value="matutino">Matutino</option>
            <option value="vespertino">Vespertino</option>
            <option value="ambos">Ambos</option>
          </select>
        </div>
        <button
          onClick={addClass}
          disabled={!newClassName.trim()}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center h-[42px]"
        >
          <Plus className="w-4 h-4 mr-2" />
          Adicionar
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className={editingClassId ? 'lg:col-span-2 overflow-x-auto' : 'lg:col-span-3 overflow-x-auto'}>
          <table className="w-full text-left text-sm border border-slate-200 rounded-xl overflow-hidden">
            <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Nome da Turma</th>
                <th className="px-4 py-3">Segmento</th>
                <th className="px-4 py-3">Carga Horária (Aulas)</th>
                <th className="px-4 py-3 w-32">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {classes.map(c => {
                const shift = getClassShift(c);
                const shiftLabel = shift === 'matutino' ? 'Matutino' : shift === 'vespertino' ? 'Vespertino' : 'Ambos';
                const shiftBadgeColor = shift === 'matutino' ? 'bg-amber-50 text-amber-700 border-amber-100' : shift === 'vespertino' ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-slate-50 text-slate-600 border-slate-100';

                return (
                  <tr key={c.id} className={`hover:bg-slate-50/50 ${editingClassId === c.id ? 'bg-red-50/40 hover:bg-red-50/50' : ''}`}>
                    <td className="px-4 py-3 font-semibold text-slate-800">
                      <div className="flex flex-col">
                        <span>{c.name}</span>
                        <span className={`inline-block text-[10px] px-1.5 py-0.5 rounded border mt-1 font-semibold w-max ${shiftBadgeColor}`}>
                          Turno: {shiftLabel}
                        </span>
                      </div>
                    </td>
                  <td className="px-4 py-3">
                    <span className="bg-slate-100 text-slate-600 text-xs px-2 py-1 rounded-md font-medium">
                      {groupLabels[c.group]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    <div className="flex flex-wrap gap-1 max-w-md">
                      {Object.entries(c.subject_workloads || {}).map(([sub, hours]) => (
                        <span key={sub} className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[10px] font-semibold">
                          {sub}: {hours} {hours === 1 ? 'aula' : 'aulas'}
                        </span>
                      ))}
                      {(!c.subject_workloads || Object.keys(c.subject_workloads).length === 0) && (
                        <span className="italic text-slate-400">Nenhum registrado (usa padrão)</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center space-x-2">
                      <button 
                        onClick={() => startEditingWorkloads(c)}
                        title="Editar Carga Horária" 
                        className="text-slate-600 hover:text-red-600 p-1 bg-slate-100 hover:bg-slate-200 rounded transition-colors"
                      >
                        <CalendarClock className="w-4 h-4" />
                      </button>
                      <button onClick={() => removeClass(c.id)} className="text-red-500 hover:text-red-700 p-1 bg-slate-100 hover:bg-red-100 rounded transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
              {classes.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-slate-500">Nenhuma turma cadastrada.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Workload Editor Sidebar */}
        {editingClassId && selectedClassForEdit && (
          <div className="bg-white rounded-2xl border border-red-200 p-5 shadow-sm space-y-4">
            <div>
              <div className="flex justify-between items-center mb-1">
                <h3 className="font-bold text-slate-800 text-sm font-serif-editorial">Editar: {selectedClassForEdit.name}</h3>
                <button onClick={() => setEditingClassId(null)} className="text-xs text-slate-400 hover:text-slate-600 font-bold">Fechar</button>
              </div>
              <p className="text-[11px] text-slate-500">Defina o turno e o número de aulas semanais.</p>
            </div>

            <div className="flex flex-col gap-1.5 mb-2">
              <label className="text-[11px] font-bold text-slate-700 uppercase">Turno da Turma</label>
              <select
                className="w-full px-2 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded focus:outline-none focus:border-red-400"
                value={selectedClassForEdit.shift || 'ambos'}
                onChange={(e) => {
                  const shift = e.target.value as 'matutino' | 'vespertino' | 'ambos';
                  setClasses(prev => prev.map(c => c.id === editingClassId ? { ...c, shift } : c));
                }}
              >
                <option value="matutino">Matutino</option>
                <option value="vespertino">Vespertino</option>
                <option value="ambos">Ambos</option>
              </select>
            </div>

            <div className="border-t border-slate-100 pt-3">
              <label className="text-[11px] font-bold text-slate-700 uppercase mb-2 block">Carga Horária Semanal (Aulas)</label>
              <div className="space-y-2.5 max-h-[200px] overflow-y-auto pr-1">
                {Object.entries(editingWorkloads).map(([subject, hours]) => {
                  const h = hours as number;
                  return (
                    <div key={subject} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg border border-slate-100 text-xs">
                      <span className="font-semibold text-slate-700 truncate max-w-[120px]">{subject}</span>
                      <div className="flex items-center space-x-2">
                        <button 
                          onClick={() => updateSubjectHours(subject, h - 1)} 
                          className="w-5 h-5 rounded bg-white hover:bg-slate-100 border text-slate-600 font-bold flex items-center justify-center text-[10px] shadow-sm"
                        >
                          -
                        </button>
                        <span className="min-w-14 text-center font-bold text-slate-800">{h} {h === 1 ? 'aula' : 'aulas'}</span>
                        <button 
                          onClick={() => updateSubjectHours(subject, h + 1)} 
                          className="w-5 h-5 rounded bg-white hover:bg-slate-100 border text-slate-600 font-bold flex items-center justify-center text-[10px] shadow-sm"
                        >
                          +
                        </button>
                        <button 
                          onClick={() => deleteSubject(subject)} 
                          className="text-red-500 hover:text-red-700 ml-1 p-0.5"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
                {Object.keys(editingWorkloads).length === 0 && (
                  <div className="text-center py-6 text-xs text-slate-400 italic">Nenhuma disciplina cadastrada para esta turma.</div>
                )}
              </div>
            </div>

            {/* Add subject form */}
            <div className="pt-2 border-t border-slate-100 space-y-2">
              <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide">Nova Disciplina</span>
              <div className="flex gap-2">
                <select
                  className="flex-1 min-w-0 px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs focus:ring-1 focus:ring-red-500 focus:outline-none"
                  value={newSubjectName}
                  onChange={(e) => setNewSubjectName(e.target.value)}
                >
                  <option value="">Selecione ou digite...</option>
                  {subjects.map(s => (
                    <option key={s.id} value={s.name}>{s.name}</option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="Ou digite"
                  className="flex-1 min-w-0 px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs focus:ring-1 focus:ring-red-500 focus:outline-none"
                  value={newSubjectName}
                  onChange={(e) => setNewSubjectName(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <input
                  type="number"
                  min="1"
                  className="w-16 px-2 py-1.5 bg-white border border-slate-300 rounded text-xs focus:ring-1 focus:ring-red-500 focus:outline-none text-center"
                  value={newSubjectHours}
                  onChange={(e) => setNewSubjectHours(Number(e.target.value))}
                />
                <button
                  onClick={addSubject}
                  disabled={!newSubjectName.trim()}
                  className="flex-1 bg-slate-800 hover:bg-slate-950 text-white px-2.5 py-1.5 rounded text-xs font-bold transition-colors disabled:opacity-50"
                >
                  Adicionar
                </button>
              </div>
            </div>

            {/* Sync option banner for same grade */}
            {selectedClassForEdit && (
              <div className="bg-amber-50 border border-amber-200 p-2.5 rounded-xl text-xs space-y-1">
                <label className="flex items-start space-x-2 font-bold text-amber-900 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={syncSameGrade} 
                    onChange={(e) => setSyncSameGrade(e.target.checked)}
                    className="mt-0.5 rounded border-amber-300 text-red-600 focus:ring-red-500 w-4 h-4 shrink-0"
                  />
                  <span>Sincronizar disciplinas para todo o {extractBaseGrade(selectedClassForEdit.name) || 'ano/série'}</span>
                </label>
                {syncSameGrade && (
                  <p className="text-[10px] text-amber-800 leading-tight pl-6">
                    Aplica automaticamente para todas as turmas do mesmo ano (ex: {extractBaseGrade(selectedClassForEdit.name)} A e B, Manhã e Tarde).
                  </p>
                )}
              </div>
            )}

            <div className="flex space-x-2 pt-2 border-t border-slate-100">
              <button 
                onClick={saveWorkloads}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg font-bold text-xs transition-colors flex items-center justify-center space-x-1"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Salvar Cargas</span>
              </button>
              <button 
                onClick={() => setEditingClassId(null)}
                className="px-3 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg text-xs font-semibold transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// --- Subject Manager ---
function SubjectManager({ subjects, setSubjects }: { subjects: Subject[], setSubjects: React.Dispatch<React.SetStateAction<Subject[]>> }) {
  const [newSubjectName, setNewSubjectName] = useState('');

  const addSubject = () => {
    if (!newSubjectName.trim()) return;
    setSubjects([...subjects, { id: crypto.randomUUID(), name: newSubjectName.trim(), created_at: new Date().toISOString() }]);
    setNewSubjectName('');
  };

  const removeSubject = async (id: string) => {
    try {
      await storage.deleteSubject(id);
      setSubjects(subjects.filter(s => s.id !== id));
    } catch (err: any) {
      console.error('Erro ao deletar disciplina:', err?.message || err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row gap-4 items-end">
        <div className="flex-1 w-full">
          <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nome da Disciplina</label>
          <input
            type="text"
            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none"
            placeholder="Ex: Português"
            value={newSubjectName}
            onChange={(e) => setNewSubjectName(e.target.value)}
          />
        </div>
        <button
          onClick={addSubject}
          disabled={!newSubjectName.trim()}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center h-[42px]"
        >
          <Plus className="w-4 h-4 mr-2" />
          Adicionar
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {subjects.map(subject => (
          <div key={subject.id} className="flex items-center justify-between bg-white border border-slate-200 p-3 rounded-xl shadow-sm">
            <span className="font-semibold text-slate-700 text-sm">{subject.name}</span>
            <button onClick={() => removeSubject(subject.id)} className="text-red-500 hover:text-red-700 p-1 bg-red-50 rounded-lg transition-colors">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
        {subjects.length === 0 && (
          <div className="col-span-full py-8 text-center text-slate-500 italic">
            Nenhuma disciplina cadastrada.
          </div>
        )}
      </div>
    </div>
  );
}

// Helper to convert time HH:MM to minutes since midnight for chronological sorting
const timeToMinutes = (timeStr: string): number => {
  if (!timeStr) return 0;
  const parts = timeStr.split(':');
  const h = parseInt(parts[0] || '0', 10);
  const m = parseInt(parts[1] || '0', 10);
  return (isNaN(h) ? 0 : h) * 60 + (isNaN(m) ? 0 : m);
};

// Helper to normalize time string to HH:MM format
const normalizeTimeStr = (timeStr: string): string => {
  if (!timeStr) return '00:00';
  const parts = timeStr.split(':');
  const h = String(parseInt(parts[0] || '0', 10)).padStart(2, '0');
  const m = String(parseInt(parts[1] || '0', 10)).padStart(2, '0');
  return `${h}:${m}`;
};

// --- Schedule Manager ---
function ScheduleManager({ teachers, classes, subjects, scheduleSlots, setScheduleSlots, timeBlocks, setTimeBlocks, isAdmin }: { 
  teachers: Teacher[], 
  classes: SchoolClass[], 
  subjects: Subject[],
  scheduleSlots: ScheduleSlot[], 
  setScheduleSlots: React.Dispatch<React.SetStateAction<ScheduleSlot[]>>,
  timeBlocks: TimeBlock[],
  setTimeBlocks: React.Dispatch<React.SetStateAction<TimeBlock[]>>,
  isAdmin: boolean 
}) {
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [editingCell, setEditingCell] = useState<{ day: DayOfWeek, blockId: string } | null>(null);
  
  // Notification / report state for automatic scheduling
  const [scheduleStatus, setScheduleStatus] = useState<{
    message: string;
    type: 'success' | 'warning' | 'error';
    details?: string[];
  } | null>(null);

  // Modals for Auto-schedule scope and Export scope
  const [isAutoModalOpen, setIsAutoModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  
  // Cell edit state
  const [cellTeacherId, setCellTeacherId] = useState('');
  const [cellSubject, setCellSubject] = useState('');
  const [draggedOverCell, setDraggedOverCell] = useState<{ day: DayOfWeek, blockId: string } | null>(null);
  const [draggedSlotState, setDraggedSlotState] = useState<ScheduleSlot | null>(null);

  // View mode & Matrix grid filters
  const [viewMode, setViewMode] = useState<'matrix' | 'single'>('matrix');
  const [matrixShift, setMatrixShift] = useState<'matutino' | 'vespertino'>('matutino');
  const [matrixGroup, setMatrixGroup] = useState<string>('todos');

  // Matrix cell editing
  const [editingMatrixCell, setEditingMatrixCell] = useState<{
    classId: string;
    day: DayOfWeek;
    startTime: string;
    endTime: string;
  } | null>(null);
  const [matrixCellTeacherId, setMatrixCellTeacherId] = useState('');
  const [matrixCellSubject, setMatrixCellSubject] = useState('');

  // Matrix drag over state
  const [draggedMatrixCell, setDraggedMatrixCell] = useState<{
    classId: string;
    day: DayOfWeek;
    startTime: string;
    endTime: string;
  } | null>(null);

  const checkSlotConflict = (slot: ScheduleSlot): { isConflict: boolean; reason: string; conflictingClasses: string[] } => {
    const conflictingSlots = scheduleSlots.filter(s => 
      s.id !== slot.id &&
      s.teacher_id === slot.teacher_id &&
      s.day_of_week === slot.day_of_week &&
      timesOverlap(s.start_time, s.end_time, slot.start_time, slot.end_time)
    );

    const teacher = teachers.find(t => t.id === slot.teacher_id);
    let reason = '';
    const dayMap: Record<string, string> = {
      segunda: 'Segunda-feira',
      terca: 'Terça-feira',
      quarta: 'Quarta-feira',
      quinta: 'Quinta-feira',
      sexta: 'Sexta-feira'
    };
    const dayLabel = dayMap[slot.day_of_week] || slot.day_of_week;

    if (teacher) {
      // 1. Check availability days
      if (teacher.available_days && teacher.available_days.length > 0 && !teacher.available_days.includes(slot.day_of_week)) {
        reason = `Indisponibilidade: ${teacher.name} não trabalha na ${dayLabel}.`;
      }
      
      // 2. Check shift availability
      const slotHour = parseInt(slot.start_time.split(':')[0] || '0', 10);
      const slotShift = slotHour >= 12 ? 'vespertino' : 'matutino';
      if (teacher.availability_shift && teacher.availability_shift !== 'ambos' && teacher.availability_shift !== slotShift) {
        const shiftReason = `Indisponibilidade: ${teacher.name} trabalha apenas no turno ${teacher.availability_shift} (esta aula é no ${slotShift}).`;
        reason = reason ? `${reason} | ${shiftReason}` : shiftReason;
      }
    }

    if (conflictingSlots.length > 0) {
      const conflictingClassIds = Array.from(new Set(conflictingSlots.map(s => s.class_id)));
      const conflictingClasses = conflictingClassIds.map(cid => classes.find(c => c.id === cid)?.name || 'Outra Turma');
      const conflictReason = `Choque de Horário: Professor já alocado na(s) turma(s) ${conflictingClasses.join(', ')} neste horário.`;
      return { 
        isConflict: true, 
        reason: reason ? `${conflictReason} | ${reason}` : conflictReason, 
        conflictingClasses 
      };
    }

    if (reason) {
      return { isConflict: true, reason, conflictingClasses: [] };
    }

    return { isConflict: false, reason: '', conflictingClasses: [] };
  };

  useEffect(() => {
    const allConflicts: string[] = [];
    scheduleSlots.forEach(slot => {
      const { isConflict, reason } = checkSlotConflict(slot);
      if (isConflict) {
        const clsName = classes.find(c => c.id === slot.class_id)?.name || 'Turma';
        const teacherName = teachers.find(t => t.id === slot.teacher_id)?.name || 'Professor';
        allConflicts.push(`[${clsName}] Conflito com ${teacherName}: ${reason}`);
      }
    });

    const emptySlotsWarnings: string[] = [];
    classes.forEach(cls => {
      const clsBlocks = timeBlocks
        .filter(tb => tb.class_id === cls.id && !tb.is_interval)
        .sort((a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time));
      
      const isClass678 = is678Grade(cls.name);
      const days: DayOfWeek[] = ['segunda', 'terca', 'quarta', 'quinta', 'sexta'];

      days.forEach(day => {
        clsBlocks.forEach((block, idx) => {
          const is6thSlot = idx >= 5;
          const isRestrictedDay = day === 'segunda' || day === 'quarta' || day === 'sexta';
          if (isClass678 && isRestrictedDay && is6thSlot) {
            return;
          }

          const hasSlot = scheduleSlots.some(s => 
            s.class_id === cls.id && 
            s.day_of_week === day && 
            s.start_time === block.start_time && 
            s.end_time === block.end_time
          );

          if (!hasSlot) {
            const dayMap: Record<string, string> = {
              segunda: 'Segunda-feira',
              terca: 'Terça-feira',
              quarta: 'Quarta-feira',
              quinta: 'Quinta-feira',
              sexta: 'Sexta-feira'
            };
            const dayLabel = dayMap[day] || day;
            emptySlotsWarnings.push(`[${cls.name}] Horário Vago na ${dayLabel} (${block.start_time} - ${block.end_time}) - Alunos ficam livres!`);
          }
        });
      });
    });

    if (allConflicts.length > 0 || emptySlotsWarnings.length > 0) {
      const uniqueConflicts = Array.from(new Set(allConflicts));
      const uniqueEmpty = Array.from(new Set(emptySlotsWarnings));
      
      let message = '';
      if (uniqueConflicts.length > 0 && uniqueEmpty.length > 0) {
        message = `⚠️ Atenção: Detectado(s) ${uniqueConflicts.length} conflito(s) e ${uniqueEmpty.length} horário(s) vago(s) (alunos livres)!`;
      } else if (uniqueConflicts.length > 0) {
        message = `⚠️ Atenção: Detectado(s) ${uniqueConflicts.length} conflito(s) de horário ou disponibilidade!`;
      } else {
        message = `⚠️ Atenção: Detectado(s) ${uniqueEmpty.length} horário(s) vago(s) (alunos livres)!`;
      }

      setScheduleStatus({
        message,
        type: 'warning',
        details: [...uniqueConflicts.slice(0, 10), ...uniqueEmpty.slice(0, 15)]
      });
    } else {
      setScheduleStatus(prev => {
        if (prev?.type === 'warning' && (
          prev.message.includes('conflito') || 
          prev.message.includes('Atenção: Detectado') || 
          prev.message.includes('horário(s) vago(s)')
        )) {
          return null;
        }
        return prev;
      });
    }
  }, [scheduleSlots, teachers, classes, timeBlocks]);

  // --- HTML5 DRAG & DROP HANDLERS ---
  const handleDragStart = (e: React.DragEvent, slot: ScheduleSlot) => {
    if (!isAdmin) return;
    e.dataTransfer.setData('application/json', JSON.stringify(slot));
    e.dataTransfer.effectAllowed = 'move';
    setDraggedSlotState(slot);
  };

  const handleDragEnd = () => {
    setDraggedSlotState(null);
  };

  const handleDragOver = (e: React.DragEvent, day: DayOfWeek, block: TimeBlock) => {
    if (!isAdmin || block.is_interval) return;
    e.preventDefault();
    if (draggedOverCell?.day !== day || draggedOverCell?.blockId !== block.id) {
      setDraggedOverCell({ day, blockId: block.id });
    }
  };

  const handleDragLeave = () => {
    setDraggedOverCell(null);
  };

  const handleDrop = async (e: React.DragEvent, targetDay: DayOfWeek, targetBlock: TimeBlock) => {
    if (!isAdmin || targetBlock.is_interval) return;
    e.preventDefault();
    setDraggedOverCell(null);

    try {
      let draggedSlot: ScheduleSlot | null = null;
      const rawData = e.dataTransfer.getData('application/json');
      if (rawData) {
        try {
          draggedSlot = JSON.parse(rawData) as ScheduleSlot;
        } catch (err) {
          console.warn('Error parsing JSON from dragEvent, using fallback state:', err);
        }
      }
      if (!draggedSlot) {
        draggedSlot = draggedSlotState;
      }
      if (!draggedSlot) return;

      // Only allow dropping inside the active class view
      if (draggedSlot.class_id !== selectedClassId) return;

      const targetSlot = scheduleSlots.find(
        s => s.class_id === selectedClassId && 
        s.day_of_week === targetDay && 
        s.start_time === targetBlock.start_time && 
        s.end_time === targetBlock.end_time
      );

      let updatedSlots = [...scheduleSlots];

      if (targetSlot) {
        // SWAP both slots
        updatedSlots = updatedSlots.map(s => {
          if (s.id === draggedSlot.id) {
            return {
              ...s,
              day_of_week: targetDay,
              start_time: targetBlock.start_time,
              end_time: targetBlock.end_time
            };
          }
          if (s.id === targetSlot.id) {
            return {
              ...s,
              day_of_week: draggedSlot.day_of_week,
              start_time: draggedSlot.start_time,
              end_time: draggedSlot.end_time
            };
          }
          return s;
        });
      } else {
        // MOVE dragged slot to empty cell
        updatedSlots = updatedSlots.map(s => {
          if (s.id === draggedSlot.id) {
            return {
              ...s,
              day_of_week: targetDay,
              start_time: targetBlock.start_time,
              end_time: targetBlock.end_time
            };
          }
          return s;
        });
      }

      // Check for conflicts after this specific operation to give instant feedback
      const checkConflictsForList = (slots: ScheduleSlot[]) => {
        const list: string[] = [];
        slots.forEach(slot => {
          // Inner check similar to checkSlotConflict but local to current list
          const conflictingSlots = slots.filter(s => 
            s.id !== slot.id &&
            s.teacher_id === slot.teacher_id &&
            s.day_of_week === slot.day_of_week &&
            timesOverlap(s.start_time, s.end_time, slot.start_time, slot.end_time)
          );

          const teacher = teachers.find(t => t.id === slot.teacher_id);
          let reason = '';
          const dayMap: Record<string, string> = {
            segunda: 'Segunda-feira',
            terca: 'Terça-feira',
            quarta: 'Quarta-feira',
            quinta: 'Quinta-feira',
            sexta: 'Sexta-feira'
          };
          const dayLabel = dayMap[slot.day_of_week] || slot.day_of_week;

          if (teacher) {
            if (teacher.available_days && teacher.available_days.length > 0 && !teacher.available_days.includes(slot.day_of_week)) {
              reason = `Indisponibilidade: ${teacher.name} não trabalha na ${dayLabel}.`;
            }
            const slotHour = parseInt(slot.start_time.split(':')[0] || '0', 10);
            const slotShift = slotHour >= 12 ? 'vespertino' : 'matutino';
            if (teacher.availability_shift && teacher.availability_shift !== 'ambos' && teacher.availability_shift !== slotShift) {
              const shiftReason = `Indisponibilidade: ${teacher.name} trabalha apenas no turno ${teacher.availability_shift} (esta aula é no ${slotShift}).`;
              reason = reason ? `${reason} | ${shiftReason}` : shiftReason;
            }
          }

          if (conflictingSlots.length > 0) {
            const conflictingClassIds = Array.from(new Set(conflictingSlots.map(s => s.class_id)));
            const conflictingClasses = conflictingClassIds.map(cid => classes.find(c => c.id === cid)?.name || 'Outra Turma');
            const conflictReason = `Choque de Horário: Professor já alocado na(s) turma(s) ${conflictingClasses.join(', ')} neste horário.`;
            list.push(`[${classes.find(c => c.id === slot.class_id)?.name || 'Turma'}] ${reason ? `${conflictReason} | ${reason}` : conflictReason}`);
          } else if (reason) {
            list.push(`[${classes.find(c => c.id === slot.class_id)?.name || 'Turma'}] ${reason}`);
          }
        });
        return Array.from(new Set(list));
      };

      const newConflicts = checkConflictsForList(updatedSlots);

      setScheduleSlots(updatedSlots);
      await storage.saveScheduleSlots(updatedSlots);

      if (newConflicts.length > 0) {
        setScheduleStatus({
          message: `⚠️ Movimento realizado, mas gerou conflito!`,
          type: 'warning',
          details: newConflicts
        });
      } else {
        setScheduleStatus({
          message: targetSlot 
            ? `🔄 Horários trocados com sucesso sem conflitos!`
            : `📍 Horário movido com sucesso sem conflitos!`,
          type: 'success',
          details: [`A alteração foi persistida com sucesso.`]
        });
      }

    } catch (err) {
      console.error('Error during drag & drop drop handling:', err);
    }
  };

  // Helper to check conflicts for a list of slots
  const checkConflictsForList = (slots: ScheduleSlot[]) => {
    const list: string[] = [];
    slots.forEach(slot => {
      const conflictingSlots = slots.filter(s => {
        if (s.id === slot.id) return false;
        if (s.day_of_week !== slot.day_of_week) return false;
        if (!timesOverlap(s.start_time, s.end_time, slot.start_time, slot.end_time)) return false;
        const teacher1 = teachers.find(t => t.id === slot.teacher_id);
        const teacher2 = teachers.find(t => t.id === s.teacher_id);
        return isSameTeacher(slot.teacher_id, teacher1?.name, s.teacher_id, teacher2?.name);
      });

      const teacher = teachers.find(t => t.id === slot.teacher_id);
      let reason = '';
      const dayMap: Record<string, string> = {
        segunda: 'Segunda-feira',
        terca: 'Terça-feira',
        quarta: 'Quarta-feira',
        quinta: 'Quinta-feira',
        sexta: 'Sexta-feira'
      };
      const dayLabel = dayMap[slot.day_of_week] || slot.day_of_week;

      if (teacher) {
        if (teacher.available_days && teacher.available_days.length > 0 && !teacher.available_days.includes(slot.day_of_week)) {
          reason = `Indisponibilidade: ${teacher.name} não trabalha na ${dayLabel}.`;
        }
        const slotHour = parseInt(slot.start_time.split(':')[0] || '0', 10);
        const slotShift = slotHour >= 12 ? 'vespertino' : 'matutino';
        if (teacher.availability_shift && teacher.availability_shift !== 'ambos' && teacher.availability_shift !== slotShift) {
          const shiftReason = `Indisponibilidade: ${teacher.name} trabalha apenas no turno ${teacher.availability_shift} (esta aula é no ${slotShift}).`;
          reason = reason ? `${reason} | ${shiftReason}` : shiftReason;
        }
      }

      if (conflictingSlots.length > 0) {
        const conflictingClassIds = Array.from(new Set(conflictingSlots.map(s => s.class_id)));
        const conflictingClasses = conflictingClassIds.map(cid => classes.find(c => c.id === cid)?.name || 'Outra Turma');
        const conflictReason = `Choque de Horário: Professor já alocado na(s) turma(s) ${conflictingClasses.join(', ')} neste horário.`;
        list.push(`[${classes.find(c => c.id === slot.class_id)?.name || 'Turma'}] ${reason ? `${conflictReason} | ${reason}` : conflictReason}`);
      } else if (reason) {
        list.push(`[${classes.find(c => c.id === slot.class_id)?.name || 'Turma'}] ${reason}`);
      }

      // Verificar excesso de aulas da mesma matéria no mesmo dia (> 2 aulas por dia é proibido)
      const sameSubjectDaySlots = slots.filter(s =>
        s.class_id === slot.class_id &&
        s.day_of_week === slot.day_of_week &&
        s.subject.toUpperCase().trim() === slot.subject.toUpperCase().trim()
      );
      if (sameSubjectDaySlots.length > 2) {
        const excessReason = `Excesso de Aulas: A turma tem ${sameSubjectDaySlots.length} aulas de ${slot.subject} na ${dayLabel} (máximo de 2 aulas por dia).`;
        list.push(`[${classes.find(c => c.id === slot.class_id)?.name || 'Turma'}] ${excessReason}`);
      }
    });

    // Check for non-consecutive double lessons (2 aulas da mesma matéria no mesmo dia que não estão coladas/seguidas)
    const normSub = (s: string) => (s || '').trim().toUpperCase();
    const daysList: DayOfWeek[] = ['segunda', 'terca', 'quarta', 'quinta', 'sexta'];

    classes.forEach(cls => {
      const clsBlocks = timeBlocks
        .filter(b => b.class_id === cls.id && !b.is_interval)
        .sort((a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time));

      daysList.forEach(day => {
        const subjectSlotsMap: Record<string, ScheduleSlot[]> = {};
        slots.forEach(s => {
          if (s.class_id === cls.id && s.day_of_week === day) {
            const sub = normSub(s.subject);
            if (!subjectSlotsMap[sub]) subjectSlotsMap[sub] = [];
            subjectSlotsMap[sub].push(s);
          }
        });

        Object.entries(subjectSlotsMap).forEach(([_sub, subSlots]) => {
          if (subSlots.length === 2) {
            const idx1 = clsBlocks.findIndex(b => b.start_time === subSlots[0].start_time);
            const idx2 = clsBlocks.findIndex(b => b.start_time === subSlots[1].start_time);
            if (idx1 >= 0 && idx2 >= 0 && Math.abs(idx1 - idx2) > 1) {
              const dayMap: Record<string, string> = {
                segunda: 'Segunda-feira',
                terca: 'Terça-feira',
                quarta: 'Quarta-feira',
                quinta: 'Quinta-feira',
                sexta: 'Sexta-feira'
              };
              const dayLabel = dayMap[day] || day;
              list.push(`[${cls.name}] Aulas separadas: A turma tem 2 aulas de ${subSlots[0].subject} na ${dayLabel}, mas elas não estão em horários seguidos (dobradinha).`);
            }
          }
        });
      });
    });

    return Array.from(new Set(list));
  };

  // Helper function to make double lessons (2 lessons of same subject on same day) consecutive
  const makeDoubleLessonsConsecutive = (
    inputSlots: ScheduleSlot[],
    targetClasses: SchoolClass[],
    teachersList: Teacher[],
    activeTimeBlocks: TimeBlock[]
  ): ScheduleSlot[] => {
    let slots = [...inputSlots];
    const daysList: DayOfWeek[] = ['segunda', 'terca', 'quarta', 'quinta', 'sexta'];
    const normSub = (s: string) => (s || '').trim().toUpperCase();

    targetClasses.forEach(cls => {
      const clsBlocks = activeTimeBlocks
        .filter(b => b.class_id === cls.id && !b.is_interval)
        .sort((a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time));

      daysList.forEach(day => {
        const subjectSlotsMap: Record<string, ScheduleSlot[]> = {};
        slots.forEach(s => {
          if (s.class_id === cls.id && s.day_of_week === day) {
            const sub = normSub(s.subject);
            if (!subjectSlotsMap[sub]) subjectSlotsMap[sub] = [];
            subjectSlotsMap[sub].push(s);
          }
        });

        Object.entries(subjectSlotsMap).forEach(([_sub, subSlots]) => {
          if (subSlots.length !== 2) return;

          const getBlockIdx = (s: ScheduleSlot) =>
            clsBlocks.findIndex(b => b.start_time === s.start_time);

          let idx1 = getBlockIdx(subSlots[0]);
          let idx2 = getBlockIdx(subSlots[1]);

          if (idx1 < 0 || idx2 < 0) return;

          if (idx1 > idx2) {
            const temp = idx1;
            idx1 = idx2;
            idx2 = temp;
          }

          // Already consecutive!
          if (idx2 === idx1 + 1) return;

          const candidateTargets = [idx1 + 1, idx2 - 1];

          for (const targetIdx of candidateTargets) {
            if (targetIdx < 0 || targetIdx >= clsBlocks.length) continue;
            if (targetIdx === idx1 || targetIdx === idx2) continue;

            const targetBlock = clsBlocks[targetIdx];
            const movingSlot = targetIdx === idx1 + 1
              ? subSlots.find(s => getBlockIdx(s) === idx2)
              : subSlots.find(s => getBlockIdx(s) === idx1);

            if (!movingSlot) continue;

            const movingSlotOriginalBlockIdx = getBlockIdx(movingSlot);

            const otherSlotIdx = slots.findIndex(
              s => s.class_id === cls.id && s.day_of_week === day && s.start_time === targetBlock.start_time
            );

            if (otherSlotIdx < 0) {
              const movingTeacher = teachersList.find(t => t.id === movingSlot.teacher_id);
              const conflict = slots.some(
                s => s.class_id !== cls.id &&
                     s.day_of_week === day &&
                     s.start_time === targetBlock.start_time &&
                     isSameTeacher(s.teacher_id, teachersList.find(t => t.id === s.teacher_id)?.name, movingSlot.teacher_id, movingTeacher?.name)
              );

              if (!conflict) {
                movingSlot.start_time = targetBlock.start_time;
                movingSlot.end_time = targetBlock.end_time;
                break;
              }
            } else {
              const otherSlot = slots[otherSlotIdx];
              const movingTeacher = teachersList.find(t => t.id === movingSlot.teacher_id);
              const otherTeacher = teachersList.find(t => t.id === otherSlot.teacher_id);

              const movingSlotBlock = clsBlocks[movingSlotOriginalBlockIdx];

              const movingConflict = slots.some(
                s => s.class_id !== cls.id &&
                     s.day_of_week === day &&
                     s.start_time === targetBlock.start_time &&
                     isSameTeacher(s.teacher_id, teachersList.find(t => t.id === s.teacher_id)?.name, movingSlot.teacher_id, movingTeacher?.name)
              );

              const otherConflict = slots.some(
                s => s.class_id !== cls.id &&
                     s.day_of_week === day &&
                     s.start_time === movingSlotBlock.start_time &&
                     isSameTeacher(s.teacher_id, teachersList.find(t => t.id === s.teacher_id)?.name, otherSlot.teacher_id, otherTeacher?.name)
              );

              if (!movingConflict && !otherConflict) {
                const tmpStart = movingSlot.start_time;
                const tmpEnd = movingSlot.end_time;

                movingSlot.start_time = otherSlot.start_time;
                movingSlot.end_time = otherSlot.end_time;

                otherSlot.start_time = tmpStart;
                otherSlot.end_time = tmpEnd;
                break;
              }
            }
          }
        });
      });
    });

    return slots;
  };

  // Helper to sanitize and fill schedule with strict rules (Max 2 lessons/day per subject, respect workloads, zero free slots)
  const sanitizeAndFillSchedule = (
    inputSlots: ScheduleSlot[],
    targetClasses: SchoolClass[],
    teachersList: Teacher[],
    activeTimeBlocks: TimeBlock[]
  ) => {
    const normSub = (s: string) => (s || '').trim().toUpperCase();
    const daysList: DayOfWeek[] = ['segunda', 'terca', 'quarta', 'quinta', 'sexta'];

    let slots = [...inputSlots];

    // 1. Enforce MAX 2 LESSONS PER DAY PER SUBJECT PER CLASS
    targetClasses.forEach(cls => {
      daysList.forEach(day => {
        const subjectCounts: Record<string, number> = {};
        slots = slots.filter(s => {
          if (s.class_id !== cls.id || s.day_of_week !== day) return true;
          const sub = normSub(s.subject);
          subjectCounts[sub] = (subjectCounts[sub] || 0) + 1;
          return subjectCounts[sub] <= 2;
        });
      });
    });

    // 2. Enforce WEEKLY CAPPED WORKLOAD LIMITS (e.g. Espanhol = 1, Artes = 2)
    targetClasses.forEach(cls => {
      let workloads = cls.subject_workloads;
      if (!workloads || Object.keys(workloads).length === 0) {
        workloads = cls.group === 'infantil' ? DEFAULT_INFANTIL_WORKLOAD :
                    cls.group === 'anos_iniciais' ? DEFAULT_INICIAIS_WORKLOAD :
                    cls.group === 'anos_finais' ? DEFAULT_FINAIS_WORKLOAD : DEFAULT_MEDIO_WORKLOAD;
      }
      Object.entries(workloads || {}).forEach(([sub, h]) => {
        const targetH = typeof h === 'number' ? h : 0;
        const subUpper = normSub(sub);
        if (targetH > 0 && targetH <= 2) {
          let count = 0;
          slots = slots.filter(s => {
            if (s.class_id !== cls.id || normSub(s.subject) !== subUpper) return true;
            count++;
            return count <= targetH;
          });
        }
      });
    });

    // 3. Remove Teacher Time Conflicts (considering same physical teacher like Gilva)
    const teacherTimeMap = new Set<string>();
    slots = slots.filter(s => {
      const teacher = teachersList.find(t => t.id === s.teacher_id);
      const normFirstName = teacher ? getNormalizedTeacherFirstName(teacher.name) : '';
      const teacherKey = normFirstName.length >= 3 ? normFirstName : (teacher?.name || s.teacher_id).trim().toUpperCase();
      const key = `${teacherKey}_${s.day_of_week}_${s.start_time}`;
      if (teacherTimeMap.has(key)) return false;
      teacherTimeMap.add(key);
      return true;
    });

    // 4. Fill ALL VALID UNFILLED SLOTS (Zero Unintended Free Slots)
    let unfilledCount = 0;
    targetClasses.forEach(cls => {
      const clsBlocks = activeTimeBlocks
        .filter(b => b.class_id === cls.id && !b.is_interval)
        .sort((a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time));
      const is678 = is678Grade(cls.name);

      let workloads = cls.subject_workloads;
      if (!workloads || Object.keys(workloads).length === 0) {
        workloads = cls.group === 'infantil' ? DEFAULT_INFANTIL_WORKLOAD :
                    cls.group === 'anos_iniciais' ? DEFAULT_INICIAIS_WORKLOAD :
                    cls.group === 'anos_finais' ? DEFAULT_FINAIS_WORKLOAD : DEFAULT_MEDIO_WORKLOAD;
      }

      daysList.forEach(day => {
        const isShortDay = is678 && (day === 'segunda' || day === 'quarta' || day === 'sexta');
        const maxIdx = isShortDay ? Math.min(5, clsBlocks.length) : clsBlocks.length;

        for (let i = 0; i < maxIdx; i++) {
          const block = clsBlocks[i];
          const isOccupied = slots.some(s =>
            s.class_id === cls.id &&
            s.day_of_week === day &&
            timesOverlap(s.start_time, s.end_time, block.start_time, block.end_time)
          );

          if (!isOccupied) {
            // Find available teachers with no time conflict
            const availableTeachers = teachersList.filter(t => {
              if (t.available_days && t.available_days.length > 0 && !t.available_days.includes(day)) return false;
              const startMin = timeToMinutes(block.start_time);
              const isMorning = startMin < 780; // Before 13:00 (1:00 PM) is morning shift
              if (t.availability_shift === 'matutino' && !isMorning) return false;
              if (t.availability_shift === 'vespertino' && isMorning) return false;

              const hasConflict = slots.some(s => {
                if (s.day_of_week !== day) return false;
                if (!timesOverlap(s.start_time, s.end_time, block.start_time, block.end_time)) return false;
                const sTeacher = teachersList.find(tr => tr.id === s.teacher_id);
                return isSameTeacher(s.teacher_id, sTeacher?.name, t.id, t.name);
              });
              return !hasConflict;
            });

            let chosen: { teacher: Teacher; subject: string } | null = null;

            // Tier 1: Group teacher + subject under target weekly workload
            const groupTeachers = availableTeachers.filter(t => !t.groups || t.groups.length === 0 || t.groups.includes(cls.group));
            for (const t of groupTeachers) {
              for (const sub of (t.subjects || ['Geral'])) {
                let targetH = 0;
                for (const [wSub, h] of Object.entries(workloads || {})) {
                  if (isSameSubject(wSub, sub) && typeof h === 'number') {
                    targetH = h;
                    break;
                  }
                }
                const currentWeekly = countWeeklySlotsForSubject(cls.id, sub, slots);

                if (targetH > 0 && currentWeekly < targetH) {
                  const countInDay = countDaySlotsForSubject(cls.id, day, sub, slots);
                  if (countInDay < 2) {
                    chosen = { teacher: t, subject: sub };
                    break;
                  }
                }
              }
              if (chosen) break;
            }

            // Tier 2: Group teacher + uncapped core subject
            if (!chosen) {
              for (const t of groupTeachers) {
                for (const sub of (t.subjects || ['Geral'])) {
                  let targetH = 0;
                  for (const [wSub, h] of Object.entries(workloads || {})) {
                    if (isSameSubject(wSub, sub) && typeof h === 'number') {
                      targetH = h;
                      break;
                    }
                  }
                  const currentWeekly = countWeeklySlotsForSubject(cls.id, sub, slots);

                  if (targetH > 0 && targetH <= 2 && currentWeekly >= targetH) continue; // Capped

                  const countInDay = countDaySlotsForSubject(cls.id, day, sub, slots);
                  if (countInDay < 2) {
                    chosen = { teacher: t, subject: sub };
                    break;
                  }
                }
                if (chosen) break;
              }
            }

            // Tier 3: Any available teacher in school without conflict
            if (!chosen) {
              for (const t of availableTeachers) {
                for (const sub of (t.subjects || ['Geral'])) {
                  let targetH = 0;
                  for (const [wSub, h] of Object.entries(workloads || {})) {
                    if (isSameSubject(wSub, sub) && typeof h === 'number') {
                      targetH = h;
                      break;
                    }
                  }
                  const currentWeekly = countWeeklySlotsForSubject(cls.id, sub, slots);

                  if (targetH > 0 && targetH <= 2 && currentWeekly >= targetH) continue; // Capped

                  const countInDay = countDaySlotsForSubject(cls.id, day, sub, slots);
                  if (countInDay < 2) {
                    chosen = { teacher: t, subject: sub };
                    break;
                  }
                }
                if (chosen) break;
              }
            }

            // Tier 4: Fallback - pick any subject in workloads that needs weekly hours
            if (!chosen) {
              for (const [wSub, h] of Object.entries(workloads || {})) {
                if (typeof h !== 'number' || h <= 0) continue;
                const currentWeekly = countWeeklySlotsForSubject(cls.id, wSub, slots);
                if (currentWeekly < h) {
                  const matchingTeacher = availableTeachers.find(t =>
                    (t.subjects || []).some(ts => isSameSubject(ts, wSub))
                  );
                  if (matchingTeacher) {
                    chosen = { teacher: matchingTeacher, subject: wSub };
                    break;
                  }
                }
              }
            }

            // Tier 5: Absolute Fallback - pick any teacher without time conflict
            if (!chosen) {
              for (const t of availableTeachers) {
                const sub = (t.subjects && t.subjects[0]) || 'Geral';
                chosen = { teacher: t, subject: sub };
                break;
              }
            }

            if (chosen) {
              slots.push({
                id: crypto.randomUUID(),
                class_id: cls.id,
                teacher_id: chosen.teacher.id,
                subject: chosen.subject,
                day_of_week: day,
                start_time: block.start_time,
                end_time: block.end_time
              });
            } else {
              unfilledCount++;
            }
          }
        }
      });
    });

    // 5. Make all double lessons consecutive (dobradinhas coladas)
    slots = makeDoubleLessonsConsecutive(slots, targetClasses, teachersList, activeTimeBlocks);

    const detectedConflicts = checkConflictsForList(slots);
    return { finalSlots: slots, unfilledCount, detectedConflicts };
  };

  // Filter classes for Matrix Grid View
  const filteredMatrixClasses = useMemo(() => {
    return classes.filter(cls => {
      const shift = getClassShift(cls);
      if (shift !== matrixShift) return false;
      if (matrixGroup !== 'todos') {
        if (cls.group !== matrixGroup) return false;
      }
      return true;
    }).sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
  }, [classes, matrixShift, matrixGroup]);

  // Generate Matrix time blocks / periods
  const matrixBlocks = useMemo(() => {
    const defaultMorning = [
      { label: '1º', start_time: '07:15', end_time: '08:05', is_interval: false },
      { label: '2º', start_time: '08:05', end_time: '08:55', is_interval: false },
      { label: 'RECREIO', start_time: '08:55', end_time: '09:10', is_interval: true },
      { label: '3º', start_time: '09:10', end_time: '10:00', is_interval: false },
      { label: '4º', start_time: '10:00', end_time: '10:50', is_interval: false },
      { label: '5º', start_time: '10:50', end_time: '11:40', is_interval: false },
      { label: '6º', start_time: '11:40', end_time: '12:30', is_interval: false }
    ];

    const defaultAfternoon = [
      { label: '1º', start_time: '13:30', end_time: '14:20', is_interval: false },
      { label: '2º', start_time: '14:20', end_time: '15:10', is_interval: false },
      { label: '3º', start_time: '15:10', end_time: '16:00', is_interval: false },
      { label: 'RECREIO', start_time: '16:00', end_time: '16:20', is_interval: true },
      { label: '4º', start_time: '16:20', end_time: '17:10', is_interval: false },
      { label: '5º', start_time: '17:10', end_time: '18:00', is_interval: false },
      { label: '6º', start_time: '18:00', end_time: '18:50', is_interval: false }
    ];

    if (matrixShift === 'vespertino') return defaultAfternoon;
    return defaultMorning;
  }, [matrixShift]);

  // Handle Drag & Drop inside Matrix View across classes and days
  const handleMatrixDrop = async (
    e: React.DragEvent,
    targetClassId: string,
    targetDay: DayOfWeek,
    targetStartTime: string,
    targetEndTime: string
  ) => {
    if (!isAdmin) return;
    e.preventDefault();
    setDraggedMatrixCell(null);

    try {
      let draggedSlot: ScheduleSlot | null = null;
      const rawData = e.dataTransfer.getData('application/json');
      if (rawData) {
        try {
          draggedSlot = JSON.parse(rawData) as ScheduleSlot;
        } catch (err) {
          console.warn('Error parsing JSON drag data:', err);
        }
      }
      if (!draggedSlot) {
        draggedSlot = draggedSlotState;
      }
      if (!draggedSlot) return;

      const targetSlot = scheduleSlots.find(
        s => s.class_id === targetClassId &&
        s.day_of_week === targetDay &&
        s.start_time === targetStartTime &&
        s.end_time === targetEndTime
      );

      let updatedSlots = [...scheduleSlots];

      if (targetSlot) {
        if (targetSlot.id === draggedSlot.id) return;
        // SWAP both slots
        updatedSlots = updatedSlots.map(s => {
          if (s.id === draggedSlot!.id) {
            return {
              ...s,
              class_id: targetClassId,
              day_of_week: targetDay,
              start_time: targetStartTime,
              end_time: targetEndTime
            };
          }
          if (s.id === targetSlot.id) {
            return {
              ...s,
              class_id: draggedSlot!.class_id,
              day_of_week: draggedSlot!.day_of_week,
              start_time: draggedSlot!.start_time,
              end_time: draggedSlot!.end_time
            };
          }
          return s;
        });
      } else {
        // MOVE slot to target cell
        updatedSlots = updatedSlots.map(s => {
          if (s.id === draggedSlot!.id) {
            return {
              ...s,
              class_id: targetClassId,
              day_of_week: targetDay,
              start_time: targetStartTime,
              end_time: targetEndTime
            };
          }
          return s;
        });
      }

      const newConflicts = checkConflictsForList(updatedSlots);
      setScheduleSlots(updatedSlots);
      await storage.saveScheduleSlots(updatedSlots);

      const targetClassName = classes.find(c => c.id === targetClassId)?.name || 'Turma';

      if (newConflicts.length > 0) {
        setScheduleStatus({
          message: `⚠️ Horário alterado na turma ${targetClassName}, mas gerou conflito!`,
          type: 'warning',
          details: newConflicts
        });
      } else {
        setScheduleStatus({
          message: targetSlot 
            ? `🔄 Horários trocados com sucesso na matriz!`
            : `📍 Horário movido com sucesso para ${targetClassName}!`,
          type: 'success',
          details: [`A alteração foi salva com sucesso.`]
        });
      }
    } catch (err) {
      console.error('Error during matrix drag drop:', err);
    }
  };

  const openMatrixCellEdit = (
    classId: string,
    day: DayOfWeek,
    startTime: string,
    endTime: string,
    existingSlot?: ScheduleSlot
  ) => {
    if (!isAdmin) return;
    setMatrixCellTeacherId(existingSlot?.teacher_id || '');
    setMatrixCellSubject(existingSlot?.subject || '');
    setEditingMatrixCell({ classId, day, startTime, endTime });
  };

  const saveMatrixCell = async () => {
    if (!editingMatrixCell) return;
    const { classId, day, startTime, endTime } = editingMatrixCell;

    let updatedSlots = [...scheduleSlots];
    if (!matrixCellTeacherId || !matrixCellSubject) {
      // Clear slot
      updatedSlots = updatedSlots.filter(
        s => !(s.class_id === classId && s.day_of_week === day && s.start_time === startTime && s.end_time === endTime)
      );
    } else {
      const filtered = updatedSlots.filter(
        s => !(s.class_id === classId && s.day_of_week === day && s.start_time === startTime && s.end_time === endTime)
      );
      filtered.push({
        id: crypto.randomUUID(),
        class_id: classId,
        teacher_id: matrixCellTeacherId,
        subject: matrixCellSubject,
        day_of_week: day,
        start_time: startTime,
        end_time: endTime
      });
      updatedSlots = filtered;
    }

    const newConflicts = checkConflictsForList(updatedSlots);
    setScheduleSlots(updatedSlots);
    await storage.saveScheduleSlots(updatedSlots);
    setEditingMatrixCell(null);

    if (newConflicts.length > 0) {
      setScheduleStatus({
        message: `⚠️ Grade atualizada, mas gerou conflito!`,
        type: 'warning',
        details: newConflicts
      });
    } else {
      setScheduleStatus({
        message: `✅ Grade de aulas atualizada com sucesso!`,
        type: 'success'
      });
    }
  };

  // Time blocks are now strictly created/managed upon user request (e.g. clicking Organizar Automaticamente or manual addition)
  const classTimeBlocks = timeBlocks
    .filter(tb => tb.class_id === selectedClassId)
    .sort((a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time));

  // --- RESOLVE CONFLICTS AUTOMATICALLY ---
  const resolveConflictsAutomatically = async () => {
    setScheduleStatus(null);
    await runAutoOrganize('all');
  };

  // --- AUTOMATIC ORGANIZER (MULTIPLE SCOPES & CONFLICT WARNINGS) ---
  const runAutoOrganize = async (scope: 'selected' | 'shift' | 'all') => {
    setIsAutoModalOpen(false);
    setScheduleStatus(null);

    if (classes.length === 0) {
      setScheduleStatus({
        message: 'Nenhuma turma cadastrada no sistema.',
        type: 'error'
      });
      return;
    }

    const currentClass = classes.find(c => c.id === selectedClassId);
    const currentShift = currentClass ? getClassShift(currentClass) : 'matutino';

    let targetClasses: SchoolClass[] = [];
    if (scope === 'selected') {
      if (!currentClass) {
        alert('Selecione uma turma primeiro!');
        return;
      }
      targetClasses = [currentClass];
    } else if (scope === 'shift') {
      targetClasses = classes.filter(c => getClassShift(c) === currentShift);
    } else {
      targetClasses = classes;
    }

    if (targetClasses.length === 0) {
      setScheduleStatus({
        message: 'Nenhuma turma encontrada para o escopo selecionado.',
        type: 'warning'
      });
      return;
    }

    // Reset/Set time blocks for all target classes to the exact standard pattern and clear their existing slots
    const targetClassIds = new Set(targetClasses.map(c => c.id));
    let runningSlots = scheduleSlots.filter(s => !targetClassIds.has(s.class_id));

    let activeTimeBlocks = timeBlocks.filter(tb => !targetClassIds.has(tb.class_id));
    targetClasses.forEach(cls => {
      const clsShift = getClassShift(cls);
      const isAfternoon = clsShift === 'vespertino';
      const defaultBlocks: TimeBlock[] = isAfternoon ? [
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
      activeTimeBlocks.push(...defaultBlocks);
    });
    setTimeBlocks(activeTimeBlocks);
    await storage.saveTimeBlocks(activeTimeBlocks);

    // --- AUTOMATIC ORGANIZER WITH GEMINI 3.1 FLASH LITE ---
    setScheduleStatus({
      message: '🤖 Organizando grade horária com a IA Gemini 3.1 Flash Lite...',
      type: 'warning',
      details: ['Analisando professores, cargas horárias e disponibilidades com a IA Gemini 3.1 Flash Lite...']
    });

    try {
      const apiRes = await fetch('/api/schedule/generate-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teachers,
          classes,
          timeBlocks: activeTimeBlocks,
          targetClassIds: Array.from(targetClassIds),
          subjects
        })
      });

      if (apiRes.ok) {
        const aiData = await apiRes.json();
        if (aiData.success && Array.isArray(aiData.slots) && aiData.slots.length > 0) {
          const aiGeneratedSlots: ScheduleSlot[] = aiData.slots.map((s: any) => {
            const matchedTeacher = teachers.find(t => t.id === s.teacher_id || t.name.toUpperCase().trim() === (s.teacher_id || '').toUpperCase().trim());
            return {
              id: crypto.randomUUID(),
              class_id: s.class_id,
              teacher_id: matchedTeacher ? matchedTeacher.id : s.teacher_id,
              subject: s.subject,
              day_of_week: s.day_of_week,
              start_time: s.start_time,
              end_time: s.end_time
            };
          });

          // Post-process with zero-free-slots filler and strict max 2 lessons/day per subject
          const combined = [...runningSlots, ...aiGeneratedSlots];
          const { finalSlots, unfilledCount, detectedConflicts } = sanitizeAndFillSchedule(
            combined,
            targetClasses,
            teachers,
            activeTimeBlocks
          );

          setScheduleSlots(finalSlots);
          await storage.saveScheduleSlots(finalSlots);

          const aiConflicts: string[] = aiData.conflicts || [];
          const allConflicts = Array.from(new Set([...aiConflicts, ...detectedConflicts]));

          if (allConflicts.length === 0 && unfilledCount === 0) {
            setScheduleStatus({
              message: `✨ Sucesso! Grade 100% finalizada e organizada com Gemini 3.1 Flash Lite (${finalSlots.length} aulas, 0 horários vagos).`,
              type: 'success',
              details: [
                `Modelo de IA utilizado: Gemini 3.1 Flash Lite`,
                `Turmas processadas: ${targetClasses.length}`,
                `Total de aulas alocadas: ${finalSlots.length}`,
                `100% de ocupação sem horários vagos e máx 2 aulas/dia por matéria!`
              ]
            });
            return;
          } else {
            setScheduleStatus({
              message: `Grade organizada com Gemini 3.1 Flash Lite (${finalSlots.length} aulas):`,
              type: unfilledCount === 0 ? 'success' : 'warning',
              details: [
                `Modelo de IA utilizado: Gemini 3.1 Flash Lite`,
                unfilledCount > 0 ? `⚠️ Horários sem professor disponível: ${unfilledCount} bloco(s)` : `✅ 100% de ocupação sem horários vagos`,
                ...allConflicts.map(c => `• ${c}`)
              ]
            });
            return;
          }
        }
      }
    } catch (error) {
      console.warn('Conexão remota de IA falhou, executando otimizador local de contingência:', error);
    }

    let totalDemandedOverall = 0;
    let scheduledWithTeacherOverall = 0;
    const logDetails: string[] = [];
    const days: DayOfWeek[] = ['segunda', 'terca', 'quarta', 'quinta', 'sexta'];

    // Helper to shuffle arrays inside trials for beautiful organic variety
    const shuffleArray = <T,>(array: T[]): T[] => {
      const arr = [...array];
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    };

    // Multi-trial optimizer function for generating the schedule using global constraint satisfaction
    const runTrial = (trialIndex: number) => {
      let trialRunningSlots = [...runningSlots];

      interface TrialMeeting {
        id: string;
        classId: string;
        subject: string;
        size: number;
      }

      const getDisplaySubjectName = (subName: string): string => {
        const found = subjects.find(s => s.name.toUpperCase().trim() === subName.toUpperCase().trim());
        return found ? found.name : subName;
      };

      let trialMeetings: TrialMeeting[] = [];
      targetClasses.forEach(cls => {
        let workloads = cls.subject_workloads;
        if (!workloads || Object.keys(workloads).length === 0) {
          workloads = cls.group === 'infantil' ? DEFAULT_INFANTIL_WORKLOAD :
                      cls.group === 'anos_iniciais' ? DEFAULT_INICIAIS_WORKLOAD :
                      cls.group === 'anos_finais' ? DEFAULT_FINAIS_WORKLOAD : DEFAULT_MEDIO_WORKLOAD;
        }

        // Merge case-insensitive workloads to avoid duplicate entries for the same subject
        const normalizedWorkloads: { [subject: string]: number } = {};
        Object.entries(workloads).forEach(([subject, hours]) => {
          if (!subject || hours <= 0) return;
          const key = subject.trim().toUpperCase();
          normalizedWorkloads[key] = (normalizedWorkloads[key] || 0) + hours;
        });

        Object.entries(normalizedWorkloads).forEach(([subject, hours]) => {
          let remaining = hours;
          while (remaining >= 2) {
            trialMeetings.push({
              id: crypto.randomUUID(),
              classId: cls.id,
              subject, // upper-cased key for reliable optimization
              size: 2
            });
            remaining -= 2;
          }
          if (remaining === 1) {
            trialMeetings.push({
              id: crypto.randomUUID(),
              classId: cls.id,
              subject,
              size: 1
            });
          }
        });
      });

      const totalDemanded = trialMeetings.reduce((sum, m) => sum + m.size, 0);

      const getTeacherAssignedHours = (teacherId: string) => {
        return trialRunningSlots.filter(s => s.teacher_id === teacherId).length;
      };

      const isTeacherAvailable = (teacher: Teacher, day: DayOfWeek, block: TimeBlock, clsBlocks: TimeBlock[]) => {
        if (teacher.available_days && teacher.available_days.length > 0) {
          if (!teacher.available_days.includes(day)) return false;
        }
        const startHour = parseInt(normalizeTime(block.start_time).split(':')[0]);
        const isMorning = startHour < 13;
        if (teacher.availability_shift === 'matutino' && !isMorning) return false;
        if (teacher.availability_shift === 'vespertino' && isMorning) return false;

        const slotIndex = clsBlocks.findIndex(b => b.id === block.id) + 1;
        if (teacher.available_slots && teacher.available_slots.length > 0 && teacher.available_slots.length < 6) {
          if (slotIndex > 0 && !teacher.available_slots.includes(slotIndex)) {
            return false;
          }
        }

        if (teacher.availability_grid && Object.keys(teacher.availability_grid).length > 0) {
          const key = `${day}-${slotIndex}`;
          if (teacher.availability_grid[key] === false) {
            return false;
          }
        }

        return true;
      };

      const getFlexibility = (m: TrialMeeting) => {
        const cls = targetClasses.find(c => c.id === m.classId)!;
        const qTeachers = teachers.filter(t =>
          t.subjects.some(sub => sub.toUpperCase().trim() === m.subject.toUpperCase().trim()) &&
          t.groups.includes(cls.group) &&
          (!t.class_ids || t.class_ids.length === 0 || t.class_ids.includes(cls.id))
        );
        if (qTeachers.length === 0) return 99999;
        let totalAvail = 0;
        qTeachers.forEach(t => {
          if (t.availability_grid) {
            totalAvail += Object.values(t.availability_grid).filter(Boolean).length;
          } else {
            totalAvail += 30;
          }
        });
        const sizeBonus = m.size === 2 ? 0 : 5000;
        return qTeachers.length * 100 + totalAvail + sizeBonus;
      };

      let meetingsPool = [...trialMeetings];
      let scheduledCount = 0;
      let totalPenalty = 0;

      const sortPool = () => {
        meetingsPool.sort((a, b) => {
          const flexA = getFlexibility(a);
          const flexB = getFlexibility(b);
          if (flexA !== flexB) return flexA - flexB;
          return Math.random() - 0.5;
        });
      };

      sortPool();

      while (meetingsPool.length > 0) {
        const m = meetingsPool.shift()!;
        const cls = targetClasses.find(c => c.id === m.classId)!;
        const clsBlocks = activeTimeBlocks
          .filter(b => b.class_id === cls.id && !b.is_interval)
          .sort((a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time));

        const isTargetSpecialClass = is678Grade(cls.name);
        const qTeachers = teachers.filter(t =>
          t.subjects.some(sub => sub.toUpperCase().trim() === m.subject.toUpperCase().trim()) &&
          t.groups.includes(cls.group) &&
          (!t.class_ids || t.class_ids.length === 0 || t.class_ids.includes(cls.id))
        );

        interface Candidate {
          teacher: Teacher;
          day: DayOfWeek;
          blockIndex: number;
          penalty: number;
          score: number;
        }
        let candidates: Candidate[] = [];

        qTeachers.forEach(t => {
          days.forEach(day => {
            const dayLessonsCount = trialRunningSlots.filter(s =>
              s.class_id === cls.id &&
              s.day_of_week === day &&
              s.subject.toUpperCase().trim() === m.subject.toUpperCase().trim()
            ).length;

            const maxIndex = m.size === 2 ? clsBlocks.length - 2 : clsBlocks.length - 1;
            for (let i = 0; i <= maxIndex; i++) {
              const b1 = clsBlocks[i];

              if (isTargetSpecialClass && (day === 'segunda' || day === 'quarta' || day === 'sexta')) {
                if (i >= 5) continue;
                if (m.size === 2 && i + 1 >= 5) continue;
              }

              const isSlot1Occupied = trialRunningSlots.some(s =>
                s.class_id === cls.id &&
                s.day_of_week === day &&
                timesOverlap(s.start_time, s.end_time, b1.start_time, b1.end_time)
              );
              if (isSlot1Occupied) continue;

              const hasTeacherConflict1 = trialRunningSlots.some(s => {
                if (s.day_of_week !== day) return false;
                if (!timesOverlap(s.start_time, s.end_time, b1.start_time, b1.end_time)) return false;
                const sTeacher = teachers.find(tr => tr.id === s.teacher_id);
                return isSameTeacher(s.teacher_id, sTeacher?.name, t.id, t.name);
              });
              if (hasTeacherConflict1) continue;

              if (m.size === 2) {
                const b2 = clsBlocks[i + 1];
                const isSlot2Occupied = trialRunningSlots.some(s =>
                  s.class_id === cls.id &&
                  s.day_of_week === day &&
                  timesOverlap(s.start_time, s.end_time, b2.start_time, b2.end_time)
                );
                if (isSlot2Occupied) continue;

                const hasTeacherConflict2 = trialRunningSlots.some(s => {
                  if (s.day_of_week !== day) return false;
                  if (!timesOverlap(s.start_time, s.end_time, b2.start_time, b2.end_time)) return false;
                  const sTeacher = teachers.find(tr => tr.id === s.teacher_id);
                  return isSameTeacher(s.teacher_id, sTeacher?.name, t.id, t.name);
                });
                if (hasTeacherConflict2) continue;
              }

              // Regra 4: As turmas não podem ter mais que 2 aulas da mesma matéria no mesmo dia (no máximo 2 aulas/dia por matéria)
              if (dayLessonsCount + m.size > 2) {
                continue; // Proibido estritamente ultrapassar 2 aulas da mesma matéria por turma no dia
              }

              // REGRA 1 (RESTRIÇÃO RÍGIDA): Disponibilidade do Professor (Dias, Turno, Horários e Grade)
              if (!isTeacherAvailable(t, day, b1, clsBlocks)) {
                continue; // Proibido: Professor não tem disponibilidade neste dia/turno/horário
              }

              if (m.size === 2) {
                const b2 = clsBlocks[i + 1];
                if (!isTeacherAvailable(t, day, b2, clsBlocks)) {
                  continue; // Proibido: Professor não tem disponibilidade no 2º horário da aula dupla
                }
              }

              let penalty = 0;

              // REGRA 2: O professor que tem poucas aulas (ex: 1 a 6 no total) deve dar aulas no mesmo dia para todos os segmentos
              const teacherAssignedHours = trialRunningSlots.filter(s => s.teacher_id === t.id).length;
              const isLowWorkload = (t.workload_hours || 20) <= 6;
              const teacherScheduledDays = Array.from(new Set(trialRunningSlots.filter(s => s.teacher_id === t.id).map(s => s.day_of_week)));

              if (isLowWorkload && teacherScheduledDays.length > 0) {
                if (teacherScheduledDays.includes(day)) {
                  // Excelente: Concentra as poucas aulas no mesmo dia que o professor já irá trabalhar
                  penalty -= 400;
                } else {
                  // Penaliza fortemente criar um novo dia de trabalho para um professor de pouca carga
                  penalty += 2500;
                }
              }

              // REGRA 3: O professor/matéria não pode ficar distante entre as aulas (máximo 1 horário sem dar aula)
              const existingClassSubjectSlots = trialRunningSlots.filter(s =>
                s.class_id === cls.id &&
                s.day_of_week === day &&
                s.subject.toUpperCase().trim() === m.subject.toUpperCase().trim()
              );

              if (existingClassSubjectSlots.length > 0) {
                const existingIndices = existingClassSubjectSlots.map(s => {
                  return clsBlocks.findIndex(b => timesOverlap(b.start_time, b.end_time, s.start_time, s.end_time));
                }).filter(idx => idx >= 0);

                if (existingIndices.length > 0) {
                  const minDist = Math.min(...existingIndices.map(eIdx => Math.abs(eIdx - i)));
                  if (minDist === 1) {
                    // Aulas geminadas/consecutivas: Excelente!
                    penalty -= 150;
                  } else if (minDist === 2) {
                    // No máximo 1 horário de intervalo entre as aulas (ex: 1º e 3º horário) -> Tolerável
                    penalty += 50;
                  } else if (minDist > 2) {
                    // Distante (mais de 1 horário vago entre as aulas da mesma matéria) -> Incorreto/Penalizado
                    penalty += 3500;
                  }
                }
              }

              // Carga do professor limite
              if (teacherAssignedHours + m.size > (t.workload_hours || 20)) {
                penalty += 2000;
              }

              // Se já houver 1 aula da matéria no dia e for adicionar a 2ª
              if (dayLessonsCount + m.size === 2) {
                penalty += 10;
              }

              const workloadRatio = teacherAssignedHours / (t.workload_hours || 20);
              const randomFactor = Math.random() * 0.1;

              // Total score is dominated by penalty, with workloadRatio and randomFactor as tie-breakers
              const score = penalty * 10000 + workloadRatio * 10 + randomFactor;

              candidates.push({
                teacher: t,
                day,
                blockIndex: i,
                penalty,
                score
              });
            }
          });
        });

        if (candidates.length > 0) {
          candidates.sort((a, b) => a.score - b.score);
          const best = candidates[0];

          const b1 = clsBlocks[best.blockIndex];
          trialRunningSlots.push({
            id: crypto.randomUUID(),
            class_id: cls.id,
            teacher_id: best.teacher.id,
            subject: getDisplaySubjectName(m.subject),
            day_of_week: best.day,
            start_time: b1.start_time,
            end_time: b1.end_time
          });

          if (m.size === 2) {
            const b2 = clsBlocks[best.blockIndex + 1];
            trialRunningSlots.push({
              id: crypto.randomUUID(),
              class_id: cls.id,
              teacher_id: best.teacher.id,
              subject: getDisplaySubjectName(m.subject),
              day_of_week: best.day,
              start_time: b2.start_time,
              end_time: b2.end_time
            });
          }

          scheduledCount += m.size;
          totalPenalty += best.penalty;
        } else {
          if (m.size === 2) {
            meetingsPool.push({
              id: crypto.randomUUID(),
              classId: m.classId,
              subject: m.subject,
              size: 1
            });
            meetingsPool.push({
              id: crypto.randomUUID(),
              classId: m.classId,
              subject: m.subject,
              size: 1
            });
            sortPool();
          }
        }
      }

      // PASSE DE PREENCHIMENTO DE LACUNAS / HORÁRIOS OBRIGATÓRIOS VAGOS
      targetClasses.forEach(cls => {
        const clsBlocks = activeTimeBlocks
          .filter(b => b.class_id === cls.id && !b.is_interval)
          .sort((a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time));
        const isTargetSpecialClass = is678Grade(cls.name);

        days.forEach(day => {
          const isShortDay = isTargetSpecialClass && (day === 'segunda' || day === 'quarta' || day === 'sexta');
          const maxIndex = isShortDay ? Math.min(5, clsBlocks.length) : clsBlocks.length;

          for (let i = 0; i < maxIndex; i++) {
            const block = clsBlocks[i];
            const isOccupied = trialRunningSlots.some(s =>
              s.class_id === cls.id &&
              s.day_of_week === day &&
              timesOverlap(s.start_time, s.end_time, block.start_time, block.end_time)
            );

            if (!isOccupied) {
              let candidates: { teacher: Teacher; subjectName: string; penalty: number }[] = [];

              let workloads = cls.subject_workloads;
              if (!workloads || Object.keys(workloads).length === 0) {
                workloads = cls.group === 'infantil' ? DEFAULT_INFANTIL_WORKLOAD :
                            cls.group === 'anos_iniciais' ? DEFAULT_INICIAIS_WORKLOAD :
                            cls.group === 'anos_finais' ? DEFAULT_FINAIS_WORKLOAD : DEFAULT_MEDIO_WORKLOAD;
              }

              const normalizedWorkloads: { [subject: string]: number } = {};
              Object.entries(workloads).forEach(([subject, hours]) => {
                if (!subject || hours <= 0) return;
                const key = subject.trim().toUpperCase();
                normalizedWorkloads[key] = (normalizedWorkloads[key] || 0) + hours;
              });

              // First pass: try class subjects that are under target workload
              const classSubjects = Object.keys(normalizedWorkloads);
              classSubjects.forEach(subUpper => {
                const targetHours = normalizedWorkloads[subUpper] || 0;
                const scheduledForSub = trialRunningSlots.filter(s =>
                  s.class_id === cls.id && s.subject.toUpperCase().trim() === subUpper
                ).length;

                // STRICT: If subject has already reached target workload, do not add more in Pass 1!
                if (targetHours > 0 && scheduledForSub >= targetHours) return;

                const qTeachers = teachers.filter(t =>
                  t.subjects.some(sub => sub.toUpperCase().trim() === subUpper) &&
                  t.groups.includes(cls.group) &&
                  (!t.class_ids || t.class_ids.length === 0 || t.class_ids.includes(cls.id))
                );

                qTeachers.forEach(t => {
                  if (!isTeacherAvailable(t, day, block, clsBlocks)) return;

                  const hasTeacherConflict = trialRunningSlots.some(s => {
                    if (s.day_of_week !== day) return false;
                    if (!timesOverlap(s.start_time, s.end_time, block.start_time, block.end_time)) return false;
                    const sTeacher = teachers.find(tr => tr.id === s.teacher_id);
                    return isSameTeacher(s.teacher_id, sTeacher?.name, t.id, t.name);
                  });
                  if (hasTeacherConflict) return;

                  const dayLessonsCount = trialRunningSlots.filter(s =>
                    s.class_id === cls.id &&
                    s.day_of_week === day &&
                    s.subject.toUpperCase().trim() === subUpper
                  ).length;

                  if (dayLessonsCount >= 2) return; // Máximo de 2 aulas da mesma matéria por dia para uma turma

                  candidates.push({
                    teacher: t,
                    subjectName: getDisplaySubjectName(subUpper),
                    penalty: -1000
                  });
                });
              });

              // Fallback pass: try any available teacher for this group to guarantee zero free slots, strictly avoiding duplicate Espanhol
              if (candidates.length === 0) {
                const groupTeachers = teachers.filter(t =>
                  t.groups.includes(cls.group) &&
                  (!t.class_ids || t.class_ids.length === 0 || t.class_ids.includes(cls.id))
                );

                groupTeachers.forEach(t => {
                  if (!isTeacherAvailable(t, day, block, clsBlocks)) return;

                  const hasTeacherConflict = trialRunningSlots.some(s => {
                    if (s.day_of_week !== day) return false;
                    if (!timesOverlap(s.start_time, s.end_time, block.start_time, block.end_time)) return false;
                    const sTeacher = teachers.find(tr => tr.id === s.teacher_id);
                    return isSameTeacher(s.teacher_id, sTeacher?.name, t.id, t.name);
                  });
                  if (hasTeacherConflict) return;

                  // Find a subject from teacher that is NOT Espanhol or capped if already at target
                  let suitableSub = t.subjects && t.subjects[0] ? t.subjects[0] : 'Geral';
                  for (const sub of (t.subjects || ['Geral'])) {
                    const subUpper = sub.toUpperCase().trim();
                    const targetHours = normalizedWorkloads[subUpper] || 0;
                    const currentAllocated = trialRunningSlots.filter(s =>
                      s.class_id === cls.id && s.subject.toUpperCase().trim() === subUpper
                    ).length;

                    if (targetHours > 0 && targetHours <= 2 && currentAllocated >= targetHours) {
                      continue; // Skip capped subjects like Espanhol
                    }

                    const dayLessonsCount = trialRunningSlots.filter(s =>
                      s.class_id === cls.id &&
                      s.day_of_week === day &&
                      s.subject.toUpperCase().trim() === subUpper
                    ).length;

                    if (dayLessonsCount < 2) {
                      suitableSub = sub;
                      break;
                    }
                  }

                  const subUpper = suitableSub.toUpperCase().trim();
                  const targetHours = normalizedWorkloads[subUpper] || 0;
                  const currentAllocated = trialRunningSlots.filter(s =>
                    s.class_id === cls.id && s.subject.toUpperCase().trim() === subUpper
                  ).length;

                  if (targetHours > 0 && targetHours <= 2 && currentAllocated >= targetHours) {
                    return; // Do not push if it's Espanhol or capped
                  }

                  candidates.push({
                    teacher: t,
                    subjectName: getDisplaySubjectName(suitableSub),
                    penalty: 500
                  });
                });
              }

              if (candidates.length > 0) {
                candidates.sort((a, b) => a.penalty - b.penalty);
                const bestCandidate = candidates[0];

                trialRunningSlots.push({
                  id: crypto.randomUUID(),
                  class_id: cls.id,
                  teacher_id: bestCandidate.teacher.id,
                  subject: bestCandidate.subjectName,
                  day_of_week: day,
                  start_time: block.start_time,
                  end_time: block.end_time
                });

                scheduledCount += 1;
              }
            }
          }
        });
      });

      // Compute unfilled required slots
      let unfilledRequiredSlots = 0;
      targetClasses.forEach(cls => {
        const clsBlocks = activeTimeBlocks
          .filter(b => b.class_id === cls.id && !b.is_interval)
          .sort((a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time));
        const is678 = is678Grade(cls.name);

        days.forEach(day => {
          const isShortDay = is678 && (day === 'segunda' || day === 'quarta' || day === 'sexta');
          const maxIdx = isShortDay ? Math.min(5, clsBlocks.length) : clsBlocks.length;

          for (let i = 0; i < maxIdx; i++) {
            const block = clsBlocks[i];
            const isOccupied = trialRunningSlots.some(s =>
              s.class_id === cls.id &&
              s.day_of_week === day &&
              timesOverlap(s.start_time, s.end_time, block.start_time, block.end_time)
            );
            if (!isOccupied) {
              unfilledRequiredSlots += 1;
            }
          }
        });
      });

      const trialScore = (scheduledCount * 1000) - (unfilledRequiredSlots * 50000) - (totalPenalty * 10);

      const trialClassResults = targetClasses.map(c => {
        let workloads = c.subject_workloads;
        if (!workloads || Object.keys(workloads).length === 0) {
          workloads = c.group === 'infantil' ? DEFAULT_INFANTIL_WORKLOAD :
                      c.group === 'anos_iniciais' ? DEFAULT_INICIAIS_WORKLOAD :
                      c.group === 'anos_finais' ? DEFAULT_FINAIS_WORKLOAD : DEFAULT_MEDIO_WORKLOAD;
        }
        const clsDemanded = Object.values(workloads).reduce((sum, h) => sum + h, 0);
        const clsScheduled = trialRunningSlots.filter(s => s.class_id === c.id).length;
        return {
          classId: c.id,
          scheduled: clsScheduled,
          demanded: clsDemanded
        };
      });

      return {
        trialScheduledOverall: scheduledCount,
        unfilledRequiredSlots,
        totalDemanded,
        totalPenalty,
        score: trialScore,
        trialRunningSlots,
        trialClassResults
      };
    };

    // Run 100 randomized optimization trials to search for the best and most diverse layouts
    const trials: ReturnType<typeof runTrial>[] = [];
    const numTrials = 100;
    for (let t = 0; t < numTrials; t++) {
      trials.push(runTrial(t));
    }

    // 1. Filter trials that achieved minimum unfilled required slots (0 if possible)
    const minUnfilled = Math.min(...trials.map(t => t.unfilledRequiredSlots));
    const bestUnfilledTrials = trials.filter(t => t.unfilledRequiredSlots === minUnfilled);

    // 2. Find the maximum allocation achieved among those
    const maxScheduled = Math.max(...bestUnfilledTrials.map(t => t.trialScheduledOverall));
    const bestAllocationTrials = bestUnfilledTrials.filter(t => t.trialScheduledOverall === maxScheduled);

    // 3. Among those with the best allocation, find the minimum total penalty
    const minPenalty = Math.min(...bestAllocationTrials.map(t => t.totalPenalty));
    const bestTrials = bestAllocationTrials.filter(t => t.totalPenalty <= minPenalty + 5);

    // Randomly select one of the top-performing trials to ensure a fresh layout on every click
    const bestResult = bestTrials[Math.floor(Math.random() * bestTrials.length)];

    const rawRunning = bestResult.trialRunningSlots;
    const { finalSlots, unfilledCount, detectedConflicts } = sanitizeAndFillSchedule(
      rawRunning,
      targetClasses,
      teachers,
      activeTimeBlocks
    );

    setScheduleSlots(finalSlots);
    await storage.saveScheduleSlots(finalSlots);

    if (unfilledCount === 0 && detectedConflicts.length === 0) {
      setScheduleStatus({
        message: `✨ Sucesso! Grade horária 100% finalizada e organizada para ${targetClasses.length} turma(s) (${finalSlots.length} aulas alocadas).`,
        type: 'success',
        details: [
          `Turmas processadas: ${targetClasses.length}`,
          `Total de aulas agendadas: ${finalSlots.length}`,
          `100% de ocupação sem horários vagos e máx 2 aulas/dia por matéria!`,
          `Sem conflitos de professores ou horários.`
        ]
      });
    } else {
      setScheduleStatus({
        message: `Organização concluída (${finalSlots.length} aulas agendadas):`,
        type: unfilledCount === 0 ? 'success' : 'warning',
        details: [
          `Turmas processadas: ${targetClasses.length}`,
          unfilledCount > 0 ? `⚠️ Horários sem professor disponível: ${unfilledCount} bloco(s)` : `✅ 100% de ocupação sem horários vagos`,
          ...detectedConflicts.map(c => `• ${c}`)
        ]
      });
    }
  };

  // Helper to add minutes to HH:MM time string
  const addMinutesToTimeStr = (timeStr: string, minutes: number): string => {
    if (!timeStr || !timeStr.includes(':')) return '08:00';
    const [hStr, mStr] = timeStr.split(':');
    let h = parseInt(hStr, 10);
    let m = parseInt(mStr, 10);
    if (isNaN(h) || isNaN(m)) return timeStr;
    m += minutes;
    h += Math.floor(m / 60);
    m = m % 60;
    h = h % 24;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  // --- TIME BLOCKS MANAGEMENT (SYNCED ACCROSS ENTIRE SHIFT) ---
  const handleAddTimeBlock = (isInterval = false) => {
    const currentClass = classes.find(c => c.id === selectedClassId);
    if (!currentClass) return;
    const currentShift = getClassShift(currentClass);
    const isAfternoon = currentShift === 'vespertino';

    const currentBlocks = timeBlocks
      .filter(tb => tb.class_id === selectedClassId)
      .sort((a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time));

    let defaultStart = isAfternoon ? '13:30' : '07:15';
    let defaultEnd = isInterval ? (isAfternoon ? '16:00' : '08:55') : (isAfternoon ? '14:20' : '08:05');

    if (currentBlocks.length > 0) {
      const lastBlock = currentBlocks[currentBlocks.length - 1];
      defaultStart = normalizeTimeStr(lastBlock.end_time);
      defaultEnd = addMinutesToTimeStr(defaultStart, isInterval ? 20 : 50);
    }

    const sameShiftClasses = classes.filter(c => getClassShift(c) === currentShift);

    setTimeBlocks(prev => {
      const newBlocks: TimeBlock[] = sameShiftClasses.map(c => ({
        id: crypto.randomUUID(),
        class_id: c.id,
        start_time: defaultStart,
        end_time: defaultEnd,
        is_interval: isInterval
      }));
      return [...prev, ...newBlocks];
    });
  };

  const handleResetDefaultBlocks = () => {
    const currentClass = classes.find(c => c.id === selectedClassId);
    if (!currentClass) return;
    const currentShift = getClassShift(currentClass);

    if (!confirm(`Tem certeza de que deseja resetar os horários de TODAS as turmas do turno ${currentShift.toUpperCase()} para o padrão de 6 aulas com 2 intervalos?`)) {
      return;
    }

    const sameShiftClasses = classes.filter(c => getClassShift(c) === currentShift);
    const sameShiftClassIds = new Set(sameShiftClasses.map(c => c.id));

    // Remove slots of all same-shift classes
    setScheduleSlots(slots => slots.filter(s => !sameShiftClassIds.has(s.class_id)));

    const isAfternoon = currentShift === 'vespertino';

    setTimeBlocks(prev => {
      const filtered = prev.filter(tb => !sameShiftClassIds.has(tb.class_id));
      const newBlocks: TimeBlock[] = [];

      sameShiftClasses.forEach(c => {
        if (isAfternoon) {
          newBlocks.push(
            { id: crypto.randomUUID(), class_id: c.id, start_time: '13:30', end_time: '14:20', is_interval: false },
            { id: crypto.randomUUID(), class_id: c.id, start_time: '14:20', end_time: '15:10', is_interval: false },
            { id: crypto.randomUUID(), class_id: c.id, start_time: '15:10', end_time: '16:00', is_interval: false },
            { id: crypto.randomUUID(), class_id: c.id, start_time: '16:00', end_time: '16:20', is_interval: true },
            { id: crypto.randomUUID(), class_id: c.id, start_time: '16:20', end_time: '17:10', is_interval: false },
            { id: crypto.randomUUID(), class_id: c.id, start_time: '17:10', end_time: '18:00', is_interval: false },
            { id: crypto.randomUUID(), class_id: c.id, start_time: '18:00', end_time: '18:50', is_interval: false }
          );
        } else {
          newBlocks.push(
            { id: crypto.randomUUID(), class_id: c.id, start_time: '07:15', end_time: '08:05', is_interval: false },
            { id: crypto.randomUUID(), class_id: c.id, start_time: '08:05', end_time: '08:55', is_interval: false },
            { id: crypto.randomUUID(), class_id: c.id, start_time: '08:55', end_time: '09:10', is_interval: true },
            { id: crypto.randomUUID(), class_id: c.id, start_time: '09:10', end_time: '10:00', is_interval: false },
            { id: crypto.randomUUID(), class_id: c.id, start_time: '10:00', end_time: '10:50', is_interval: false },
            { id: crypto.randomUUID(), class_id: c.id, start_time: '10:50', end_time: '11:40', is_interval: false },
            { id: crypto.randomUUID(), class_id: c.id, start_time: '11:40', end_time: '12:30', is_interval: false }
          );
        }
      });

      return [...filtered, ...newBlocks];
    });
  };

  const updateTimeBlock = (blockId: string, field: 'start_time' | 'end_time', rawValue: string) => {
    const targetClass = classes.find(c => c.id === selectedClassId);
    if (!targetClass) return;
    const currentShift = getClassShift(targetClass);

    const sortedCurrentBlocks = timeBlocks
      .filter(tb => tb.class_id === selectedClassId)
      .sort((a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time));
    
    const blockIndex = sortedCurrentBlocks.findIndex(tb => tb.id === blockId);
    if (blockIndex === -1) return;

    const targetBlock = sortedCurrentBlocks[blockIndex];
    const oldValue = targetBlock[field];
    const normalizedValue = normalizeTimeStr(rawValue);

    const sameShiftClasses = classes.filter(c => getClassShift(c) === currentShift);
    const sameShiftClassIds = new Set(sameShiftClasses.map(c => c.id));

    setTimeBlocks(prev => {
      const next = [...prev];
      sameShiftClasses.forEach(c => {
        const classBlocks = next
          .filter(tb => tb.class_id === c.id)
          .sort((a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time));
        
        let targetForC = classBlocks.find(tb => tb.start_time === targetBlock.start_time && tb.end_time === targetBlock.end_time);
        if (!targetForC && classBlocks[blockIndex]) {
          targetForC = classBlocks[blockIndex];
        }

        if (targetForC) {
          const idxInPrev = next.findIndex(tb => tb.id === targetForC!.id);
          if (idxInPrev !== -1) {
            next[idxInPrev] = { ...next[idxInPrev], [field]: normalizedValue };
          }
        }
      });
      return next;
    });

    setScheduleSlots(slots => slots.map(s => {
      if (sameShiftClassIds.has(s.class_id) && s[field] === oldValue) {
        return { ...s, [field]: normalizedValue };
      }
      return s;
    }));
  };

  const removeTimeBlock = (blockId: string) => {
    const targetClass = classes.find(c => c.id === selectedClassId);
    if (!targetClass) return;
    const currentShift = getClassShift(targetClass);

    const sortedCurrentBlocks = timeBlocks
      .filter(tb => tb.class_id === selectedClassId)
      .sort((a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time));
    
    const blockIndex = sortedCurrentBlocks.findIndex(tb => tb.id === blockId);
    if (blockIndex === -1) return;

    const targetBlock = sortedCurrentBlocks[blockIndex];

    const sameShiftClasses = classes.filter(c => getClassShift(c) === currentShift);
    const sameShiftClassIds = new Set(sameShiftClasses.map(c => c.id));

    const idsToRemove = new Set<string>();

    sameShiftClasses.forEach(c => {
      const classBlocks = timeBlocks
        .filter(tb => tb.class_id === c.id)
        .sort((a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time));
      
      const matched = classBlocks.find(tb => tb.start_time === targetBlock.start_time && tb.end_time === targetBlock.end_time) || classBlocks[blockIndex];
      if (matched) {
        idsToRemove.add(matched.id);
      }
    });

    setScheduleSlots(slots => slots.filter(s => {
      if (sameShiftClassIds.has(s.class_id)) {
        return !(s.start_time === targetBlock.start_time && s.end_time === targetBlock.end_time);
      }
      return true;
    }));

    setTimeBlocks(prev => prev.filter(tb => !idsToRemove.has(tb.id)));
  };

  const saveCell = (block: TimeBlock, day: DayOfWeek) => {
    if (!cellTeacherId || !cellSubject) {
      // If empty, remove the slot
      setScheduleSlots(slots => slots.filter(s => !(s.class_id === selectedClassId && s.day_of_week === day && s.start_time === block.start_time && s.end_time === block.end_time)));
    } else {
      const teacher = teachers.find(t => t.id === cellTeacherId);
      if (!teacher) return;

      // Validate Day
      if (!teacher.available_days?.includes(day)) {
        if (!confirm(`Atenção: O professor não tem disponibilidade na ${day}. Deseja adicionar mesmo assim?`)) {
          return;
        }
      }

      // Validate Shift
      const startHour = parseInt(block.start_time.split(':')[0]);
      const isMorning = startHour < 13;
      if (
        (teacher.availability_shift === 'matutino' && !isMorning) ||
        (teacher.availability_shift === 'vespertino' && isMorning)
      ) {
        if (!confirm(`Atenção: O professor tem disponibilidade apenas no turno ${teacher.availability_shift}. Deseja adicionar mesmo assim?`)) {
          return;
        }
      }

      // Validate Slot Position (1º, 2º, 3º, etc.)
      if (teacher.available_slots && teacher.available_slots.length > 0 && teacher.available_slots.length < 6) {
        const nonIntervalBlocks = classTimeBlocks
          .filter(b => !b.is_interval)
          .sort((a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time));
        const slotIndex = nonIntervalBlocks.findIndex(b => b.id === block.id) + 1;
        if (slotIndex > 0 && !teacher.available_slots.includes(slotIndex)) {
          if (!confirm(`Atenção: O professor ${teacher.name} não tem disponibilidade cadastrada no ${slotIndex}º horário. Deseja adicionar mesmo assim?`)) {
            return;
          }
        }
      }

      // Validate Workload
      const getDurationHours = (start: string, end: string) => {
        const [h1, m1] = start.split(':').map(Number);
        const [h2, m2] = end.split(':').map(Number);
        return (h2 - h1) + (m2 - m1) / 60;
      };

      const newSlotDuration = getDurationHours(block.start_time, block.end_time);
      const currentLoad = scheduleSlots
        .filter(s => s.teacher_id === teacher.id && !(s.class_id === selectedClassId && s.day_of_week === day && s.start_time === block.start_time && s.end_time === block.end_time))
        .reduce((total, s) => total + getDurationHours(s.start_time, s.end_time), 0);

      if (currentLoad + newSlotDuration > (teacher.workload_hours || 20)) {
        if (!confirm(`Atenção: A carga horária deste professor excederá o limite de ${teacher.workload_hours}h. Deseja adicionar mesmo assim?`)) {
          return;
        }
      }

      // Check max 2 lessons of the same subject per day limit
      const sameSubjectCountOnDay = scheduleSlots.filter(s => 
        s.class_id === selectedClassId && 
        s.day_of_week === day && 
        s.subject === cellSubject && 
        !(s.start_time === block.start_time && s.end_time === block.end_time)
      ).length;

      if (sameSubjectCountOnDay >= 2) {
        if (!confirm(`Atenção: A turma já possui ${sameSubjectCountOnDay} aulas de "${cellSubject}" na ${day}. O limite é de no máximo 2 aulas da mesma matéria no mesmo dia. Deseja adicionar mesmo assim?`)) {
          return;
        }
      }

      // Check conflict (the same teacher cannot be scheduled twice at the same/overlapping time slot in any class)
      const conflict = scheduleSlots.find(s => 
        s.teacher_id === cellTeacherId && 
        s.day_of_week === day &&
        !(s.class_id === selectedClassId && s.day_of_week === day && s.start_time === block.start_time && s.end_time === block.end_time) &&
        timesOverlap(block.start_time, block.end_time, s.start_time, s.end_time)
      );

      if (conflict) {
        const conflictClass = classes.find(c => c.id === conflict.class_id)?.name;
        const sameClass = conflict.class_id === selectedClassId;
        const msg = sameClass
          ? `Conflito de Professor: O professor ${teacher.name} já está agendado nesta mesma turma na disciplina de "${conflict.subject}" neste horário (${block.start_time} - ${block.end_time}). Os horários não podem bater!`
          : `Conflito de Professor: O professor ${teacher.name} já está agendado na turma "${conflictClass}" na disciplina de "${conflict.subject}" neste mesmo horário (${block.start_time} - ${block.end_time}). Os horários não podem bater!`;
        
        if (!confirm(`${msg}\n\nDeseja forçar o agendamento mesmo assim?`)) {
          return;
        }
      }

      setScheduleSlots(slots => {
        const filtered = slots.filter(s => !(s.class_id === selectedClassId && s.day_of_week === day && s.start_time === block.start_time && s.end_time === block.end_time));
        return [...filtered, {
          id: crypto.randomUUID(),
          class_id: selectedClassId,
          teacher_id: cellTeacherId,
          subject: cellSubject,
          day_of_week: day,
          start_time: block.start_time,
          end_time: block.end_time
        }];
      });
    }
    setEditingCell(null);
  };

  const openCellEdit = (block: TimeBlock, day: DayOfWeek, existingSlot?: ScheduleSlot) => {
    if (!isAdmin) return;
    setCellTeacherId(existingSlot?.teacher_id || '');
    setCellSubject(existingSlot?.subject || '');
    setEditingCell({ day, blockId: block.id });
  };

  // Group classes by EducationalGroup for the selector
  const groupLabels: Record<EducationalGroup, string> = {
    infantil: 'Educação Infantil',
    anos_iniciais: 'Anos Iniciais',
    anos_finais: 'Anos Finais',
    ensino_medio: 'Ensino Médio'
  };

  // --- PDF EXPORT FUNCTIONS ---
  const exportPDFCurrentClass = () => {
    setIsExportModalOpen(false);
    if (!selectedClassId) return;
    const selectedClass = classes.find(c => c.id === selectedClassId);
    if (!selectedClass) return;

    const doc = new jsPDF({ orientation: 'landscape', format: 'a4' });
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text(`Grade Horária - ${selectedClass.name} (${groupLabels[selectedClass.group] || selectedClass.group})`, 14, 15);

    const daysOfWeek: DayOfWeek[] = ['segunda', 'terca', 'quarta', 'quinta', 'sexta'];
    const headers = ['Horários', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta'];

    const isClass678 = is678Grade(selectedClass.name);
    const nonIntervalBlocks = classTimeBlocks
      .filter(b => !b.is_interval)
      .sort((a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time));

    const body = classTimeBlocks.map(block => {
      const nonIntervalIdx = nonIntervalBlocks.findIndex(b => b.id === block.id);
      const is6thSlot = nonIntervalIdx >= 5;

      const row = [`${block.start_time} - ${block.end_time}`];
      if (block.is_interval) {
        daysOfWeek.forEach(() => {
          row.push('☕ INTERVALO');
        });
      } else {
        daysOfWeek.forEach(day => {
          const isRestrictedDay = day === 'segunda' || day === 'quarta' || day === 'sexta';
          const slot = scheduleSlots.find(s => s.class_id === selectedClassId && s.day_of_week === day && s.start_time === block.start_time && s.end_time === block.end_time);
          if (isClass678 && isRestrictedDay && is6thSlot && !slot) {
            row.push('Sem 6º Horário\n(Apenas Ter/Qui)');
          } else {
            row.push(slot ? `${slot.subject}\n(${teachers.find(t => t.id === slot.teacher_id)?.name || 'S/ Prof'})` : '⚠️ VAGO');
          }
        });
      }
      return row;
    });

    autoTable(doc, {
      startY: 25,
      head: [headers],
      body: body,
      theme: 'grid',
      headStyles: { fillColor: [220, 38, 38], textColor: [255, 255, 255] },
      styles: { fontSize: 10, halign: 'center', valign: 'middle' },
      columnStyles: {
        0: { fontStyle: 'bold', halign: 'center' }
      },
      margin: { left: 14 }
    });

    doc.save(`grade_horaria_${selectedClass.name.toLowerCase().replace(/\s+/g, '_')}.pdf`);
  };

  const exportAllClassesPDF = (targetClassesList: SchoolClass[], titleSuffix: string) => {
    setIsExportModalOpen(false);
    if (targetClassesList.length === 0) return;

    const doc = new jsPDF({ orientation: 'landscape', format: 'a4' });
    const daysOfWeek: DayOfWeek[] = ['segunda', 'terca', 'quarta', 'quinta', 'sexta'];
    const headers = ['Horários', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta'];

    targetClassesList.forEach((cls, index) => {
      if (index > 0) {
        doc.addPage();
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.text(`Grade Horária - ${cls.name} (${groupLabels[cls.group] || cls.group})`, 14, 15);

      const cBlocks = timeBlocks
        .filter(tb => tb.class_id === cls.id)
        .sort((a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time));

      const isClass678 = is678Grade(cls.name);
      const nonIntervalBlocks = cBlocks
        .filter(b => !b.is_interval)
        .sort((a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time));

      const body = cBlocks.map(block => {
        const nonIntervalIdx = nonIntervalBlocks.findIndex(b => b.id === block.id);
        const is6thSlot = nonIntervalIdx >= 5;

        const row = [`${block.start_time} - ${block.end_time}`];
        if (block.is_interval) {
          daysOfWeek.forEach(() => {
            row.push('☕ INTERVALO');
          });
        } else {
          daysOfWeek.forEach(day => {
            const isRestrictedDay = day === 'segunda' || day === 'quarta' || day === 'sexta';
            const slot = scheduleSlots.find(s => s.class_id === cls.id && s.day_of_week === day && s.start_time === block.start_time && s.end_time === block.end_time);
            if (isClass678 && isRestrictedDay && is6thSlot && !slot) {
              row.push('Sem 6º Horário\n(Apenas Ter/Qui)');
            } else {
              row.push(slot ? `${slot.subject}\n(${teachers.find(t => t.id === slot.teacher_id)?.name || 'S/ Prof'})` : '⚠️ VAGO');
            }
          });
        }
        return row;
      });

      autoTable(doc, {
        startY: 22,
        head: [headers],
        body: body,
        theme: 'grid',
        headStyles: { fillColor: [211, 47, 47], textColor: [255, 255, 255] },
        styles: { fontSize: 9, halign: 'center', valign: 'middle' },
        columnStyles: {
          0: { fontStyle: 'bold', halign: 'center', cellWidth: 35 }
        },
        margin: { left: 14, right: 14 }
      });
    });

    doc.save(`grade_horaria_${titleSuffix.toLowerCase().replace(/\s+/g, '_')}.pdf`);
  };

  const exportTeacherSchedulesPDF = () => {
    setIsExportModalOpen(false);
    if (teachers.length === 0) {
      alert('Nenhum professor cadastrado para exportar.');
      return;
    }

    const doc = new jsPDF({ orientation: 'landscape', format: 'a4' });
    const daysOfWeek: DayOfWeek[] = ['segunda', 'terca', 'quarta', 'quinta', 'sexta'];
    const headers = ['Horários', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta'];

    const teacherMap = new Map<string, Teacher>();
    const nameToTeacherIds = new Map<string, string[]>();

    teachers.forEach(t => {
      const normName = t.name.trim().toLowerCase();
      const list = nameToTeacherIds.get(normName) || [];
      list.push(t.id);
      nameToTeacherIds.set(normName, list);

      if (!teacherMap.has(normName)) {
        teacherMap.set(normName, { ...t });
      } else {
        const existing = teacherMap.get(normName)!;
        existing.subjects = Array.from(new Set([...existing.subjects, ...t.subjects]));
        existing.groups = Array.from(new Set([...existing.groups, ...t.groups]));
      }
    });

    const uniqueTeachers = Array.from(teacherMap.values()).sort((a, b) => a.name.localeCompare(b.name));
    let pageCount = 0;

    uniqueTeachers.forEach(teacher => {
      const tIds = nameToTeacherIds.get(teacher.name.trim().toLowerCase()) || [teacher.id];
      const teacherSlots = scheduleSlots.filter(s => tIds.includes(s.teacher_id));

      const morningTimes = Array.from(new Set(
        timeBlocks
          .filter(b => {
            const hour = parseInt(normalizeTime(b.start_time).split(':')[0], 10);
            return hour < 12;
          })
          .map(b => `${b.start_time} - ${b.end_time}`)
      )).sort((a, b) => timeToMinutes(a.split(' - ')[0]) - timeToMinutes(b.split(' - ')[0]));

      const afternoonTimes = Array.from(new Set(
        timeBlocks
          .filter(b => {
            const hour = parseInt(normalizeTime(b.start_time).split(':')[0], 10);
            return hour >= 12;
          })
          .map(b => `${b.start_time} - ${b.end_time}`)
      )).sort((a, b) => timeToMinutes(a.split(' - ')[0]) - timeToMinutes(b.split(' - ')[0]));

      const hasMorningSlots = morningTimes.some(tr => {
        const [st, et] = tr.split(' - ');
        return teacherSlots.some(s => s.start_time === st && s.end_time === et);
      });

      const hasAfternoonSlots = afternoonTimes.some(tr => {
        const [st, et] = tr.split(' - ');
        return teacherSlots.some(s => s.start_time === st && s.end_time === et);
      });

      const showMorning = hasMorningSlots || morningTimes.length > 0 && (!hasAfternoonSlots && teacher.availability_shift !== 'vespertino');
      const showAfternoon = hasAfternoonSlots || afternoonTimes.length > 0 && (!hasMorningSlots && teacher.availability_shift !== 'matutino');

      const shiftsToRender: { shiftName: string, times: string[] }[] = [];
      if (showMorning && morningTimes.length > 0) {
        shiftsToRender.push({ shiftName: 'Matutino', times: morningTimes });
      }
      if (showAfternoon && afternoonTimes.length > 0) {
        shiftsToRender.push({ shiftName: 'Vespertino', times: afternoonTimes });
      }
      if (shiftsToRender.length === 0) {
        const allTimes = Array.from(new Set(timeBlocks.map(b => `${b.start_time} - ${b.end_time}`)))
          .sort((a, b) => timeToMinutes(a.split(' - ')[0]) - timeToMinutes(b.split(' - ')[0]));
        shiftsToRender.push({ shiftName: 'Geral', times: allTimes });
      }

      shiftsToRender.forEach(shiftData => {
        if (pageCount > 0) {
          doc.addPage();
        }
        pageCount++;

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.text(`Grade de Aulas - Prof. ${teacher.name} (${shiftData.shiftName})`, 14, 15);

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        const teacherSubjects = teacher.subjects.join(', ');
        doc.text(`Disciplinas: ${teacherSubjects || 'N/A'} | Carga Horária: ${teacher.workload_hours || 20}h | Turno: ${shiftData.shiftName}`, 14, 21);

        const body = shiftData.times.map(timeRange => {
          const [startTime, endTime] = timeRange.split(' - ');
          const row = [timeRange];

          daysOfWeek.forEach(day => {
            const slot = teacherSlots.find(s => s.day_of_week === day && s.start_time === startTime && s.end_time === endTime);
            if (slot) {
              const cls = classes.find(c => c.id === slot.class_id);
              row.push(`${slot.subject}\n(${cls ? cls.name : 'Turma'})`);
            } else {
              row.push('---------');
            }
          });
          return row;
        });

        autoTable(doc, {
          startY: 27,
          head: [headers],
          body: body,
          theme: 'grid',
          headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255] },
          styles: { fontSize: 9, halign: 'center', valign: 'middle' },
          columnStyles: {
            0: { fontStyle: 'bold', halign: 'center', cellWidth: 35 }
          },
          margin: { left: 14, right: 14 }
        });
      });
    });

    doc.save(`grade_horaria_professores.pdf`);
  };

  const exportMatrixPDF = (targetShift: 'matutino' | 'vespertino' | 'ambos') => {
    setIsExportModalOpen(false);

    const shiftsToExport: ('matutino' | 'vespertino')[] = 
      targetShift === 'ambos' ? ['matutino', 'vespertino'] : [targetShift];

    const doc = new jsPDF({ orientation: 'landscape', format: 'a4' });
    const daysOfWeek: DayOfWeek[] = ['segunda', 'terca', 'quarta', 'quinta', 'sexta'];
    const dayLabels: Record<DayOfWeek, string> = {
      segunda: 'SEGUNDA',
      terca: 'TERÇA',
      quarta: 'QUARTA',
      quinta: 'QUINTA',
      sexta: 'SEXTA',
      sabado: 'SÁBADO'
    };

    const defaultMorningBlocks = [
      { label: '1º', start_time: '07:15', end_time: '08:05', is_interval: false },
      { label: '2º', start_time: '08:05', end_time: '08:55', is_interval: false },
      { label: 'RECREIO', start_time: '08:55', end_time: '09:10', is_interval: true },
      { label: '3º', start_time: '09:10', end_time: '10:00', is_interval: false },
      { label: '4º', start_time: '10:00', end_time: '10:50', is_interval: false },
      { label: '5º', start_time: '10:50', end_time: '11:40', is_interval: false },
      { label: '6º', start_time: '11:40', end_time: '12:30', is_interval: false }
    ];

    const defaultAfternoonBlocks = [
      { label: '1º', start_time: '13:30', end_time: '14:20', is_interval: false },
      { label: '2º', start_time: '14:20', end_time: '15:10', is_interval: false },
      { label: '3º', start_time: '15:10', end_time: '16:00', is_interval: false },
      { label: 'RECREIO', start_time: '16:00', end_time: '16:20', is_interval: true },
      { label: '4º', start_time: '16:20', end_time: '17:10', is_interval: false },
      { label: '5º', start_time: '17:10', end_time: '18:00', is_interval: false },
      { label: '6º', start_time: '18:00', end_time: '18:50', is_interval: false }
    ];

    let pageCount = 0;

    shiftsToExport.forEach(shift => {
      const shiftClasses = classes.filter(cls => {
        const cShift = getClassShift(cls);
        return cShift === shift;
      }).sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));

      if (shiftClasses.length === 0) return;

      if (pageCount > 0) {
        doc.addPage();
      }
      pageCount++;

      const blocks = shift === 'vespertino' ? defaultAfternoonBlocks : defaultMorningBlocks;
      const shiftTitle = shift === 'matutino' ? 'MATUTINO' : 'VESPERTINO';

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text(`Visão Geral da Grade Horária - Turno ${shiftTitle}`, 8, 8);
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'normal');
      doc.text(`Apenas Disciplinas (Sem nomes de professores)`, 8, 11.5);

      const headers = ['DIA', 'HORÁRIO', ...shiftClasses.map(c => c.name.toUpperCase())];

      const body: string[][] = [];

      daysOfWeek.forEach(dayKey => {
        blocks.forEach((block) => {
          const row: string[] = [];

          row.push(dayLabels[dayKey]);
          row.push(block.is_interval ? `RECREIO` : `${block.label} (${block.start_time}-${block.end_time})`);

          shiftClasses.forEach(cls => {
            if (block.is_interval) {
              row.push('☕ RECREIO');
            } else {
              const slot = scheduleSlots.find(
                s => s.class_id === cls.id &&
                s.day_of_week === dayKey &&
                s.start_time === block.start_time &&
                s.end_time === block.end_time
              );
              row.push(slot ? slot.subject : '-');
            }
          });

          body.push(row);
        });
      });

      const numCols = headers.length;
      let fontSize = 6.5;
      if (numCols > 12) fontSize = 5;
      else if (numCols > 9) fontSize = 5.5;
      else if (numCols > 7) fontSize = 6;

      autoTable(doc, {
        startY: 13,
        head: [headers],
        body: body,
        theme: 'grid',
        headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center', cellPadding: 0.6 },
        styles: { fontSize, halign: 'center', valign: 'middle', cellPadding: 0.5, overflow: 'ellipsize', minCellHeight: 3.5 },
        columnStyles: {
          0: { fontStyle: 'bold', halign: 'center', cellWidth: 16, fillColor: [241, 245, 249] },
          1: { fontStyle: 'bold', halign: 'center', cellWidth: 26, fillColor: [248, 250, 252] }
        },
        margin: { left: 6, right: 6, top: 4, bottom: 4 },
        rowPageBreak: 'avoid'
      });
    });

    if (pageCount === 0) {
      alert('Nenhuma turma encontrada para o turno selecionado.');
      return;
    }

    doc.save(`visao_geral_grade_horaria_${targetShift}.pdf`);
  };

  const currentSelectedClass = classes.find(c => c.id === selectedClassId);
  const currentShiftName = currentSelectedClass ? getClassShift(currentSelectedClass) : 'matutino';

  return (
    <div className="space-y-6">
      {scheduleStatus && (
        <div className={`p-4 rounded-xl border flex flex-col space-y-2 animate-in fade-in duration-200 ${
          scheduleStatus.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
          scheduleStatus.type === 'warning' ? 'bg-amber-50 border-amber-200 text-amber-800' :
          'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          <div className="flex items-center space-x-2 flex-wrap gap-2">
            <AlertCircle className={`w-5 h-5 ${
              scheduleStatus.type === 'success' ? 'text-emerald-600' :
              scheduleStatus.type === 'warning' ? 'text-amber-600' :
              'text-rose-600'
            }`} />
            <span className="font-bold text-sm">{scheduleStatus.message}</span>
            <div className="ml-auto flex items-center gap-2">
              {scheduleStatus.type === 'warning' && (
                <button
                  onClick={resolveConflictsAutomatically}
                  className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-sm transition-all flex items-center gap-1.5"
                >
                  🛠️ Arrumar conflito automaticamente
                </button>
              )}
              <button onClick={() => setScheduleStatus(null)} className="text-xs font-semibold hover:underline px-2 py-1">Fechar</button>
            </div>
          </div>
          {scheduleStatus.details && scheduleStatus.details.length > 0 && (
            <ul className="list-disc list-inside text-xs space-y-1 pl-1 opacity-90">
              {scheduleStatus.details.map((d, idx) => <li key={idx}>{d}</li>)}
            </ul>
          )}
        </div>
      )}

      {/* AUTO ORGANIZER MODAL / OPTIONS */}
      {isAutoModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Wand2 className="w-5 h-5 text-red-600" />
                <h3 className="font-bold text-slate-800 text-base">Organizar Grade com IA Gemini 3.1 Flash Lite</h3>
              </div>
              <button onClick={() => setIsAutoModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Organização automática de aulas com a IA <strong className="text-slate-700">Gemini 3.1 Flash Lite</strong>:
            </p>

            <div className="p-3 bg-red-50/60 rounded-xl border border-red-200 space-y-1.5 text-xs">
              <p className="font-bold text-red-900 text-xs flex items-center gap-1">
                <span>🤖</span> Regras Rigorosas do Modelo Gemini 3.1 Flash Lite:
              </p>
              <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-700 font-medium">
                <li><strong className="text-red-700">1. Zero Horários Livres:</strong> Preenche 100% dos horários das turmas sem deixar aulas vagas.</li>
                <li><strong className="text-red-700">2. Rigor na Carga Horária:</strong> Aloca exatamente a carga horária de cada matéria (sem aulas excedentes).</li>
                <li><strong className="text-red-700">3. Explicação de Conflitos:</strong> Caso ocorra qualquer conflito de professor ou indisponibilidade, a IA informa detalhadamente o porquê.</li>
                <li><strong className="text-red-700">4. Máximo 2 Aulas/Dia:</strong> Limita no máximo 2 aulas da mesma disciplina por dia em cada turma.</li>
              </ul>
            </div>

            <div className="space-y-2">
              {selectedClassId && (
                <button
                  onClick={() => runAutoOrganize('selected')}
                  className="w-full text-left p-3 rounded-xl border border-slate-200 hover:border-red-500 hover:bg-red-50/50 transition-all group"
                >
                  <p className="font-bold text-xs text-slate-800 group-hover:text-red-700">⚡ Organizar com IA Apenas {currentSelectedClass?.name}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Aloca com Gemini 3.1 Flash Lite apenas para a turma selecionada.</p>
                </button>
              )}

              <button
                onClick={() => runAutoOrganize('shift')}
                className="w-full text-left p-3 rounded-xl border border-slate-200 hover:border-red-500 hover:bg-red-50/50 transition-all group"
              >
                <p className="font-bold text-xs text-slate-800 group-hover:text-red-700">
                  ⚡ Organizar com IA TODAS as Turmas do Turno ({currentShiftName.toUpperCase()})
                </p>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  Organiza todas as turmas do turno {currentShiftName} simultaneamente sem conflitos de professores.
                </p>
              </button>

              <button
                onClick={() => runAutoOrganize('all')}
                className="w-full text-left p-3 rounded-xl border border-slate-200 hover:border-red-500 hover:bg-red-50/50 transition-all group"
              >
                <p className="font-bold text-xs text-slate-800 group-hover:text-red-700">⚡ Organizar com IA TODAS as Turmas da Escola (Geral)</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Mapeia e aloca todas as turmas de todos os turnos e segmentos com o Gemini 3.1 Flash Lite.</p>
              </button>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setIsAutoModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EXPORT OPTIONS MODAL */}
      {isExportModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Download className="w-5 h-5 text-slate-800" />
                <h3 className="font-bold text-slate-800 text-base">Exportar Grade Horária (PDF)</h3>
              </div>
              <button onClick={() => setIsExportModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Selecione o formato de relatório que deseja exportar em PDF:
            </p>

            <div className="space-y-3">
              {/* VISÃO GERAL MATRIX (SEM NOME DO PROFESSOR) */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <p className="text-[11px] font-bold uppercase text-slate-800 tracking-wider flex items-center gap-1">
                  <span>📊</span> Visão Geral em Matriz (Apenas Matérias, sem Professores)
                </p>
                <div className="grid grid-cols-1 gap-1.5">
                  <button
                    onClick={() => exportMatrixPDF('matutino')}
                    className="w-full text-left p-2.5 rounded-lg border border-slate-200 bg-white hover:border-red-600 hover:bg-red-50/50 transition-all group"
                  >
                    <p className="font-bold text-xs text-slate-800 group-hover:text-red-700">☀️ Visão Geral - Matutino</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Grade em matriz com todas as turmas do matutino sem o nome do professor.</p>
                  </button>

                  <button
                    onClick={() => exportMatrixPDF('vespertino')}
                    className="w-full text-left p-2.5 rounded-lg border border-slate-200 bg-white hover:border-red-600 hover:bg-red-50/50 transition-all group"
                  >
                    <p className="font-bold text-xs text-slate-800 group-hover:text-red-700">🌙 Visão Geral - Vespertino</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Grade em matriz com todas as turmas do vespertino sem o nome do professor.</p>
                  </button>

                  <button
                    onClick={() => exportMatrixPDF('ambos')}
                    className="w-full text-left p-2.5 rounded-lg border border-slate-200 bg-white hover:border-red-600 hover:bg-red-50/50 transition-all group"
                  >
                    <p className="font-bold text-xs text-slate-800 group-hover:text-red-700">🏫 Visão Geral Completa (Matutino + Vespertino)</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Gera relatório completo da escola em matriz sem nomes de professores.</p>
                  </button>
                </div>
              </div>

              {/* RELATÓRIOS INDIVIDUAIS POR TURMA E PROFESSOR */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <p className="text-[11px] font-bold uppercase text-slate-800 tracking-wider flex items-center gap-1">
                  <span>📑</span> Relatórios Individuais (Com Professores)
                </p>
                <div className="grid grid-cols-1 gap-1.5">
                  {selectedClassId && (
                    <button
                      onClick={exportPDFCurrentClass}
                      className="w-full text-left p-2.5 rounded-lg border border-slate-200 bg-white hover:border-slate-800 hover:bg-slate-100 transition-all group"
                    >
                      <p className="font-bold text-xs text-slate-800 group-hover:text-red-600">📄 Turma Atual ({currentSelectedClass?.name})</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">PDF individual da turma selecionada.</p>
                    </button>
                  )}

                  <button
                    onClick={() => exportAllClassesPDF(classes.filter(c => getClassShift(c) === currentShiftName), `Turno_${currentShiftName}`)}
                    className="w-full text-left p-2.5 rounded-lg border border-slate-200 bg-white hover:border-slate-800 hover:bg-slate-100 transition-all group"
                  >
                    <p className="font-bold text-xs text-slate-800 group-hover:text-red-600">
                      📚 Todas as Turmas do Turno ({currentShiftName.toUpperCase()})
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Consolida as turmas do turno {currentShiftName} (página por turma).</p>
                  </button>

                  <button
                    onClick={() => exportAllClassesPDF(classes, 'Geral_Escola')}
                    className="w-full text-left p-2.5 rounded-lg border border-slate-200 bg-white hover:border-slate-800 hover:bg-slate-100 transition-all group"
                  >
                    <p className="font-bold text-xs text-slate-800 group-hover:text-red-600">🏫 Todas as Turmas da Escola</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Gera relatório de todas as turmas da escola (página por turma).</p>
                  </button>

                  <button
                    onClick={exportTeacherSchedulesPDF}
                    className="w-full text-left p-2.5 rounded-lg border border-slate-200 bg-white hover:border-slate-800 hover:bg-slate-100 transition-all group"
                  >
                    <p className="font-bold text-xs text-slate-800 group-hover:text-red-600">👨‍🏫 Agenda por Professor</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">PDF individual com a agenda semanal de cada docente.</p>
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setIsExportModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW SELECTION & CONTROL BAR */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setViewMode('matrix')}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
              viewMode === 'matrix'
                ? 'bg-red-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <span>📊 Visão Geral (Matriz)</span>
          </button>
          <button
            onClick={() => setViewMode('single')}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
              viewMode === 'single'
                ? 'bg-red-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <span>🏫 Visão Por Turma</span>
          </button>
        </div>

        {viewMode === 'matrix' ? (
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                onClick={() => setMatrixShift('matutino')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  matrixShift === 'matutino' ? 'bg-amber-500 text-white shadow-xs' : 'text-slate-700 hover:bg-slate-200'
                }`}
              >
                ☀️ Matutino (A)
              </button>
              <button
                onClick={() => setMatrixShift('vespertino')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  matrixShift === 'vespertino' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-700 hover:bg-slate-200'
                }`}
              >
                🌙 Vespertino (B)
              </button>
            </div>

            <select
              value={matrixGroup}
              onChange={(e) => setMatrixGroup(e.target.value)}
              className="px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-700 focus:ring-2 focus:ring-red-500"
            >
              <option value="todos">Todos os Segmentos</option>
              <option value="anos_finais">6º ao 9º Ano (Anos Finais)</option>
              <option value="ensino_medio">Ensino Médio</option>
              <option value="anos_iniciais">Anos Iniciais</option>
              <option value="infantil">Educação Infantil</option>
            </select>
          </div>
        ) : (
          <select
            className="px-4 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500 font-bold text-slate-700 min-w-[250px] text-xs"
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
          >
            <option value="">Selecione uma Turma...</option>
            {(['infantil', 'anos_iniciais', 'anos_finais', 'ensino_medio'] as EducationalGroup[]).map(group => {
              const groupClasses = classes.filter(c => c.group === group);
              if (groupClasses.length === 0) return null;
              return (
                <optgroup key={group} label={groupLabels[group]}>
                  {groupClasses.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </optgroup>
              );
            })}
          </select>
        )}

        <div className="flex items-center space-x-2">
          {isAdmin && (
            <button 
              onClick={() => setIsAutoModalOpen(true)} 
              className="flex items-center space-x-1.5 bg-red-600 hover:bg-red-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-colors shadow-xs"
            >
              <Wand2 className="w-3.5 h-3.5" />
              <span>Organizar Automático</span>
            </button>
          )}

          <button 
            onClick={() => setIsExportModalOpen(true)} 
            className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-900 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-colors shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar PDF</span>
          </button>
        </div>
      </div>

      {/* MATRIX VIEW GRID */}
      {viewMode === 'matrix' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border-2 border-slate-800 overflow-hidden shadow-md">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-800 text-white border-b-2 border-slate-900">
                    <th className="p-2.5 font-extrabold uppercase text-center border-r-2 border-slate-700 w-[90px]">
                      DIA
                    </th>
                    <th className="p-2.5 font-extrabold uppercase text-center border-r-2 border-slate-700 w-[110px]">
                      HORÁRIO
                    </th>
                    {filteredMatrixClasses.map(cls => (
                      <th key={cls.id} className="p-2.5 font-black uppercase text-center border-r-2 border-slate-700 last:border-r-0 min-w-[145px] text-xs tracking-wide bg-slate-800">
                        {cls.name.toUpperCase()}
                      </th>
                    ))}
                    {filteredMatrixClasses.length === 0 && (
                      <th className="p-2.5 font-bold text-center">Nenhuma turma encontrada</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {filteredMatrixClasses.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="p-8 text-center text-slate-500 font-medium italic">
                        Nenhuma turma encontrada para o turno e segmento selecionados.
                      </td>
                    </tr>
                  ) : (
                    (['segunda', 'terca', 'quarta', 'quinta', 'sexta'] as DayOfWeek[]).map((dayKey, dayIdx) => {
                      const dayLabels: Record<DayOfWeek, string> = {
                        segunda: 'SEGUNDA',
                        terca: 'TERÇA',
                        quarta: 'QUARTA',
                        quinta: 'QUINTA',
                        sexta: 'SEXTA',
                        sabado: 'SÁBADO'
                      };
                      const isShadedDay = dayIdx % 2 === 1;

                      return matrixBlocks.map((block, blockIdx) => {
                        const isFirstRowOfDay = blockIdx === 0;

                        return (
                          <tr
                            key={`${dayKey}-${block.start_time}-${block.end_time}`}
                            className={`border-b border-slate-400 ${
                              isShadedDay ? 'bg-slate-200/60' : 'bg-white'
                            } hover:bg-amber-50/40 transition-colors`}
                          >
                            {isFirstRowOfDay && (
                              <td
                                rowSpan={matrixBlocks.length}
                                className="p-2 font-black text-slate-900 text-center uppercase tracking-wider text-xs border-r-2 border-slate-800 border-b-2 border-slate-800 bg-slate-300/80 align-middle select-none"
                              >
                                <div className="font-bold text-slate-900 text-xs">
                                  {dayLabels[dayKey]}
                                </div>
                              </td>
                            )}

                            <td className="p-1.5 font-extrabold text-slate-800 text-center border-r-2 border-slate-700 whitespace-nowrap bg-slate-100/90 text-[11px]">
                              <div>{block.label}</div>
                              <div className="text-[9px] font-normal text-slate-600">
                                {block.start_time} - {block.end_time}
                              </div>
                            </td>

                            {filteredMatrixClasses.map(cls => {
                              if (block.is_interval) {
                                return (
                                  <td
                                    key={cls.id}
                                    className="p-1 border-r border-slate-400 text-center bg-slate-300/40 font-bold text-[10px] text-slate-600 uppercase select-none"
                                  >
                                    ☕ RECREIO
                                  </td>
                                );
                              }

                              const slot = scheduleSlots.find(
                                s => s.class_id === cls.id &&
                                s.day_of_week === dayKey &&
                                s.start_time === block.start_time &&
                                s.end_time === block.end_time
                              );

                              const conflict = slot ? checkSlotConflict(slot) : null;
                              const isDraggedOver = draggedMatrixCell?.classId === cls.id &&
                                draggedMatrixCell?.day === dayKey &&
                                draggedMatrixCell?.startTime === block.start_time &&
                                draggedMatrixCell?.endTime === block.end_time;

                              return (
                                <td
                                  key={cls.id}
                                  onDragOver={(e) => {
                                    if (!isAdmin) return;
                                    e.preventDefault();
                                    if (!isDraggedOver) {
                                      setDraggedMatrixCell({ classId: cls.id, day: dayKey, startTime: block.start_time, endTime: block.end_time });
                                    }
                                  }}
                                  onDragLeave={() => setDraggedMatrixCell(null)}
                                  onDrop={(e) => handleMatrixDrop(e, cls.id, dayKey, block.start_time, block.end_time)}
                                  onClick={() => openMatrixCellEdit(cls.id, dayKey, block.start_time, block.end_time, slot)}
                                  className={`p-1.5 border-r border-slate-400 align-middle text-center relative transition-all min-w-[135px] h-[58px] ${
                                    isDraggedOver ? 'bg-red-100 ring-2 ring-red-600' : ''
                                  } ${isAdmin ? 'hover:bg-amber-100/50 cursor-pointer' : ''}`}
                                >
                                  {slot ? (
                                    <div
                                      draggable={isAdmin}
                                      onDragStart={(e) => handleDragStart(e, slot)}
                                      onDragEnd={handleDragEnd}
                                      className={`flex flex-col justify-center items-center p-1 rounded-md border transition-all h-full ${
                                        isAdmin ? 'cursor-grab active:cursor-grabbing hover:brightness-95 shadow-2xs' : ''
                                      } ${
                                        conflict?.isConflict
                                          ? 'bg-rose-100 border-rose-500 text-rose-950 ring-1 ring-rose-400 animate-pulse'
                                          : 'bg-emerald-50 border-emerald-300 text-slate-900 shadow-2xs'
                                      }`}
                                    >
                                      {conflict?.isConflict && (
                                        <span title={conflict.reason} className="text-[8px] font-black uppercase text-rose-700 bg-rose-200 px-1 rounded mb-0.5">
                                          ⚠️ CONFLITO
                                        </span>
                                      )}
                                      <span className="font-extrabold text-xs text-slate-900 leading-tight">
                                        {slot.subject}
                                      </span>
                                      <span className="text-[10px] font-medium text-slate-600 truncate max-w-[125px]">
                                        {teachers.find(t => t.id === slot.teacher_id)?.name || 'S/ Prof'}
                                      </span>
                                    </div>
                                  ) : (
                                    <div className="flex flex-col items-center justify-center h-full border border-dashed border-slate-300 rounded-md bg-white/50 text-slate-400 hover:text-slate-600 hover:border-slate-400 hover:bg-white transition-all p-1">
                                      <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                                        + Adicionar
                                      </span>
                                    </div>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      });
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* MATRIX CELL EDIT MODAL */}
          {editingMatrixCell && (
            <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in duration-150">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm">
                      Editar Aulas - {classes.find(c => c.id === editingMatrixCell.classId)?.name}
                    </h4>
                    <p className="text-[11px] text-slate-500 capitalize">
                      {editingMatrixCell.day === 'terca' ? 'Terça' : editingMatrixCell.day} | {editingMatrixCell.startTime} - {editingMatrixCell.endTime}
                    </p>
                  </div>
                  <button onClick={() => setEditingMatrixCell(null)} className="text-slate-400 hover:text-slate-600 p-1">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Professor</label>
                    <select
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl bg-white font-medium text-slate-800"
                      value={matrixCellTeacherId}
                      onChange={e => {
                        setMatrixCellTeacherId(e.target.value);
                        setMatrixCellSubject('');
                      }}
                    >
                      <option value="">Nenhum / Horário Vago</option>
                      {teachers
                        .filter(t => {
                          const cls = classes.find(c => c.id === editingMatrixCell.classId);
                          return cls && t.groups?.includes(cls.group);
                        })
                        .map(t => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Disciplina</label>
                    <select
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl bg-white font-medium text-slate-800 disabled:opacity-50"
                      value={matrixCellSubject}
                      onChange={e => setMatrixCellSubject(e.target.value)}
                      disabled={!matrixCellTeacherId}
                    >
                      <option value="">Selecione a disciplina...</option>
                      {teachers.find(t => t.id === matrixCellTeacherId)?.subjects.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex items-center space-x-2 pt-2 border-t border-slate-100">
                  <button
                    onClick={saveMatrixCell}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white text-xs font-bold py-2 rounded-xl transition-all shadow-xs"
                  >
                    Salvar Célula
                  </button>
                  <button
                    onClick={() => setEditingMatrixCell(null)}
                    className="px-4 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold py-2 rounded-xl transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SINGLE CLASS VIEW */}
      {viewMode === 'single' && (
        selectedClassId ? (
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse min-w-[800px]">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3 font-bold text-slate-700 w-[180px] border-r border-slate-200">Horários</th>
                      {['segunda', 'terca', 'quarta', 'quinta', 'sexta'].map(day => (
                        <th key={day} className="px-4 py-3 font-bold text-slate-700 text-center capitalize border-r border-slate-200 last:border-r-0 w-[150px]">
                          {day === 'terca' ? 'Terça' : day}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {classTimeBlocks.map((block) => (
                      <tr key={block.id} className="group">
                        <td className="px-4 py-3 border-r border-slate-200 bg-slate-50/50 relative">
                          {isAdmin ? (
                            <div className="flex flex-col space-y-2">
                              <div className="flex items-center space-x-1">
                                <input type="time" className="w-[70px] text-xs px-1 py-1 border rounded bg-white text-slate-700" value={block.start_time} onChange={e => updateTimeBlock(block.id, 'start_time', e.target.value)} />
                                <span className="text-slate-400 text-xs">-</span>
                                <input type="time" className="w-[70px] text-xs px-1 py-1 border rounded bg-white text-slate-700" value={block.end_time} onChange={e => updateTimeBlock(block.id, 'end_time', e.target.value)} />
                              </div>
                              <button onClick={() => removeTimeBlock(block.id)} className="text-[10px] text-red-500 hover:text-red-700 font-bold self-start flex items-center">
                                <Trash2 className="w-3 h-3 mr-1" /> Remover
                              </button>
                            </div>
                          ) : (
                            <div className="font-bold text-slate-700 text-center">{block.start_time} - {block.end_time}</div>
                          )}
                        </td>
                        {block.is_interval ? (
                          <td colSpan={5} className="bg-amber-50/30 border-r border-slate-200 p-4 align-middle text-center">
                            <div className="flex items-center justify-center space-x-2 text-amber-800 font-bold tracking-wider text-xs">
                              <span className="text-sm">☕</span>
                              <span className="font-serif-editorial">INTERVALO / RECREIO</span>
                            </div>
                          </td>
                        ) : (
                          (['segunda', 'terca', 'quarta', 'quinta', 'sexta'] as DayOfWeek[]).map(day => {
                            const existingSlot = scheduleSlots.find(s => s.class_id === selectedClassId && s.day_of_week === day && s.start_time === block.start_time && s.end_time === block.end_time);
                            const isEditing = editingCell?.day === day && editingCell?.blockId === block.id;
                            
                            const selectedClass = classes.find(c => c.id === selectedClassId);
                            const availableTeachers = teachers.filter(t => selectedClass && t.groups?.includes(selectedClass.group));

                            const isClass678 = selectedClass ? is678Grade(selectedClass.name) : false;
                            const nonIntervalBlocks = classTimeBlocks.filter(b => !b.is_interval).sort((a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time));
                            const nonIntervalIdx = nonIntervalBlocks.findIndex(b => b.id === block.id);
                            const is6thSlot = nonIntervalIdx >= 5;
                            const isRestrictedDay = day === 'segunda' || day === 'quarta' || day === 'sexta';
                            const isRestricted6thSlot = isClass678 && isRestrictedDay && is6thSlot && !existingSlot; const isDraggedOver = draggedOverCell?.day === day && draggedOverCell?.blockId === block.id;

                            return (
                              <td key={day} onDragOver={(e) => handleDragOver(e, day, block)} onDragLeave={handleDragLeave} onDrop={(e) => handleDrop(e, day, block)} className={`border-r border-slate-200 last:border-r-0 p-2 align-top relative transition-all ${isDraggedOver ? 'bg-red-50 ring-2 ring-red-500 ring-dashed' : ''} ${isAdmin ? 'hover:bg-slate-50 cursor-pointer' : ''}`} onClick={() => !isEditing && openCellEdit(block, day, existingSlot)}>
                                {isEditing ? (
                                  <div className="flex flex-col space-y-2 bg-white p-2 rounded-lg shadow-sm border border-slate-200" onClick={e => e.stopPropagation()}>
                                    <select 
                                      className="text-xs px-2 py-1.5 border rounded w-full"
                                      value={cellTeacherId}
                                      onChange={e => {
                                        setCellTeacherId(e.target.value);
                                        setCellSubject('');
                                      }}
                                    >
                                      <option value="">Professor...</option>
                                      {availableTeachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                    </select>
                                    <select 
                                      className="text-xs px-2 py-1.5 border rounded w-full"
                                      value={cellSubject}
                                      onChange={e => setCellSubject(e.target.value)}
                                      disabled={!cellTeacherId}
                                    >
                                      <option value="">Disciplina...</option>
                                      {teachers.find(t => t.id === cellTeacherId)?.subjects.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                    <div className="flex space-x-1 pt-1">
                                      <button onClick={() => saveCell(block, day)} className="flex-1 bg-red-600 text-white text-[10px] font-bold py-1 rounded">Salvar</button>
                                      <button onClick={() => setEditingCell(null)} className="flex-1 bg-slate-100 text-slate-600 text-[10px] font-bold py-1 rounded">Cancelar</button>
                                    </div>
                                  </div>
                                ) : existingSlot ? (() => {
                                  const conflict = checkSlotConflict(existingSlot);
                                  return (
                                    <div draggable={isAdmin} onDragStart={(e) => handleDragStart(e, existingSlot)} onDragEnd={handleDragEnd} className={`flex flex-col items-center justify-center h-full min-h-[60px] p-2 rounded-lg border transition-all ${isAdmin ? 'cursor-grab active:cursor-grabbing hover:brightness-95' : ''} ${conflict.isConflict ? 'bg-red-100 border-red-500 text-red-950 shadow-md ring-2 ring-red-400 animate-pulse' : 'bg-emerald-50/60 border-emerald-200 text-slate-800'}`}>
                                      {conflict.isConflict && (
                                        <span title={conflict.reason} className="text-[9px] font-bold uppercase tracking-wider text-red-700 bg-red-200 px-1.5 py-0.5 rounded mb-0.5 flex items-center gap-0.5 cursor-help">
                                          ⚠️ Conflito
                                        </span>
                                      )}
                                      <span className="font-bold text-xs text-center">{existingSlot.subject}</span>
                                      <span className="text-[10px] opacity-80 text-center">{teachers.find(t => t.id === existingSlot.teacher_id)?.name || 'S/ Prof'}</span>
                                      {conflict.isConflict && conflict.reason && (
                                        <span className="text-[8px] text-red-700 font-semibold text-center leading-tight mt-1 bg-white/80 border border-red-200 px-1 py-0.5 rounded">
                                          {conflict.reason}
                                        </span>
                                      )}
                                    </div>
                                  );
                                })() : isRestricted6thSlot ? (
                                  <div className="flex flex-col items-center justify-center h-full min-h-[60px] p-2 bg-slate-100/60 rounded-lg border border-dashed border-slate-200">
                                    <span className="text-[11px] font-medium text-slate-400 text-center">Sem 6º Horário</span>
                                    <span className="text-[9px] text-slate-400 text-center">(Apenas Ter/Qui)</span>
                                  </div>
                                ) : (
                                  <div className="flex flex-col items-center justify-center h-full min-h-[60px] p-2 bg-amber-50/50 hover:bg-amber-100/60 rounded-lg border border-dashed border-amber-300 transition-colors">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded mb-1 flex items-center gap-0.5">
                                      ⚠️ Horário Vago
                                    </span>
                                    <span className="text-[10px] text-amber-800 font-medium text-center leading-tight">
                                      Alunos livres!
                                    </span>
                                  </div>
                                )}
                              </td>
                            );
                          })
                        )}
                      </tr>
                    ))}
                    {classTimeBlocks.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                          Nenhum horário definido para esta turma.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            
            {isAdmin && (
              <div className="flex flex-wrap gap-3 pt-2">
                <button 
                  onClick={() => handleAddTimeBlock(false)}
                  className="flex items-center space-x-2 text-red-600 hover:text-red-700 font-bold text-xs bg-red-50 hover:bg-red-100 px-3.5 py-2 rounded-xl transition-colors border border-red-100"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Adicionar Horário Aula</span>
                </button>
                <button 
                  onClick={() => handleAddTimeBlock(true)}
                  className="flex items-center space-x-2 text-amber-700 hover:text-amber-800 font-bold text-xs bg-amber-50 hover:bg-amber-100 px-3.5 py-2 rounded-xl transition-colors border border-amber-100"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Adicionar Intervalo / Recreio</span>
                </button>
                <button 
                  onClick={handleResetDefaultBlocks}
                  className="flex items-center space-x-2 text-slate-600 hover:text-slate-800 font-bold text-xs bg-slate-50 hover:bg-slate-100 px-3.5 py-2 rounded-xl transition-colors border border-slate-200 ml-auto"
                >
                  <span>Resetar para Grade Padrão</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400 bg-white rounded-2xl border border-slate-200">
            <CalendarClock className="w-16 h-16 mb-4 opacity-20" />
            <p className="font-medium text-lg text-slate-500">Selecione uma turma para visualizar a grade individual.</p>
          </div>
        )
      )}
    </div>
  );
}
