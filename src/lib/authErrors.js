const TRANSLATIONS = [
  { match: /email rate limit exceeded/i, message: 'Muitas tentativas de cadastro recente. Aguarde alguns minutos antes de tentar novamente.' },
  { match: /over_email_send_rate_limit|email.*rate.*limit/i, message: 'Limite de emails atingido. Aguarde alguns minutos.' },
  { match: /password should be at least|password is too short|weak password/i, message: 'A senha precisa ter pelo menos 6 caracteres.' },
  { match: /user already registered|already registered|user_already_exists/i, message: 'Já existe uma conta com este email.' },
  { match: /invalid login credentials/i, message: 'Email ou senha incorretos.' },
  { match: /email not confirmed/i, message: 'Confirme seu email antes de entrar. Verifique sua caixa de entrada.' },
  { match: /invalid email/i, message: 'Email inválido.' },
  { match: /signup is disabled/i, message: 'Cadastros estão temporariamente desabilitados.' },
  { match: /network request failed|failed to fetch/i, message: 'Sem conexão. Verifique sua internet e tente novamente.' },
  { match: /token has expired|jwt expired/i, message: 'Sessão expirada. Faça login novamente.' },
  { match: /captcha/i, message: 'Validação de segurança falhou. Recarregue a página e tente novamente.' },
  { match: /too many requests|429/i, message: 'Muitas requisições. Aguarde alguns segundos e tente de novo.' }
];

export function translateAuthError(error, fallback = 'Algo deu errado. Tente novamente.') {
  if (!error) return fallback;
  const raw = typeof error === 'string' ? error : (error.message || error.error_description || '');
  if (!raw) return fallback;

  for (const rule of TRANSLATIONS) {
    if (rule.match.test(raw)) return rule.message;
  }

  return raw;
}
