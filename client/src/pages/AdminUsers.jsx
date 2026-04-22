import { useState, useEffect } from 'react';
import { getAdminUsers, makeAdmin, removeAdmin } from '../api';
import { useAuth } from '../context/AuthContext';

export default function AdminUsers() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState(null); // id currently being actioned
  const [toast, setToast] = useState(null);
  const [search, setSearch] = useState('');

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    getAdminUsers()
      .then(setUsers)
      .catch(() => showToast('Failed to load users', 'error'))
      .finally(() => setLoading(false));
  }, []);

  const handleMakeAdmin = async (id, name) => {
    setActionId(id);
    try {
      const updated = await makeAdmin(id);
      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...updated } : u)));
      showToast(`${name} is now an admin ✨`);
    } catch (e) {
      showToast(e.response?.data?.message || 'Error', 'error');
    } finally {
      setActionId(null);
    }
  };

  const handleRemoveAdmin = async (id, name) => {
    setActionId(id);
    try {
      const updated = await removeAdmin(id);
      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...updated } : u)));
      showToast(`${name} admin role removed`);
    } catch (e) {
      showToast(e.response?.data?.message || 'Error', 'error');
    } finally {
      setActionId(null);
    }
  };

  const filtered = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  if (loading)
    return <div className="spinner-wrapper"><div className="spinner" /></div>;

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div className="page-header-left">
          <h1>Users 👥</h1>
          <p>{users.length} registered user{users.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* Search */}
      <div className="admin-search-bar mb-16">
        <span className="admin-search-icon">🔍</span>
        <input
          className="admin-search-input"
          placeholder="Search by name or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* User Table */}
      <div className="admin-table-wrapper">
        <table className="admin-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Email</th>
              <th>Habits</th>
              <th>Joined</th>
              <th>Role</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="admin-empty-row">No users found</td>
              </tr>
            )}
            {filtered.map((u) => {
              const isMe = u.id === me?.id;
              const busy = actionId === u.id;
              return (
                <tr key={u.id} className={u.isAdmin ? 'admin-row-admin' : ''}>
                  <td>
                    <div className="admin-user-cell">
                      <div className="admin-avatar" style={{ background: u.isAdmin ? 'linear-gradient(135deg,#f472b6,#a78bfa)' : 'linear-gradient(135deg,#7c3aed,#a78bfa)' }}>
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="admin-user-name">{u.name}{isMe ? ' (you)' : ''}</span>
                    </div>
                  </td>
                  <td className="admin-email">{u.email}</td>
                  <td className="admin-center">{u.habitCount}</td>
                  <td className="admin-center admin-date">
                    {new Date(u.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>
                  <td className="admin-center">
                    <span className={`badge ${u.isAdmin ? 'badge-pink' : 'badge-purple'}`}>
                      {u.isAdmin ? '👑 Admin' : '👤 User'}
                    </span>
                  </td>
                  <td className="admin-center">
                    {isMe ? (
                      <span className="admin-you-tag">–</span>
                    ) : u.isAdmin ? (
                      <button
                        className="btn btn-ghost btn-sm"
                        disabled={busy}
                        onClick={() => handleRemoveAdmin(u.id, u.name)}
                      >
                        {busy ? '…' : 'Remove Admin'}
                      </button>
                    ) : (
                      <button
                        className="btn btn-primary btn-sm"
                        disabled={busy}
                        onClick={() => handleMakeAdmin(u.id, u.name)}
                      >
                        {busy ? '…' : '👑 Make Admin'}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Toast */}
      {toast && (
        <div className="toast-container">
          <div className={`toast ${toast.type}`}>
            {toast.type === 'success' ? '✅' : '❌'} {toast.msg}
          </div>
        </div>
      )}
    </div>
  );
}
