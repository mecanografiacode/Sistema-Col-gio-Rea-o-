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
  if (c.shift) return c.shift;
  const upperName = c.name.toUpperCase().trim();
  if (upperName.endsWith('A') || upperName.includes(' A ') || upperName.endsWith('-A')) {
    return 'matutino';
  }
  if (upperName.endsWith('B') || upperName.includes(' B ') || upperName.endsWith('-B')) {
    return 'vespertino';
  }
  return 'ambos';
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
  
  // Cell edit state
  const [cellTeacherId, setCellTeacherId] = useState('');
  const [cellSubject, setCellSubject] = useState('');

  // Automatically populate default time blocks (or inherit from same shift) if none exist for this class
  useEffect(() => {
    if (!selectedClassId) return;
    const currentClass = classes.find(c => c.id === selectedClassId);
    if (!currentClass) return;
    const currentShift = getClassShift(currentClass);
    const isAfternoon = currentShift === 'vespertino';

    setTimeBlocks(prev => {
      const existing = prev.filter(tb => tb.class_id === selectedClassId);
      if (existing.length === 0) {
        // Look for another class in the same shift that already has time blocks configured
        const siblingClass = classes.find(c => c.id !== selectedClassId && getClassShift(c) === currentShift);
        const siblingBlocks = siblingClass 
          ? prev.filter(tb => tb.class_id === siblingClass.id).sort((a, b) => a.start_time.localeCompare(b.start_time)) 
          : [];

        if (siblingBlocks.length > 0) {
          return [
            ...prev,
            ...siblingBlocks.map(tb => ({
              id: crypto.randomUUID(),
              class_id: selectedClassId,
              start_time: tb.start_time,
              end_time: tb.end_time,
              is_interval: tb.is_interval
            }))
          ];
        }

        if (isAfternoon) {
          return [
            ...prev,
            { id: crypto.randomUUID(), class_id: selectedClassId, start_time: '13:10', end_time: '14:00' },
            { id: crypto.randomUUID(), class_id: selectedClassId, start_time: '14:00', end_time: '14:50' },
            { id: crypto.randomUUID(), class_id: selectedClassId, start_time: '14:50', end_time: '15:10', is_interval: true },
            { id: crypto.randomUUID(), class_id: selectedClassId, start_time: '15:10', end_time: '16:00' },
            { id: crypto.randomUUID(), class_id: selectedClassId, start_time: '16:00', end_time: '16:50' },
            { id: crypto.randomUUID(), class_id: selectedClassId, start_time: '16:50', end_time: '17:10', is_interval: true },
            { id: crypto.randomUUID(), class_id: selectedClassId, start_time: '17:10', end_time: '18:00' },
            { id: crypto.randomUUID(), class_id: selectedClassId, start_time: '18:00', end_time: '18:50' }
          ];
        } else {
          return [
            ...prev,
            { id: crypto.randomUUID(), class_id: selectedClassId, start_time: '07:20', end_time: '08:10' },
            { id: crypto.randomUUID(), class_id: selectedClassId, start_time: '08:10', end_time: '09:00' },
            { id: crypto.randomUUID(), class_id: selectedClassId, start_time: '09:00', end_time: '09:20', is_interval: true },
            { id: crypto.randomUUID(), class_id: selectedClassId, start_time: '09:20', end_time: '10:10' },
            { id: crypto.randomUUID(), class_id: selectedClassId, start_time: '10:10', end_time: '11:00' },
            { id: crypto.randomUUID(), class_id: selectedClassId, start_time: '11:00', end_time: '11:20', is_interval: true },
            { id: crypto.randomUUID(), class_id: selectedClassId, start_time: '11:20', end_time: '12:10' },
            { id: crypto.randomUUID(), class_id: selectedClassId, start_time: '12:10', end_time: '13:00' }
          ];
        }
      }
      return prev;
    });
  }, [selectedClassId, classes, setTimeBlocks]);

  const classTimeBlocks = timeBlocks.filter(tb => tb.class_id === selectedClassId)
    .sort((a, b) => a.start_time.localeCompare(b.start_time));

  const autoOrganizeSchedule = () => {
    if (!selectedClassId) return;
    const currentClass = classes.find(c => c.id === selectedClassId);
    if (!currentClass) return;

    // Clear any previous status
    setScheduleStatus(null);

    // 1. Get the subject workloads for the class
    let workloads = currentClass.subject_workloads;
    if (!workloads || Object.keys(workloads).length === 0) {
      workloads = currentClass.group === 'infantil' ? DEFAULT_INFANTIL_WORKLOAD :
                  currentClass.group === 'anos_iniciais' ? DEFAULT_INICIAIS_WORKLOAD :
                  currentClass.group === 'anos_finais' ? DEFAULT_FINAIS_WORKLOAD : DEFAULT_MEDIO_WORKLOAD;
    }

    // 2. Build the pool of remaining lessons
    const subjectPool: { subject: string, remaining: number }[] = Object.entries(workloads)
      .map(([subject, hours]) => ({ subject, remaining: hours }))
      .filter(item => item.remaining > 0);

    const totalDemanded = subjectPool.reduce((sum, item) => sum + item.remaining, 0);

    // Get time blocks for this class, excluding intervals
    const blocks = classTimeBlocks.filter(b => !b.is_interval);
    const days: DayOfWeek[] = ['segunda', 'terca', 'quarta', 'quinta', 'sexta'];

    // 3. Prepare teachers that can teach each subject and are aligned to this segment (educational group) and class
    const teachersBySubject: { [subject: string]: Teacher[] } = {};
    subjectPool.forEach(item => {
      teachersBySubject[item.subject] = teachers.filter(t => 
        t.subjects.includes(item.subject) && 
        t.groups.includes(currentClass.group) &&
        (!t.class_ids || t.class_ids.length === 0 || t.class_ids.includes(currentClass.id))
      );
    });

    // 4. Prepare list of temporary slots (preserve other classes, rewrite this class's slots)
    const otherClassesSlots = scheduleSlots.filter(s => s.class_id !== selectedClassId);

    // List all cells: (day, block) sorted by day then block
    const cells: { block: TimeBlock, day: DayOfWeek, assigned: boolean, subject: string, teacher_id: string }[] = [];
    days.forEach(day => {
      blocks.forEach(block => {
        cells.push({ block, day, assigned: false, subject: '', teacher_id: '' });
      });
    });

    // Helper to check if a teacher has a conflict at a specific day/block
    const hasTeacherConflict = (teacherId: string, day: DayOfWeek, block: TimeBlock) => {
      // Check conflict in other classes' schedules
      const hasConflictInOthers = otherClassesSlots.some(s => 
        s.teacher_id === teacherId && 
        s.day_of_week === day &&
        timesOverlap(block.start_time, block.end_time, s.start_time, s.end_time)
      );
      if (hasConflictInOthers) return true;

      // Check conflict in already assigned cells of current class in this auto-scheduler run
      const hasConflictInCurrent = cells.some(c => 
        c.assigned && 
        c.teacher_id === teacherId && 
        c.day === day &&
        timesOverlap(block.start_time, block.end_time, c.block.start_time, c.block.end_time)
      );
      return hasConflictInCurrent;
    };

    // Helper to check if a teacher is available on a specific day & shift & slot
    const isTeacherAvailable = (teacher: Teacher, day: DayOfWeek, block: TimeBlock) => {
      if (!teacher.available_days?.includes(day)) return false;
      const startHour = parseInt(normalizeTime(block.start_time).split(':')[0]);
      const isMorning = startHour < 13;
      if (teacher.availability_shift === 'matutino' && !isMorning) return false;
      if (teacher.availability_shift === 'vespertino' && isMorning) return false;

      const slotIndex = blocks.findIndex(b => b.id === block.id) + 1;

      // Check slot position availability (1º, 2º, 3º, etc.)
      if (teacher.available_slots && teacher.available_slots.length > 0 && teacher.available_slots.length < 6) {
        if (slotIndex > 0 && !teacher.available_slots.includes(slotIndex)) {
          return false;
        }
      }

      // Check detailed matrix grid availability (e.g. "segunda-1", "terca-3", etc.)
      if (teacher.availability_grid && Object.keys(teacher.availability_grid).length > 0) {
        const key = `${day}-${slotIndex}`;
        if (teacher.availability_grid[key] === false) {
          return false;
        }
      }

      return true;
    };

    // Helper to calculate teacher's total assigned hours (in other classes + currently scheduled in this run)
    const getTeacherAssignedHours = (teacherId: string) => {
      const otherClassesHours = otherClassesSlots.filter(s => s.teacher_id === teacherId).length;
      const currentRunHours = cells.filter(c => c.assigned && c.teacher_id === teacherId).length;
      return otherClassesHours + currentRunHours;
    };

    // Sort subjects by difficulty (fewer possible teachers first, then more remaining lessons)
    const sortPoolByDifficulty = () => {
      subjectPool.sort((a, b) => {
        const teachersA = teachersBySubject[a.subject]?.length || 0;
        const teachersB = teachersBySubject[b.subject]?.length || 0;
        if (teachersA !== teachersB) {
          return teachersA - teachersB; // Fewer available teachers first
        }
        return b.remaining - a.remaining; // More remaining lessons first
      });
    };

    const unassignedSubjectsList: string[] = [];
    let scheduledWithTeacher = 0;
    let scheduledWithoutTeacher = 0;

    sortPoolByDifficulty();

    // Place each lesson from our sorted subject pool
    subjectPool.forEach(poolItem => {
      const subject = poolItem.subject;
      const possibleTeachers = teachersBySubject[subject] || [];

      while (poolItem.remaining > 0) {
        let placed = false;

        // Pass 1: Try to place with daily frequency limit (< 2 lessons/day), workload-compliant, and conflict-free teacher
        for (let c of cells) {
          if (c.assigned) continue;

          const dailyCount = cells.filter(cell => cell.assigned && cell.day === c.day && cell.subject === subject).length;
          if (dailyCount >= 2) continue;

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
            scheduledWithTeacher++;
            placed = true;
            break;
          }
        }

        if (placed) continue;

        // Pass 2: Relax daily count constraint (allow >= 2 lessons/day if needed), but still require an available, workload-compliant, conflict-free teacher
        for (let c of cells) {
          if (c.assigned) continue;

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
            scheduledWithTeacher++;
            placed = true;
            break;
          }
        }

        if (placed) continue;

        if (!placed) {
          // Break to avoid infinite loop since no teacher could take this lesson, and we don't assign it without a teacher
          console.warn(`Could not find an available teacher for lesson of subject ${subject}`);
          break;
        }
      }
    });

    // Convert our assigned cells back to ScheduleSlot format
    const newSlots: ScheduleSlot[] = cells
      .filter(c => c.assigned)
      .map(c => ({
        id: crypto.randomUUID(),
        class_id: selectedClassId,
        teacher_id: c.teacher_id,
        subject: c.subject,
        day_of_week: c.day,
        start_time: c.block.start_time,
        end_time: c.block.end_time
      }));

    setScheduleSlots([...otherClassesSlots, ...newSlots]);

    const details: string[] = [];
    details.push(`Total de aulas demandadas pelo currículo: ${totalDemanded}`);
    details.push(`Aulas com professor designado: ${scheduledWithTeacher}`);
    
    if (totalDemanded > scheduledWithTeacher) {
      details.push(`Aulas não agendadas por falta de professor disponível: ${totalDemanded - scheduledWithTeacher}`);
      
      // List missing subjects
      subjectPool.forEach(poolItem => {
        if (poolItem.remaining > 0) {
          details.push(`• Faltou alocar ${poolItem.remaining} aula(s) de ${poolItem.subject}.`);
        }
      });
      
      setScheduleStatus({
        message: `Grade organizada parcialmente. Agendadas ${scheduledWithTeacher} de ${totalDemanded} aulas possíveis.`,
        type: 'warning',
        details: [
          ...details,
          '',
          'Aviso: Para que a grade horária seja gerada automaticamente, é obrigatório que o professor esteja cadastrado com:',
          '1. A disciplina selecionada',
          '2. O segmento (Ex: Ensino Médio)',
          '3. Os dias disponíveis e o turno correto.'
        ]
      });
    } else {
      setScheduleStatus({
        message: 'Sucesso! Grade horária gerada e 100% alinhada com professores cadastrados.',
        type: 'success',
        details
      });
    }
  };

  const handleAddTimeBlock = () => {
    const currentClass = classes.find(c => c.id === selectedClassId);
    if (!currentClass) return;
    const currentShift = getClassShift(currentClass);
    const isAfternoon = currentShift === 'vespertino';

    const defaultStart = isAfternoon ? '13:10' : '07:30';
    const defaultEnd = isAfternoon ? '14:00' : '08:20';

    const sameShiftClasses = classes.filter(c => getClassShift(c) === currentShift);

    setTimeBlocks(prev => [
      ...prev,
      ...sameShiftClasses.map(c => ({
        id: crypto.randomUUID(),
        class_id: c.id,
        start_time: defaultStart,
        end_time: defaultEnd
      }))
    ]);
  };

  const handleAddIntervalBlock = () => {
    const currentClass = classes.find(c => c.id === selectedClassId);
    if (!currentClass) return;
    const currentShift = getClassShift(currentClass);
    const isAfternoon = currentShift === 'vespertino';

    const defaultStart = isAfternoon ? '14:50' : '09:00';
    const defaultEnd = isAfternoon ? '15:10' : '09:20';

    const sameShiftClasses = classes.filter(c => getClassShift(c) === currentShift);

    setTimeBlocks(prev => [
      ...prev,
      ...sameShiftClasses.map(c => ({
        id: crypto.randomUUID(),
        class_id: c.id,
        start_time: defaultStart,
        end_time: defaultEnd,
        is_interval: true
      }))
    ]);
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
            { id: crypto.randomUUID(), class_id: c.id, start_time: '13:10', end_time: '14:00' },
            { id: crypto.randomUUID(), class_id: c.id, start_time: '14:00', end_time: '14:50' },
            { id: crypto.randomUUID(), class_id: c.id, start_time: '14:50', end_time: '15:10', is_interval: true },
            { id: crypto.randomUUID(), class_id: c.id, start_time: '15:10', end_time: '16:00' },
            { id: crypto.randomUUID(), class_id: c.id, start_time: '16:00', end_time: '16:50' },
            { id: crypto.randomUUID(), class_id: c.id, start_time: '16:50', end_time: '17:10', is_interval: true },
            { id: crypto.randomUUID(), class_id: c.id, start_time: '17:10', end_time: '18:00' },
            { id: crypto.randomUUID(), class_id: c.id, start_time: '18:00', end_time: '18:50' }
          );
        } else {
          newBlocks.push(
            { id: crypto.randomUUID(), class_id: c.id, start_time: '07:20', end_time: '08:10' },
            { id: crypto.randomUUID(), class_id: c.id, start_time: '08:10', end_time: '09:00' },
            { id: crypto.randomUUID(), class_id: c.id, start_time: '09:00', end_time: '09:20', is_interval: true },
            { id: crypto.randomUUID(), class_id: c.id, start_time: '09:20', end_time: '10:10' },
            { id: crypto.randomUUID(), class_id: c.id, start_time: '10:10', end_time: '11:00' },
            { id: crypto.randomUUID(), class_id: c.id, start_time: '11:00', end_time: '11:20', is_interval: true },
            { id: crypto.randomUUID(), class_id: c.id, start_time: '11:20', end_time: '12:10' },
            { id: crypto.randomUUID(), class_id: c.id, start_time: '12:10', end_time: '13:00' }
          );
        }
      });

      return [...filtered, ...newBlocks];
    });
  };

  const updateTimeBlock = (id: string, field: 'start_time' | 'end_time', value: string) => {
    const targetBlock = timeBlocks.find(tb => tb.id === id);
    if (!targetBlock) return;

    const currentClass = classes.find(c => c.id === selectedClassId);
    if (!currentClass) return;

    const currentShift = getClassShift(currentClass);
    const sortedCurrent = classTimeBlocks;
    const blockIndex = sortedCurrent.findIndex(tb => tb.id === id);
    const oldValue = targetBlock[field];

    if (blockIndex === -1) return;

    const sameShiftClasses = classes.filter(c => getClassShift(c) === currentShift);
    const sameShiftClassIds = new Set(sameShiftClasses.map(c => c.id));

    setTimeBlocks(prev => {
      return prev.map(tb => {
        if (sameShiftClassIds.has(tb.class_id)) {
          const sortedClassBlocks = prev
            .filter(b => b.class_id === tb.class_id)
            .sort((a, b) => a.start_time.localeCompare(b.start_time));

          if (sortedClassBlocks[blockIndex]?.id === tb.id) {
            return { ...tb, [field]: value };
          }
        }
        return tb;
      });
    });

    setScheduleSlots(slots => slots.map(s => {
      if (sameShiftClassIds.has(s.class_id) && s[field] === oldValue) {
        return { ...s, [field]: value };
      }
      return s;
    }));
  };

  const removeTimeBlock = (id: string) => {
    const block = timeBlocks.find(tb => tb.id === id);
    if (!block) return;

    const currentClass = classes.find(c => c.id === selectedClassId);
    if (!currentClass) return;

    const currentShift = getClassShift(currentClass);
    const blockIndex = classTimeBlocks.findIndex(tb => tb.id === id);

    const sameShiftClasses = classes.filter(c => getClassShift(c) === currentShift);
    const sameShiftClassIds = new Set(sameShiftClasses.map(c => c.id));

    const idsToRemove = new Set<string>();
    timeBlocks.forEach(tb => {
      if (sameShiftClassIds.has(tb.class_id)) {
        const sorted = timeBlocks
          .filter(b => b.class_id === tb.class_id)
          .sort((a, b) => a.start_time.localeCompare(b.start_time));
        if (sorted[blockIndex]?.id === tb.id) {
          idsToRemove.add(tb.id);
        }
      }
    });

    setScheduleSlots(slots => slots.filter(s => {
      if (sameShiftClassIds.has(s.class_id)) {
        return !(s.start_time === block.start_time && s.end_time === block.end_time);
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
          .sort((a, b) => a.start_time.localeCompare(b.start_time));
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

      // Check conflict (the same teacher cannot be scheduled twice at the same/overlapping time slot in any class, or the same class)
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

  const exportPDF = () => {
    if (!selectedClassId) return;
    const selectedClass = classes.find(c => c.id === selectedClassId);
    if (!selectedClass) return;

    const doc = new jsPDF({ orientation: 'landscape', format: 'a4' });
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text(`Grade Horária - ${selectedClass.name} (${groupLabels[selectedClass.group]})`, 14, 15);

    const daysOfWeek: DayOfWeek[] = ['segunda', 'terca', 'quarta', 'quinta', 'sexta'];
    const headers = ['Horários', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta'];

    const body = classTimeBlocks.map(block => {
      const row = [`${block.start_time} - ${block.end_time}`];
      if (block.is_interval) {
        daysOfWeek.forEach(() => {
          row.push('☕ INTERVALO');
        });
      } else {
        daysOfWeek.forEach(day => {
          const slot = scheduleSlots.find(s => s.class_id === selectedClassId && s.day_of_week === day && s.start_time === block.start_time && s.end_time === block.end_time);
          row.push(slot ? `${slot.subject}\n(${teachers.find(t => t.id === slot.teacher_id)?.name || 'S/ Prof'})` : '---------');
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

  return (
    <div className="space-y-6">
      {scheduleStatus && (
        <div className={`p-4 rounded-xl border flex flex-col space-y-2 animate-in fade-in duration-200 ${
          scheduleStatus.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
          scheduleStatus.type === 'warning' ? 'bg-amber-50 border-amber-200 text-amber-800' :
          'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          <div className="flex items-center space-x-2">
            <AlertCircle className={`w-5 h-5 ${
              scheduleStatus.type === 'success' ? 'text-emerald-600' :
              scheduleStatus.type === 'warning' ? 'text-amber-600' :
              'text-rose-600'
            }`} />
            <span className="font-bold text-sm">{scheduleStatus.message}</span>
            <button onClick={() => setScheduleStatus(null)} className="ml-auto text-xs font-semibold hover:underline">Fechar</button>
          </div>
          {scheduleStatus.details && scheduleStatus.details.length > 0 && (
            <ul className="list-disc list-inside text-xs space-y-1 pl-1 opacity-90">
              {scheduleStatus.details.map((d, idx) => <li key={idx}>{d}</li>)}
            </ul>
          )}
        </div>
      )}

      <div className="flex justify-between items-center">
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
              onClick={autoOrganizeSchedule} 
              disabled={!selectedClassId}
              className="flex items-center space-x-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Wand2 className="w-4 h-4" />
              <span>Organizar Automaticamente</span>
            </button>
          )}

          <button 
            onClick={exportPDF} 
            disabled={!selectedClassId}
            className="flex items-center space-x-2 bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-lg font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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

                          return (
                            <td key={day} className={`border-r border-slate-200 last:border-r-0 p-2 align-top relative ${isAdmin ? 'hover:bg-slate-50 cursor-pointer' : ''}`} onClick={() => !isEditing && openCellEdit(block, day, existingSlot)}>
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
                              ) : existingSlot ? (
                                <div className="flex flex-col items-center justify-center h-full min-h-[60px] p-2 bg-red-50/50 rounded-lg border border-red-100">
                                  <span className="font-bold text-xs text-slate-800 text-center">{existingSlot.subject}</span>
                                  <span className="text-[10px] text-slate-500 text-center">{teachers.find(t => t.id === existingSlot.teacher_id)?.name}</span>
                                </div>
                              ) : (
                                <div className="flex items-center justify-center h-full min-h-[60px]">
                                  <span className="text-xs text-slate-300 italic">Livre</span>
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
                onClick={handleAddTimeBlock}
                className="flex items-center space-x-2 text-red-600 hover:text-red-700 font-bold text-xs bg-red-50 hover:bg-red-100 px-3.5 py-2 rounded-xl transition-colors border border-red-100"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Adicionar Horário Aula</span>
              </button>
              <button 
                onClick={handleAddIntervalBlock}
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
