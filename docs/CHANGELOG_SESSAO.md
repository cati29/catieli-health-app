# Histórico do que foi feito nesta sessão

Documento simples, em ordem cronológica. Cada item descreve o que mudou e por quê.

---

## 1. Setup inicial do projeto

- Extraí o `health-app.zip` para `/Users/fernando/Documents/Projetos/Catieli/health-app/`.
- Restaurei as permissões de execução em `node_modules/.bin/*` (o zip remove o bit de exec).
- Instalei o módulo nativo que faltava: `@rollup/rollup-darwin-arm64`.
- Subi o dev server (`npm run dev`) na porta 5173.

## 2. Trocou as credenciais do Supabase

- O projeto antigo (`adbswibdazbirlfjlcqd.supabase.co`) tinha sido deletado — o DNS já não resolvia.
- Você passou as credenciais do projeto novo (anon, service_role, publishable e secret keys).
- Decodifiquei o JWT pra extrair o project ref correto (`zpoioviumbbuihegzpwb`) — você tinha digitado faltando uma letra.
- Atualizei o `.env.local` com tudo: URL, anon, service role, publishable, secret, project ref.

## 3. Corrigi o bug de cadastro (signUp)

- O fluxo antigo tentava login automático logo depois do signUp; com a confirmação de email ativada no Supabase, isso falhava com 400.
- Refatorei `Register.jsx`: quando `session` vem nula, salvo os dados de perfil no `localStorage` e mostro a tela "Confirme seu email".
- Em `Login.jsx`, após login bem-sucedido, finalizo o perfil que ficou pendente em `localStorage`.

## 4. Detecção de email já cadastrado

- O Supabase com proteção anti-enumeração não retorna erro quando o email já existe (retorna 200 OK silencioso).
- Adicionei em `appClient.signUp` a detecção via `data.user.identities.length === 0` e lanço um erro claro: "Este email já está cadastrado".

## 5. Criei a página de reset de senha

- Antes, o link de reset apontava pra `/Login`, que não fazia nada com o token.
- Criei `src/pages/ResetPassword.jsx` que detecta o token de recovery no hash da URL.
- Adicionei `appClient.auth.updatePassword(newPassword)` que chama `supabase.auth.updateUser({password})`.
- Atualizei `requestPasswordReset` pra redirecionar pra `/ResetPassword`.
- Registrei a rota em `pages.config.js` e marquei como pública em `App.jsx`.

## 6. Subi o site no Firebase Hosting

- Firebase CLI já estava instalado.
- Adicionei sua conta `catieligama29@gmail.com` via `firebase login:add`.
- Criei o projeto `healthcg` no Firebase via CLI.
- Configurei `firebase.json` (SPA-friendly, cache longo nos assets) e `.firebaserc`.
- Build com Vite + deploy → **https://healthcg.web.app** funcionando.
- Salvei a preferência "sempre fazer deploy depois de mudanças" na memória.
- Adicionei script `npm run deploy` (build + firebase deploy).

## 7. Resetei a senha da conta de teste

- `catieligama29@gmail.com` → senha `C2t3l10!` (via service_role API).

## 8. Logo HEALTH APP no menu

- Você queria só o coração no menu, sem o texto "HEALTH APP".
- Passei `showText={false}` no `Logo` em 3 lugares: header mobile, sidebar desktop e drawer mobile.

## 9. Centralizei o coração

- Reorganizei o flex dos 3 menus pra centralizar o ícone do coração com spacers nas laterais.

## 10. Criei a conta de nutricionista

- `jhenniffer_lopes@icloud.com` → senha `C2t3l10!` (via service_role API).
- `user_metadata.role = 'nutritionist'`.
- Criei o `UserProfile` com `user_type: 'nutritionist'`, `crm_nutrition` placeholder, etc.

## 11. Roteamento por papel

- O login mandava todo mundo pra `/Home` (página de atleta).
- `Login.jsx` agora consulta o perfil após login e manda nutricionista pra `/NutritionistDashboard`.
- `Home.jsx` ganhou guard: se for nutri, redireciona pra dashboard e retorna `null` pra evitar flash.

## 12. Fluxo completo do nutricionista (planejamento aprovado e executado)

Regras de negócio implementadas:

- Atleta vê todos os nutricionistas (página `Nutritionists` intacta pra atleta).
- Nutri **não** vê página `Nutritionists` (redirecionada pra dashboard).
- Nutri **não** consegue criar `Conversation` (bloqueio em `appClient.create` quando `entityName === 'Conversation'` e role é nutri).
- Nutri só vê pacientes com `Conversation.status='accepted'`.

Implementação:

- Criei `src/hooks/useActivePatients.js` com 2 hooks: `useActivePatients` (lista pacientes aceitos) e `usePendingPatientRequests` (pedidos pendentes).
- `NutritionistDashboard.jsx`: nova seção "Pedidos Pendentes" no topo, com botões Aceitar / Recusar; mutations chamam `Conversation.update({status})`.
- `RoutineBuilder.jsx`: detecta nutri e mostra dropdown "Atribuir a paciente"; ao salvar, marca `patient_id`, `nutritionist_id`, `user_id` = email do paciente.
- `PatientDetails.jsx`: botão "+ Novo treino para este paciente" + nova seção "Treinos Atribuídos".
- `WorkoutTracker.jsx`: badge roxa "Nutricionista" nos treinos atribuídos.
- Realtime via Supabase no Dashboard pra empurrar pedidos novos.

