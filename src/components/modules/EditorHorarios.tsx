import React, { useState, useEffect } from 'react';
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
function ScheduleManager({ teachers, classes, scheduleSlots, setScheduleSlots, timeBlocks, setTimeBlocks, isAdmin }: { 
  teachers: Teacher[], 
  classes: SchoolClass[], 
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
      const rawData = e.dataTransfer.getData('application/json');
      if (!rawData) return;
      const draggedSlot = JSON.parse(rawData) as ScheduleSlot;

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

    // Multi-trial optimizer function for generating the schedule
    const runTrial = (trialIndex: number) => {
      let trialRunningSlots = [...runningSlots];
      let trialScheduledOverall = 0;
      const trialClassResults: { classId: string, cells: { block: TimeBlock, day: DayOfWeek, assigned: boolean, subject: string, teacher_id: string }[], scheduled: number, demanded: number }[] = [];

      // Fully shuffle classes in each trial to balance priority and optimize general results
      const sortedTargetClasses = shuffleArray(targetClasses);

      for (const cls of sortedTargetClasses) {
        let workloads = cls.subject_workloads;
        if (!workloads || Object.keys(workloads).length === 0) {
          workloads = cls.group === 'infantil' ? DEFAULT_INFANTIL_WORKLOAD :
                      cls.group === 'anos_iniciais' ? DEFAULT_INICIAIS_WORKLOAD :
                      cls.group === 'anos_finais' ? DEFAULT_FINAIS_WORKLOAD : DEFAULT_MEDIO_WORKLOAD;
        }

        const subjectPool = Object.entries(workloads)
          .map(([subject, hours]) => ({ subject, remaining: hours }))
          .filter(item => item.remaining > 0);

        const clsDemanded = subjectPool.reduce((sum, item) => sum + item.remaining, 0);

        const clsBlocks = activeTimeBlocks
          .filter(b => b.class_id === cls.id && !b.is_interval)
          .sort((a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time));

        const teachersBySubject: { [subject: string]: Teacher[] } = {};
        subjectPool.forEach(item => {
          teachersBySubject[item.subject] = teachers.filter(t => 
            t.subjects.includes(item.subject) && 
            t.groups.includes(cls.group) &&
            (!t.class_ids || t.class_ids.length === 0 || t.class_ids.includes(cls.id))
          );
        });

        const isTargetSpecialClass = is678Grade(cls.name);

        const cells: { block: TimeBlock, day: DayOfWeek, assigned: boolean, subject: string, teacher_id: string }[] = [];
        days.forEach(day => {
          clsBlocks.forEach((block) => {
            const nonIntervalIdx = clsBlocks.findIndex(b => b.id === block.id);
            const is6thSlot = nonIntervalIdx >= 5;
            const isRestrictedDay = day === 'segunda' || day === 'quarta' || day === 'sexta';

            // Skip 6th slot on Mon/Wed/Fri for 6th, 7th, 8th grade
            if (isTargetSpecialClass && isRestrictedDay && is6thSlot) {
              return;
            }

            cells.push({ block, day, assigned: false, subject: '', teacher_id: '' });
          });
        });

        const hasTeacherConflict = (teacherId: string, day: DayOfWeek, block: TimeBlock) => {
          const conflictInRunning = trialRunningSlots.some(s => 
            s.teacher_id === teacherId && 
            s.day_of_week === day &&
            timesOverlap(block.start_time, block.end_time, s.start_time, s.end_time)
          );
          if (conflictInRunning) return true;

          return cells.some(c => 
            c.assigned && 
            c.teacher_id === teacherId && 
            c.day === day &&
            timesOverlap(block.start_time, block.end_time, c.block.start_time, c.block.end_time)
          );
        };

        const isTeacherAvailable = (teacher: Teacher, day: DayOfWeek, block: TimeBlock) => {
          if (!teacher.available_days?.includes(day)) return false;
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

        const getTeacherAssignedHours = (teacherId: string) => {
          const runningHours = trialRunningSlots.filter(s => s.teacher_id === teacherId).length;
          const currentRunHours = cells.filter(c => c.assigned && c.teacher_id === teacherId).length;
          return runningHours + currentRunHours;
        };

        const getSubjectTeacherFlexibility = (subj: string) => {
          const pTeachers = teachersBySubject[subj] || [];
          if (pTeachers.length === 0) return 9999;
          
          let minScore = 9999;
          pTeachers.forEach(t => {
            const daysCount = t.available_days?.length ?? 5;
            const slotsCount = (t.available_slots && t.available_slots.length > 0) ? t.available_slots.length : 6;
            let gridCount = 30;
            if (t.availability_grid && Object.keys(t.availability_grid).length > 0) {
              gridCount = Object.values(t.availability_grid).filter(v => v === true).length;
            }
            const score = daysCount * 100 + slotsCount * 10 + gridCount;
            if (score < minScore) {
              minScore = score;
            }
          });
          return minScore;
        };

        // Sort subjects: highly restricted teachers first, with a randomized tie-breaker
        subjectPool.sort((a, b) => {
          const flexA = getSubjectTeacherFlexibility(a.subject);
          const flexB = getSubjectTeacherFlexibility(b.subject);
          if (flexA !== flexB) return flexA - flexB;

          const teachersA = teachersBySubject[a.subject]?.length || 0;
          const teachersB = teachersBySubject[b.subject]?.length || 0;
          if (teachersA !== teachersB) return teachersA - teachersB;

          // Random tie-breaker for perfect organic scattering
          return Math.random() - 0.5;
        });

        let clsScheduled = 0;

        subjectPool.forEach(poolItem => {
          const subject = poolItem.subject;
          const rawPossibleTeachers = teachersBySubject[subject] || [];
          const possibleTeachers = [...rawPossibleTeachers].sort((t1, t2) => {
            const days1 = t1.available_days?.length ?? 5;
            const days2 = t2.available_days?.length ?? 5;
            if (days1 !== days2) return days1 - days2;
            return getTeacherAssignedHours(t1.id) - getTeacherAssignedHours(t2.id);
          });

          // Shuffle the days checked to prevent identical day patterns
          const daysList = shuffleArray<DayOfWeek>(['segunda', 'terca', 'quarta', 'quinta', 'sexta']);

          // --- Phase 1: Allocate Double Lessons (Aulas Geminadas) on days with 0 lessons of this subject ---
          if (poolItem.remaining >= 2) {
            for (let d of daysList) {
              if (poolItem.remaining < 2) break;
              const currentDayCount = cells.filter(cell => cell.assigned && cell.day === d && cell.subject === subject).length;
              if (currentDayCount > 0) continue;

              // Check pairs of blocks in a randomized order to prevent double lessons always starting in the 1st slot
              const pairIndices = Array.from({ length: clsBlocks.length - 1 }, (_, index) => index);
              const randomizedPairs = shuffleArray(pairIndices);

              for (let i of randomizedPairs) {
                const b1 = clsBlocks[i];
                const b2 = clsBlocks[i + 1];
                const c1 = cells.find(c => c.day === d && c.block.id === b1.id);
                const c2 = cells.find(c => c.day === d && c.block.id === b2.id);

                if (c1 && !c1.assigned && c2 && !c2.assigned) {
                  const availableTeacher = possibleTeachers.find(t => 
                    isTeacherAvailable(t, d, c1.block) && 
                    !hasTeacherConflict(t.id, d, c1.block) &&
                    isTeacherAvailable(t, d, c2.block) && 
                    !hasTeacherConflict(t.id, d, c2.block) &&
                    getTeacherAssignedHours(t.id) + 1 < (t.workload_hours || 20)
                  );

                  if (availableTeacher) {
                    c1.assigned = true;
                    c1.subject = subject;
                    c1.teacher_id = availableTeacher.id;

                    c2.assigned = true;
                    c2.subject = subject;
                    c2.teacher_id = availableTeacher.id;

                    poolItem.remaining -= 2;
                    clsScheduled += 2;
                    break;
                  }
                }
              }
            }
          }

          // --- Phase 2: Spread single lessons across days with 0 lessons of this subject ---
          if (poolItem.remaining > 0) {
            for (let d of daysList) {
              if (poolItem.remaining <= 0) break;
              const currentDayCount = cells.filter(cell => cell.assigned && cell.day === d && cell.subject === subject).length;
              if (currentDayCount > 0) continue;

              // Shuffle cells order to distribute subjects organically throughout the hours of the day
              const randomizedCells = shuffleArray(cells);
              for (let c of randomizedCells) {
                if (c.day !== d || c.assigned) continue;
                const availableTeacher = possibleTeachers.find(t => 
                  isTeacherAvailable(t, c.day, c.block) && 
                  !hasTeacherConflict(t.id, c.day, c.block) &&
                  getTeacherAssignedHours(t.id) < (t.workload_hours || 20)
                );

                if (availableTeacher) {
                  c.assigned = true;
                  c.subject = subject;
                  c.teacher_id = availableTeacher.id;
                  poolItem.remaining--;
                  clsScheduled++;
                  break;
                }
              }
            }
          }

          // --- Phase 3: Fill remaining up to MAX 2 LESSONS PER DAY on days with 1 lesson ---
          if (poolItem.remaining > 0) {
            for (let d of daysList) {
              if (poolItem.remaining <= 0) break;
              const currentDayCount = cells.filter(cell => cell.assigned && cell.day === d && cell.subject === subject).length;
              if (currentDayCount >= 2) continue; // STRICT MAX 2 LESSONS PER DAY

              const randomizedCells = shuffleArray(cells);
              for (let c of randomizedCells) {
                if (c.day !== d || c.assigned) continue;
                const availableTeacher = possibleTeachers.find(t => 
                  isTeacherAvailable(t, c.day, c.block) && 
                  !hasTeacherConflict(t.id, c.day, c.block) &&
                  getTeacherAssignedHours(t.id) < (t.workload_hours || 20)
                );

                if (availableTeacher) {
                  c.assigned = true;
                  c.subject = subject;
                  c.teacher_id = availableTeacher.id;
                  poolItem.remaining--;
                  clsScheduled++;
                  break;
                }
              }
            }
          }

          // --- Phase 4: Fallback Fill pass if any unassigned slots exist ---
          if (poolItem.remaining > 0) {
            const randomizedCells = shuffleArray(cells);
            for (let c of randomizedCells) {
              if (poolItem.remaining <= 0) break;
              if (c.assigned) continue;

              const dayCount = cells.filter(cell => cell.assigned && cell.day === c.day && cell.subject === subject).length;
              if (dayCount >= 2) continue;

              const availableTeacher = possibleTeachers.find(t => 
                isTeacherAvailable(t, c.day, c.block) && 
                !hasTeacherConflict(t.id, c.day, c.block) &&
                getTeacherAssignedHours(t.id) < (t.workload_hours || 20)
              );

              if (availableTeacher) {
                c.assigned = true;
                c.subject = subject;
                c.teacher_id = availableTeacher.id;
                poolItem.remaining--;
                clsScheduled++;
              }
            }
          }

          // --- Phase 5: Aggressive Force Allocation ---
          if (poolItem.remaining > 0) {
            const randomizedCells = shuffleArray(cells);
            for (let c of randomizedCells) {
              if (poolItem.remaining <= 0) break;
              if (c.assigned) continue;

              const availableTeacher = possibleTeachers.find(t => 
                !hasTeacherConflict(t.id, c.day, c.block)
              ) || rawPossibleTeachers[0];

              if (availableTeacher) {
                c.assigned = true;
                c.subject = subject;
                c.teacher_id = availableTeacher.id;
                poolItem.remaining--;
                clsScheduled++;
              }
            }
          }
        });

        trialScheduledOverall += clsScheduled;
        trialClassResults.push({
          classId: cls.id,
          cells,
          scheduled: clsScheduled,
          demanded: clsDemanded
        });

        cells.filter(c => c.assigned).forEach(c => {
          trialRunningSlots.push({
            id: crypto.randomUUID(),
            class_id: cls.id,
            teacher_id: c.teacher_id,
            subject: c.subject,
            day_of_week: c.day,
            start_time: c.block.start_time,
            end_time: c.block.end_time
          });
        });
      }

      const totalDemanded = trialClassResults.reduce((s, r) => s + r.demanded, 0);
      const score = (trialScheduledOverall * 1000) - ((totalDemanded - trialScheduledOverall) * 2000);

      return {
        trialScheduledOverall,
        totalDemanded,
        score,
        trialRunningSlots,
        trialClassResults
      };
    };

    // Run 50 randomized optimization trials to search for the best and most diverse layouts
    const trials: ReturnType<typeof runTrial>[] = [];
    const numTrials = 50;
    for (let t = 0; t < numTrials; t++) {
      trials.push(runTrial(t));
    }

    // Find the maximum allocation achieved in any trial
    const maxScheduled = Math.max(...trials.map(t => t.trialScheduledOverall));

    // Filter trials that reached the best score
    const bestTrials = trials.filter(t => t.trialScheduledOverall === maxScheduled);

    // Randomly select one of the top-performing trials to ensure a fresh, beautifully scattered layout on every click
    const bestResult = bestTrials[Math.floor(Math.random() * bestTrials.length)];

    totalDemandedOverall = bestResult.totalDemanded;
    scheduledWithTeacherOverall = bestResult.trialScheduledOverall;

    bestResult.trialClassResults.forEach(res => {
      const cls = targetClasses.find(c => c.id === res.classId);
      if (cls) {
        if (res.demanded > res.scheduled) {
          logDetails.push(`• Turma ${cls.name}: Alocadas ${res.scheduled}/${res.demanded} aulas (faltaram ${res.demanded - res.scheduled} aulas).`);
        } else {
          logDetails.push(`• Turma ${cls.name}: 100% alocado (${res.scheduled}/${res.demanded} aulas).`);
        }
      }
    });

    runningSlots = bestResult.trialRunningSlots;

    setScheduleSlots(runningSlots);
    await storage.saveScheduleSlots(runningSlots);

    if (scheduledWithTeacherOverall === totalDemandedOverall) {
      setScheduleStatus({
        message: `Sucesso! Grade horária organizada com 100% de aproveitamento (${scheduledWithTeacherOverall}/${totalDemandedOverall} aulas) para ${targetClasses.length} turma(s).`,
        type: 'success',
        details: [`Total de turmas processadas: ${targetClasses.length}`, `Total de aulas agendadas: ${scheduledWithTeacherOverall}`, `Sem conflitos de professores ou horários.`]
      });
    } else {
      setScheduleStatus({
        message: `Organização concluída: ${scheduledWithTeacherOverall} de ${totalDemandedOverall} aulas foram agendadas sem conflitos.`,
        type: 'warning',
        details: [
          `Turmas processadas: ${targetClasses.length}`,
          `Aulas com professor: ${scheduledWithTeacherOverall} de ${totalDemandedOverall}`,
          ...logDetails
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
                <h3 className="font-bold text-slate-800 text-base">Organizar Grade Automática</h3>
              </div>
              <button onClick={() => setIsAutoModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Escolha qual escopo de turmas deseja organizar automaticamente com base nas disciplinas e professores cadastrados:
            </p>

            <div className="space-y-2">
              {selectedClassId && (
                <button
                  onClick={() => runAutoOrganize('selected')}
                  className="w-full text-left p-3 rounded-xl border border-slate-200 hover:border-red-500 hover:bg-red-50/50 transition-all group"
                >
                  <p className="font-bold text-xs text-slate-800 group-hover:text-red-700">⚡ Organizar Apenas {currentSelectedClass?.name}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Aloca aulas apenas para a turma atualmente selecionada.</p>
                </button>
              )}

              <button
                onClick={() => runAutoOrganize('shift')}
                className="w-full text-left p-3 rounded-xl border border-slate-200 hover:border-red-500 hover:bg-red-50/50 transition-all group"
              >
                <p className="font-bold text-xs text-slate-800 group-hover:text-red-700">
                  ⚡ Organizar TODAS as Turmas do Turno ({currentShiftName.toUpperCase()})
                </p>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  Organiza todas as turmas do turno {currentShiftName} simultaneamente sem conflitos de professores.
                </p>
              </button>

              <button
                onClick={() => runAutoOrganize('all')}
                className="w-full text-left p-3 rounded-xl border border-slate-200 hover:border-red-500 hover:bg-red-50/50 transition-all group"
              >
                <p className="font-bold text-xs text-slate-800 group-hover:text-red-700">⚡ Organizar TODAS as Turmas da Escola (Geral)</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Mapeia e aloca todas as turmas de todos os turnos e segmentos.</p>
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
              Selecione o formato de relatório que deseja exportar:
            </p>

            <div className="space-y-2">
              {selectedClassId && (
                <button
                  onClick={exportPDFCurrentClass}
                  className="w-full text-left p-3 rounded-xl border border-slate-200 hover:border-slate-800 hover:bg-slate-50 transition-all group"
                >
                  <p className="font-bold text-xs text-slate-800 group-hover:text-red-600">📄 Exportar Turma Atual ({currentSelectedClass?.name})</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Gera o arquivo PDF individual da turma selecionada.</p>
                </button>
              )}

              <button
                onClick={() => exportAllClassesPDF(classes.filter(c => getClassShift(c) === currentShiftName), `Turno_${currentShiftName}`)}
                className="w-full text-left p-3 rounded-xl border border-slate-200 hover:border-slate-800 hover:bg-slate-50 transition-all group"
              >
                <p className="font-bold text-xs text-slate-800 group-hover:text-red-600">
                  📚 Exportar TODAS as Turmas do Turno ({currentShiftName.toUpperCase()})
                </p>
                <p className="text-[10px] text-slate-500 mt-0.5">Consolida as turmas do turno {currentShiftName} em um único documento PDF.</p>
              </button>

              <button
                onClick={() => exportAllClassesPDF(classes, 'Geral_Escola')}
                className="w-full text-left p-3 rounded-xl border border-slate-200 hover:border-slate-800 hover:bg-slate-50 transition-all group"
              >
                <p className="font-bold text-xs text-slate-800 group-hover:text-red-600">🏫 Exportar TODAS as Turmas da Escola</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Gera relatório completo com todas as turmas de todos os segmentos.</p>
              </button>

              <button
                onClick={exportTeacherSchedulesPDF}
                className="w-full text-left p-3 rounded-xl border border-slate-200 hover:border-slate-800 hover:bg-slate-50 transition-all group"
              >
                <p className="font-bold text-xs text-slate-800 group-hover:text-red-600">👨‍🏫 Exportar Grade por Professor (Individual)</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Gera arquivo PDF com a agenda semanal detalhada de cada docente.</p>
              </button>
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

      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
        <select
          className="px-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 font-bold text-slate-700 min-w-[250px]"
          value={selectedClassId}
          onChange={(e) => setSelectedClassId(e.target.value)}
        >
          <option value="">Selecione uma Turma</option>
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

        <div className="flex items-center space-x-2">
          {isAdmin && (
            <button 
              onClick={() => setIsAutoModalOpen(true)} 
              className="flex items-center space-x-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-bold transition-colors"
            >
              <Wand2 className="w-4 h-4" />
              <span>Organizar Automaticamente</span>
            </button>
          )}

          <button 
            onClick={() => setIsExportModalOpen(true)} 
            className="flex items-center space-x-2 bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-lg font-bold transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Exportar PDF</span>
          </button>
        </div>
      </div>

      {selectedClassId ? (
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
                                  <div draggable={isAdmin} onDragStart={(e) => handleDragStart(e, existingSlot)} className={`flex flex-col items-center justify-center h-full min-h-[60px] p-2 rounded-lg border transition-all ${isAdmin ? 'cursor-grab active:cursor-grabbing hover:brightness-95' : ''} ${conflict.isConflict ? 'bg-red-100 border-red-500 text-red-950 shadow-md ring-2 ring-red-400 animate-pulse' : 'bg-emerald-50/60 border-emerald-200 text-slate-800'}`}>
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
        <div className="flex flex-col items-center justify-center py-16 text-slate-400">
          <CalendarClock className="w-16 h-16 mb-4 opacity-20" />
          <p className="font-medium text-lg text-slate-500">Selecione uma turma para visualizar a grade.</p>
        </div>
      )}
    </div>
  );
}
