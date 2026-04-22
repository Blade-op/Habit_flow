import { useState, useEffect, useCallback } from 'react';
import { getTracking, toggleTracking } from '../api';

// Returns YYYY-MM-DD in the USER'S LOCAL timezone (avoids UTC-shift bug)
function localDateStr(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function useTracking(startDate, endDate) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchRecords = useCallback(async () => {
    if (!startDate || !endDate) return;
    try {
      setLoading(true);
      const data = await getTracking(startDate, endDate);
      setRecords(data);
    } catch (err) {
      console.error('Tracking fetch error:', err.message);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const isCompleted = (habitId, dateStr) => {
    return records.some(
      (r) => r.habitId === habitId && r.date === dateStr && r.completed
    );
  };


  const toggle = async (habitId, dateStr) => {
    const currentStatus = isCompleted(habitId, dateStr);
    const newStatus = !currentStatus;

    // Optimistic update
    setRecords((prev) => {
      const existing = prev.find((r) => r.habitId === habitId && r.date === dateStr);
      if (existing) {
        return prev.map((r) =>
          r.habitId === habitId && r.date === dateStr ? { ...r, completed: newStatus } : r
        );
      }
      return [...prev, { habitId, date: dateStr, completed: newStatus }];
    });

    try {
      await toggleTracking(habitId, dateStr, newStatus);
    } catch (err) {
      // Revert on error
      console.error('Toggle error:', err.message);
      setRecords((prev) => {
        const existing = prev.find((r) => r.habitId === habitId && r.date === dateStr);
        if (existing) {
          return prev.map((r) =>
            r.habitId === habitId && r.date === dateStr ? { ...r, completed: currentStatus } : r
          );
        }
        return prev;
      });
    }
  };

  return { records, loading, isCompleted, toggle, fetchRecords };
}
