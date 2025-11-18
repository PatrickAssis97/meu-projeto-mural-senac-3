
import React, { useState, useRef, useEffect } from 'react';
import { SENAC_COLORS, DEFAULT_SETTINGS } from '../constants';
import type { OpenEnrollmentCourse, OngoingCourse, NewsItem, User, CourseSchedule, AppSettings, MuralComponentId } from '../types';
import Modal from './Modal';
import WysiwygEditor from './WysiwygEditor';
import { useToast } from '../context/ToastContext';
import { findScheduleConflict } from '../services/scheduleService';
import { parseCoursesFromCSV } from '../services/csvParser';
import { saveVideoToDB, deleteVideoFromDB } from '../services/videoDB';


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

type AdminSection = 'enrollments' | 'ongoing' | 'news' | 'video' | 'users' | 'settings';

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
                Exportar
              </button>
               <button onClick={() => setIsImportModalOpen(true)} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded w-full sm:w-auto">
                Importar
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
                