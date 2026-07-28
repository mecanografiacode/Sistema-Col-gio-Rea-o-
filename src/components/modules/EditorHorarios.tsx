import React, { useState, useEffect } from 'react';
import { UserProfile, Teacher, SchoolClass, ScheduleSlot, EducationalGroup, DayOfWeek, TimeBlock } from '../../types';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Plus, Trash2, Edit2, AlertCircle, Save, Download, CalendarClock, Wand2 } from 'lucide-react';
import { storage } from '../../lib/storage';

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
  const [scheduleSlots, setScheduleSlots] = useState<ScheduleSlot[]>([]);
  const [timeBlocks, setTimeBlocks] = useState<TimeBlock[]>([]);
  const [activeTab, setActiveTab] = useState<'grade' | 'professores' | 'turmas'>('grade');
  const [isLoading, setIsLoading] = useState(true);

  // Load from storage (with Supabase fallback)
  useEffect(() => {
    const loadData = async () => {
      try {
        const dbTeachers = await storage.getTeachers();
        setTeachers(dbTeachers || []);

        const dbClasses = await storage.getClasses();
        setClasses(dbClasses || []);

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
      storage.saveScheduleSlots(scheduleSlots);
    }
  }, [scheduleSlots, isLoading]);

  useEffect(() => {
    if (!isLoading) {
      storage.saveTimeBlocks(timeBlocks);
    }
  }, [timeBlocks, isLoading]);


  const isAdmin = currentUser.role === 'admin' || currentUser.role === 'super_admin';

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 font-serif-editorial">Editor de Horários</h2>
          <p className="text-sm text-slate-500 mt-1">
            Visualização e gestão da grade horária
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 border-b border-slate-200">
        {(isAdmin ? ['grade', 'professores', 'turmas'] : ['grade']).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-semibold capitalize border-b-2 transition-colors ${
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
          <TeacherManager teachers={teachers} setTeachers={setTeachers} />
        )}
        {activeTab === 'turmas' && (
          <ClassManager classes={classes} setClasses={setClasses} />
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
function TeacherManager({ teachers, setTeachers }: { teachers: Teacher[], setTeachers: React.Dispatch<React.SetStateAction<Teacher[]>> }) {
  const [newTeacherName, setNewTeacherName] = useState('');
  const [newTeacherSubjects, setNewTeacherSubjects] = useState('');
  const [newTeacherDays, setNewTeacherDays] = useState<DayOfWeek[]>(['segunda', 'terca', 'quarta', 'quinta', 'sexta']);
  const [newTeacherShift, setNewTeacherShift] = useState<'matutino' | 'vespertino' | 'ambos'>('ambos');
  const [newTeacherGroups, setNewTeacherGroups] = useState<EducationalGroup[]>([]);

  const allDays: DayOfWeek[] = ['segunda', 'terca', 'quarta', 'quinta', 'sexta'];
  const allGroups: { id: EducationalGroup, label: string }[] = [
    { id: 'infantil', label: 'Infantil' },
    { id: 'anos_iniciais', label: 'Anos Iniciais' },
    { id: 'anos_finais', label: 'Anos Finais' },
    { id: 'ensino_medio', label: 'Ensino Médio' }
  ];

  const toggleDay = (day: DayOfWeek) => {
    if (newTeacherDays.includes(day)) {
      setNewTeacherDays(newTeacherDays.filter(d => d !== day));
    } else {
      setNewTeacherDays([...newTeacherDays, day]);
    }
  };

  const toggleGroup = (group: EducationalGroup) => {
    if (newTeacherGroups.includes(group)) {
      setNewTeacherGroups(newTeacherGroups.filter(g => g !== group));
    } else {
      setNewTeacherGroups([...newTeacherGroups, group]);
    }
  };

  const addTeacher = () => {
    if (!newTeacherName.trim() || !newTeacherSubjects.trim() || newTeacherDays.length === 0 || newTeacherGroups.length === 0) return;
    const subjects = newTeacherSubjects.split(',').map(s => s.trim()).filter(s => s);
    if (subjects.length === 0) return;

    setTeachers([
      ...teachers,
      {
        id: crypto.randomUUID(),
        name: newTeacherName,
        subjects,
        groups: newTeacherGroups,
        available_days: newTeacherDays,
        availability_shift: newTeacherShift,
        created_at: new Date().toISOString()
      }
    ]);
    setNewTeacherName('');
    setNewTeacherSubjects('');
    setNewTeacherDays(['segunda', 'terca', 'quarta', 'quinta', 'sexta']);
    setNewTeacherShift('ambos');
    setNewTeacherGroups([]);
  };

  const removeTeacher = (id: string) => {
    setTeachers(teachers.filter(t => t.id !== id));
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row gap-4 items-end">
          <div className="flex-1 w-full">
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nome do Professor</label>
            <input
              type="text"
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none"
              placeholder="Ex: João Silva"
              value={newTeacherName}
              onChange={(e) => setNewTeacherName(e.target.value)}
            />
          </div>
          <div className="flex-1 w-full">
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Disciplinas (separadas por vírgula)</label>
            <input
              type="text"
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none"
              placeholder="Ex: Matemática, Física"
              value={newTeacherSubjects}
              onChange={(e) => setNewTeacherSubjects(e.target.value)}
            />
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 items-end">
          <div className="w-full sm:w-1/3 border-r border-slate-200 pr-4 mr-4">
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Turno</label>
            <select
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none"
              value={newTeacherShift}
              onChange={(e) => setNewTeacherShift(e.target.value as 'matutino' | 'vespertino' | 'ambos')}
            >
              <option value="matutino">Matutino</option>
              <option value="vespertino">Vespertino</option>
              <option value="ambos">Ambos</option>
            </select>
          </div>

          <div className="flex-1 w-full">
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Dias Disponíveis</label>
            <div className="flex flex-wrap gap-2">
              {allDays.map(day => (
                <button
                  key={day}
                  onClick={() => toggleDay(day)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg border capitalize transition-colors ${
                    newTeacherDays.includes(day)
                      ? 'bg-red-50 border-red-200 text-red-700'
                      : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                  }`}
                >
                  {day}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 items-end">
          <div className="flex-1 w-full">
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Segmentos de Atuação</label>
            <div className="flex flex-wrap gap-2">
              {allGroups.map(group => (
                <button
                  key={group.id}
                  onClick={() => toggleGroup(group.id)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-colors ${
                    newTeacherGroups.includes(group.id)
                      ? 'bg-blue-50 border-blue-200 text-blue-700'
                      : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                  }`}
                >
                  {group.label}
                </button>
              ))}
            </div>
          </div>
          
          <button
            onClick={addTeacher}
            disabled={!newTeacherName.trim() || !newTeacherSubjects.trim() || newTeacherDays.length === 0 || newTeacherGroups.length === 0}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center h-[42px] shrink-0"
          >
            <Plus className="w-4 h-4 mr-2" />
            Adicionar
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
            <tr>
              <th className="px-4 py-3">Nome</th>
              <th className="px-4 py-3">Segmentos</th>
              <th className="px-4 py-3">Disciplinas</th>
              <th className="px-4 py-3">Disponibilidade</th>
              <th className="px-4 py-3 w-24">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {teachers.map(teacher => (
              <tr key={teacher.id} className="hover:bg-slate-50/50">
                <td className="px-4 py-3 font-semibold text-slate-800">{teacher.name}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {teacher.groups?.map((g, i) => {
                      const groupLabel = allGroups.find(ag => ag.id === g)?.label || g;
                      return (
                        <span key={i} className="bg-blue-50 text-blue-700 text-[10px] px-2 py-0.5 rounded-full font-bold">
                          {groupLabel}
                        </span>
                      );
                    })}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {teacher.subjects.map((sub, i) => (
                      <span key={i} className="bg-slate-100 text-slate-700 text-[10px] px-2 py-0.5 rounded-full font-bold">
                        {sub}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-col space-y-1">
                    <span className="text-xs text-slate-600 capitalize"><span className="font-bold">Turno:</span> {teacher.availability_shift}</span>
                    <div className="flex gap-1 mt-1">
                      {teacher.available_days?.map(d => (
                        <span key={d} className="bg-slate-100 text-slate-500 text-[9px] px-1.5 py-0.5 rounded font-bold capitalize">
                          {d.slice(0, 3)}
                        </span>
                      ))}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 align-top">
                  <button onClick={() => removeTeacher(teacher.id)} className="text-red-500 hover:text-red-700 p-1">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
            {teachers.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-500">Nenhum professor cadastrado.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// --- Class Manager ---
function ClassManager({ classes, setClasses }: { classes: SchoolClass[], setClasses: React.Dispatch<React.SetStateAction<SchoolClass[]>> }) {
  const [newClassName, setNewClassName] = useState('');
  const [newClassGroup, setNewClassGroup] = useState<EducationalGroup>('anos_iniciais');
  const [editingClassId, setEditingClassId] = useState<string | null>(null);
  const [editingWorkloads, setEditingWorkloads] = useState<{ [subject: string]: number }>({});
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newSubjectHours, setNewSubjectHours] = useState<number>(2);

  const addClass = () => {
    if (!newClassName.trim()) return;
    const defaultWorkload = newClassGroup === 'infantil' ? DEFAULT_INFANTIL_WORKLOAD :
                            newClassGroup === 'anos_iniciais' ? DEFAULT_INICIAIS_WORKLOAD :
                            newClassGroup === 'anos_finais' ? DEFAULT_FINAIS_WORKLOAD : DEFAULT_MEDIO_WORKLOAD;
    setClasses([
      ...classes,
      {
        id: crypto.randomUUID(),
        name: newClassName,
        group: newClassGroup,
        subject_workloads: { ...defaultWorkload },
        created_at: new Date().toISOString()
      }
    ]);
    setNewClassName('');
  };

  const removeClass = (id: string) => {
    setClasses(classes.filter(c => c.id !== id));
    if (editingClassId === id) {
      setEditingClassId(null);
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
    setClasses(prev => prev.map(c => {
      if (c.id === editingClassId) {
        return {
          ...c,
          subject_workloads: editingWorkloads
        };
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
                <th className="px-4 py-3">Carga Horária (Disciplinas)</th>
                <th className="px-4 py-3 w-32">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {classes.map(c => (
                <tr key={c.id} className={`hover:bg-slate-50/50 ${editingClassId === c.id ? 'bg-red-50/40 hover:bg-red-50/50' : ''}`}>
                  <td className="px-4 py-3 font-semibold text-slate-800">{c.name}</td>
                  <td className="px-4 py-3">
                    <span className="bg-slate-100 text-slate-600 text-xs px-2 py-1 rounded-md font-medium">
                      {groupLabels[c.group]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    <div className="flex flex-wrap gap-1 max-w-md">
                      {Object.entries(c.subject_workloads || {}).map(([sub, hours]) => (
                        <span key={sub} className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[10px] font-semibold">
                          {sub}: {hours}h
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
              ))}
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
                <h3 className="font-bold text-slate-800 text-sm font-serif-editorial">Carga Horária: {selectedClassForEdit.name}</h3>
                <button onClick={() => setEditingClassId(null)} className="text-xs text-slate-400 hover:text-slate-600 font-bold">Fechar</button>
              </div>
              <p className="text-[11px] text-slate-500">Defina o número de aulas semanais para cada disciplina da turma.</p>
            </div>

            <div className="space-y-2.5 max-h-[280px] overflow-y-auto pr-1">
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
                      <span className="w-8 text-center font-bold text-slate-800">{h}h</span>
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

            {/* Add subject form */}
            <div className="pt-2 border-t border-slate-100 space-y-2">
              <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide">Nova Disciplina</span>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Ex: Português"
                  className="flex-1 min-w-0 px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs focus:ring-1 focus:ring-red-500 focus:outline-none"
                  value={newSubjectName}
                  onChange={(e) => setNewSubjectName(e.target.value)}
                />
                <input
                  type="number"
                  min="1"
                  className="w-12 px-2 py-1.5 bg-white border border-slate-300 rounded text-xs focus:ring-1 focus:ring-red-500 focus:outline-none text-center"
                  value={newSubjectHours}
                  onChange={(e) => setNewSubjectHours(Number(e.target.value))}
                />
                <button
                  onClick={addSubject}
                  disabled={!newSubjectName.trim()}
                  className="bg-slate-800 hover:bg-slate-950 text-white px-2.5 py-1.5 rounded text-xs font-bold transition-colors disabled:opacity-50"
                >
                  Ok
                </button>
              </div>
            </div>

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

  // Automatically populate 6 default time blocks with intervals if none exist for this class
  useEffect(() => {
    if (!selectedClassId) return;
    setTimeBlocks(prev => {
      const existing = prev.filter(tb => tb.class_id === selectedClassId);
      if (existing.length === 0) {
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
      return prev;
    });
  }, [selectedClassId, setTimeBlocks]);

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

    // 3. Prepare teachers that can teach each subject and are aligned to this segment (educational group)
    const teachersBySubject: { [subject: string]: Teacher[] } = {};
    subjectPool.forEach(item => {
      teachersBySubject[item.subject] = teachers.filter(t => 
        t.subjects.includes(item.subject) && 
        t.groups.includes(currentClass.group)
      );
    });

    // 4. Prepare list of temporary slots (preserve other classes, rewrite this class's slots)
    const otherClassesSlots = scheduleSlots.filter(s => s.class_id !== selectedClassId);
    const newSlots: ScheduleSlot[] = [];

    // Helper to check if a teacher has a conflict at a specific day/block
    const hasTeacherConflict = (teacherId: string, day: DayOfWeek, block: TimeBlock) => {
      const hasConflictInOthers = otherClassesSlots.some(s => 
        s.teacher_id === teacherId && 
        s.day_of_week === day &&
        ((block.start_time >= s.start_time && block.start_time < s.end_time) || 
         (block.end_time > s.start_time && block.end_time <= s.end_time) ||
         (block.start_time <= s.start_time && block.end_time >= s.end_time))
      );
      if (hasConflictInOthers) return true;

      const hasConflictInNew = newSlots.some(s => 
        s.teacher_id === teacherId && 
        s.day_of_week === day &&
        ((block.start_time >= s.start_time && block.start_time < s.end_time) || 
         (block.end_time > s.start_time && block.end_time <= s.end_time) ||
         (block.start_time <= s.start_time && block.end_time >= s.end_time))
      );
      return hasConflictInNew;
    };

    // Helper to check if a teacher is available on a specific day & shift
    const isTeacherAvailable = (teacher: Teacher, day: DayOfWeek, block: TimeBlock) => {
      if (!teacher.available_days?.includes(day)) return false;
      const startHour = parseInt(block.start_time.split(':')[0]);
      const isMorning = startHour < 13;
      if (teacher.availability_shift === 'matutino' && !isMorning) return false;
      if (teacher.availability_shift === 'vespertino' && isMorning) return false;
      return true;
    };

    // List all cells: (block, day)
    const cells: { block: TimeBlock, day: DayOfWeek }[] = [];
    blocks.forEach(block => {
      days.forEach(day => {
        cells.push({ block, day });
      });
    });

    const subjectCountPerDay: { [day: string]: { [subject: string]: number } } = {};
    days.forEach(d => {
      subjectCountPerDay[d] = {};
    });

    const sortPool = () => {
      subjectPool.sort((a, b) => b.remaining - a.remaining);
    };

    const unassignedSubjectsList: string[] = [];
    let scheduledWithTeacher = 0;
    let scheduledWithoutTeacher = 0;

    // Try to fill the cells
    cells.forEach(({ block, day }) => {
      sortPool();
      let assigned = false;

      // First pass: try with daily frequency constraint (at most 2 of the same subject per day)
      for (let i = 0; i < subjectPool.length; i++) {
        const poolItem = subjectPool[i];
        if (poolItem.remaining <= 0) continue;

        const subject = poolItem.subject;
        const dailyCount = subjectCountPerDay[day][subject] || 0;
        if (dailyCount >= 2 && subjectPool.some(item => item.remaining > 0 && (subjectCountPerDay[day][item.subject] || 0) < 2)) {
          continue;
        }

        const possibleTeachers = teachersBySubject[subject] || [];
        const availableTeacher = possibleTeachers.find(t => 
          isTeacherAvailable(t, day, block) && !hasTeacherConflict(t.id, day, block)
        );

        if (availableTeacher) {
          newSlots.push({
            id: crypto.randomUUID(),
            class_id: selectedClassId,
            teacher_id: availableTeacher.id,
            subject: subject,
            day_of_week: day,
            start_time: block.start_time,
            end_time: block.end_time
          });

          poolItem.remaining -= 1;
          subjectCountPerDay[day][subject] = (subjectCountPerDay[day][subject] || 0) + 1;
          assigned = true;
          scheduledWithTeacher++;
          break;
        }
      }

      // Second pass: ignore daily count constraint, but still require a conflict-free teacher
      if (!assigned) {
        for (let i = 0; i < subjectPool.length; i++) {
          const poolItem = subjectPool[i];
          if (poolItem.remaining <= 0) continue;

          const subject = poolItem.subject;
          const possibleTeachers = teachersBySubject[subject] || [];
          const availableTeacher = possibleTeachers.find(t => 
            isTeacherAvailable(t, day, block) && !hasTeacherConflict(t.id, day, block)
          );

          if (availableTeacher) {
            newSlots.push({
              id: crypto.randomUUID(),
              class_id: selectedClassId,
              teacher_id: availableTeacher.id,
              subject: subject,
              day_of_week: day,
              start_time: block.start_time,
              end_time: block.end_time
            });

            poolItem.remaining -= 1;
            subjectCountPerDay[day][subject] = (subjectCountPerDay[day][subject] || 0) + 1;
            assigned = true;
            scheduledWithTeacher++;
            break;
          }
        }
      }

      // Third pass (Fallback): assign the subject anyway even if no teacher is available!
      if (!assigned) {
        for (let i = 0; i < subjectPool.length; i++) {
          const poolItem = subjectPool[i];
          if (poolItem.remaining <= 0) continue;

          const subject = poolItem.subject;
          newSlots.push({
            id: crypto.randomUUID(),
            class_id: selectedClassId,
            teacher_id: '', // No teacher
            subject: subject,
            day_of_week: day,
            start_time: block.start_time,
            end_time: block.end_time
          });

          poolItem.remaining -= 1;
          subjectCountPerDay[day][subject] = (subjectCountPerDay[day][subject] || 0) + 1;
          assigned = true;
          scheduledWithoutTeacher++;
          unassignedSubjectsList.push(`${subject} na ${day === 'terca' ? 'terça-feira' : day + '-feira'} às ${block.start_time}`);
          break;
        }
      }
    });

    setScheduleSlots([...otherClassesSlots, ...newSlots]);

    const details: string[] = [];
    details.push(`Total de aulas demandadas pelo currículo: ${totalDemanded}`);
    details.push(`Aulas com professor designado: ${scheduledWithTeacher}`);
    
    if (scheduledWithoutTeacher > 0) {
      details.push(`Aulas agendadas SEM professor designado: ${scheduledWithoutTeacher}`);
      details.push(`Notas de Alinhamento / Detalhes de Alocação:`);
      unassignedSubjectsList.forEach(item => {
        details.push(`• Sem prof. alinhado para: ${item}`);
      });
    }

    if (scheduledWithoutTeacher === 0 && totalScheduledWithTeacherAndWithout() === totalDemanded) {
      setScheduleStatus({
        message: 'Sucesso! Grade horária gerada e 100% alinhada com professores cadastrados.',
        type: 'success',
        details
      });
    } else {
      setScheduleStatus({
        message: `Grade organizada! Agendadas ${scheduledWithTeacher + scheduledWithoutTeacher} de ${totalDemanded} aulas possíveis.`,
        type: 'warning',
        details: [
          ...details,
          'Dica: Cadastre mais professores correspondentes a este segmento e verifique sua disponibilidade de turnos para preencher as lacunas.'
        ]
      });
    }

    function totalScheduledWithTeacherAndWithout() {
      return scheduledWithTeacher + scheduledWithoutTeacher;
    }
  };

  const handleAddTimeBlock = () => {
    setTimeBlocks([
      ...timeBlocks,
      {
        id: crypto.randomUUID(),
        class_id: selectedClassId,
        start_time: '07:30',
        end_time: '08:20'
      }
    ]);
  };

  const handleAddIntervalBlock = () => {
    setTimeBlocks([
      ...timeBlocks,
      {
        id: crypto.randomUUID(),
        class_id: selectedClassId,
        start_time: '09:00',
        end_time: '09:20',
        is_interval: true
      }
    ]);
  };

  const handleResetDefaultBlocks = () => {
    if (!confirm('Tem certeza de que deseja resetar os horários desta turma para o padrão de 6 aulas com 2 intervalos? Todos os agendamentos desta turma serão apagados.')) {
      return;
    }
    // Remove slots of this class
    setScheduleSlots(slots => slots.filter(s => s.class_id !== selectedClassId));
    
    // Set default blocks with intervals
    setTimeBlocks(prev => {
      const filtered = prev.filter(tb => tb.class_id !== selectedClassId);
      return [
        ...filtered,
        { id: crypto.randomUUID(), class_id: selectedClassId, start_time: '07:20', end_time: '08:10' },
        { id: crypto.randomUUID(), class_id: selectedClassId, start_time: '08:10', end_time: '09:00' },
        { id: crypto.randomUUID(), class_id: selectedClassId, start_time: '09:00', end_time: '09:20', is_interval: true },
        { id: crypto.randomUUID(), class_id: selectedClassId, start_time: '09:20', end_time: '10:10' },
        { id: crypto.randomUUID(), class_id: selectedClassId, start_time: '10:10', end_time: '11:00' },
        { id: crypto.randomUUID(), class_id: selectedClassId, start_time: '11:00', end_time: '11:20', is_interval: true },
        { id: crypto.randomUUID(), class_id: selectedClassId, start_time: '11:20', end_time: '12:10' },
        { id: crypto.randomUUID(), class_id: selectedClassId, start_time: '12:10', end_time: '13:00' }
      ];
    });
  };

  const updateTimeBlock = (id: string, field: 'start_time' | 'end_time', value: string) => {
    setTimeBlocks(timeBlocks.map(tb => tb.id === id ? { ...tb, [field]: value } : tb));
    // Ideally we should also update existing scheduleSlots that match this time block, 
    // but for simplicity we rely on the block itself. Wait, if we change the time, the slots will disconnect.
    // Let's update the slots too.
    const oldBlock = timeBlocks.find(tb => tb.id === id);
    if (oldBlock) {
      setScheduleSlots(slots => slots.map(s => {
        if (s.class_id === selectedClassId && s.start_time === oldBlock.start_time && s.end_time === oldBlock.end_time) {
          return { ...s, [field]: value };
        }
        return s;
      }));
    }
  };

  const removeTimeBlock = (id: string) => {
    const block = timeBlocks.find(tb => tb.id === id);
    if (block) {
      // Remove all slots for this block
      setScheduleSlots(slots => slots.filter(s => !(s.class_id === selectedClassId && s.start_time === block.start_time && s.end_time === block.end_time)));
    }
    setTimeBlocks(timeBlocks.filter(tb => tb.id !== id));
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
        ((block.start_time >= s.start_time && block.start_time < s.end_time) || 
         (block.end_time > s.start_time && block.end_time <= s.end_time) ||
         (block.start_time <= s.start_time && block.end_time >= s.end_time))
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
