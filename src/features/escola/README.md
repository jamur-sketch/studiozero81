# Módulo Escola — diário da professora

Sistema de gerenciamento de escola de educação infantil: chamada diária,
ficha completa das crianças e cobrança automática do lançamento.

Entra por **`/escola`**. É independente do sistema do studio: não usa Supabase
nem a autenticação existente.

## Duas áreas separadas

Professoras e gestão são portas diferentes: cada uma tem o seu link, o seu login
e a sua sessão. Entrar em uma não dá acesso à outra — a conta da direção é
recusada na porta da professora e vice-versa (`autenticar`, em `lib/acesso.ts`).

| Área | Link de acesso | Quem entra |
| --- | --- | --- |
| Professora | `/escola/professor/entrar` | Quem dá aula, para lançar a chamada |
| Gestão | `/escola/gestao/entrar` | Direção e coordenação |

`/escola` é só a portaria: mostra as duas portas e o endereço de cada uma, para
a escola saber qual link mandar para cada pessoa.

### Telas da professora

| Rota | O que é |
| --- | --- |
| `/escola/professor` | Página do Professor: turmas, chamada de hoje e pendências |
| `/escola/professor/turma/:turmaId` | Visão da turma |
| `/escola/professor/turma/:turmaId/chamada` | Datas do período, com status lançada / não lançada |
| `/escola/professor/turma/:turmaId/chamada/:data` | Lançamento da chamada do dia |
| `/escola/professor/turma/:turmaId/visao-geral` | Frequência de cada criança |
| `/escola/professor/turma/:turmaId/alunos` | Lista de estudantes |
| `/escola/professor/aluno/:alunoId` | Ficha da criança |

### Telas da gestão

| Rota | O que é |
| --- | --- |
| `/escola/gestao` | Visão geral: indicadores, notificações de faltas e chamada de hoje |
| `/escola/gestao/chamadas` | Mapa de lançamentos por dia e turma, e o que está em atraso |
| `/escola/gestao/turmas` | Turmas, frequência média e quem está em alerta |
| `/escola/gestao/turma/:turmaId` | Frequência criança a criança |
| `/escola/gestao/professoras` | Acessos e vínculo professora × turma |

## Acesso e senha

Cada pessoa entra com e-mail e senha (`Usuario` em `types.ts`). A gestão liga e
desliga o acesso de cada uma na tela *Professoras e acessos* — desligar bloqueia
a entrada na hora e derruba a sessão aberta.

**Isto ainda não é autenticação de verdade.** A senha está em texto puro na
carga de demonstração e a conferência acontece no navegador, porque não há
servidor. Para valer, é preciso:

1. trocar `autenticar` (`lib/acesso.ts`) por uma chamada ao provedor — Supabase
   Auth, por exemplo — e apagar o campo `senha` de `Usuario`;
2. trocar o miolo de `hooks/useSessao.tsx` pela sessão do provedor, mantendo o
   mesmo contrato (`usuario`, `professora`, `carregando`, `entrar`, `sair`);
3. remover a caixa "Acessos de demonstração" de `components/FormularioEntrada.tsx`;
4. repetir a checagem de papel no servidor — o guard de rota é conveniência de
   navegação, não segurança.

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

## O que ainda falta na gestão

O painel já cobre acompanhamento de chamadas, acessos e vínculo professora ×
turma. Ainda não tem: cadastro de turmas e do calendário letivo, criação de
novas contas pela tela e edição da ficha das crianças — hoje tudo isso vem da
carga de dados.

## Dados

Fictícios e gerados de forma determinística em `data/seed.ts` — mesma semente,
mesma turma, sempre os mesmos nomes. Nada vem de pessoas reais. São 3 turmas,
3 professoras, 2 contas de gestão e 38 crianças com filiação, responsáveis
autorizados, endereço, saúde (alergias, restrições, medicações) e observações de
rotina. Todas as contas usam a senha `SENHA_DEMONSTRACAO`.

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
aviso de faltas para a direção. `lib/acesso.test.ts` cobre o login de cada área,
incluindo a recusa de conta de outra área e de acesso desativado.
