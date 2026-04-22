import { useState, useEffect, useCallback } from 'react';
import { getHabits, createHabit, updateHabit, deleteHabit } from '../api';

export function useHabits() {
  const [habits, setHabits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchHabits = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getHabits();
      setHabits(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHabits();
  }, [fetchHabits]);

  const addHabit = async (habitData) => {
    const newHabit = await createHabit(habitData);
    setHabits((prev) => [...prev, newHabit]);
    return newHabit;
  };

  const editHabit = async (id, habitData) => {
    const updated = await updateHabit(id, habitData);
    setHabits((prev) => prev.map((h) => (h._id === id ? updated : h)));
    return updated;
  };

  const removeHabit = async (id) => {
    await deleteHabit(id);
    setHabits((prev) => prev.filter((h) => h._id !== id));
  };

  return { habits, loading, error, fetchHabits, addHabit, editHabit, removeHabit };
}
