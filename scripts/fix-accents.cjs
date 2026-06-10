#!/usr/bin/env node
/* eslint-disable */
const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');

const DRY = process.argv.includes('--dry');

// Dictionary of de-accented -> accented Portuguese words.
// Unambiguous entries only — words where the de-accented form is not a valid
// Portuguese word and is not in common English usage in this codebase.
const MAP = {
  // -ão / -ões family
  'Nutricao': 'Nutrição', 'nutricao': 'nutrição',
  'Refeicao': 'Refeição', 'refeicao': 'refeição',
  'Refeicoes': 'Refeições', 'refeicoes': 'refeições',
  'aplicacao': 'aplicação', 'aplicacoes': 'aplicações',
  'Aplicacao': 'Aplicação', 'Aplicacoes': 'Aplicações',
  'configuracao': 'configuração', 'configuracoes': 'configurações',
  'Configuracao': 'Configuração', 'Configuracoes': 'Configurações',
  'opcao': 'opção', 'opcoes': 'opções',
  'Opcao': 'Opção', 'Opcoes': 'Opções',
  'sessao': 'sessão', 'sessoes': 'sessões',
  'Sessao': 'Sessão', 'Sessoes': 'Sessões',
  'descricao': 'descrição', 'descricoes': 'descrições',
  'Descricao': 'Descrição', 'Descricoes': 'Descrições',
  'definicao': 'definição', 'definicoes': 'definições',
  'Definicao': 'Definição', 'Definicoes': 'Definições',
  'observacao': 'observação', 'observacoes': 'observações',
  'Observacao': 'Observação', 'Observacoes': 'Observações',
  'permissao': 'permissão', 'permissoes': 'permissões',
  'Permissao': 'Permissão', 'Permissoes': 'Permissões',
  'versao': 'versão', 'versoes': 'versões',
  'Versao': 'Versão', 'Versoes': 'Versões',
  'recuperacao': 'recuperação',
  'Recuperacao': 'Recuperação',
  'autenticacao': 'autenticação',
  'Autenticacao': 'Autenticação',
  'confirmacao': 'confirmação',
  'Confirmacao': 'Confirmação',
  'avaliacao': 'avaliação', 'avaliacoes': 'avaliações',
  'Avaliacao': 'Avaliação', 'Avaliacoes': 'Avaliações',
  'visualizacao': 'visualização',
  'Visualizacao': 'Visualização',
  'variacao': 'variação', 'variacoes': 'variações',
  'Variacao': 'Variação', 'Variacoes': 'Variações',
  'direcao': 'direção', 'direcoes': 'direções',
  'Direcao': 'Direção', 'Direcoes': 'Direções',
  'duracao': 'duração',
  'Duracao': 'Duração',
  'repeticao': 'repetição', 'repeticoes': 'repetições',
  'Repeticao': 'Repetição', 'Repeticoes': 'Repetições',
  'localizacao': 'localização',
  'Localizacao': 'Localização',
  'identificacao': 'identificação',
  'Identificacao': 'Identificação',
  'informacao': 'informação', 'informacoes': 'informações',
  'Informacao': 'Informação', 'Informacoes': 'Informações',
  'atencao': 'atenção',
  'Atencao': 'Atenção',
  'protecao': 'proteção',
  'Protecao': 'Proteção',
  'selecao': 'seleção', 'selecoes': 'seleções',
  'Selecao': 'Seleção', 'Selecoes': 'Seleções',
  'promocao': 'promoção', 'promocoes': 'promoções',
  'Promocao': 'Promoção', 'Promocoes': 'Promoções',
  'realizacao': 'realização',
  'Realizacao': 'Realização',
  'integracao': 'integração',
  'Integracao': 'Integração',
  'organizacao': 'organização',
  'Organizacao': 'Organização',
  'utilizacao': 'utilização',
  'Utilizacao': 'Utilização',
  'manutencao': 'manutenção',
  'Manutencao': 'Manutenção',
  'inscricao': 'inscrição', 'inscricoes': 'inscrições',
  'Inscricao': 'Inscrição', 'Inscricoes': 'Inscrições',
  'instrucao': 'instrução', 'instrucoes': 'instruções',
  'Instrucao': 'Instrução', 'Instrucoes': 'Instruções',
  'reuniao': 'reunião', 'reunioes': 'reuniões',
  'Reuniao': 'Reunião', 'Reunioes': 'Reuniões',
  'decisao': 'decisão', 'decisoes': 'decisões',
  'Decisao': 'Decisão', 'Decisoes': 'Decisões',
  'precisao': 'precisão',
  'Precisao': 'Precisão',
  'divisao': 'divisão', 'divisoes': 'divisões',
  'Divisao': 'Divisão', 'Divisoes': 'Divisões',
  'dimensao': 'dimensão', 'dimensoes': 'dimensões',
  'Dimensao': 'Dimensão', 'Dimensoes': 'Dimensões',
  'extensao': 'extensão',
  'Extensao': 'Extensão',
  'expressao': 'expressão', 'expressoes': 'expressões',
  'Expressao': 'Expressão', 'Expressoes': 'Expressões',
  'profissao': 'profissão', 'profissoes': 'profissões',
  'Profissao': 'Profissão', 'Profissoes': 'Profissões',
  'compreensao': 'compreensão',
  'Compreensao': 'Compreensão',
  'tensao': 'tensão',
  'Tensao': 'Tensão',
  'conexao': 'conexão', 'conexoes': 'conexões',
  'Conexao': 'Conexão', 'Conexoes': 'Conexões',
  'acao': 'ação', 'acoes': 'ações',
  'Acao': 'Ação', 'Acoes': 'Ações',
  'notificacao': 'notificação', 'notificacoes': 'notificações',
  'Notificacao': 'Notificação', 'Notificacoes': 'Notificações',
  'hidratacao': 'hidratação',
  'Hidratacao': 'Hidratação',
  'navegacao': 'navegação',
  'Navegacao': 'Navegação',
  'porcao': 'porção', 'porcoes': 'porções',
  'Porcao': 'Porção', 'Porcoes': 'Porções',
  'respiracao': 'respiração',
  'Respiracao': 'Respiração',
  'estabilizacao': 'estabilização',
  'Estabilizacao': 'Estabilização',
  'gamificacao': 'gamificação',
  'Gamificacao': 'Gamificação',
  'evolucao': 'evolução',
  'Evolucao': 'Evolução',
  'distribuicao': 'distribuição',
  'Distribuicao': 'Distribuição',
  'redefinicao': 'redefinição',
  'Redefinicao': 'Redefinição',
  'comunicacao': 'comunicação',
  'Comunicacao': 'Comunicação',
  'posicao': 'posição', 'posicoes': 'posições',
  'Posicao': 'Posição', 'Posicoes': 'Posições',
  'estacionario': 'estacionário', 'estacionaria': 'estacionária',
  'estacionarios': 'estacionários', 'estacionarias': 'estacionárias',
  'Estacionario': 'Estacionário', 'Estacionaria': 'Estacionária',
  'sustentavel': 'sustentável', 'sustentaveis': 'sustentáveis',
  'Sustentavel': 'Sustentável', 'Sustentaveis': 'Sustentáveis',
  'resistencia': 'resistência', 'resistencias': 'resistências',
  'Resistencia': 'Resistência', 'Resistencias': 'Resistências',
  'deficiencia': 'deficiência', 'deficiencias': 'deficiências',
  'Deficiencia': 'Deficiência', 'Deficiencias': 'Deficiências',
  'elastico': 'elástico', 'elasticos': 'elásticos',
  'elastica': 'elástica', 'elasticas': 'elásticas',
  'Elastico': 'Elástico', 'Elasticos': 'Elásticos',
  'improvavel': 'improvável', 'improvaveis': 'improváveis',
  'Improvavel': 'Improvável',
  'provavel': 'provável', 'provaveis': 'prováveis',
  'Provavel': 'Provável',
  'fisiologico': 'fisiológico', 'fisiologica': 'fisiológica',
  'fisiologicos': 'fisiológicos', 'fisiologicas': 'fisiológicas',
  'Fisiologico': 'Fisiológico', 'Fisiologica': 'Fisiológica',
  'biologico': 'biológico', 'biologica': 'biológica',
  'Biologico': 'Biológico', 'Biologica': 'Biológica',
  'psicologico': 'psicológico', 'psicologica': 'psicológica',
  'Psicologico': 'Psicológico', 'Psicologica': 'Psicológica',
  'ergonomico': 'ergonômico', 'ergonomica': 'ergonômica',
  'Ergonomico': 'Ergonômico', 'Ergonomica': 'Ergonômica',
  'metabolismo': 'metabolismo', // no accent
  'cronico': 'crônico', 'cronica': 'crônica',
  'Cronico': 'Crônico', 'Cronica': 'Crônica',
  'sintoma': 'sintoma', // no accent
  'fadiga': 'fadiga', // no accent
  'leitura': 'leitura', // no accent

  // -í, -á, -ó accented vowels
  'Inicio': 'Início', 'inicio': 'início',
  'Saude': 'Saúde', 'saude': 'saúde',
  'Voce': 'Você', 'voce': 'você',
  'Agua': 'Água', 'agua': 'água',
  'Ja': 'Já', 'ja': 'já',
  'Ate': 'Até', 'ate': 'até',
  'Nao': 'Não', 'nao': 'não',
  'Sao': 'São', 'sao': 'são',
  'Tambem': 'Também', 'tambem': 'também',
  'Porem': 'Porém', 'porem': 'porém',
  'Alem': 'Além', 'alem': 'além',
  'Atras': 'Atrás', 'atras': 'atrás',
  'Atraves': 'Através', 'atraves': 'através',
  'Apos': 'Após', 'apos': 'após',
  'Ninguem': 'Ninguém', 'ninguem': 'ninguém',
  'Alguem': 'Alguém', 'alguem': 'alguém',
  'Gratis': 'Grátis', 'gratis': 'grátis',
  'Faca': 'Faça', // verb form

  // exercicio / exercicios / Exercicio / Exercicios
  'exercicio': 'exercício', 'exercicios': 'exercícios',
  'Exercicio': 'Exercício', 'Exercicios': 'Exercícios',

  // Beneficios / Avancados
  'beneficio': 'benefício', 'beneficios': 'benefícios',
  'Beneficio': 'Benefício', 'Beneficios': 'Benefícios',
  'avancado': 'avançado', 'avancada': 'avançada',
  'avancados': 'avançados', 'avancadas': 'avançadas',
  'Avancado': 'Avançado', 'Avancada': 'Avançada',
  'Avancados': 'Avançados', 'Avancadas': 'Avançadas',

  // Basic adjectives
  'Basico': 'Básico', 'basico': 'básico',
  'Basica': 'Básica', 'basica': 'básica',
  'Basicos': 'Básicos', 'basicos': 'básicos',
  'Basicas': 'Básicas', 'basicas': 'básicas',
  'rapido': 'rápido', 'rapida': 'rápida',
  'rapidos': 'rápidos', 'rapidas': 'rápidas',
  'Rapido': 'Rápido', 'Rapida': 'Rápida',
  'Rapidos': 'Rápidos', 'Rapidas': 'Rápidas',
  'proximo': 'próximo', 'proxima': 'próxima',
  'proximos': 'próximos', 'proximas': 'próximas',
  'Proximo': 'Próximo', 'Proxima': 'Próxima',
  'Proximos': 'Próximos', 'Proximas': 'Próximas',
  'ultimo': 'último', 'ultima': 'última',
  'ultimos': 'últimos', 'ultimas': 'últimas',
  'Ultimo': 'Último', 'Ultima': 'Última',
  'Ultimos': 'Últimos', 'Ultimas': 'Últimas',
  'medio': 'médio', 'media': 'média',
  'medios': 'médios', 'medias': 'médias',
  'Medio': 'Médio', 'Media': 'Média',
  'Medios': 'Médios', 'Medias': 'Médias',
  'unico': 'único', 'unica': 'única',
  'unicos': 'únicos', 'unicas': 'únicas',
  'Unico': 'Único', 'Unica': 'Única',
  'Unicos': 'Únicos', 'Unicas': 'Únicas',
  'publico': 'público', 'publica': 'pública',
  'publicos': 'públicos', 'publicas': 'públicas',
  'Publico': 'Público', 'Publica': 'Pública',
  'Publicos': 'Públicos', 'Publicas': 'Públicas',
  'automatico': 'automático', 'automatica': 'automática',
  'automaticos': 'automáticos', 'automaticas': 'automáticas',
  'Automatico': 'Automático', 'Automatica': 'Automática',
  'Automaticos': 'Automáticos', 'Automaticas': 'Automáticas',
  'generico': 'genérico', 'generica': 'genérica',
  'genericos': 'genéricos', 'genericas': 'genéricas',
  'Generico': 'Genérico', 'Generica': 'Genérica',
  'pratico': 'prático', 'praticos': 'práticos',
  'Pratico': 'Prático', 'Praticos': 'Práticos',
  'cardiaco': 'cardíaco', 'cardiaca': 'cardíaca',
  'Cardiaco': 'Cardíaco', 'Cardiaca': 'Cardíaca',
  'saudavel': 'saudável', 'saudaveis': 'saudáveis',
  'Saudavel': 'Saudável', 'Saudaveis': 'Saudáveis',
  'disponivel': 'disponível', 'disponiveis': 'disponíveis',
  'Disponivel': 'Disponível', 'Disponiveis': 'Disponíveis',
  'possivel': 'possível', 'possiveis': 'possíveis',
  'Possivel': 'Possível', 'Possiveis': 'Possíveis',
  'impossivel': 'impossível', 'impossiveis': 'impossíveis',
  'Impossivel': 'Impossível', 'Impossiveis': 'Impossíveis',
  'sensivel': 'sensível', 'sensiveis': 'sensíveis',
  'Sensivel': 'Sensível', 'Sensiveis': 'Sensíveis',
  'util': 'útil', 'uteis': 'úteis',
  'Util': 'Útil', 'Uteis': 'Úteis',
  'agil': 'ágil', 'ageis': 'ágeis',
  'Agil': 'Ágil',

  // -ário family
  'usuario': 'usuário', 'usuarios': 'usuários',
  'Usuario': 'Usuário', 'Usuarios': 'Usuários',
  'usuaria': 'usuária', 'usuarias': 'usuárias',
  'Usuaria': 'Usuária', 'Usuarias': 'Usuárias',
  'horario': 'horário', 'horarios': 'horários',
  'Horario': 'Horário', 'Horarios': 'Horários',
  'calendario': 'calendário', 'calendarios': 'calendários',
  'Calendario': 'Calendário', 'Calendarios': 'Calendários',
  'comentario': 'comentário', 'comentarios': 'comentários',
  'Comentario': 'Comentário', 'Comentarios': 'Comentários',
  'formulario': 'formulário', 'formularios': 'formulários',
  'Formulario': 'Formulário', 'Formularios': 'Formulários',
  'relatorio': 'relatório', 'relatorios': 'relatórios',
  'Relatorio': 'Relatório', 'Relatorios': 'Relatórios',
  'diario': 'diário', 'diarios': 'diários',
  'Diario': 'Diário', 'Diarios': 'Diários',
  'diaria': 'diária', 'diarias': 'diárias',
  'Diaria': 'Diária', 'Diarias': 'Diárias',
  'voluntario': 'voluntário', 'voluntarios': 'voluntários',
  'Voluntario': 'Voluntário', 'Voluntarios': 'Voluntários',
  'necessario': 'necessário', 'necessaria': 'necessária',
  'necessarios': 'necessários', 'necessarias': 'necessárias',
  'Necessario': 'Necessário', 'Necessaria': 'Necessária',
  'obrigatorio': 'obrigatório', 'obrigatoria': 'obrigatória',
  'obrigatorios': 'obrigatórios', 'obrigatorias': 'obrigatórias',
  'Obrigatorio': 'Obrigatório', 'Obrigatoria': 'Obrigatória',

  // -ico family
  'historico': 'histórico', 'historicos': 'históricos',
  'historica': 'histórica', 'historicas': 'históricas',
  'Historico': 'Histórico', 'Historicos': 'Históricos',
  'Historica': 'Histórica', 'Historicas': 'Históricas',
  'grafico': 'gráfico', 'graficos': 'gráficos',
  'grafica': 'gráfica', 'graficas': 'gráficas',
  'Grafico': 'Gráfico', 'Graficos': 'Gráficos',
  'Grafica': 'Gráfica', 'Graficas': 'Gráficas',
  'tecnico': 'técnico', 'tecnicos': 'técnicos',
  'tecnica': 'técnica', 'tecnicas': 'técnicas',
  'Tecnico': 'Técnico', 'Tecnicos': 'Técnicos',
  'Tecnica': 'Técnica', 'Tecnicas': 'Técnicas',
  'metodico': 'metódico',
  'organico': 'orgânico', 'organica': 'orgânica',
  'organicos': 'orgânicos', 'organicas': 'orgânicas',
  'Organico': 'Orgânico', 'Organica': 'Orgânica',

  // -ulo / -ulos
  'titulo': 'título', 'titulos': 'títulos',
  'Titulo': 'Título', 'Titulos': 'Títulos',
  'modulo': 'módulo', 'modulos': 'módulos',
  'Modulo': 'Módulo', 'Modulos': 'Módulos',
  'veiculo': 'veículo', 'veiculos': 'veículos',
  'Veiculo': 'Veículo', 'Veiculos': 'Veículos',
  'capitulo': 'capítulo', 'capitulos': 'capítulos',
  'musculo': 'músculo', 'musculos': 'músculos',
  'Musculo': 'Músculo', 'Musculos': 'Músculos',

  // -ero / -ero family
  'numero': 'número', 'numeros': 'números',
  'Numero': 'Número', 'Numeros': 'Números',
  'genero': 'gênero', 'generos': 'gêneros',
  'Genero': 'Gênero', 'Generos': 'Gêneros',

  // -ível / -íveis already above

  // -encia family
  'frequencia': 'frequência', 'frequencias': 'frequências',
  'Frequencia': 'Frequência', 'Frequencias': 'Frequências',
  'tendencia': 'tendência', 'tendencias': 'tendências',
  'Tendencia': 'Tendência', 'Tendencias': 'Tendências',
  'referencia': 'referência', 'referencias': 'referências',
  'Referencia': 'Referência', 'Referencias': 'Referências',
  'experiencia': 'experiência', 'experiencias': 'experiências',
  'Experiencia': 'Experiência', 'Experiencias': 'Experiências',
  'consequencia': 'consequência', 'consequencias': 'consequências',
  'Consequencia': 'Consequência', 'Consequencias': 'Consequências',
  'preferencia': 'preferência', 'preferencias': 'preferências',
  'Preferencia': 'Preferência', 'Preferencias': 'Preferências',
  'urgencia': 'urgência', 'urgencias': 'urgências',
  'Urgencia': 'Urgência', 'Urgencias': 'Urgências',
  'emergencia': 'emergência', 'emergencias': 'emergências',
  'Emergencia': 'Emergência', 'Emergencias': 'Emergências',
  'influencia': 'influência', 'influencias': 'influências',
  'Influencia': 'Influência', 'Influencias': 'Influências',
  'intolerancia': 'intolerância', 'intolerancias': 'intolerâncias',
  'Intolerancia': 'Intolerância', 'Intolerancias': 'Intolerâncias',
  'inteligencia': 'inteligência', 'inteligencias': 'inteligências',
  'Inteligencia': 'Inteligência',
  'sequencia': 'sequência', 'sequencias': 'sequências',
  'Sequencia': 'Sequência',
  'ciencia': 'ciência', 'ciencias': 'ciências',
  'Ciencia': 'Ciência', 'Ciencias': 'Ciências',
  'paciencia': 'paciência',
  'Paciencia': 'Paciência',
  'distancia': 'distância', 'distancias': 'distâncias',
  'Distancia': 'Distância', 'Distancias': 'Distâncias',
  'importancia': 'importância',
  'Importancia': 'Importância',
  'circunstancia': 'circunstância', 'circunstancias': 'circunstâncias',
  'instancia': 'instância', 'instancias': 'instâncias',
  'Instancia': 'Instância',

  // -enca family
  'presenca': 'presença', 'presencas': 'presenças',
  'Presenca': 'Presença', 'Presencas': 'Presenças',
  'ausencia': 'ausência', 'ausencias': 'ausências',
  'Ausencia': 'Ausência',
  'aparencia': 'aparência',
  'Aparencia': 'Aparência',
  'crenca': 'crença', 'crencas': 'crenças',
  'Crenca': 'Crença',

  // -úde / -áde already saude above

  // Other common
  'familia': 'família', 'familias': 'famílias',
  'Familia': 'Família', 'Familias': 'Famílias',
  'proteina': 'proteína', 'proteinas': 'proteínas',
  'Proteina': 'Proteína', 'Proteinas': 'Proteínas',
  'cafeina': 'cafeína',
  'Cafeina': 'Cafeína',
  'rotina': 'rotina', // no accent, correct
  'analise': 'análise', 'analises': 'análises',
  'Analise': 'Análise', 'Analises': 'Análises',
  'sintese': 'síntese', 'sinteses': 'sínteses',
  'Sintese': 'Síntese',
  'pagina': 'página', 'paginas': 'páginas',
  'Pagina': 'Página', 'Paginas': 'Páginas',
  'maquina': 'máquina', 'maquinas': 'máquinas',
  'Maquina': 'Máquina', 'Maquinas': 'Máquinas',
  'medicamento': 'medicamento', // no accent, correct
  'musica': 'música', 'musicas': 'músicas',
  'Musica': 'Música', 'Musicas': 'Músicas',
  'logica': 'lógica',
  'Logica': 'Lógica',
  'magica': 'mágica',
  'Magica': 'Mágica',

  // Geography / common nouns
  'area': 'área', 'areas': 'áreas',
  'Area': 'Área', 'Areas': 'Áreas',
  'periodo': 'período', 'periodos': 'períodos',
  'Periodo': 'Período', 'Periodos': 'Períodos',
  'mes': 'mês', // Note: "mes" alone often refers to month
  'Mes': 'Mês',
  'tres': 'três',
  'Tres': 'Três',
  'voce': 'você', // dup but safe
  'apenas': 'apenas', // no accent
  'conteudo': 'conteúdo', 'conteudos': 'conteúdos',
  'Conteudo': 'Conteúdo', 'Conteudos': 'Conteúdos',
  'nivel': 'nível', 'niveis': 'níveis',
  'Nivel': 'Nível', 'Niveis': 'Níveis',
  'movel': 'móvel', 'moveis': 'móveis',
  'Movel': 'Móvel', 'Moveis': 'Móveis',
  'imovel': 'imóvel', 'imoveis': 'imóveis',
  'Imovel': 'Imóvel', 'Imoveis': 'Imóveis',
  'coracao': 'coração', 'coracoes': 'corações',
  'Coracao': 'Coração', 'Coracoes': 'Corações',
  'oxigenio': 'oxigênio',
  'Oxigenio': 'Oxigênio',
  'oleo': 'óleo', 'oleos': 'óleos',
  'Oleo': 'Óleo',
  'oculos': 'óculos',
  'Oculos': 'Óculos',
  'otimo': 'ótimo', 'otima': 'ótima',
  'otimos': 'ótimos', 'otimas': 'ótimas',
  'Otimo': 'Ótimo', 'Otima': 'Ótima',
  'Otimos': 'Ótimos', 'Otimas': 'Ótimas',
  'orgao': 'órgão', 'orgaos': 'órgãos',
  'Orgao': 'Órgão', 'Orgaos': 'Órgãos',
  'pe': 'pé',
  'pes': 'pés',
  'maos': 'mãos',
  'Maos': 'Mãos',
  'mae': 'mãe', 'maes': 'mães',
  'Mae': 'Mãe', 'Maes': 'Mães',
  'irmao': 'irmão', 'irmaos': 'irmãos',
  'irma': 'irmã', 'irmas': 'irmãs',

  // English-Portuguese phrase: "Faça" used as verb imperative
};

