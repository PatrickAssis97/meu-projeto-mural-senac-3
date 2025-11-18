
import type { OpenEnrollmentCourse, OngoingCourse, NewsItem, AppSettings } from './types';

export const SENAC_COLORS = {
  blue: '#004586',
  orange: '#f58220',
  gray: '#666666',
  darkBlue: '#002b4f',
};

export const DEFAULT_VIDEO_URLS: string[] = ["https://videos.pexels.com/video-files/3209828/3209828-hd_1280_720_25fps.mp4"];

export const DEFAULT_SETTINGS: AppSettings = {
  layoutOrder: ['ongoing', 'open', 'video', 'news'],
  footerSettings: {
    showLogo: true,
    showClock: true,
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/5/5a/Sistema_Fecom%C3%A9rcio_MG_Sesc_Senac.svg',
    forceWhiteLogo: true,
  },
  openEnrollmentsCarousel: {
    speed: 12, // seconds
    transition: 'slide',
  },
  newsCarousel: {
    speed: 7, // seconds
    transition: 'slide',
  },
};

export const OPEN_ENROLLMENTS_COURSES: OpenEnrollmentCourse[] = [
  { id: '1', name: 'Técnico em Programação de Jogos Digitais', workload: 1000, startDate: '01/08/2024', endDate: '01/12/2025', schedule: '19:00 - 22:00', enrollmentUrl: 'https://www.senac.br/cursos/jogos-digitais', vacancies: 'available' },
  { id: '2', name: 'Técnico em Redes de Computadores', workload: 1000, startDate: '15/08/2024', endDate: '15/12/2025', schedule: '14:00 - 17:00', enrollmentUrl: 'https://www.senac.br/cursos/redes-computadores', vacancies: 'few' },
  { id: '3', name: 'Web Designer', workload: 240, startDate: '05/09/2024', endDate: '10/12/2024', schedule: '09:00 - 12:00', enrollmentUrl: 'https://www.senac.br/cursos/web-designer', vacancies: 'available' },
  { id: '4', name: 'Marketing de Conteúdo para Mídias Sociais', workload: 40, startDate: '10/09/2024', endDate: '25/09/2024', schedule: '19:00 - 22:00', enrollmentUrl: 'https://www.senac.br/cursos/marketing-conteudo', vacancies: 'few' },
  { id: '5', name: 'Técnico em Enfermagem', workload: 1800, startDate: '02/08/2024', endDate: '02/08/2026', schedule: '08:00 - 12:00', enrollmentUrl: 'https://www.senac.br/cursos/enfermagem', vacancies: 'available' },
  { id: '6', name: 'Cibersegurança', workload: 160, startDate: '20/08/2024', endDate: '30/11/2024', schedule: '19:00 - 22:00', enrollmentUrl: 'https://www.senac.br/cursos/ciberseguranca', vacancies: 'filled' },
];

export const ONGOING_COURSES_DATA: OngoingCourse[] = [
    // Manhã (08:00 - 12:00)
    { id: '101', block: 'A', room: "Sala 101", courseName: "Design Gráfico", schedules: [{ dayOfWeek: 1, startTime: "08:00", endTime: "12:00" }, { dayOfWeek: 3, startTime: "08:00", endTime: "12:00" }] },
    { id: '102', block: 'A', room: "Sala 102", courseName: "Téc. Enfermagem", schedules: [{ dayOfWeek: 1, startTime: "08:00", endTime: "12:00" }, { dayOfWeek: 2, startTime: "08:00", endTime: "12:00" }, { dayOfWeek: 4, startTime: "08:00", endTime: "12:00" }] },
    { id: '103', block: 'B', room: "Sala 201", courseName: "Gestão de Pessoas", schedules: [{ dayOfWeek: 5, startTime: "09:00", endTime: "11:00" }] },
    
    // Tarde (14:00 - 17:00)
    { id: '201', block: 'B', room: "Sala 103", courseName: "Logística", schedules: [{ dayOfWeek: 2, startTime: "14:00", endTime: "17:00" }, { dayOfWeek: 4, startTime: "14:00", endTime: "17:00" }] },
    { id: '202', block: 'C', room: "Sala 202", courseName: "Excel Avançado", schedules: [{ dayOfWeek: 1, startTime: "13:30", endTime: "17:30" }, { dayOfWeek: 3, startTime: "13:30", endTime: "17:30" }] },
    { id: '203', block: 'A', room: "Sala 203", courseName: "Redes de Comp.", schedules: [{ dayOfWeek: 1, startTime: "14:00", endTime: "17:00" }, { dayOfWeek: 2, startTime: "14:00", endTime: "17:00" }, { dayOfWeek: 3, startTime: "14:00", endTime: "17:00" }] },

    // Noite (19:00 - 22:00)
    { id: '301', block: 'A', room: "Sala 101", courseName: "Inglês Interm.", schedules: [{ dayOfWeek: 1, startTime: "19:00", endTime: "22:00" }, { dayOfWeek: 3, startTime: "19:00", endTime: "22:00" }] },
    { id: '302', block: 'B', room: "Sala 102", courseName: "Prog. de Jogos", schedules: [{ dayOfWeek: 2, startTime: "19:00", endTime: "22:00" }, { dayOfWeek: 4, startTime: "19:00", endTime: "22:00" }] },
    { id: '303', block: 'C', room: "Sala 201", courseName: "Cibersegurança", schedules: [{ dayOfWeek: 1, startTime: "18:30", endTime: "22:30" }] },
    { id: '304', block: 'C', room: "Sala 204", courseName: "Marketing Digital", schedules: [{ dayOfWeek: 5, startTime: "19:00", endTime: "21:00" }] },
];


export const NEWS_ITEMS_DATA: NewsItem[] = [
  { id: 'n1', title: 'Inscrições Abertas para o Vestibular 2024/2', content: 'Não perca a chance de estudar no Senac. Inscreva-se já e transforme seu futuro profissional.', urgent: false },
  { id: 'n2', title: 'Semana da Tecnologia', content: 'Participe de palestras e workshops com grandes nomes do mercado de TI. De 15 a 19 de Agosto.', urgent: false },
  { id: 'n3', title: 'Feira de Empregabilidade', content: 'Conecte-se com as melhores empresas da região e encontre a sua vaga dos sonhos. Dia 25 de Setembro.', urgent: false },
  { id: 'n4', title: 'AVISO URGENTE: Manutenção do Sistema', content: 'O sistema acadêmico estará indisponível no próximo sábado para manutenções programadas.', urgent: true },
];
