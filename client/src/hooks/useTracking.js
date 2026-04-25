import { useState, useEffect, useCallback } from 'react';
import { getTracking, setTrackingStatus, skipDay as skipDayAPI } from '../api';

// Returns YYYY-MM-DD in the USER'S LOCAL timezone (avoids UTC-shift bug)
function localDateStr(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Status cycle: missed → completed → skipped → missed
const STATUS_CYCLE = { missed: 'completed', completed: 'skipped', skipped: 'missed' };

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

  // ── Status helpers ──────────────────────────────────────────────────────────

  /**
   * Get the effective status of a habit on a date.
   * Handles backward-compat for old records that only have `completed: Boolean`.
   * @returns {'completed'|'missed'|'skipped'}
   */
  const getStatus = (habitId, dateStr) => {
    const record = records.find((r) => r.habitId === habitId && r.date === dateStr);
    if (!record) return 'missed';
    // Use server-resolved effectiveStatus if present (returned by enriched GET)
    if (record.effectiveStatus) return record.effectiveStatus;
    // Local fallback for optimistic updates
    if (record.status === 'completed' || record.status === 'skipped') return record.status;
    if (record.completed === true) return 'completed';
    return 'missed';
  };

  /** Returns true if a habit is completed on a date (legacy helper, still used widely) */
  const isCompleted = (habitId, dateStr) => getStatus(habitId, dateStr) === 'completed';

  /**
   * Returns true when ALL habits in the provided array are skipped for a date
   * and at least one was marked via a day-level skip.
   */
  const isDaySkipped = (dateStr, habits) => {
    if (!habits || habits.length === 0) return false;
    return habits.every((habit) => {
      const record = records.find((r) => r.habitId === habit._id && r.date === dateStr);
      return record && record.isDaySkipped === true;
    });
  };

  // ── Toggle (3-state cycle) ─────────────────────────────────────────────────

  /**
   * Cycle through: missed → completed → skipped → missed
   */
  const toggle = async (habitId, dateStr) => {
    const currentStatus = getStatus(habitId, dateStr);
    const nextStatus = STATUS_CYCLE[currentStatus] || 'completed';

    // Optimistic update
    setRecords((prev) => {
      const existing = prev.find((r) => r.habitId === habitId && r.date === dateStr);
      if (existing) {
        return prev.map((r) =>
          r.habitId === habitId && r.date === dateStr
            ? { ...r, status: nextStatus, effectiveStatus: nextStatus, completed: nextStatus === 'completed', isDaySkipped: false }
            : r
        );
      }
      return [...prev, { habitId, date: dateStr, status: nextStatus, effectiveStatus: nextStatus, completed: nextStatus === 'completed', isDaySkipped: false }];
    });

    try {
      const updated = await setTrackingStatus(habitId, dateStr, nextStatus);
      // Sync server response (in case it differs)
      setRecords((prev) =>
        prev.map((r) =>
          r.habitId === habitId && r.date === dateStr ? { ...r, ...updated } : r
        )
      );
    } catch (err) {
      console.error('Toggle error:', err.message);
      // Revert on error
      setRecords((prev) => {
        const existing = prev.find((r) => r.habitId === habitId && r.date === dateStr);
        if (existing) {
          return prev.map((r) =>
            r.habitId === habitId && r.date === dateStr
              ? { ...r, status: currentStatus, effectiveStatus: currentStatus, completed: currentStatus === 'completed' }
              : r
          );
        }
        return prev;
      });
    }
  };

  // ── Skip Day ───────────────────────────────────────────────────────────────

  /**
   * Mark all scheduled habits for a given date as skipped.
   * @param {string} dateStr  YYYY-MM-DD
   * @param {Array}  habits   array of habit objects that are scheduled for this day
   */
  const skipDay = async (dateStr, habits) => {
    if (!habits || habits.length === 0) return;
    const habitIds = habits.map((h) => h._id);

    // Optimistic update — set all to skipped
    setRecords((prev) => {
      const updated = [...prev];
      habitIds.forEach((habitId) => {
        const idx = updated.findIndex((r) => r.habitId === habitId && r.date === dateStr);
        const skippedRecord = { habitId, date: dateStr, status: 'skipped', effectiveStatus: 'skipped', completed: false, isDaySkipped: true };
        if (idx !== -1) {
          updated[idx] = { ...updated[idx], ...skippedRecord };
        } else {
          updated.push(skippedRecord);
        }
      });
      return updated;
    });

    try {
      const serverRecords = await skipDayAPI(dateStr, habitIds);
      // Merge server response
      setRecords((prev) => {
        const updated = [...prev];
        serverRecords.forEach((sr) => {
          const idx = updated.findIndex((r) => r.habitId === sr.habitId?.toString() && r.date === sr.date);
          const enriched = { ...sr, habitId: sr.habitId?.toString(), effectiveStatus: 'skipped' };
          if (idx !== -1) {
            updated[idx] = enriched;
          } else {
            updated.push(enriched);
          }
        });
        return updated;
      });
    } catch (err) {
      console.error('Skip day error:', err.message);
      // Revert on error — remove the optimistically added skipped records
      setRecords((prev) =>
        prev.filter((r) => !(habitIds.includes(r.habitId) && r.date === dateStr && r.isDaySkipped))
      );
    }
  };

  return { records, loading, isCompleted, getStatus, isDaySkipped, toggle, skipDay, fetchRecords };
}
