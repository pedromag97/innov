import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { ROLES, ROLE_LABELS } from '../roles.js';

// Ecrã de administração (ADMIN): gerir utilizadores, equipas e departamentos,
// com atribuição de âmbito (países p/ BACKOFFICE, departamentos p/ CDT, equipa p/ TERRENO).
export default function Admin() {
  const [teams, setTeams] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('users');

  async function reload() {
    try {
      const [t, d, u] = await Promise.all([api.listTeams(), api.listDepartments(), api.listUsers()]);
      setTeams(t.teams); setDepartments(d.departments); setUsers(u.users); setError('');
    } catch (e) { setError(e.message); }
  }
  useEffect(() => { reload(); }, []);

  const Tab = ({ id, label }) => (
    <button onClick={() => setTab(id)} className={`px-3 py-1.5 ${tab === id ? 'bg-brand text-white' : 'bg-white'}`}>{label}</button>
  );

  return (
    <div className="mx-auto max-w-4xl p-4 space-y-4">
      <div className="flex items-center gap-2">
        <h1 className="text-lg font-bold text-slate-800">Administração</h1>
        <div className="ml-auto flex rounded-lg border border-slate-300 overflow-hidden text-sm">
          <Tab id="users" label="Utilizadores" />
          <Tab id="teams" label="Equipas" />
          <Tab id="departments" label="Departamentos" />
        </div>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}

      {tab === 'users' && <UsersPanel users={users} teams={teams} departments={departments} onChange={reload} setError={setError} />}
      {tab === 'teams' && <TeamsPanel teams={teams} onChange={reload} setError={setError} />}
      {tab === 'departments' && <DepartmentsPanel departments={departments} onChange={reload} setError={setError} />}
      <Styles />
    </div>
  );
}

const COUNTRIES = [{ code: 'PT', label: 'Portugal' }, { code: 'FR', label: 'França' }];
const EMPTY_USER = { id: null, email: '', name: '', role: 'TERRENO', team_id: '', countries: [], department_ids: [] };

