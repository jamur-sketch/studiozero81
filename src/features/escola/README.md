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
| `/escola/turma/:turmaId/chamada/:data` | Lançamento da chamada do dia |
| `/escola/turma/:turmaId/alunos` | Lista de estudantes |
| `/escola/aluno/:alunoId` | Ficha da criança |
| `/escola/gestao` | Painel da gestão — **reservado, ainda não construído** |

## Como funciona a chamada

- **Turnos, não períodos.** A grade tem uma coluna por turno da turma
  (`Manhã`, `Tarde`) em vez de 1º/2º/3º período. Turma integral mostra as duas.
- **Coluna "Todos"** em cada linha marca/desmarca todos os turnos daquela
  criança. A linha *Todos os estudantes*, no topo, faz o mesmo para a turma
  inteira: por coluna de turno ou tudo de uma vez, no cruzamento.
- Toda alternância é "se está tudo marcado, desmarca; senão, marca tudo".
- Falta no dia = ausente em todos os turnos. Ausente em só um turno conta meia
  falta e mantém a criança como presente no dia.
- **As datas aparecem sozinhas conforme o calendário vira**: são os dias úteis
  do período letivo, sem feriados, nunca à frente de hoje e nunca antes de
  `escola.usoDesde` (data em que a escola começou a usar o sistema).

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

A carga de demonstração deixa lançadas todas as chamadas do período menos os
dois últimos dias anteriores a hoje — assim o aviso de pendência sempre aparece.
O botão "Reiniciar dados de demonstração", na barra lateral, recria tudo.

Persistência: `localStorage` (`data/store.ts`), chave `escola:estado:v1`. Trocar
por um banco é mexer só nesse arquivo — as telas não conhecem o storage.

## Testes

```sh
npm test
```

`lib/chamada.test.ts` cobre as alternâncias do "Todos", o status da chamada, a
geração das datas do calendário e a regra de pendências.
