import type { OngoingCourse } from '../types';

interface CsvRow {
    room: string;
    courseName: string;
    block: string;
    dayOfWeek: string;
    startTime: string;
    endTime: string;
}

/**
 * Parses a CSV string into an array of OngoingCourse objects.
 * Groups multiple schedules for the same course.
 * @param csvText - The raw CSV string content.
 * @returns {{ courses: Omit<OngoingCourse, 'id'>[], errors: string[] }} - Parsed courses and a list of errors.
 */
export const parseCoursesFromCSV = (csvText: string): { courses: Omit<OngoingCourse, 'id'>[], errors: string[] } => {
    const lines = csvText.trim().split(/\r?\n/);
    if (lines.length < 2) {
        return { courses: [], errors: ["CSV vazio ou contém apenas o cabeçalho."] };
    }

    const header = lines[0].split(',').map(h => h.trim());
    const expectedHeaders = ['room', 'courseName', 'block', 'dayOfWeek', 'startTime', 'endTime'];
    
    // Validate headers
    const missingHeaders = expectedHeaders.filter(h => !header.includes(h));
    if (missingHeaders.length > 0) {
        return { courses: [], errors: [`Cabeçalhos ausentes no CSV: ${missingHeaders.join(', ')}`] };
    }

    const rows: CsvRow[] = [];
    const errors: string[] = [];

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (!line.trim()) continue; // Skip empty lines

        const values = line.split(',');
        const rowData = header.reduce((obj, col, index) => {
            obj[col] = values[index]?.trim() || '';
            return obj;
        }, {} as any);
        
        if (expectedHeaders.some(h => !rowData[h])) {
            errors.push(`Linha ${i + 1}: Contém valores vazios. Todos os campos são obrigatórios.`);
            continue;
        }

        rows.push(rowData as CsvRow);
    }

    if (errors.length > 0) {
        return { courses: [], errors };
    }

    // Group rows by course
    const courseMap = new Map<string, Omit<OngoingCourse, 'id'>>();
    
    rows.forEach((row, index) => {
        const courseKey = `${row.room}-${row.courseName}-${row.block}`.toLowerCase();
        
        const schedule = {
            dayOfWeek: parseInt(row.dayOfWeek, 10),
            startTime: row.startTime,
            endTime: row.endTime
        };

        if (isNaN(schedule.dayOfWeek) || schedule.dayOfWeek < 0 || schedule.dayOfWeek > 6) {
             errors.push(`Linha ${index + 2}: 'dayOfWeek' inválido (${row.dayOfWeek}). Use 0-6.`);
             return;
        }
        if (!/^\d{2}:\d{2}$/.test(schedule.startTime) || !/^\d{2}:\d{2}$/.test(schedule.endTime)) {
            errors.push(`Linha ${index + 2}: Formato de hora inválido. Use HH:mm.`);
            return;
        }

        if (courseMap.has(courseKey)) {
            courseMap.get(courseKey)!.schedules.push(schedule);
        } else {
            courseMap.set(courseKey, {
                room: row.room,
                courseName: row.courseName,
                block: row.block,
                schedules: [schedule]
            });
        }
    });

    if (errors.length > 0) {
        return { courses: [], errors };
    }

    return { courses: Array.from(courseMap.values()), errors: [] };
};