## 13. Escondi XP/Nível pra nutricionista

- Gamification é só pra atleta. Antes a nutri via "Nível 1 - 0 XP" na sidebar.
- `Layout.jsx`: sidebar mostra CRN da nutri no lugar do nível; barra de XP escondida.
- `Profile.jsx`: badge muda pra "Nutricionista • CRN-XXX" (roxo) quando nutri. AvatarEvolution só renderiza pra atleta.

## 14. Refatorei o sistema de XP/Nível

Problema: o cálculo de nível estava espalhado em 3 lugares e a curva era linear (100 XP por nível) — pulava nível com 1 missão.

- Criei `src/lib/leveling.js` como fonte única: `levelFromXp`, `progressInLevel`, `applyXpGain`, `xpForLevelStep`, `totalXpForLevel`.
- **Curva triangular nova**: L2 = 100 XP, L3 = 300 XP, L5 = 1000 XP, L10 = 4500 XP, L20 = 19000 XP. Progresso real dentro de cada nível.
- `ProgressionService.jsx`, `AchievementSystem.jsx`, `Home.jsx` (optimistic), `Layout.jsx` (barra) agora usam a lib.
- Invalidação ampliada: ao ganhar XP, invalida `userProfile`, `activeMissions`, `streakStats`, `badges`, `leaderboard` — fim da inconsistência entre páginas.

## 15. Edição de perfil

- `Profile.jsx`:
  - Campo email mostrado como read-only ("O email não pode ser alterado").
  - Botão "Trocar senha" abre dialog com 3 campos: senha atual, nova, confirmar.
  - Valida senha atual reautenticando, depois chama `supabase.auth.updateUser({password})`.
  - Regex força: 8+ chars + maiúscula + minúscula + número + símbolo.
  - Botão "Customizar avatar" logo abaixo do AvatarEvolution (só atleta).
- `AvatarCustomization.jsx`: adicionado `onError` que mostra toast — antes o save falhava silenciosamente.

## 16. Auditoria das features

- Disparei agente que mapeou status de **todas as 15 telas do atleta** com avaliação ✅/⚠️/❌.
- Identifiquei: wearables são mock (`Math.random`), pagamento é fake, exports não funcionavam, realtime era genérico.
- Listei o que falta no lado nutricionista pra cada feature.

## 17. Rodada 1 — Comunicação fim-a-fim

- 7 novos templates de notificação em `NotificationHelper.jsx`:
  - `newPatientRequest` (paciente → nutri)
  - `requestAccepted`, `requestDeclined` (nutri → paciente)
  - `workoutAssigned`, `mealPlanAssigned` (nutri → paciente)
  - `workoutUpdated`, `mealPlanUpdated` (nutri → paciente)
  - `newPatientMessage`, `newNutritionistMessage` (cross-side)
- Acionamentos:
  - `Nutritionists.jsx`: notifica nutri quando atleta inicia conversa.
  - `NutritionistDashboard.jsx`: notifica paciente ao aceitar/recusar pedido.
  - `RoutineBuilder.jsx`: notifica paciente ao atribuir treino.
  - `Chat.jsx`: notifica receiver quando msg é enviada em conversa accepted.
- **PDF de relatório** por paciente em `PatientDetails.jsx` usando `jspdf`: peso, metas, treinos, sessões, nutrição.
- **Realtime no Chat**: polling reduzido (12s/10s) — Supabase realtime já cobre o push imediato.

## 18. Rodada 2 — Widgets do paciente em PatientDetails

Três cards novos pra a nutri ver de relance:

- **Nutrição — média 7 dias**: calorias, proteína, carbs, gorduras.
- **Wearable & Saúde**: status conectado/desconectado, passos médios, FC média, última sync.
- **Aderência aos treinos (14d)**: cruza `assignedWorkouts.days_per_week × 2` com sessões executadas; barra colorida (verde ≥75%, amarela 40–74%, vermelha <40%).

---

## O que ainda falta (não foi feito)

### Rodada 3 — Operações
- Editar treino existente no `RoutineBuilder` (carregar via `?id=`).
- Ativar o `NotificationScheduler` de verdade (renderiza mas não dispara).
- Refinar `RealtimeQuerySync` global (hoje invalida tudo a cada mudança em qualquer tabela).
- Salvar preferências em `/NotificationSettings`.

### Rodada 4 — Comercial e integrações reais
- Stripe **de verdade** em `/Plans` (hoje o pagamento é fake).
- Wearables OAuth real (Apple Health, Google Fit) — hoje é `Math.random()`.

### Itens da auditoria ainda em aberto
- Criar grupo (atleta só consegue entrar nos existentes).
- Trending sem decay temporal no `/SocialFeed`.
- Moderação dos `Groups`.
- `Subscription.end_date` não é verificado em lugar nenhum.
- Notas privadas do nutricionista sobre o paciente.
- Privacy settings do Profile estão parciais.

---

## Contas de teste

- **Atleta**: `catieligama29@gmail.com` / `C2t3l10!`
- **Nutricionista**: `jhenniffer_lopes@icloud.com` / `C2t3l10!`

## URLs

- **Dev local**: http://localhost:5173
- **Produção**: https://healthcg.web.app
- **Firebase Console**: https://console.firebase.google.com/project/healthcg/overview
- **Supabase Project**: `zpoioviumbbuihegzpwb`

## Para rodar e deployar

```bash
npm run dev      # dev server
npm run deploy   # build + firebase deploy (usa a conta catieligama29@gmail.com)
```
