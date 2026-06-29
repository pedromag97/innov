import { useEffect, useState } from 'react';
import { api } from '../api.js';

const ROLES = [
  { value: 'ADMIN', label: 'Administrador' },
  { value: 'BACKOFFICE', label: 'Backoffice' },
  { value: 'FIELD', label: 'Equipa Terreno' },
];

// Ecrã de administração (ADMIN): gerir equipas e autorizar utilizadores.
export default function Admin() {
  const [teams, setTeams] = useState([]);
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('users');

  async function reload() {
    try {
      const [t, u] = await Promise.all([api.listTeams(), api.listUsers()]);
      setTeams(t.teams);
      setUsers(u.users);
      setError('');
    } catch (e) { setError(e.message); }
  }
  useEffect(() => { reload(); }, []);

  return (
    <div className="mx-auto max-w-4xl p-4 space-y-4">
      <div className="flex items-center gap-2">
        <h1 className="text-lg font-bold text-slate-800">Administração</h1>
        <div className="ml-auto flex rounded-lg border border-slate-300 overflow-hidden text-sm">
          <button onClick={() => setTab('users')} className={`px-3 py-1.5 ${tab === 'users' ? 'bg-brand text-white' : 'bg-white'}`}>Utilizadores</button>
          <button onClick={() => setTab('teams')} className={`px-3 py-1.5 ${tab === 'teams' ? 'bg-brand text-white' : 'bg-white'}`}>Equipas</button>
        </div>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}

      {tab === 'users'
        ? <UsersPanel users={users} teams={teams} onChange={reload} setError={setError} />
        : <TeamsPanel teams={teams} onChange={reload} setError={setError} />}
    </div>
  );
}

function UsersPanel({ users, teams, onChange, setError }) {
  const [form, setForm] = useState({ email: '', name: '', role: 'FIELD', team_id: '' });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function addUser(e) {
    e.preventDefault();
    try {
      await api.createUser({ ...form, team_id: form.team_id || null });
      setForm({ email: '', name: '', role: 'FIELD', team_id: '' });
      onChange();
    } catch (err) { setError(err.message); }
  }
  async function patch(id, body) {
    try { await api.updateUser(id, body); onChange(); }
    catch (err) { setError(err.message); }
  }

  return (
    <div className="space-y-4">
      {/* Form de provisionamento */}
      <form onSubmit={addUser} className="rounded-xl border border-slate-200 bg-white p-4 grid sm:grid-cols-5 gap-2 items-end">
        <label className="sm:col-span-2 block">
          <span className="block text-xs font-medium text-slate-500 mb-1">Email Google *</span>
          <input required type="email" value={form.email} onChange={set('email')} className="adm-inp" placeholder="pessoa@empresa.pt" />
        </label>
        <label className="block">
          <span className="block text-xs font-medium text-slate-500 mb-1">Nome</span>
          <input value={form.name} onChange={set('name')} className="adm-inp" />
        </label>
        <label className="block">
          <span className="block text-xs font-medium text-slate-500 mb-1">Role</span>
          <select value={form.role} onChange={set('role')} className="adm-inp">
            {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="block text-xs font-medium text-slate-500 mb-1">Equipa</span>
          <select value={form.team_id} onChange={set('team_id')} className="adm-inp">
            <option value="">—</option>
            {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </label>
        <button className="sm:col-span-5 justify-self-start rounded-lg bg-brand text-white px-4 py-2 text-sm font-medium hover:bg-brand-dark">
          Autorizar utilizador
        </button>
      </form>

      {/* Lista de utilizadores */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs">
            <tr>
              <th className="text-left p-2">Email</th>
              <th className="text-left p-2">Role</th>
              <th className="text-left p-2">Equipa</th>
              <th className="text-left p-2">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((u) => (
              <tr key={u.id} className={u.active ? '' : 'opacity-50'}>
                <td className="p-2">
                  <div className="font-medium text-slate-700">{u.email}</div>
                  {u.name && <div className="text-xs text-slate-400">{u.name}</div>}
                </td>
                <td className="p-2">
                  <select value={u.role} onChange={(e) => patch(u.id, { role: e.target.value })} className="adm-inp py-1">
                    {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                </td>
                <td className="p-2">
                  <select value={u.team_id || ''} onChange={(e) => patch(u.id, { team_id: e.target.value || null })} className="adm-inp py-1">
                    <option value="">—</option>
                    {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </td>
                <td className="p-2">
                  <button onClick={() => patch(u.id, { active: !u.active })}
                    className={`rounded px-2 py-1 text-xs ${u.active ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-600'}`}>
                    {u.active ? 'Ativo' : 'Inativo'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Styles />
    </div>
  );
}

function TeamsPanel({ teams, onChange, setError }) {
  const [form, setForm] = useState({ name: '', country: 'PT' });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function addTeam(e) {
    e.preventDefault();
    try { await api.createTeam(form); setForm({ name: '', country: 'PT' }); onChange(); }
    catch (err) { setError(err.message); }
  }
  async function patch(id, body) {
    try { await api.updateTeam(id, body); onChange(); }
    catch (err) { setError(err.message); }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={addTeam} className="rounded-xl border border-slate-200 bg-white p-4 flex flex-wrap gap-2 items-end">
        <label className="block flex-1 min-w-[180px]">
          <span className="block text-xs font-medium text-slate-500 mb-1">Nome da equipa *</span>
          <input required value={form.name} onChange={set('name')} className="adm-inp" placeholder="Equipa Norte" />
        </label>
        <label className="block">
          <span className="block text-xs font-medium text-slate-500 mb-1">País</span>
          <select value={form.country} onChange={set('country')} className="adm-inp">
            <option value="PT">Portugal</option>
            <option value="FR">França</option>
          </select>
        </label>
        <button className="rounded-lg bg-brand text-white px-4 py-2 text-sm font-medium hover:bg-brand-dark">Criar equipa</button>
      </form>

      <div className="rounded-xl border border-slate-200 bg-white divide-y divide-slate-100">
        {teams.map((t) => (
          <div key={t.id} className={`flex items-center gap-3 p-3 ${t.active ? '' : 'opacity-50'}`}>
            <span className="font-medium text-slate-700">{t.name}</span>
            <span className="text-xs rounded bg-slate-100 px-2 py-0.5 text-slate-500">{t.country}</span>
            <button onClick={() => patch(t.id, { active: !t.active })}
              className={`ml-auto rounded px-2 py-1 text-xs ${t.active ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-600'}`}>
              {t.active ? 'Ativa' : 'Inativa'}
            </button>
          </div>
        ))}
        {teams.length === 0 && <p className="p-3 text-sm text-slate-400">Sem equipas.</p>}
      </div>
      <Styles />
    </div>
  );
}

function Styles() {
  return <style>{`.adm-inp{width:100%;border:1px solid #cbd5e1;border-radius:.5rem;padding:.4rem .6rem;font-size:.875rem;background:#fff}
    .adm-inp:focus{outline:2px solid #1d4ed8;outline-offset:-1px}`}</style>;
}
