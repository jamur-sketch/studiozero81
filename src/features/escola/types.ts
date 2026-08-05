export type Turno = "manha" | "tarde";

/** Turno em que a turma funciona. "integral" = manhã e tarde. */
export type TurnoTurma = Turno | "integral";

export interface Escola {
  id: string;
  nome: string;
  municipio: string;
  anoLetivo: number;
  /**
   * Data em que a escola passou a usar o sistema. Nada antes disso é cobrado
   * da professora — a chamada só começa a valer a partir daqui.
   */
  usoDesde: string; // YYYY-MM-DD
}

export interface PeriodoLetivo {
  id: string;
  nome: string;
  inicio: string; // YYYY-MM-DD
  fim: string; // YYYY-MM-DD
}

export interface Professora {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  formacao: string;
  /** Reservado para quando os acessos forem criados: id do usuário no provedor de auth. */
  usuarioId: string | null;
}

export interface Turma {
  id: string;
  nome: string;
  nivel: string; // MATERNAL 1, PRÉ I ...
  etapa: string; // CRECHE / PRÉ-ESCOLA
  turno: TurnoTurma;
  sala: string;
  /** Definido pela gestão. A primeira é a titular, as demais auxiliares. */
  professoraIds: string[];
}

export interface Responsavel {
  nome: string;
  parentesco: string;
  telefone: string;
  email?: string;
  profissao?: string;
}

export interface Aluno {
  id: string;
  codigo: string; // matrícula
  nome: string;
  turmaId: string;
  dataNascimento: string; // YYYY-MM-DD
  sexo: "F" | "M";
  turno: TurnoTurma;
  matriculadoEm: string; // YYYY-MM-DD
  mae: Responsavel;
  pai: Responsavel;
  /** Pessoas autorizadas a retirar a criança. */
  autorizados: Responsavel[];
  endereco: {
    logradouro: string;
    numero: string;
    bairro: string;
    cidade: string;
    uf: string;
    cep: string;
  };
  saude: {
    tipoSanguineo: string;
    alergias: string[];
    restricoesAlimentares: string[];
    medicacoes: string[];
    convenio: string;
    observacoes: string;
  };
  transporte: string;
  observacoes: string;
}

export interface RegistroPresenca {
  manha: boolean;
  tarde: boolean;
  observacao?: string;
}

/** Uma chamada = uma turma em uma data. */
export interface Chamada {
  turmaId: string;
  data: string; // YYYY-MM-DD
  /** null enquanto a professora não salvar. É isso que define "feita / não feita". */
  lancadaEm: string | null;
  lancadaPor: string | null;
  registros: Record<string, RegistroPresenca>;
}

export type StatusChamada = "lancada" | "pendente" | "atrasada";

export interface EstadoEscola {
  versao: number;
  escola: Escola;
  periodos: PeriodoLetivo[];
  feriados: { data: string; descricao: string }[];
  professoras: Professora[];
  turmas: Turma[];
  alunos: Aluno[];
  /** Chave: `${turmaId}|${data}` */
  chamadas: Record<string, Chamada>;
  /**
   * Avisos de falta que a direção já marcou como vistos: aluno → número de
   * faltas na hora em que foi visto. Se faltar de novo, o aviso volta a ser
   * novo.
   */
  avisosLidos: Record<string, number>;
}
