import type { Aluno, Chamada, EstadoEscola, Professora, Turma } from "../types";
import { chaveChamada, turnosDaTurma } from "../lib/chamada";
import { diasLetivos, hojeIso, paraIso } from "../lib/datas";

export const VERSAO_ESTADO = 2;

const ANO_LETIVO = 2026;

// --- gerador determinístico -------------------------------------------------
// Os dados são fictícios, mas precisam ser estáveis entre recargas: mesma
// semente, mesma turma. Nada aqui vem de pessoas reais.

function semente(texto: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const escolher = <T,>(rnd: () => number, lista: readonly T[]): T =>
  lista[Math.floor(rnd() * lista.length)];

const NOMES_F = [
  "Alice", "Ana Laura", "Beatriz", "Cecília", "Clara", "Elisa", "Helena",
  "Isabela", "Joana", "Lara", "Laura", "Lívia", "Luiza", "Manuela", "Maria Júlia",
  "Nina", "Olívia", "Rafaela", "Sofia", "Valentina",
] as const;

const NOMES_M = [
  "Antônio", "Arthur", "Benício", "Bernardo", "Caio", "Davi", "Enzo", "Felipe",
  "Gael", "Heitor", "Ítalo", "Joaquim", "Lorenzo", "Lucas", "Miguel", "Noah",
  "Otávio", "Pedro", "Samuel", "Theo",
] as const;

const SOBRENOMES = [
  "Almeida Fraga", "Bittencourt Cardoso", "Corrêa Leal", "da Rosa Nunes",
  "Duarte Peixoto", "Fagundes Lima", "Gonçalves Prates", "Krech Techera",
  "Machado Vieira", "Nogueira Brum", "Oliveira Matos", "Pereira Vargas",
  "Quadros Amaral", "Ribas Camargo", "Santos de Souza", "Silva Oliveira",
  "Soares da Costa", "Teixeira Bastos", "Viana da Costa", "Xavier Fontoura",
] as const;

const NOMES_MAE = [
  "Adriana", "Bruna", "Camila", "Daniela", "Eliane", "Fernanda", "Gabriela",
  "Jéssica", "Karine", "Luciana", "Marcela", "Natália", "Patrícia", "Roberta",
  "Simone", "Tatiane", "Vanessa",
] as const;

const NOMES_PAI = [
  "Alexandre", "Bruno", "Carlos", "Diego", "Eduardo", "Fábio", "Gustavo",
  "Henrique", "Jonas", "Leandro", "Marcelo", "Rodrigo", "Sérgio", "Thiago",
  "Vinícius", "William",
] as const;

const PROFISSOES = [
  "Auxiliar administrativa", "Costureira", "Enfermeira", "Vendedora",
  "Diarista", "Professora", "Agricultora", "Caixa de supermercado",
  "Motorista", "Pedreiro", "Mecânico", "Eletricista", "Metalúrgico",
  "Agricultor", "Vigilante", "Autônomo",
] as const;

const BAIRROS = [
  "Centro", "Vila Nova", "São José", "Bela Vista", "Jardim América",
  "Santa Terezinha", "Colina Verde", "Parque das Acácias",
] as const;

const RUAS = [
  "Rua das Hortênsias", "Avenida dos Ipês", "Rua Bento Gonçalves",
  "Travessa São Pedro", "Rua Juscelino Kubitschek", "Rua das Palmeiras",
  "Avenida Central", "Rua Sete de Setembro",
] as const;

const ALERGIAS = [
  [], [], [], ["Amendoim"], ["Leite de vaca"], ["Poeira"], ["Ovo"],
  ["Picada de inseto"], ["Dipirona"], ["Frutos do mar"],
] as const;

const RESTRICOES = [
  [], [], [], ["Sem lactose"], ["Sem glúten"], ["Não come carne vermelha"],
  ["Dieta pastosa"],
] as const;

const MEDICACOES = [
  [], [], [], [], ["Bombinha (asma) — uso conforme receita"],
  ["Antialérgico em caso de crise"],
] as const;

const CONVENIOS = ["SUS", "SUS", "Unimed", "Bradesco Saúde", "Cassi"] as const;
const SANGUE = ["A+", "A-", "B+", "O+", "O-", "AB+"] as const;
const TRANSPORTE = [
  "Transporte escolar municipal", "Carro próprio da família", "A pé",
  "Carro próprio da família", "Transporte escolar municipal",
] as const;

const OBSERVACOES = [
  "Dorme após o almoço, acorda por volta das 14h.",
  "Está em processo de desfralde.",
  "Usa chupeta apenas na hora do sono.",
  "Chega chorando nas segundas-feiras, acalma-se em poucos minutos.",
  "Traz lanche de casa às sextas-feiras.",
  "Precisa de apoio na alimentação.",
  "Adora atividades com música e movimento.",
  "",
  "",
] as const;

function telefone(rnd: () => number): string {
  const meio = String(Math.floor(rnd() * 9000) + 1000);
  const fim = String(Math.floor(rnd() * 9000) + 1000);
  return `(51) 9${meio}-${fim}`;
}

function cep(rnd: () => number): string {
  return `9550${Math.floor(rnd() * 9)}-${String(Math.floor(rnd() * 900) + 100)}`;
}

function semAcento(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function emailDe(nome: string, sobrenome: string): string {
  const primeiro = semAcento(nome.split(" ")[0]);
  const ultimo = semAcento(sobrenome.split(" ").pop() ?? "");
  return `${primeiro}.${ultimo}@email.com.br`;
}

// --- escola, turmas e professoras -------------------------------------------

const PROFESSORAS: Professora[] = [
  {
    id: "prof-sabrina",
    nome: "Sabrina Ferreira Lima",
    email: "sabrina.lima@escola.exemplo.br",
    telefone: "(51) 99812-4477",
    formacao: "Pedagogia — Educação Infantil",
    usuarioId: null,
  },
  {
    id: "prof-adriana",
    nome: "Adriana Souza Rocha",
    email: "adriana.rocha@escola.exemplo.br",
    telefone: "(51) 99745-3120",
    formacao: "Pedagogia — Anos Iniciais",
    usuarioId: null,
  },
  {
    id: "prof-juliana",
    nome: "Juliana Prates Amaral",
    email: "juliana.amaral@escola.exemplo.br",
    telefone: "(51) 99630-8892",
    formacao: "Pedagogia — Especialização em Educação Especial",
    usuarioId: null,
  },
];

const TURMAS: Turma[] = [
  {
    id: "turma-maternal-1a",
    nome: "MATERNAL I A",
    nivel: "MATERNAL 1",
    etapa: "CRECHE",
    turno: "manha",
    sala: "Sala 3 — Bloco A",
    professoraIds: ["prof-sabrina"],
  },
  {
    id: "turma-maternal-2b",
    nome: "MATERNAL II B",
    nivel: "MATERNAL 2",
    etapa: "CRECHE",
    turno: "tarde",
    sala: "Sala 5 — Bloco A",
    professoraIds: ["prof-adriana", "prof-juliana"],
  },
  {
    id: "turma-pre-1a",
    nome: "PRÉ-ESCOLA I A",
    nivel: "PRÉ I",
    etapa: "PRÉ-ESCOLA",
    turno: "integral",
    sala: "Sala 1 — Bloco B",
    professoraIds: ["prof-juliana"],
  },
];

/** Idade-alvo (em anos) de cada turma, para gerar nascimentos coerentes. */
const IDADE_TURMA: Record<string, number> = {
  "turma-maternal-1a": 2,
  "turma-maternal-2b": 3,
  "turma-pre-1a": 4,
};

function embaralhar<T>(rnd: () => number, lista: readonly T[]): T[] {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

function gerarAlunos(turma: Turma, quantidade: number): Aluno[] {
  const rnd = semente(turma.id);
  const alunos: Aluno[] = [];

  // Sorteia sem reposição: dentro da turma não se repetem nomes nem sobrenomes.
  const femininos = embaralhar(rnd, NOMES_F);
  const masculinos = embaralhar(rnd, NOMES_M);
  const sobrenomes = embaralhar(rnd, SOBRENOMES);
  let usadosF = 0;
  let usadosM = 0;

  for (let i = 0; i < quantidade; i++) {
    const sexo: "F" | "M" = rnd() < 0.5 ? "F" : "M";
    const primeiro =
      sexo === "F"
        ? femininos[usadosF++ % femininos.length]
        : masculinos[usadosM++ % masculinos.length];
    const sobrenomeFamilia = sobrenomes[i % sobrenomes.length];
    const nome = `${primeiro} ${sobrenomeFamilia}`;
    const idade = IDADE_TURMA[turma.id] ?? 3;
    const anoNasc = ANO_LETIVO - idade;
    const mesNasc = Math.floor(rnd() * 12);
    const diaNasc = Math.floor(rnd() * 27) + 1;
    const nascimento = paraIso(new Date(anoNasc, mesNasc, diaNasc));

    const nomeMae = `${escolher(rnd, NOMES_MAE)} ${sobrenomeFamilia}`;
    const nomePai = `${escolher(rnd, NOMES_PAI)} ${sobrenomeFamilia}`;
    const temAutorizadoExtra = rnd() < 0.6;

    alunos.push({
      id: `${turma.id}-aluno-${i + 1}`,
      codigo: String(10000 + Math.floor(rnd() * 89999)),
      nome: nome.toUpperCase(),
      turmaId: turma.id,
      dataNascimento: nascimento,
      sexo,
      turno: turma.turno,
      matriculadoEm: `${ANO_LETIVO}-02-${String(Math.floor(rnd() * 20) + 1).padStart(2, "0")}`,
      mae: {
        nome: nomeMae,
        parentesco: "Mãe",
        telefone: telefone(rnd),
        email: emailDe(nomeMae, sobrenomeFamilia),
        profissao: escolher(rnd, PROFISSOES),
      },
      pai: {
        nome: nomePai,
        parentesco: "Pai",
        telefone: telefone(rnd),
        email: emailDe(nomePai, sobrenomeFamilia),
        profissao: escolher(rnd, PROFISSOES),
      },
      autorizados: temAutorizadoExtra
        ? [
            {
              nome: `${escolher(rnd, NOMES_MAE)} ${escolher(rnd, SOBRENOMES)}`,
              parentesco: rnd() < 0.5 ? "Avó materna" : "Tia",
              telefone: telefone(rnd),
            },
          ]
        : [],
      endereco: {
        logradouro: escolher(rnd, RUAS),
        numero: String(Math.floor(rnd() * 1800) + 20),
        bairro: escolher(rnd, BAIRROS),
        cidade: "Santo Antônio da Patrulha",
        uf: "RS",
        cep: cep(rnd),
      },
      saude: {
        tipoSanguineo: escolher(rnd, SANGUE),
        alergias: [...escolher(rnd, ALERGIAS)],
        restricoesAlimentares: [...escolher(rnd, RESTRICOES)],
        medicacoes: [...escolher(rnd, MEDICACOES)],
        convenio: escolher(rnd, CONVENIOS),
        observacoes: rnd() < 0.25 ? "Encaminhada avaliação fonoaudiológica pela rede." : "",
      },
      transporte: escolher(rnd, TRANSPORTE),
      observacoes: escolher(rnd, OBSERVACOES),
    });
  }

  return alunos.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}

/**
 * Chamadas de demonstração: tudo que já passou aparece lançado, menos os dois
 * últimos dias letivos anteriores a hoje — assim a professora sempre encontra
 * pendência ao entrar, que é o comportamento que o sistema precisa mostrar.
 */
function gerarChamadas(
  turmas: Turma[],
  alunos: Aluno[],
  datas: string[],
  hoje: string,
): Record<string, Chamada> {
  const chamadas: Record<string, Chamada> = {};
  const passados = datas.filter((d) => d < hoje);
  const naoLancados = new Set(passados.slice(-2));

  for (const turma of turmas) {
    const daTurma = alunos.filter((a) => a.turmaId === turma.id);
    const turnos = turnosDaTurma(turma.turno);
    const rnd = semente(`chamada-${turma.id}`);

    for (const data of datas) {
      if (data >= hoje || naoLancados.has(data)) continue;
      const registros: Record<string, { manha: boolean; tarde: boolean; observacao?: string }> = {};
      for (const aluno of daTurma) {
        const faltou = rnd() < 0.08;
        const meioPeriodo = !faltou && turnos.length > 1 && rnd() < 0.05;
        registros[aluno.id] = {
          manha: !faltou,
          tarde: !faltou && !meioPeriodo,
          observacao: faltou && rnd() < 0.4 ? "Família avisou: consulta médica." : undefined,
        };
      }
      chamadas[chaveChamada(turma.id, data)] = {
        turmaId: turma.id,
        data,
        lancadaEm: `${data}T18:10:00`,
        lancadaPor: turma.professoraIds[0] ?? null,
        registros,
      };
    }
  }

  return chamadas;
}

export function criarEstadoInicial(hoje = hojeIso()): EstadoEscola {
  const periodos = [
    { id: "periodo-1", nome: "1º SEMESTRE", inicio: `${ANO_LETIVO}-02-16`, fim: `${ANO_LETIVO}-07-10` },
    { id: "periodo-2", nome: "2º SEMESTRE", inicio: `${ANO_LETIVO}-07-27`, fim: `${ANO_LETIVO}-12-18` },
  ];

  const feriados = [
    { data: `${ANO_LETIVO}-09-07`, descricao: "Independência do Brasil" },
    { data: `${ANO_LETIVO}-09-21`, descricao: "Dia do Município" },
    { data: `${ANO_LETIVO}-10-12`, descricao: "Nossa Senhora Aparecida" },
    { data: `${ANO_LETIVO}-10-15`, descricao: "Dia do Professor" },
    { data: `${ANO_LETIVO}-11-02`, descricao: "Finados" },
    { data: `${ANO_LETIVO}-11-15`, descricao: "Proclamação da República" },
    { data: `${ANO_LETIVO}-11-20`, descricao: "Consciência Negra" },
  ];

  const alunos = TURMAS.flatMap((turma) =>
    gerarAlunos(turma, turma.id === "turma-pre-1a" ? 14 : 12),
  );

  const feriadosIso = feriados.map((f) => f.data);
  // Só o período em curso recebe chamadas de demonstração.
  const periodoAtual = periodos.find((p) => p.inicio <= hoje && hoje <= p.fim) ?? periodos[1];
  const datas = diasLetivos(periodoAtual.inicio, periodoAtual.fim, feriadosIso, hoje);

  return {
    versao: VERSAO_ESTADO,
    escola: {
      id: "escola-1",
      nome: "E.M.E.I. JARDIM ENCANTADO",
      municipio: "Santo Antônio da Patrulha",
      anoLetivo: ANO_LETIVO,
      usoDesde: periodoAtual.inicio,
    },
    periodos,
    feriados,
    professoras: PROFESSORAS,
    turmas: TURMAS,
    alunos,
    chamadas: gerarChamadas(TURMAS, alunos, datas, hoje),
  };
}
