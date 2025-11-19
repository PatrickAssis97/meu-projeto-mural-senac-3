
import React, { useState, useRef, useEffect } from 'react';
import { SENAC_COLORS, DEFAULT_SETTINGS } from '../constants';
import type { OpenEnrollmentCourse, OngoingCourse, NewsItem, User, CourseSchedule, AppSettings, MuralComponentId } from '../types';
import Modal from './Modal';
import WysiwygEditor from './WysiwygEditor';
import { useToast } from '../context/ToastContext';
import { findScheduleConflict } from '../services/scheduleService';
import { parseCoursesFromCSV } from '../services/csvParser';
import { saveVideoToDB, deleteVideoFromDB } from '../services/videoDB';
import { exportBackup, importBackup } from '../services/dataService';


// Helper types for props
type SetState<T> = React.Dispatch<React.SetStateAction<T>>;

interface AdminPanelProps {
  currentUser: User;
  onLogout: () => void;
  onViewMural: () => void;
  openEnrollments: OpenEnrollmentCourse[];
  setOpenEnrollments: SetState<OpenEnrollmentCourse[]>;
  ongoingCourses: OngoingCourse[];
  setOngoingCourses: SetState<OngoingCourse[]>;
  newsItems: NewsItem[];
  setNewsItems: SetState<NewsItem[]>;
  videoUrls: string[];
  setVideoUrls: SetState<string[]>;
  users: User[];
  setUsers: SetState<User[]>;
  settings: AppSettings;
  setSettings: SetState<AppSettings>;
  initialNewsToEdit?: NewsItem | null;
  onEditingComplete?: () => void;
}

type AdminSection = 'enrollments' | 'ongoing' | 'news' | 'video' | 'users' | 'settings' | 'system';

// --- Reusable Confirm Delete Modal ---
interface ConfirmDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  itemName: string;
}

const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({ isOpen, onClose, onConfirm, itemName }) => (
  <Modal isOpen={isOpen} onClose={onClose} title="Confirmar Exclusão">
    <p className="mb-6">Você tem certeza que deseja excluir "{itemName}"? Esta ação não pode ser desfeita.</p>
    <div className="flex justify-end gap-4">
      <button onClick={onClose} className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded transition-colors">
        Cancelar
      </button>
      <button onClick={onConfirm} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded transition-colors">
        Excluir
      </button>
    </div>
  </Modal>
);


const AdminPanel: React.FC<AdminPanelProps> = (props) => {
  const [activeSection, setActiveSection] = useState<AdminSection>('enrollments');
  const { currentUser, onLogout, onViewMural, initialNewsToEdit } = props;

  useEffect(() => {
    if (initialNewsToEdit) {
      setActiveSection('news');
    }
  }, [initialNewsToEdit]);

  const renderSection = () => {
    switch (activeSection) {
      case 'enrollments': return <ManageOpenEnrollments {...props} />;
      case 'ongoing': return <ManageOngoingCourses {...props} />;
      case 'news': return <ManageNews {...props} />;
      case 'video': return <ManageVideo {...props} />;
      case 'users': return <ManageUsers {...props} />;
      case 'settings': return <ManageSettings {...props} />;
      case 'system': return <ManageSystem {...props} />;
      default: return null;
    }
  };

  const getButtonClass = (section: AdminSection) => 
    `px-4 py-2 rounded-md transition-colors text-sm font-semibold ${
      activeSection === section 
        ? 'bg-[#f58220] text-white' 
        : 'bg-white/20 hover:bg-white/30 text-gray-200'
    }`;

  return (
    <div className="p-4 md:p-8 text-white min-h-screen">
      <header className="flex flex-wrap justify-between items-center mb-6 pb-4 border-b-2 border-white/20 gap-4">
        <div>
          <h1 className="text-3xl font-bold">Painel Administrativo</h1>
          <p className="text-gray-300">Bem-vindo, {currentUser.username} ({currentUser.role}).</p>
        </div>
        <div className="flex items-center gap-2">
            <button onClick={onViewMural} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-colors flex items-center gap-2">
                <img 
                    src="https://cdn-icons-png.flaticon.com/128/9790/9790517.png"
                    alt=""
                    className="h-5 w-5"
                />
                Visualizar Mural
            </button>
            <button onClick={onLogout} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded transition-colors flex items-center gap-2">
                 <img 
                    src="https://cdn-icons-png.flaticon.com/128/1828/1828479.png"
                    alt=""
                    className="h-5 w-5"
                />
                Sair
            </button>
        </div>
      </header>

      <nav className="flex flex-wrap gap-2 mb-6">
        <button onClick={() => setActiveSection('enrollments')} className={getButtonClass('enrollments')}>Matrículas Abertas</button>
        <button onClick={() => setActiveSection('ongoing')} className={getButtonClass('ongoing')}>Cursos em Andamento</button>
        <button onClick={() => setActiveSection('news')} className={getButtonClass('news')}>Notícias e Avisos</button>
        {currentUser.role === 'admin' && (
          <>
            <button onClick={() => setActiveSection('video')} className={getButtonClass('video')}>Vídeo Institucional</button>
            <button onClick={() => setActiveSection('users')} className={getButtonClass('users')}>Gerenciar Usuários</button>
            <button onClick={() => setActiveSection('settings')} className={getButtonClass('settings')}>Personalização</button>
            <button onClick={() => setActiveSection('system')} className={getButtonClass('system')}>Sincronização</button>
          </>
        )}
      </nav>

      <main>
        {renderSection()}
      </main>
    </div>
  );
};


// --- Sub-components for managing each section ---