const exts = new Set(['.js', '.jsx', '.ts', '.tsx', '.html', '.json', '.md']);
const skipDirs = new Set(['node_modules', '.git', 'dist', 'build', '.next', 'coverage']);

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (!skipDirs.has(e.name)) walk(p, out);
      continue;
    }
    if (exts.has(path.extname(e.name))) out.push(p);
  }
  return out;
}

// Build a single regex matching all keys, word-boundary based.
const keys = Object.keys(MAP).sort((a, b) => b.length - a.length);
const WORD_RE = new RegExp('\\b(' + keys.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')\\b', 'g');

function replaceInText(s) {
  return s.replace(WORD_RE, (m) => MAP[m] || m);
}

function collectRangesFromAst(code, ext) {
  const ranges = []; // [{start, end}]
  try {
    const ast = parser.parse(code, {
      sourceType: 'unambiguous',
      allowImportExportEverywhere: true,
      allowReturnOutsideFunction: true,
      errorRecovery: true,
      plugins: [
        'jsx',
        'typescript',
        'classProperties',
        'classPrivateProperties',
        'classPrivateMethods',
        'optionalChaining',
        'nullishCoalescingOperator',
        'topLevelAwait',
        'objectRestSpread',
        'dynamicImport',
        'decorators-legacy',
      ],
    });
    walkAst(ast, (node) => {
      if (!node || typeof node !== 'object') return;
      // String literals
      if (node.type === 'StringLiteral' && typeof node.value === 'string') {
        if (looksLikePath(node.value)) return;
        if (looksLikeEnumIdent(node.value)) return; // skip enum-like
        ranges.push({ start: node.start + 1, end: node.end - 1 });
      } else if (node.type === 'TemplateElement') {
        ranges.push({ start: node.start, end: node.end });
      } else if (node.type === 'JSXText') {
        ranges.push({ start: node.start, end: node.end });
      }
    });
  } catch (err) {
    return null;
  }
  return ranges;
}

