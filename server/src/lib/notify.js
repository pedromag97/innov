// Notificação ao backoffice quando uma equipa submete um retorno.
//
// Dois canais (ambos opcionais / com degradação suave):
//   1. In-app: a própria submissão fica visível no histórico/lista de retornos
//      do backoffice (sempre disponível, sem config).
//   2. Telegram: se TELEGRAM_BOT_TOKEN + TELEGRAM_BACKOFFICE_CHAT_ID estiverem
//      definidos, envia uma mensagem (reutiliza o bot do maganalysis).
import config from '../config.js';
import { stateLabel } from './states.js';

export async function notifyBackofficeReturn({ work, ret, teamName, userName }) {
  const lines = [
    '🔧 Novo retorno de trabalho',
    `Ordem: ${work.id_ordem} — ${work.denominacao}`,
    `Equipa: ${teamName || '—'}${userName ? ` (${userName})` : ''}`,
    `Estado: ${stateLabel(ret.prev_estado)} → ${stateLabel(ret.new_estado)}`,
    ret.observacoes ? `Obs: ${ret.observacoes}` : null,
    ret.gps_lat != null ? `GPS: ${ret.gps_lat.toFixed(5)}, ${ret.gps_lng.toFixed(5)}` : null,
  ].filter(Boolean);
  const text = lines.join('\n');

  if (config.telegramBotToken && config.telegramBackofficeChatId) {
    try {
      await fetch(`https://api.telegram.org/bot${config.telegramBotToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: config.telegramBackofficeChatId, text }),
      });
    } catch (err) {
      console.warn('[notify] telegram falhou:', err.message);
    }
  } else {
    console.log('[notify]\n' + text);
  }
}
