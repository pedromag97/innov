// Registo de histórico de alterações por trabalho.
// Aceita um client de transação (ou o pool via query).

export async function logHistory(client, { workId, userId, action, field, oldValue, newValue, note }) {
  await client.query(
    `INSERT INTO work_history (work_id, user_id, action, field, old_value, new_value, note)
     VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [workId, userId || null, action, field || null,
     oldValue != null ? String(oldValue) : null,
     newValue != null ? String(newValue) : null,
     note || null]
  );
}

// Compara dois objetos e regista uma linha de histórico por campo alterado.
export async function logDiff(client, { workId, userId, before, after, fields }) {
  for (const f of fields) {
    const oldV = before[f];
    const newV = after[f];
    if (String(oldV ?? '') !== String(newV ?? '')) {
      await logHistory(client, { workId, userId, action: 'UPDATE', field: f, oldValue: oldV, newValue: newV });
    }
  }
}