function UsersPanel({ users, teams, departments, onChange, setError }) {
  const [form, setForm] = useState(EMPTY_USER);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const toggle = (k, val) => setForm((f) => ({
    ...f, [k]: f[k].includes(val) ? f[k].filter((x) => x !== val) : [...f[k], val],
  }));
  const reset = () => setForm(EMPTY_USER);

  function edit(u) {
    setForm({
      id: u.id, email: u.email, name: u.name || '', role: u.role,
      team_id: u.team_id || '', countries: u.countries || [], department_ids: u.department_ids || [],
    });
  }

  async function save(e) {
    e.preventDefault();
    const body = {
      email: form.email, name: form.name, role: form.role,
      team_id: form.role === 'TERRENO' ? (form.team_id || null) : null,
      countries: form.role === 'BACKOFFICE' ? form.countries : [],
      department_ids: form.role === 'CDT' ? form.department_ids : [],
    };
    try {
      if (form.id) await api.updateUser(form.id, body);
      else await api.createUser(body);
      reset(); onChange();
    } catch (err) { setError(err.message); }
  }
  async function patch(id, b) { try { await api.updateUser(id, b); onChange(); } catch (e) { setError(e.message); } }

  const deptName = (id) => departments.find((d) => d.id === id)?.name || id;
  const scopeText = (u) => {
    if (u.role === 'BACKOFFICE') return (u.countries || []).join(', ') || '— sem país —';
    if (u.role === 'CDT') return (u.department_ids || []).map(deptName).join(', ') || '— sem dept —';
    if (u.role === 'TERRENO') return u.team_name || '— sem equipa —';
    return 'PT + FR (tudo)';
  };

  return (
    <div className="space-y-4">
      {/* Form de criar/editar */}
      <form onSubmit={save} className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-slate-700 text-sm">{form.id ? 'Editar utilizador' : 'Autorizar novo utilizador'}</h2>
          {form.id && <button type="button" onClick={reset} className="text-xs text-slate-500 underline">cancelar edição</button>}
        </div>
        <div className="grid sm:grid-cols-3 gap-2">
          <label className="block sm:col-span-2">
            <span className="lbl">Email Google *</span>
            <input required type="email" value={form.email} onChange={set('email')} disabled={!!form.id} className="adm-inp" placeholder="pessoa@empresa.pt" />
          </label>
          <label className="block">
            <span className="lbl">Nome</span>
            <input value={form.name} onChange={set('name')} className="adm-inp" />
          </label>
          <label className="block">
            <span className="lbl">Papel</span>
            <select value={form.role} onChange={set('role')} className="adm-inp">
              {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
            </select>
          </label>

          {/* Âmbito conforme o papel */}
          {form.role === 'BACKOFFICE' && (
            <div className="sm:col-span-2">
              <span className="lbl">Países (âmbito)</span>
              <div className="flex gap-3 mt-1">
                {COUNTRIES.map((c) => (
                  <label key={c.code} className="flex items-center gap-1 text-sm">
                    <input type="checkbox" checked={form.countries.includes(c.code)} onChange={() => toggle('countries', c.code)} />
                    {c.label}
                  </label>
                ))}
              </div>
            </div>
          )}
          {form.role === 'CDT' && (
            <div className="sm:col-span-2">
              <span className="lbl">Departamentos (âmbito)</span>
              <div className="flex flex-wrap gap-3 mt-1">
                {departments.map((d) => (
                  <label key={d.id} className="flex items-center gap-1 text-sm">
                    <input type="checkbox" checked={form.department_ids.includes(d.id)} onChange={() => toggle('department_ids', d.id)} />
                    {d.name} <span className="text-slate-400">({d.country})</span>
                  </label>
                ))}
              </div>
            </div>
          )}
          {form.role === 'TERRENO' && (
            <label className="block sm:col-span-2">
              <span className="lbl">Equipa</span>
              <select value={form.team_id} onChange={set('team_id')} className="adm-inp">
                <option value="">— escolher equipa —</option>
                {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </label>
          )}
        </div>
        <button className="rounded-lg bg-brand text-white px-4 py-2 text-sm font-medium hover:bg-brand-dark">
          {form.id ? 'Guardar alterações' : 'Autorizar utilizador'}
        </button>
      </form>

      {/* Lista */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs">
            <tr><th className="text-left p-2">Email</th><th className="text-left p-2">Papel</th><th className="text-left p-2">Âmbito</th><th className="text-left p-2">Estado</th><th></th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((u) => (
              <tr key={u.id} className={u.active ? '' : 'opacity-50'}>
                <td className="p-2"><div className="font-medium text-slate-700">{u.email}</div>{u.name && <div className="text-xs text-slate-400">{u.name}</div>}</td>
                <td className="p-2">{ROLE_LABELS[u.role] || u.role}</td>
                <td className="p-2 text-xs text-slate-500">{scopeText(u)}</td>
                <td className="p-2">
                  <button onClick={() => patch(u.id, { active: !u.active })}
                    className={`rounded px-2 py-1 text-xs ${u.active ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-600'}`}>
                    {u.active ? 'Ativo' : 'Inativo'}
                  </button>
                </td>
                <td className="p-2 text-right"><button onClick={() => edit(u)} className="text-xs text-brand underline">editar</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TeamsPanel({ teams, onChange, setError }) {
  const [form, setForm] = useState({ name: '', country: 'PT' });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  async function add(e) { e.preventDefault(); try { await api.createTeam(form); setForm({ name: '', country: 'PT' }); onChange(); } catch (err) { setError(err.message); } }
  async function patch(id, b) { try { await api.updateTeam(id, b); onChange(); } catch (e) { setError(e.message); } }
  return (
    <div className="space-y-4">
      <form onSubmit={add} className="rounded-xl border border-slate-200 bg-white p-4 flex flex-wrap gap-2 items-end">
        <label className="block flex-1 min-w-[180px]"><span className="lbl">Nome da equipa *</span><input required value={form.name} onChange={set('name')} className="adm-inp" placeholder="VALTER RIBEIRO" /></label>
        <label className="block"><span className="lbl">País</span><select value={form.country} onChange={set('country')} className="adm-inp"><option value="PT">Portugal</option><option value="FR">França</option></select></label>
        <button className="rounded-lg bg-brand text-white px-4 py-2 text-sm font-medium hover:bg-brand-dark">Criar equipa</button>
      </form>
      <div className="rounded-xl border border-slate-200 bg-white divide-y divide-slate-100">
        {teams.map((t) => (
          <div key={t.id} className={`flex items-center gap-3 p-3 ${t.active ? '' : 'opacity-50'}`}>
            <span className="font-medium text-slate-700">{t.name}</span>
            <span className="text-xs rounded bg-slate-100 px-2 py-0.5 text-slate-500">{t.country}</span>
            <button onClick={() => patch(t.id, { active: !t.active })} className={`ml-auto rounded px-2 py-1 text-xs ${t.active ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-600'}`}>{t.active ? 'Ativa' : 'Inativa'}</button>
          </div>
        ))}
        {teams.length === 0 && <p className="p-3 text-sm text-slate-400">Sem equipas.</p>}
      </div>
    </div>
  );
}

function DepartmentsPanel({ departments, onChange, setError }) {
  const [form, setForm] = useState({ code: '', name: '', country: 'FR' });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  async function add(e) { e.preventDefault(); try { await api.createDepartment(form); setForm({ code: '', name: '', country: 'FR' }); onChange(); } catch (err) { setError(err.message); } }
  async function patch(id, b) { try { await api.updateDepartment(id, b); onChange(); } catch (e) { setError(e.message); } }
  return (
    <div className="space-y-4">
      <form onSubmit={add} className="rounded-xl border border-slate-200 bg-white p-4 flex flex-wrap gap-2 items-end">
        <label className="block"><span className="lbl">Código *</span><input required value={form.code} onChange={set('code')} className="adm-inp" placeholder="ERT45" /></label>
        <label className="block flex-1 min-w-[140px]"><span className="lbl">Nome *</span><input required value={form.name} onChange={set('name')} className="adm-inp" placeholder="ERT 45" /></label>
        <label className="block"><span className="lbl">País</span><select value={form.country} onChange={set('country')} className="adm-inp"><option value="FR">França</option><option value="PT">Portugal</option></select></label>
        <button className="rounded-lg bg-brand text-white px-4 py-2 text-sm font-medium hover:bg-brand-dark">Criar departamento</button>
      </form>
      <div className="rounded-xl border border-slate-200 bg-white divide-y divide-slate-100">
        {departments.map((d) => (
          <div key={d.id} className={`flex items-center gap-3 p-3 ${d.active ? '' : 'opacity-50'}`}>
            <span className="font-medium text-slate-700">{d.name}</span>
            <span className="text-xs rounded bg-slate-100 px-2 py-0.5 text-slate-500">{d.code} · {d.country}</span>
            <button onClick={() => patch(d.id, { active: !d.active })} className={`ml-auto rounded px-2 py-1 text-xs ${d.active ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-600'}`}>{d.active ? 'Ativo' : 'Inativo'}</button>
          </div>
        ))}
        {departments.length === 0 && <p className="p-3 text-sm text-slate-400">Sem departamentos.</p>}
      </div>
    </div>
  );
}

function Styles() {
  return <style>{`.adm-inp{width:100%;border:1px solid #cbd5e1;border-radius:.5rem;padding:.4rem .6rem;font-size:.875rem;background:#fff}
    .adm-inp:focus{outline:2px solid #1d4ed8;outline-offset:-1px}
    .lbl{display:block;font-size:.7rem;font-weight:500;color:#64748b;margin-bottom:.25rem}`}</style>;
}
