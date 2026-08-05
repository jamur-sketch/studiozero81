# Módulo Escola — diário da professora

Sistema de gerenciamento de escola de educação infantil: chamada diária,
ficha completa das crianças e cobrança automática do lançamento.

Entra por **`/escola`**. É independente do sistema do studio: não usa Supabase
nem a autenticação existente.

## Telas

| Rota | O que é |
| --- | --- |
| `/escola/entrar` | Entrada da professora (ainda sem login — ver abaixo) |
| `/escola/painel` | Página do Professor: turmas, situação da chamada de hoje e pendências |
| `/escola/turma/:turmaId` | Visão da turma |
| `/escola/turma/:turmaId/chamada` | Datas do período, com status lançada / não lançada |
| `/escola/turma/:turmaId/visao-geral` | Visão geral da turma: frequência de cada criança |
| `/escola/turma/:turmaId/chamada/:data` | Lançamento da chamada do dia |
| `/escola/turma/:turmaId/alunos` | Lista de estudantes |
| `/escola/aluno/:alunoId` | Ficha da criança |
| `/escola/gestao` | Painel da gestão — **reservado, ainda não construído** |

## Como funciona a chamada

- **Turnos, não períodos.** A grade tem `Manhã` e `Tarde` em vez de 1º/2º/3º
  período — sempre os dois, em qualquer turma (`TURNOS_CHAMADA`), porque a
  criança pode ficar meio turno ou o dia todo e quem registra isso é a
  professora.
- **Coluna "Todos"** em cada linha marca/desmarca os dois turnos daquela
  criança. A linha *Todos os estudantes*, no topo, faz o mesmo para a turma
  inteira: por coluna de turno ou tudo de uma vez, no cruzamento.
- Toda alternância é "se está tudo marcado, desmarca; senão, marca tudo".
- **Três estados, não dois** (`estadoDoGrupo`): verde (tudo marcado), vermelho
  (nada marcado) e âmbar (parte marcada). Sem o âmbar, uma criança sem tarde
  pintava a coluna inteira de vermelho e parecia que a turma toda faltou. Há uma
  legenda acima da tabela.
- **Frequência em coluna própria**, entre o nome e os turnos: quantos dias a
  criança veio sobre os dias já lançados (`19/36`), com o percentual embaixo.
- Falta é o dia inteiro: ausente nos dois turnos. Meio período conta como dia
  presente.
- **As datas aparecem sozinhas conforme o calendário vira**: são os dias úteis
  do período letivo, sem feriados, nunca à frente de hoje e nunca antes de
  `escola.usoDesde` (data em que a escola começou a usar o sistema).
- Com a chamada do dia já lançada, o painel manda a professora para a **visão
  geral da turma** em vez de reabrir o mesmo dia.

## O aviso de lançamento diário

A chamada é obrigatória todo dia letivo. Enquanto não for salva:

- ao entrar, a professora recebe um **modal** listando o que está em aberto
  (uma vez por dia — `ModalAvisoEntrada`);
- uma **faixa fixa** aparece no topo de todas as telas (`AvisoPendencias`),
  vermelha para dias atrasados e âmbar para o dia de hoje;
- o painel lista "Chamadas em aberto" com link direto para o lançamento.

Um dia só sai da cobrança depois que a professora clica em **Lançar chamada** —
abrir a tela não conta. A regra está em `pendenciasDaProfessora`
(`lib/chamada.ts`) e é coberta por testes.

## Aviso de faltas para a direção

Quando qualquer criança chega a **5 faltas** (`LIMITE_FALTAS_AVISO`), um aviso
aparece no painel da gestão, com contador no sino, a turma, o total de faltas, a
frequência e a data da última falta. A direção pode marcar como visto; o aviso
volta a ficar novo se a criança faltar de novo (`avisosLidos` guarda o número de
faltas no momento em que foi visto). A regra está em `avisosDeFaltas`
(`lib/chamada.ts`) e a mesma contagem alimenta o alerta na visão geral da turma.

## O que ainda não está ligado (de propósito)

**Acessos das professoras.** Não existem login e senha ainda. `pages/Entrar.tsx`
lista as professoras cadastradas e a escolhida fica na sessão. Todo o resto do
sistema consome `useProfessora()`, que já expõe o mesmo contrato de uma
autenticação real (`professora`, `carregando`, `entrar`, `sair`). Quando as
contas existirem:

1. trocar o miolo de `hooks/useProfessora.tsx` pela autenticação (Supabase Auth,
   por exemplo), casando `Professora.usuarioId` com o usuário logado;
2. transformar `pages/Entrar.tsx` no formulário de login;
3. `components/ProfessoraRoute.tsx` já é o ponto do guard — é onde entra também
   a checagem de papel (professora × gestão).

**Painel da gestão.** Só o esqueleto (`pages/Gestao.tsx`). É lá que vão ficar a
criação de acessos, o vínculo professora × turma, o calendário e o cadastro das
crianças. O modelo de dados já suporta: `Turma.professoraIds` define quem dá
aula em qual turma (uma professora pode ter mais de uma turma, e uma turma mais
de uma professora).

## Dados

Fictícios e gerados de forma determinística em `data/seed.ts` — mesma semente,
mesma turma, sempre os mesmos nomes. Nada vem de pessoas reais. São 3 turmas,
3 professoras e 38 crianças com filiação, responsáveis autorizados, endereço,
saúde (alergias, restrições, medicações) e observações de rotina.

A escola "usa o sistema" desde 01/06, então há alguns meses de chamada lançada —
o suficiente para a frequência significar alguma coisa. A carga deixa lançadas
todas as chamadas menos os dois últimos dias anteriores a hoje, para o aviso de
pendência sempre aparecer, e dá a uma criança de cada turma um histórico de
infrequência, para a direção ter o que ver no aviso de faltas. O botão
"Reiniciar dados de demonstração", na barra lateral, recria tudo.

Persistência: `localStorage` (`data/store.ts`), chave `escola:estado:v1`. Trocar
por um banco é mexer só nesse arquivo — as telas não conhecem o storage.

## Testes

```sh
npm test
```

`lib/chamada.test.ts` cobre as alternâncias do "Todos", o status da chamada, a
geração das datas do calendário, a regra de pendências, a frequência em dias e o
aviso de faltas para a direção.