const ManageOpenEnrollments: React.FC<Pick<AdminPanelProps, 'openEnrollments' | 'setOpenEnrollments'>> = ({ openEnrollments, setOpenEnrollments }) => {
    const blankCourse: Omit<OpenEnrollmentCourse, 'id'> = { name: '', workload: 0, startDate: '', endDate: '', schedule: '', enrollmentUrl: '', vacancies: 'available' };
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCourse, setEditingCourse] = useState<OpenEnrollmentCourse | Omit<OpenEnrollmentCourse, 'id'> | null>(null);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const { addToast } = useToast();

    const handleOpenAddModal = () => {
        setEditingCourse(blankCourse);
        setIsModalOpen(true);
    };

    const handleOpenEditModal = (course: OpenEnrollmentCourse) => {
        setEditingCourse(course);
        setIsModalOpen(true);
    };

    const handleOpenConfirm = (id: string) => {
        setDeletingId(id);
        setIsConfirmOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingCourse(null);
    };

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingCourse) return;

        if ('id' in editingCourse) {
            setOpenEnrollments(prev => prev.map(c => c.id === editingCourse.id ? editingCourse : c));
        } else {
            setOpenEnrollments(prev => [...prev, { ...editingCourse, id: crypto.randomUUID() }]);
        }
        addToast('Curso salvo com sucesso!', 'success');
        handleCloseModal();
    };

    const handleDelete = () => {
        if (deletingId) {
            setOpenEnrollments(prev => prev.filter(c => c.id !== deletingId));
            addToast('Curso excluído com sucesso!', 'success');
        }
        setDeletingId(null);
        setIsConfirmOpen(false);
    };

    const filteredCourses = openEnrollments.filter(course =>
        course.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const courseToDelete = openEnrollments.find(c => c.id === deletingId);

    return (
        <>
            <div className="bg-black/20 p-4 rounded-lg">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-4">
                    <h3 className="text-xl font-bold">Gerenciar Matrículas Abertas</h3>
                    <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
                        <input
                            type="search"
                            placeholder="Buscar curso..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="p-2 rounded bg-gray-700 focus:outline-none focus:ring-2 focus:ring-[#f58220] w-full sm:w-auto"
                        />
                        <button onClick={handleOpenAddModal} className="bg-[#f58220] hover:opacity-90 text-white font-bold py-2 px-4 rounded w-full sm:w-auto">
                            + Adicionar Curso
                        </button>
                    </div>
                </div>

                <div className="max-h-96 overflow-y-auto">
                    <ul className="space-y-2 pr-2">
                        {filteredCourses.map(course => (
                            <li key={course.id} className="bg-gray-700 p-2 rounded flex justify-between items-center">
                                <span>{course.name}</span>
                                <div className="flex gap-2 flex-shrink-0">
                                    <button onClick={() => handleOpenEditModal(course)} className="text-sm text-yellow-400 hover:text-yellow-300">Editar</button>
                                    <button onClick={() => handleOpenConfirm(course.id)} className="text-sm text-red-400 hover:text-red-300">Excluir</button>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>

            <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingCourse && 'id' in editingCourse ? 'Editar Curso' : 'Adicionar Curso'}>
                {editingCourse && (
                    <form onSubmit={handleSave} className="space-y-4">
                        <input type="text" placeholder="Nome do Curso" value={editingCourse.name} onChange={e => setEditingCourse(prev => prev ? {...prev, name: e.target.value} : prev)} className="w-full p-2 rounded bg-gray-700 focus:outline-none focus:ring-2 focus:ring-[#f58220]" required />
                        <input type="number" placeholder="Carga Horária" value={editingCourse.workload} onChange={e => setEditingCourse(prev => prev ? {...prev, workload: parseInt(e.target.value) || 0} : prev)} className="w-full p-2 rounded bg-gray-700 focus:outline-none focus:ring-2 focus:ring-[#f58220]" required />
                        <input type="text" placeholder="Início (DD/MM/AAAA)" value={editingCourse.startDate} onChange={e => setEditingCourse(prev => prev ? {...prev, startDate: e.target.value} : prev)} className="w-full p-2 rounded bg-gray-700 focus:outline-none focus:ring-2 focus:ring-[#f58220]" required />
                        <input type="text" placeholder="Término (DD/MM/AAAA)" value={editingCourse.endDate} onChange={e => setEditingCourse(prev => prev ? {...prev, endDate: e.target.value} : prev)} className="w-full p-2 rounded bg-gray-700 focus:outline-none focus:ring-2 focus:ring-[#f58220]" required />
                        <input type="text" placeholder="Horário (HH:mm - HH:mm)" value={editingCourse.schedule} onChange={e => setEditingCourse(prev => prev ? {...prev, schedule: e.target.value} : prev)} className="w-full p-2 rounded bg-gray-700 focus:outline-none focus:ring-2 focus:ring-[#f58220]" required />
                        <input type="url" placeholder="URL de Inscrição" value={editingCourse.enrollmentUrl} onChange={e => setEditingCourse(prev => prev ? {...prev, enrollmentUrl: e.target.value} : prev)} className="w-full p-2 rounded bg-gray-700 focus:outline-none focus:ring-2 focus:ring-[#f58220]" required />
                        <select value={editingCourse.vacancies} onChange={e => setEditingCourse(prev => prev ? {...prev, vacancies: e.target.value as any} : prev)} className="w-full p-2 rounded bg-gray-700 focus:outline-none focus:ring-2 focus:ring-[#f58220]">
                            <option value="available">Vagas Disponíveis</option>
                            <option value="few">Poucas Vagas</option>
                            <option value="filled">Vagas Esgotadas</option>
                        </select>
                        <div className="flex justify-end gap-2 pt-2">
                             <button type="button" onClick={handleCloseModal} className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded">Cancelar</button>
                            <button type="submit" className="bg-[#f58220] hover:opacity-90 text-white font-bold py-2 px-4 rounded">Salvar</button>
                        </div>
                    </form>
                )}
            </Modal>
            
            <ConfirmDeleteModal isOpen={isConfirmOpen} onClose={() => setIsConfirmOpen(false)} onConfirm={handleDelete} itemName={courseToDelete?.name || ''}/>
        </>
    );
}

const ManageOngoingCourses: React.FC<Pick<AdminPanelProps, 'ongoingCourses' | 'setOngoingCourses'>> = ({ ongoingCourses, setOngoingCourses }) => {
    const blankSchedule: CourseSchedule = { dayOfWeek: 1, startTime: '08:00', endTime: '12:00' };
    const blankCourse: Omit<OngoingCourse, 'id'> = { room: '', courseName: '', block: 'A', schedules: [blankSchedule] };
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [editingCourse, setEditingCourse] = useState<OngoingCourse | Omit<OngoingCourse, 'id'> | null>(null);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const { addToast } = useToast();

    const daysOfWeek = [
        { value: 1, label: 'Segunda' }, { value: 2, label: 'Terça' }, { value: 3, label: 'Quarta' },
        { value: 4, label: 'Quinta' }, { value: 5, label: 'Sexta' }, { value: 6, label: 'Sábado' },
        { value: 0, label: 'Domingo' },
    ];
    
    const handleOpenAddModal = () => {
        setEditingCourse(blankCourse);
        setIsModalOpen(true);
    };

    const handleOpenEditModal = (course: OngoingCourse) => {
        setEditingCourse(course);
        setIsModalOpen(true);
    };
    
    const handleOpenConfirm = (id: string) => {
        setDeletingId(id);
        setIsConfirmOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingCourse(null);
    };

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingCourse) return;
        
        const conflict = findScheduleConflict(editingCourse, ongoingCourses);
        if (conflict) {
            addToast(`Conflito: Sala ${conflict.room} já em uso por "${conflict.courseName}" nesse horário.`, 'error');
            return;
        }

        if ('id' in editingCourse) {
            setOngoingCourses(prev => prev.map(c => c.id === editingCourse.id ? editingCourse : c));
        } else {
            setOngoingCourses(prev => [...prev, { ...editingCourse, id: crypto.randomUUID() }]);
        }
        addToast('Curso salvo com sucesso!', 'success');
        handleCloseModal();
    };

    const handleDelete = () => {
        if (deletingId) {
            setOngoingCourses(prev => prev.filter(c => c.id !== deletingId));
            addToast('Curso excluído com sucesso!', 'success');
        }
        setDeletingId(null);
        setIsConfirmOpen(false);
    };
    
    const handleScheduleChange = (index: number, field: keyof CourseSchedule, value: string | number) => {
        setEditingCourse(prevCourse => {
            if (!prevCourse) return prevCourse;
            const newSchedules = [...prevCourse.schedules];
            newSchedules[index] = { ...newSchedules[index], [field]: value };
            return { ...prevCourse, schedules: newSchedules };
        });
    };
    
    const addSchedule = () => {
        setEditingCourse(prevCourse => {
            if (!prevCourse) return prevCourse;
            return { ...prevCourse, schedules: [...prevCourse.schedules, blankSchedule] };
        });
    };

    const removeSchedule = (index: number) => {
        setEditingCourse(prevCourse => {
            if (!prevCourse || prevCourse.schedules.length <= 1) {
                addToast('O curso deve ter pelo menos um horário.', 'error');
                return prevCourse;
            }
            const newSchedules = prevCourse.schedules.filter((_, i) => i !== index);
            return { ...prevCourse, schedules: newSchedules };
        });
    };
    
    const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const text = await file.text();
        const { courses: parsedCourses, errors: parseErrors } = parseCoursesFromCSV(text);

        if (parseErrors.length > 0) {
            parseErrors.forEach(err => addToast(err, 'error'));
            return;
        }

        const conflicts: string[] = [];
        let tempCombinedCourses = [...ongoingCourses];

        for (const newCourse of parsedCourses) {
            const conflict = findScheduleConflict(newCourse, tempCombinedCourses);
            if (conflict) {
                conflicts.push(`Conflito detectado: ${newCourse.courseName} (${newCourse.room}) colide com ${conflict.courseName} (${conflict.room}).`);
            } else {
                tempCombinedCourses.push({ ...newCourse, id: `temp-${Math.random()}` });
            }
        }

        if (conflicts.length > 0) {
            conflicts.forEach(err => addToast(err, 'error'));
            addToast("Importação abortada devido a conflitos de horário.", 'error');
            return;
        }

        const coursesToAdd = parsedCourses.map(c => ({...c, id: crypto.randomUUID() }));
        setOngoingCourses(prev => [...prev, ...coursesToAdd]);
        addToast(`${coursesToAdd.length} curso(s) importado(s) com sucesso!`, 'success');
        setIsImportModalOpen(false);
    };
    
    const handleDownloadTemplate = () => {
        const csvContent = "data:text/csv;charset=utf-8,"
            + "room,courseName,block,dayOfWeek,startTime,endTime\n"
            + "Sala 101,Design Gráfico,A,1,08:00,12:00\n"
            + "Sala 101,Design Gráfico,A,3,08:00,12:00\n"
            + "Sala 202,Excel Avançado,C,1,13:30,17:30\n";
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "template_cursos.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };
    
    const handleExport = () => {
        if (ongoingCourses.length === 0) {
            addToast('Não há cursos para exportar.', 'error');
            return;
        }

        const headers = ['room', 'courseName', 'block', 'dayOfWeek', 'startTime', 'endTime'];
        const csvRows: string[] = [headers.join(',')]; // Header row

        ongoingCourses.forEach(course => {
            course.schedules.forEach(schedule => {
                const row = [
                    course.room,
                    course.courseName,
                    course.block,
                    schedule.dayOfWeek,
                    schedule.startTime,
                    schedule.endTime,
                ].map(value => {
                    const strValue = String(value);
                    if (strValue.includes(',') || strValue.includes('"')) {
                        return `"${strValue.replace(/"/g, '""')}"`;
                    }
                    return strValue;
                }).join(',');
                csvRows.push(row);
            });
        });

        const csvContent = csvRows.join('\n');
        const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", "cursos_em_andamento.csv");
        document.body.appendChild(link);
        link.click();

        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        addToast('Dados exportados com sucesso!', 'success');
    };


    const filteredCourses = ongoingCourses.filter(course =>
        course.courseName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        course.room.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const courseToDelete = ongoingCourses.find(c => c.id === deletingId);

    return (
      <>
        <div className="bg-black/20 p-4 rounded-lg">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-4">
            <h3 className="text-xl font-bold">Gerenciar Cursos em Andamento</h3>
            <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
              <input type="search" placeholder="Buscar por nome ou sala..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="p-2 rounded bg-gray-700 focus:outline-none focus:ring-2 focus:ring-[#f58220] w-full sm:w-auto"/>
               <button onClick={handleExport} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded w-full sm:w-auto">
                Exportar CSV
              </button>
               <button onClick={() => setIsImportModalOpen(true)} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded w-full sm:w-auto">
                Importar CSV
              </button>
              <button onClick={handleOpenAddModal} className="bg-[#f58220] hover:opacity-90 text-white font-bold py-2 px-4 rounded w-full sm:w-auto">
                + Adicionar Curso
              </button>
            </div>
          </div>
          <div className="max-h-96 overflow-y-auto">
            <ul className="space-y-2 pr-2">
              {filteredCourses.map(course => (
                <li key={course.id} className="bg-gray-700 p-2 rounded flex justify-between items-center">
                  <span>{`Bloco ${course.block} / ${course.room} - ${course.courseName}`}</span>
                  <div className="flex gap-2 flex-shrink-0">
                    <button onClick={() => handleOpenEditModal(course)} className="text-sm text-yellow-400 hover:text-yellow-300">Editar</button>
                    <button onClick={() => handleOpenConfirm(course.id)} className="text-sm text-red-400 hover:text-red-300">Excluir</button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
        
        <Modal isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)} title="Importar Cursos de Planilha (CSV)">
            <div className="space-y-4">
                <p>Faça o upload de um arquivo CSV com as colunas: <code className="bg-gray-800 p-1 rounded text-sm">room,courseName,block,dayOfWeek,startTime,endTime</code></p>
                <p className="text-sm text-gray-400">O sistema irá validar por conflitos de horários antes de importar. Use 1 para Segunda, 2 para Terça, etc.</p>
                <button onClick={handleDownloadTemplate} className="text-blue-400 hover:underline">Baixar modelo de planilha</button>
                <input 
                    type="file" 
                    accept=".csv"
                    onChange={handleFileImport}
                    className="w-full p-2 rounded bg-gray-700 focus:outline-none focus:ring-2 focus:ring-[#f58220]"
                />
            </div>
        </Modal>

        <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingCourse && 'id' in editingCourse ? 'Editar Curso' : 'Adicionar Curso'}>
          {editingCourse && (
            <form onSubmit={handleSave} className="space-y-4">
              <input type="text" placeholder="Nome da Sala (Ex: Sala 101)" value={editingCourse.room} onChange={e => setEditingCourse(prev => prev ? {...prev, room: e.target.value} : prev)} className="w-full p-2 rounded bg-gray-700 focus:outline-none focus:ring-2 focus:ring-[#f58220]" required />
              <input type="text" placeholder="Nome do Curso" value={editingCourse.courseName} onChange={e => setEditingCourse(prev => prev ? {...prev, courseName: e.target.value} : prev)} className="w-full p-2 rounded bg-gray-700 focus:outline-none focus:ring-2 focus:ring-[#f58220]" required />
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Bloco</label>
                <select value={editingCourse.block} onChange={e => setEditingCourse(prev => prev ? {...prev, block: e.target.value} : prev)} className="w-full p-2 rounded bg-gray-700 focus:outline-none focus:ring-2 focus:ring-[#f58220]">
                  <option value="A">Bloco A</option> <option value="B">Bloco B</option> <option value="C">Bloco C</option>
                </select>
              </div>
              <div className="space-y-3">
                <h4 className="text-lg font-semibold">Horários</h4>
                {editingCourse.schedules.map((schedule, index) => (
                  <div key={index} className="bg-gray-800 p-3 rounded-md space-y-2 relative">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <select value={schedule.dayOfWeek} onChange={e => handleScheduleChange(index, 'dayOfWeek', parseInt(e.target.value))} className="w-full p-2 rounded bg-gray-700 focus:outline-none focus:ring-2 focus:ring-[#f58220]">
                        {daysOfWeek.map(day => <option key={day.value} value={day.value}>{day.label}</option>)}
                      </select>
                      <input type="time" value={schedule.startTime} onChange={e => handleScheduleChange(index, 'startTime', e.target.value)} className="w-full p-2 rounded bg-gray-700 focus:outline-none focus:ring-2 focus:ring-[#f58220]" required />
                      <input type="time" value={schedule.endTime} onChange={e => handleScheduleChange(index, 'endTime', e.target.value)} className="w-full p-2 rounded bg-gray-700 focus:outline-none focus:ring-2 focus:ring-[#f58220]" required />
                    </div>
                     <button type="button" onClick={() => removeSchedule(index)} className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full h-6 w-6 flex items-center justify-center font-bold text-sm hover:bg-red-700">&times;</button>
                  </div>
                ))}
                <button type="button" onClick={addSchedule} className="w-full bg-blue-600/50 hover:bg-blue-600/70 text-white font-bold py-2 px-2 rounded">+ Adicionar Horário</button>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                 <button type="button" onClick={handleCloseModal} className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded">Cancelar</button>
                <button type="submit" className="bg-[#f58220] hover:opacity-90 text-white font-bold py-2 px-4 rounded">Salvar</button>
              </div>
            </form>
          )}
        </Modal>

        <ConfirmDeleteModal isOpen={isConfirmOpen} onClose={() => setIsConfirmOpen(false)} onConfirm={handleDelete} itemName={`${courseToDelete?.courseName} (Sala ${courseToDelete?.room})`}/>
      </>
    );
}

const ManageNews: React.FC<Pick<AdminPanelProps, 'newsItems' | 'setNewsItems' | 'initialNewsToEdit' | 'onEditingComplete'>> = ({ newsItems, setNewsItems, initialNewsToEdit, onEditingComplete }) => {
    const blankNews: Omit<NewsItem, 'id'> = { title: '', content: '', urgent: false, imageUrl: '' };
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingNews, setEditingNews] = useState<NewsItem | Omit<NewsItem, 'id'> | null>(null);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const { addToast } = useToast();

    useEffect(() => {
        if (initialNewsToEdit && onEditingComplete) {
            handleOpenEditModal(initialNewsToEdit);
            onEditingComplete(); // Prevents re-opening on re-render
        }
    }, [initialNewsToEdit, onEditingComplete]);

    const handleOpenAddModal = () => {
        setEditingNews(blankNews);
        setIsModalOpen(true);
    };

    const handleOpenEditModal = (item: NewsItem) => {
        setEditingNews(item);
        setIsModalOpen(true);
    };
    
    const handleOpenConfirm = (id: string) => {
        setDeletingId(id);
        setIsConfirmOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingNews(null);
    };
    
    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingNews) return;

        if ('id' in editingNews) {
            setNewsItems(prev => prev.map(n => n.id === editingNews.id ? editingNews : n));
        } else {
            setNewsItems(prev => [...prev, { ...editingNews, id: crypto.randomUUID() }]);
        }
        addToast('Notícia salva com sucesso!', 'success');
        handleCloseModal();
    };

    const handleDelete = () => {
        if(deletingId) {
            setNewsItems(prev => prev.filter(n => n.id !== deletingId));
            addToast('Notícia excluída com sucesso!', 'success');
        }
        setDeletingId(null);
        setIsConfirmOpen(false);
    };

    const filteredNews = newsItems.filter(item =>
        item.title.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const newsToDelete = newsItems.find(n => n.id === deletingId);

    return (
        <>
            <div className="bg-black/20 p-4 rounded-lg">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-4">
                    <h3 className="text-xl font-bold">Gerenciar Notícias e Avisos</h3>
                    <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
                        <input type="search" placeholder="Buscar notícia..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="p-2 rounded bg-gray-700 focus:outline-none focus:ring-2 focus:ring-[#f58220] w-full sm:w-auto"/>
                        <button onClick={handleOpenAddModal} className="bg-[#f58220] hover:opacity-90 text-white font-bold py-2 px-4 rounded w-full sm:w-auto">
                            + Adicionar Notícia
                        </button>
                    </div>
                </div>
                <div className="max-h-96 overflow-y-auto">
                    <ul className="space-y-2 pr-2">
                        {filteredNews.map(item => (
                            <li key={item.id} className="bg-gray-700 p-2 rounded flex justify-between items-center">
                                <span>{item.title}</span>
                                <div className="flex gap-2 flex-shrink-0">
                                    <button onClick={() => handleOpenEditModal(item)} className="text-sm text-yellow-400 hover:text-yellow-300">Editar</button>
                                    <button onClick={() => handleOpenConfirm(item.id)} className="text-sm text-red-400 hover:text-red-300">Excluir</button>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>

            <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingNews && 'id' in editingNews ? 'Editar Notícia' : 'Adicionar Notícia'}>
                {editingNews && (
                    <form onSubmit={handleSave} className="space-y-4">
                        <input type="text" placeholder="Título" value={editingNews.title} onChange={e => setEditingNews(prev => prev ? {...prev, title: e.target.value} : prev)} className="w-full p-2 rounded bg-gray-700 focus:outline-none focus:ring-2 focus:ring-[#f58220]" required />
                        <WysiwygEditor
                            content={editingNews.content}
                            setContent={content => setEditingNews(prev => prev ? { ...prev, content } : null)}
                        />
                        <input type="url" placeholder="URL da Imagem de Fundo (Opcional)" value={editingNews.imageUrl || ''} onChange={e => setEditingNews(prev => prev ? {...prev, imageUrl: e.target.value} : prev)} className="w-full p-2 rounded bg-gray-700 focus:outline-none focus:ring-2 focus:ring-[#f58220]" />
                        <label className="flex items-center gap-2 text-gray-300 cursor-pointer">
                            <input type="checkbox" checked={editingNews.urgent} onChange={e => setEditingNews(prev => prev ? {...prev, urgent: e.target.checked} : prev)} className="form-checkbox h-5 w-5 text-[#f58220] bg-gray-700 border-gray-600 rounded focus:ring-[#f58220]"/>
                            <span>Aviso Urgente</span>
                        </label>
                        <div className="flex justify-end gap-2 pt-2">
                           <button type="button" onClick={handleCloseModal} className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded">Cancelar</button>
                           <button type="submit" className="bg-[#f58220] hover:opacity-90 text-white font-bold py-2 px-4 rounded">Salvar</button>
                        </div>
                    </form>
                )}
            </Modal>
            <ConfirmDeleteModal isOpen={isConfirmOpen} onClose={() => setIsConfirmOpen(false)} onConfirm={handleDelete} itemName={newsToDelete?.title || ''}/>
        </>
    );
}

const ManageVideo: React.FC<Pick<AdminPanelProps, 'videoUrls' | 'setVideoUrls'>> = ({ videoUrls, setVideoUrls }) => {
    const [newUrl, setNewUrl] = useState('');
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [deletingIndex, setDeletingIndex] = useState<number | null>(null);
    const { addToast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleAddUrl = (e: React.FormEvent) => {
        e.preventDefault();
        const trimmedUrl = newUrl.trim();
        if (trimmedUrl) {
            try {
                new URL(trimmedUrl);
                setVideoUrls(prev => [...prev, trimmedUrl]);
                setNewUrl('');
                addToast('Vídeo adicionado com sucesso!', 'success');
            } catch (_) {
                addToast('Por favor, insira uma URL válida.', 'error');
            }
        }
    };

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            try {
                addToast('Salvando vídeo no banco de dados local...', 'success');
                const videoId = await saveVideoToDB(file);
                setVideoUrls(prev => [...prev, videoId]);
                addToast('Upload do vídeo concluído e salvo permanentemente!', 'success');
            } catch (error) {
                console.error(error);
                addToast('Erro ao salvar vídeo. Tente um arquivo menor ou verifique o espaço em disco.', 'error');
            }
        }
        if(fileInputRef.current) fileInputRef.current.value = "";
    };
    
    const handleOpenConfirm = (index: number) => {
        setDeletingIndex(index);
        setIsConfirmOpen(true);
    };

    const handleDelete = async () => {
        if (deletingIndex !== null) {
            const urlToDelete = videoUrls[deletingIndex];
            
            if (urlToDelete.startsWith('local-video-')) {
                try {
                    await deleteVideoFromDB(urlToDelete);
                } catch (error) {
                    console.error("Erro ao deletar do IndexedDB", error);
                }
            }
            
            if (urlToDelete.startsWith('blob:')) {
                URL.revokeObjectURL(urlToDelete);
            }

            setVideoUrls(prev => prev.filter((_, index) => index !== deletingIndex));
            addToast('Vídeo removido com sucesso!', 'success');
        }
        setDeletingIndex(null);
        setIsConfirmOpen(false);
    };
    
    const urlToDelete = deletingIndex !== null ? videoUrls[deletingIndex] : '';
    const isLocalVideo = (url: string) => url.startsWith('local-video-');

    return (
        <>
            <div className="bg-black/20 p-4 rounded-lg">
                <h3 className="text-xl font-bold mb-4">Gerenciar Vídeos Institucionais</h3>
                
                <div className="bg-yellow-600/30 border-l-4 border-yellow-500 p-3 mb-4 text-sm text-yellow-100">
                    <p className="font-bold">Importante sobre Sincronização:</p>
                    <p>Vídeos enviados por upload ("Vídeo Local") ficam salvos <strong>apenas neste computador</strong>. Se você exportar as configurações para a recepção, precisará enviar o arquivo de vídeo lá também.</p>
                </div>

                <form onSubmit={handleAddUrl} className="flex flex-col sm:flex-row gap-2 mb-2">
                    <input type="url" placeholder="Cole a URL do vídeo (YouTube, MP4...)" value={newUrl} onChange={e => setNewUrl(e.target.value)} className="flex-grow p-2 rounded bg-gray-700 focus:outline-none focus:ring-2 focus:ring-[#f58220]" />
                    <button type="submit" className="bg-[#f58220] hover:opacity-90 text-white font-bold py-2 px-4 rounded">Adicionar URL</button>
                </form>

                <div className="flex items-center justify-center gap-4 my-4">
                    <hr className="w-full border-t border-gray-600"/>
                    <span className="text-gray-400 font-semibold">OU</span>
                    <hr className="w-full border-t border-gray-600"/>
                </div>

                <div className="text-center">
                     <input
                        type="file"
                        accept="video/*"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        className="hidden"
                        id="video-upload"
                    />
                    <label htmlFor="video-upload" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded cursor-pointer transition-colors">
                        Upload de Vídeo (Salvo no Navegador)
                    </label>
                    <p className="text-xs text-gray-400 mt-2">
                        Salva o vídeo permanentemente no navegador deste computador.
                    </p>
                </div>


                <h4 className="text-lg font-semibold mt-6 mb-2">Playlist Atual</h4>
                <div className="max-h-80 overflow-y-auto">
                    {videoUrls && videoUrls.length > 0 ? (
                        <ul className="space-y-2 pr-2">
                            {videoUrls.map((url, index) => (
                                <li key={index} className="bg-gray-700 p-2 rounded flex justify-between items-center gap-4">
                                    <span className="text-sm break-all">
                                        {isLocalVideo(url) ? `(Vídeo Local) Arquivo Salvo no PC ${index + 1}` : (url.startsWith('blob:') ? `(Temporário) Video ${index + 1}` : url)}
                                    </span>
                                    <button onClick={() => handleOpenConfirm(index)} className="text-sm text-red-400 hover:text-red-300 ml-auto flex-shrink-0 px-2 py-1" aria-label={`Excluir vídeo ${index + 1}`}>
                                        Excluir
                                    </button>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-gray-400">Nenhum vídeo na playlist. Adicione uma URL ou faça upload acima.</p>
                    )}
                </div>
            </div>
            <ConfirmDeleteModal isOpen={isConfirmOpen} onClose={() => setIsConfirmOpen(false)} onConfirm={handleDelete} itemName={isLocalVideo(urlToDelete) ? `Vídeo Local ${deletingIndex! + 1}` : urlToDelete}/>
        </>
    );
}

const ManageUsers: React.FC<Pick<AdminPanelProps, 'users' | 'setUsers' | 'currentUser'>> = ({ users, setUsers, currentUser }) => {
    const blankUser: Omit<User, 'id'> = { username: '', password: '', role: 'basic' };

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | Omit<User, 'id'> | null>(null);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const { addToast } = useToast();

    const handleOpenAddModal = () => {
        setEditingUser(blankUser);
        setIsModalOpen(true);
    };
    
    const handleOpenConfirm = (id: string) => {
        setDeletingId(id);
        setIsConfirmOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingUser(null);
    };

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingUser) return;

        const isDuplicate = users.some(u => u.username === editingUser.username && (!('id' in editingUser) || u.id !== editingUser.id));
        if(isDuplicate) {
            addToast('Este nome de usuário já existe.', 'error');
            return;
        }

        if ('id' in editingUser) {
            // Cannot edit users in this simplified version
        } else {
            setUsers(prev => [...prev, { ...editingUser, id: crypto.randomUUID() }]);
            addToast('Usuário criado com sucesso!', 'success');
        }
        
        handleCloseModal();
    };

    const handleDelete = () => {
        if (deletingId) {
            setUsers(prev => prev.filter(u => u.id !== deletingId));
            addToast('Usuário excluído com sucesso!', 'success');
        }
        setDeletingId(null);
        setIsConfirmOpen(false);
    };

    const userToDelete = users.find(u => u.id === deletingId);

    return (
        <>
            <div className="bg-black/20 p-4 rounded-lg">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-4">
                    <h3 className="text-xl font-bold">Gerenciar Usuários</h3>
                    <button onClick={handleOpenAddModal} className="bg-[#f58220] hover:opacity-90 text-white font-bold py-2 px-4 rounded w-full sm:w-auto">
                        + Adicionar Usuário
                    </button>
                </div>
                <div className="max-h-96 overflow-y-auto">
                    <ul className="space-y-2 pr-2">
                        {users.map(user => (
                            <li key={user.id} className="bg-gray-700 p-2 rounded flex justify-between items-center">
                                <span>{user.username} - <span className="capitalize text-gray-300">{user.role}</span></span>
                                <div className="flex gap-2 flex-shrink-0">
                                    {currentUser.id !== user.id ? (
                                        <button onClick={() => handleOpenConfirm(user.id)} className="text-sm text-red-400 hover:text-red-300">Excluir</button>
                                    ) : (
                                        <span className="text-sm text-gray-500">(Você)</span>
                                    )}
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>

            <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={'Adicionar Novo Usuário'}>
                {editingUser && (
                    <form onSubmit={handleSave} className="space-y-4">
                        <input type="text" placeholder="Nome de usuário" value={editingUser.username} onChange={e => setEditingUser(prev => prev ? {...prev, username: e.target.value} : prev)} className="w-full p-2 rounded bg-gray-700 focus:outline-none focus:ring-2 focus:ring-[#f58220]" required />
                        <input type="password" placeholder="Senha" value={editingUser.password} onChange={e => setEditingUser(prev => prev ? {...prev, password: e.target.value} : prev)} className="w-full p-2 rounded bg-gray-700 focus:outline-none focus:ring-2 focus:ring-[#f58220]" required />
                        <select value={editingUser.role} onChange={e => setEditingUser(prev => prev ? {...prev, role: e.target.value as any} : prev)} className="w-full p-2 rounded bg-gray-700 focus:outline-none focus:ring-2 focus:ring-[#f58220]">
                            <option value="basic">Básico</option>
                            <option value="admin">Administrador</option>
                        </select>
                        <div className="flex justify-end gap-2 pt-2">
                           <button type="button" onClick={handleCloseModal} className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded">Cancelar</button>
                           <button type="submit" className="bg-[#f58220] hover:opacity-90 text-white font-bold py-2 px-4 rounded">Salvar</button>
                        </div>
                    </form>
                )}
            </Modal>
            <ConfirmDeleteModal isOpen={isConfirmOpen} onClose={() => setIsConfirmOpen(false)} onConfirm={handleDelete} itemName={userToDelete?.username || ''}/>
        </>
    );
};

const ManageSettings: React.FC<Pick<AdminPanelProps, 'settings' | 'setSettings'>> = ({ settings, setSettings }) => {
    const { addToast } = useToast();
    const logoFileInputRef = useRef<HTMLInputElement>(null);

    const handleLayoutReset = () => {
        setSettings(prev => ({...prev, layoutOrder: DEFAULT_SETTINGS.layoutOrder }));
        addToast('Layout do mural foi restaurado para o padrão.', 'success');
    };
    
    const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            if (file.size > 500 * 1024) {
                addToast('O arquivo da logo deve ter menos de 500KB.', 'error');
                return;
            }

            const reader = new FileReader();
            reader.onloadend = () => {
                setSettings(prev => ({
                    ...prev,
                    footerSettings: { ...prev.footerSettings, logoUrl: reader.result as string }
                }));
                addToast('Logo atualizada com sucesso!', 'success');
            };
            reader.readAsDataURL(file);
        }
        if (logoFileInputRef.current) logoFileInputRef.current.value = "";
    };
    
    const componentNames: Record<MuralComponentId, string> = {
        ongoing: 'Cursos em Andamento',
        open: 'Matrículas Abertas',
        video: 'Vídeo Institucional',
        news: 'Notícias e Avisos'
    };

    return (
        <div className="space-y-8">
            {/* Carousel Settings */}
            <div className="bg-black/20 p-4 rounded-lg">
                <h3 className="text-xl font-bold mb-4 border-b border-white/20 pb-2">Configurações dos Carrosséis</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Open Enrollments Carousel */}
                    <div>
                        <h4 className="font-semibold text-lg mb-2">Matrículas Abertas</h4>
                        <div className="space-y-3">
                             <label className="block">
                                <span className="text-gray-300">Velocidade da Transição ({settings.openEnrollmentsCarousel.speed}s)</span>
                                <input type="range" min="3" max="30" value={settings.openEnrollmentsCarousel.speed} onChange={e => setSettings(prev => ({...prev, openEnrollmentsCarousel: {...prev.openEnrollmentsCarousel, speed: parseInt(e.target.value)}}))} className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-[#f58220]" />
                            </label>
                            <label className="block">
                                <span className="text-gray-300">Efeito de Transição</span>
                                <select value={settings.openEnrollmentsCarousel.transition} onChange={e => setSettings(prev => ({...prev, openEnrollmentsCarousel: {...prev.openEnrollmentsCarousel, transition: e.target.value as any}}))} className="w-full p-2 rounded bg-gray-700 focus:outline-none focus:ring-2 focus:ring-[#f58220] mt-1">
                                    <option value="slide">Deslizar</option>
                                    <option value="fade">Esmaecer</option>
                                </select>
                            </label>
                        </div>
                    </div>
                     {/* News Carousel */}
                     <div>
                        <h4 className="font-semibold text-lg mb-2">Notícias e Avisos</h4>
                        <div className="space-y-3">
                             <label className="block">
                                <span className="text-gray-300">Velocidade da Transição ({settings.newsCarousel.speed}s)</span>
                                <input type="range" min="3" max="30" value={settings.newsCarousel.speed} onChange={e => setSettings(prev => ({...prev, newsCarousel: {...prev.newsCarousel, speed: parseInt(e.target.value)}}))} className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-[#f58220]" />
                            </label>
                            <label className="block">
                                <span className="text-gray-300">Efeito de Transição</span>
                                <select value={settings.newsCarousel.transition} onChange={e => setSettings(prev => ({...prev, newsCarousel: {...prev.newsCarousel, transition: e.target.value as any}}))} className="w-full p-2 rounded bg-gray-700 focus:outline-none focus:ring-2 focus:ring-[#f58220] mt-1">
                                    <option value="slide">Deslizar</option>
                                    <option value="fade">Esmaecer</option>
                                </select>
                            </label>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 {/* Layout Settings */}
                <div className="bg-black/20 p-4 rounded-lg">
                    <h3 className="text-xl font-bold mb-4 border-b border-white/20 pb-2">Layout do Mural</h3>
                     <p className="text-sm text-gray-400 mb-2">Arraste e solte os painéis diretamente no mural para reordenar.</p>
                     <p className="mb-2 font-semibold">Ordem atual:</p>
                     <ol className="list-decimal list-inside bg-gray-800/50 p-2 rounded mb-4">
                        {settings.layoutOrder.map(id => <li key={id}>{componentNames[id]}</li>)}
                     </ol>
                     <button onClick={handleLayoutReset} className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded transition-colors w-full">
                        Restaurar Ordem Padrão
                    </button>
                </div>
                
                 {/* Footer Settings */}
                 <div className="bg-black/20 p-4 rounded-lg">
                    <h3 className="text-xl font-bold mb-4 border-b border-white/20 pb-2">Rodapé</h3>
                    <div className="space-y-4">
                        <h4 className="font-semibold">Exibir no Rodapé:</h4>
                        <label className="flex items-center gap-2 text-gray-200 cursor-pointer">
                            <input type="checkbox" checked={settings.footerSettings.showClock} onChange={e => setSettings(prev => ({...prev, footerSettings: {...prev.footerSettings, showClock: e.target.checked }}))} className="form-checkbox h-5 w-5 text-[#f58220] bg-gray-700 border-gray-600 rounded focus:ring-[#f58220]"/> 
                            Relógio e Data
                        </label>
                        
                        <div className="border-t border-white/10 pt-4">
                            <h4 className="font-semibold mb-2">Logo do Rodapé</h4>
                            
                            <div className="mb-3">
                                <label className="block text-gray-300 text-sm mb-1">URL da Logo</label>
                                <input 
                                    type="url" 
                                    value={settings.footerSettings.logoUrl || ''} 
                                    onChange={e => setSettings(prev => ({...prev, footerSettings: { ...prev.footerSettings, logoUrl: e.target.value }}))}
                                    className="w-full p-2 rounded bg-gray-700 focus:outline-none focus:ring-2 focus:ring-[#f58220]"
                                    placeholder="https://..."
                                />
                            </div>

                            <div className="flex items-center gap-2 mb-3">
                                <span className="text-sm text-gray-400">OU</span>
                                <input 
                                    type="file" 
                                    accept="image/*"
                                    ref={logoFileInputRef}
                                    onChange={handleLogoUpload}
                                    className="hidden" 
                                    id="logo-upload"
                                />
                                <label htmlFor="logo-upload" className="bg-blue-600 hover:bg-blue-700 text-white py-1 px-3 rounded cursor-pointer text-sm font-bold">
                                    Upload Imagem
                                </label>
                            </div>

                            <label className="flex items-center gap-2 text-gray-200 cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    checked={settings.footerSettings.forceWhiteLogo !== false} 
                                    onChange={e => setSettings(prev => ({...prev, footerSettings: {...prev.footerSettings, forceWhiteLogo: e.target.checked }}))} 
                                    className="form-checkbox h-5 w-5 text-[#f58220] bg-gray-700 border-gray-600 rounded focus:ring-[#f58220]"
                                /> 
                                <span>Forçar cor branca (Filtro)</span>
                            </label>
                            <p className="text-xs text-gray-400 mt-1">Marque se a logo enviada for colorida ou preta e você quiser ela branca no rodapé.</p>
                            
                            {settings.footerSettings.logoUrl && (
                                <div className="mt-2 p-2 bg-gray-800 rounded text-center">
                                    <p className="text-xs text-gray-400 mb-1">Pré-visualização:</p>
                                    <img 
                                        src={settings.footerSettings.logoUrl} 
                                        alt="Preview" 
                                        className={`h-12 mx-auto object-contain ${settings.footerSettings.forceWhiteLogo !== false ? 'brightness-0 invert' : ''}`}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const ManageSystem: React.FC<Pick<AdminPanelProps, 'currentUser'>> = () => {
    const { addToast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleBackup = () => {
        exportBackup();
        addToast('Arquivo de configuração baixado com sucesso!', 'success');
    };

    const handleRestore = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const result = await importBackup(file);
            if (result.success) {
                addToast(result.message, 'success');
                // Pequeno delay para permitir que o toast apareça antes do reload
                setTimeout(() => {
                    window.location.reload();
                }, 1500);
            } else {
                addToast(result.message, 'error');
            }
        }
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    return (
        <div className="bg-black/20 p-6 rounded-lg">
             <h3 className="text-2xl font-bold mb-4 border-b border-white/20 pb-2">Sincronização e Backup</h3>
             
             <div className="bg-gray-800/80 p-4 rounded border border-gray-600 mb-6">
                 <h5 className="font-bold text-yellow-500 mb-2 text-lg">ℹ️ Como atualizar o mural em outro computador?</h5>
                 <p className="text-gray-300 text-sm mb-3">
                    Como este sistema roda diretamente no navegador (sem servidor na nuvem), as alterações feitas no seu computador não aparecem automaticamente na recepção. Para atualizar a recepção:
                 </p>
                 <ol className="list-decimal list-inside text-gray-300 space-y-2 text-sm ml-2">
                     <li>Faça todas as edições necessárias neste painel.</li>
                     <li>Clique em <strong>"Baixar Arquivo de Sincronização"</strong> abaixo.</li>
                     <li>Leve o arquivo para o computador da recepção (via e-mail, pen drive ou rede).</li>
                     <li>No mural da recepção, acesse esta tela e clique em <strong>"Restaurar Backup"</strong>.</li>
                 </ol>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-blue-900/30 p-4 rounded-lg border border-blue-500/30">
                    <h4 className="text-xl font-semibold mb-2 text-blue-200">1. Exportar (No seu PC)</h4>
                    <p className="text-gray-300 mb-4 text-sm">
                        Gera um arquivo com todos os cursos e notícias atuais.
                    </p>
                    <button 
                        onClick={handleBackup}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded flex items-center justify-center gap-2 transition-all"
                    >
                        <span>⬇️</span> Baixar Arquivo de Sincronização
                    </button>
                </div>

                <div className="bg-green-900/30 p-4 rounded-lg border border-green-500/30">
                    <h4 className="text-xl font-semibold mb-2 text-green-200">2. Importar (Na Recepção)</h4>
                    <p className="text-gray-300 mb-4 text-sm">
                        Atualiza o mural com os dados do arquivo baixado.
                        <br/><span className="text-yellow-400 text-xs">* Substitui os dados atuais.</span>
                    </p>
                    <input 
                        type="file" 
                        accept=".json"
                        ref={fileInputRef}
                        onChange={handleRestore}
                        className="hidden"
                        id="backup-upload"
                    />
                    <label 
                        htmlFor="backup-upload"
                        className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded flex items-center justify-center gap-2 cursor-pointer transition-all"
                    >
                        <span>⬆️</span> Selecionar Arquivo e Restaurar
                    </label>
                </div>
             </div>
        </div>
    );
};

export default AdminPanel;
