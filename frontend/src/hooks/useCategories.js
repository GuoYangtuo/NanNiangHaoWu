import { useState, useEffect } from 'react';
import { getCategories } from '../api/category';

export const useCategories = () => {
  const [categories, setCategories] = useState([]);
  const [lockedIds, setLockedIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchCategories = async () => {
    try {
      const data = await getCategories();
      setCategories(data.data.categories || []);
      setLockedIds(data.data.lockedIds || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();

    const handleUpdate = () => fetchCategories();
    window.addEventListener('categories-updated', handleUpdate);
    return () => window.removeEventListener('categories-updated', handleUpdate);
  }, []);

  return { categories, lockedIds, loading, error };
};
