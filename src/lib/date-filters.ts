export type DatePreset = 'all' | 'hj' | 'semana' | 'mes' | 'mes_passado' | 'custom';

export interface DateRange {
  startDate: string;
  endDate: string;
}

export function getDatePresetRange(preset: DatePreset, customStart: string = '', customEnd: string = ''): DateRange {
  const now = new Date();
  const todayStr = now.toISOString().substring(0, 10);

  if (preset === 'hj') {
    return { startDate: todayStr, endDate: todayStr };
  }

  if (preset === 'semana') {
    // Current week: Monday to Sunday
    const current = new Date(now);
    const day = current.getDay(); // 0 is Sunday
    const diffToMonday = current.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(current.setDate(diffToMonday));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    return {
      startDate: monday.toISOString().substring(0, 10),
      endDate: sunday.toISOString().substring(0, 10)
    };
  }

  if (preset === 'mes') {
    const year = now.getFullYear();
    const month = now.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    return {
      startDate: firstDay.toISOString().substring(0, 10),
      endDate: lastDay.toISOString().substring(0, 10)
    };
  }

  if (preset === 'mes_passado') {
    const year = now.getFullYear();
    const month = now.getMonth() - 1;
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    return {
      startDate: firstDay.toISOString().substring(0, 10),
      endDate: lastDay.toISOString().substring(0, 10)
    };
  }

  if (preset === 'custom') {
    return {
      startDate: customStart,
      endDate: customEnd
    };
  }

  return { startDate: '', endDate: '' };
}

export function isDateInRange(dateStr: string, range: DateRange): boolean {
  if (!dateStr) return true;
  const target = dateStr.substring(0, 10);

  if (range.startDate && target < range.startDate) return false;
  if (range.endDate && target > range.endDate) return false;

  return true;
}