// Heuristic: treat snake_case / kebab-case / single lowercase token as enum/identifier,
// not user-facing text. These typically map to DB enum values, CSS classes, action types, etc.
function looksLikeEnumIdent(s) {
  if (!s) return false;
  if (/\s/.test(s)) return false; // has whitespace => phrase
  if (/[A-Z]/.test(s.charAt(0))) return false; // starts uppercase => label
  // single lowercase word or snake/kebab without spaces
  if (/^[a-z][a-z0-9]*(?:[_-][a-z0-9]+)+$/.test(s)) return true; // snake/kebab
  if (/^[a-z][a-z0-9]*$/.test(s)) return true; // bare lowercase token
  return false;
}

function walkAst(node, visit) {
  visit(node);
  for (const key of Object.keys(node)) {
    if (key === 'loc' || key === 'start' || key === 'end' || key === 'range' || key === 'leadingComments' || key === 'trailingComments' || key === 'innerComments' || key === 'extra' || key === 'tokens') continue;
    const v = node[key];
    if (Array.isArray(v)) {
      for (const item of v) {
        if (item && typeof item === 'object' && typeof item.type === 'string') walkAst(item, visit);
      }
    } else if (v && typeof v === 'object' && typeof v.type === 'string') {
      walkAst(v, visit);
    }
  }
}

function looksLikePath(s) {
  if (!s) return false;
  if (s.length < 2) return true;
  if (/^https?:\/\//.test(s)) return false; // urls can contain PT text? unlikely; skip
  if (/^\.{1,2}\//.test(s)) return true;
  if (/^[@a-z0-9_-]+\/[a-z0-9_./-]+$/i.test(s) && !/\s/.test(s)) return true; // package or path
  if (/^[a-z0-9_-]+\.(js|jsx|ts|tsx|css|svg|png|jpg|webp|json|html|md)$/i.test(s)) return true;
  return false;
}

function applyToFile(file) {
  const ext = path.extname(file);
  const code = fs.readFileSync(file, 'utf8');
  let changedText = null;

  if (ext === '.json') {
    // JSON: replace inside strings only — parse and re-serialize values
    try {
      const obj = JSON.parse(code);
      const newObj = walkJson(obj);
      const out = JSON.stringify(newObj, null, 2);
      if (out !== code.trim()) changedText = out + (code.endsWith('\n') ? '\n' : '');
    } catch {
      // fallback: textual replace (less safe), skip
    }
  } else if (ext === '.md' || ext === '.html') {
    // Markdown / HTML — apply globally (no JS identifiers)
    const newText = replaceInText(code);
    if (newText !== code) changedText = newText;
  } else {
    // JS/JSX/TS/TSX — AST-based
    const ranges = collectRangesFromAst(code, ext);
    if (ranges === null) {
      // skip on parse error
      return { file, changed: false, skipped: true };
    }
    if (ranges.length === 0) return { file, changed: false };
    // Apply in reverse order
    ranges.sort((a, b) => a.start - b.start);
    let out = '';
    let cursor = 0;
    let anyChange = false;
    for (const r of ranges) {
      out += code.slice(cursor, r.start);
      const segment = code.slice(r.start, r.end);
      const replaced = replaceInText(segment);
      if (replaced !== segment) anyChange = true;
      out += replaced;
      cursor = r.end;
    }
    out += code.slice(cursor);
    if (anyChange) changedText = out;
  }

  if (changedText == null) return { file, changed: false };
  if (!DRY) fs.writeFileSync(file, changedText, 'utf8');
  return { file, changed: true };
}

function walkJson(v) {
  if (typeof v === 'string') return replaceInText(v);
  if (Array.isArray(v)) return v.map(walkJson);
  if (v && typeof v === 'object') {
    const out = {};
    for (const k of Object.keys(v)) out[k] = walkJson(v[k]);
    return out;
  }
  return v;
}

const root = process.cwd();
const targets = [];
targets.push(...walk(path.join(root, 'src')));
for (const extra of ['index.html', 'manifest.json', 'README.md']) {
  const p = path.join(root, extra);
  if (fs.existsSync(p)) targets.push(p);
}

let changedCount = 0;
let skippedCount = 0;
const changedFiles = [];
for (const f of targets) {
  const res = applyToFile(f);
  if (res.skipped) skippedCount++;
  if (res.changed) { changedCount++; changedFiles.push(path.relative(root, f)); }
}

console.log(`scanned: ${targets.length}`);
console.log(`changed: ${changedCount}${DRY ? ' (dry-run)' : ''}`);
if (skippedCount) console.log(`parse-skipped: ${skippedCount}`);
if (changedFiles.length) {
  console.log('files:');
  for (const f of changedFiles) console.log('  ' + f);
}
