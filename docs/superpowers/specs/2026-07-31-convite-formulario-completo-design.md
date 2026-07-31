# Convite de autocadastro: formulário completo — Design

**Data:** 31/07/2026
**Contexto:** estende `docs/superpowers/specs/2026-07-30-autocadastro-cliente-por-convite-design.md`

## Problema

O adestrador usava um Google Forms ("Ficha Cadastral e Avaliação Comportamental Canina")
para receber cliente e cão. O convite de autocadastro implementado em 30/07 pergunta só
cinco campos e joga o tutor na ficha de onboarding do portal para o resto.

Duas coisas quebram nesse arranjo:

1. **Seis perguntas do Forms não existem em lugar nenhum do sistema** — e são justamente as
   de segurança, as que decidem se o adestrador pode se aproximar do cão na primeira aula:
   convivência com crianças, reação a barulhos fortes, histórico de agressividade ou
   mordidas, proteção de recursos, aceita manipulação, e contato de emergência.

2. **Três perguntas estão meio construídas.** `portal-onboarding-client.tsx` declara
   `rotSleep`, `rotWalks` e `rotPlays`, envia os três no payload
   (`routine: { alimentation, sleep, walks, plays }`) e **nunca renderiza um campo** — os
   setters não são chamados em lugar nenhum. Rotina de sono, de passeios e de brincadeiras
   viajam vazias desde sempre. O mesmo vale para `tempPositive` e `envConvive`.

   Pior: `envHistory` nasce com `useState("Nunca foi adestrado")` e também nunca é
   perguntado. Todo cão cadastrado grava essa frase como se fosse resposta do tutor. É um
   dado falso, não um dado ausente.

## Decisão

O convite passa a ser **o formulário único**. Absorve o Forms inteiro e mais o que a ficha
de onboarding pedia (endereço estruturado, vacinas com data, microchip, veterinário,
objetivos de treino). A ficha de onboarding sai do fluxo do convite.

Isso foi escolhido sabendo do custo: o convite sai de 5 para ~40 campos e deixa de ser
"menos de um minuto". O texto da tela muda junto — ver "Cópia da tela" abaixo.

A ficha de onboarding **continua existindo**, para o cliente que o adestrador cadastra à
mão e a quem manda o link do portal. Só deixa de ser o destino do convite.

## Seções

Espelham as três seções do Google Forms original, que já era paginado.

### Seção 1 — Dados do Cliente

| Campo | Destino | Obrigatório |
|---|---|---|
| Nome completo | `ClientProfile.name` | **sim** |
| CPF ou RG | `ClientProfile.cpf` | não |
| Telefone / WhatsApp | `ClientProfile.phone` | **sim** |
| E-mail | `ClientProfile.email` | não |
| CEP, rua, número, complemento, bairro, cidade, UF | `Address` (`nickname: "Casa"`, `isDefault: true`) | não |
| Contato de emergência — nome | `ClientProfile.secondContactName` | não |
| Contato de emergência — telefone | `ClientProfile.secondContactPhone` | não |

O Forms pedia telefone como obrigatório e o convite atual não pedia telefone algum. Passa a
ser obrigatório: sem telefone o adestrador não consegue retomar o lead, que é o ponto do
salvamento progressivo.

### Seção 2 — Dados do Cão

| Campo | Destino | Obrigatório |
|---|---|---|
| Nome do cão | `Dog.name` | **sim** |
| Foto | `Dog.photoUrl` (base64) | não |
| Raça / SRD | `Dog.breed` | não |
| Data de nascimento | `Dog.birthDate` | não |
| Idade aproximada | `Dog.age` | não |
| Sexo | `Dog.sex` | não |
| Castrado(a) | `Dog.castrated` | não |
| Porte / peso | `Dog.weight` | não |
| Microchip | `Dog.microchip` | não |
| Cor | `Dog.color` | não |
| Vacinação e antipulgas em dia | `Dog.preventiveCare` (**coluna nova**) | não |
| Vacinas (nome, data, validade) | `Dog.vaccines` (JSON, já existe) | não |
| Alergias / problemas de saúde / medicamentos | `Dog.dietRestrictions`, `Dog.healthConditions` | não |
| Veterinário (nome + telefone) | `Dog.veterinarian` | não |

O Forms juntava sexo e castração numa pergunta só ("Macho castrado", "Fêmea não castrada").
O schema já separa os dois, o que é melhor para filtrar. Ficam duas perguntas.

### Seção 3 — Comportamento e Rotina

Tudo cai nas colunas JSON que o `Dog` já tem. Chaves novas em **negrito**.

`Dog.temperament`:

| Pergunta | Chave | Tipo |
|---|---|---|
| Nível de energia | `energy` | seleção |
| Convivência com pessoas / estranhos | `social` | seleção |
| Convivência com outros cães | `dogs` | seleção |
| **Convivência com crianças** | **`children`** | seleção |
| **Reação a barulhos fortes** | **`noise`** | **lista** (múltipla escolha) |
| **Histórico de agressividade ou mordidas** | **`biteHistory`** | seleção |
| **Proteção de recursos** | **`resourceGuarding`** | seleção |
| **Aceita manipulação** | **`handling`** | seleção |
| **Comportamentos indesejados** | **`unwantedBehaviors`** | **lista** (múltipla escolha) |
| Problemas comportamentais / observações | `behavior` | texto |
| Pontos positivos | `positive` | texto (hoje morto) |

`Dog.routine`:

| Pergunta | Chave |
|---|---|
| Rotina de alimentação | `alimentation` |
| Rotina de passeios | `walks` (hoje morto) |
| Rotina de brincadeiras e brinquedos favoritos | `plays` (hoje morto) |
| Rotina de sono | `sleep` (hoje morto) |

`Dog.environmentalAnalysis`:

| Pergunta | Chave |
|---|---|
| Tempo sozinho por dia | `aloneTime` |
| Com quem o cão convive | `convive` (hoje morto) |
| Já foi adestrado antes | `history` (hoje mente) |

`Dog.trainingGoals` — objetivos de treino (obediência, comportamento, passeio, avançado,
reabilitação), como já existe no onboarding.

`ClientProfile.propertyType` — tipo de imóvel, como já existe.

### Valores gravados

Os valores hoje em banco são verbosos: `"Alta energia"`, `"Sociável com pessoas"`,
`"Reativo a outros cães"`. Já existem cães cadastrados com eles, e a tela do adestrador os
exibe direto.

**O valor gravado não muda.** As palavras do Google Forms entram só como rótulo visível
quando lerem melhor. Exemplo: o rótulo "Muito Alto" grava `"Hiperativo"`.

Vale para as perguntas novas também: valores em português, legíveis sem tabela de/para,
porque é isso que a tela do adestrador renderiza.

## Salvamento progressivo

Cada "Avançar" persiste. É o coração desta mudança: com 40 campos o abandono no meio deixa
de ser exceção, e o desenho antigo (uma transação só, no fim) perderia o lead inteiro.

| Ação | O que acontece |
|---|---|
| Concluir seção 1 | Transação: cria `ClientProfile` (status `"Rascunho"`) + `Address` + `PortalAccessLink`, e grava `ClientInvite.clientId`. **Lead capturado.** |
| Concluir seção 2 | Cria ou atualiza o `Dog` do cliente |
| Concluir seção 3 | Atualiza os JSONs de comportamento e grava `ClientInvite.completedAt`. Devolve `portalUrl` |

Nenhuma seção depois da primeira cria cliente: todas atualizam o registro que a seção 1
criou, encontrado pelo `clientId` do convite.

### Status novo: "Em preenchimento"

Sem isso o salvamento progressivo quebra a reentrada. `canReenterInvite` devolve `true`
assim que existe `clientId`; um tutor que parasse na seção 2 e voltasse ao link veria "Você
já se cadastrou — Abrir meu portal", e o formulário pela metade seria inalcançável.

`InviteStatus` passa a ser `"Revogado" | "Usado" | "Em preenchimento" | "Expirado" | "Pendente"`.

Ordem das regras em `getInviteStatus`, estendendo a que já existe:

1. `revokedAt` → **Revogado** (decisão do adestrador vence tudo)
2. `completedAt` → **Usado** (converteu; é o desfecho de sucesso)
3. `clientId` sem `completedAt` → **Em preenchimento**
4. `expiresAt <= agora` → **Expirado**
5. resto → **Pendente**

"Em preenchimento" vence "Expirado" de propósito: quem já começou não pode ser barrado no
meio por vencimento do link.

`canReenterInvite` passa a exigir `completedAt` — só reemite portal para quem terminou.

Ganho de lado: o adestrador enxerga na lista de convites quem começou e travou, que é
exatamente quem vale uma ligação.

### Retomada

`GET /api/invite/[token]` devolve `resumeStep` (1, 2 ou 3) e `prefill` com o que já foi
respondido, para a tela reabrir na seção certa preenchida.

`prefill` só devolve dados **daquele** cadastro, alcançado pelo `clientId` do convite.
A rota é pública: nada de expor outros clientes do adestrador.

## Schema

Duas colunas novas, ambas anuláveis. O `build` da Vercel roda `prisma db push`, então o
deploy aplica sozinho — sem passo manual.

```prisma
model ClientInvite {
  // ...
  // Nulo = começou mas não terminou. Distingue "Em preenchimento" de "Usado";
  // clientId sozinho não distingue, porque ele é gravado já na seção 1.
  completedAt DateTime?
}

model Dog {
  // ...
  // Pergunta rápida do Forms: "Em dia" | "Pendente / Incompleto".
  // Coexiste com `vaccines`, que é a lista detalhada com datas.
  preventiveCare String?
}
```

## Contrato da API

`POST /api/invite/[token]` passa a receber `{ section, data }`.

```ts
// Seção 1
{ section: 1, data: { clientName, phone, cpf?, email?, address?: {...}, emergencyName?, emergencyPhone? } }
→ 200 { ok: true, resumeStep: 2 }

// Seção 2
{ section: 2, data: { dogName, breed?, birthDate?, age?, sex?, castrated?, weight?,
                      microchip?, color?, preventiveCare?, vaccines?, dietRestrictions?,
                      healthConditions?, veterinarian?, photoUrl? } }
→ 200 { ok: true, resumeStep: 3 }

// Seção 3
{ section: 3, data: { temperament: {...}, routine: {...}, environmentalAnalysis: {...},
                      trainingGoals: {...}, propertyType? } }
→ 200 { portalUrl }
```

Erros: `400` payload inválido, `404` token inexistente, `410` revogado ou expirado,
`429` rate limit. As mensagens seguem a regra que já vale — específicas por motivo, em
português, acionáveis pelo tutor.

Enviar a seção 2 ou 3 sem ter concluído a 1 devolve `409` com instrução de recomeçar: o
`clientId` do convite é o que amarra tudo, e sem ele não há o que atualizar.

`POST` sem corpo continua sendo a reentrada de quem já terminou (emite portal novo),
exatamente como hoje.

## Foto numa rota pública

`/api/invite/[token]` não exige login. Aceitar imagem ali é superfície de ataque e peso no
banco — o projeto grava base64 em `LongText`.

- Redução no navegador antes de enviar: lado maior 1600 px, JPEG qualidade 0.8
- Limite de 2 MB na string base64, recusado na rota com mensagem clara
- O `rateLimit()` que já existe cobre a frequência

O Forms aceitava 100 MB. Não é replicável aqui e nem faz sentido: a foto vira miniatura na
lista de cães.

## Cópia da tela

"Leva menos de um minuto" sai. Entra indicação de progresso ("Seção 1 de 3") e um texto que
diz a verdade: que são algumas perguntas sobre o tutor e o cão, que dá para parar e voltar
depois pelo mesmo link, e que o adestrador precisa das respostas de comportamento antes da
primeira aula.

## Arquivos

| Arquivo | Mudança |
|---|---|
| `prisma/schema.prisma` | `ClientInvite.completedAt`, `Dog.preventiveCare` |
| `lib/client-invite.ts` | status "Em preenchimento", `canReenterInvite` exige `completedAt`, `getInviteResumeStep` |
| `lib/validators.ts` | um schema zod por seção |
| `lib/invite-options.ts` (criar) | listas de opções das perguntas, valor + rótulo, num lugar só |
| `app/api/invite/[token]/route.ts` | `GET` devolve `resumeStep`/`prefill`; `POST` por seção |
| `app/convite/[token]/invite-client.tsx` | formulário em 3 seções, retomada, redução de imagem |
| `components/client-invite-panel.tsx` | exibe "Em preenchimento" |
| `app/clientes/page.tsx`, `app/clientes/[clientId]/` | exibem as respostas novas |
| `app/tutorial/page.tsx`, `app/tutorial/cliente/page.tsx`, `components/product-tour.tsx` | obrigatório pelo `AGENTS.md` |
| `scripts/check-client-invite.mts` | casos do status novo e do resume step |
| `scripts/check-invite-e2e.mjs` | percorre as 3 seções, abandona, retoma, conclui |

`lib/invite-options.ts` existe para as opções não ficarem duplicadas entre o formulário do
tutor e a tela do adestrador que renderiza as respostas — hoje as do onboarding estão
inline no JSX e é por isso que ninguém percebeu os campos mortos.

## Testes

**`npm run check:invite`** (lógica pura, sem banco): ordem das regras de `getInviteStatus`
com `completedAt`; "Em preenchimento" vence "Expirado"; `canReenterInvite` falso enquanto
não houver `completedAt`; `getInviteResumeStep` para cada combinação; os três schemas zod,
com o telefone agora obrigatório.

**`npm run check:invite:e2e`** (contra servidor e banco locais, conforme
`docs/desenvolvedor/ambiente-local.md`): percorre as três seções; confere que a seção 1
sozinha já cria o Rascunho com telefone; **abandona na seção 2, reabre o link e confirma
que retoma na seção certa com os dados preenchidos, e não com "Você já se cadastrou"**;
conclui e confirma que os JSONs de comportamento chegaram completos ao banco, incluindo as
listas de múltipla escolha; confirma que `routine.sleep`, `routine.walks` e `routine.plays`
deixaram de ser vazios; confirma que `environmentalAnalysis.history` reflete a resposta e
não mais a frase fixa.

Regressão a manter verde: rascunho fora da contagem do plano, limite cobrado na aprovação,
revogação, expiração, rotas privadas sem sessão.

## Fora de escopo

- A ficha de onboarding do portal continua como está, para clientes cadastrados à mão.
  Só deixa de ser o destino do convite.
- Importar respostas do Google Forms existente. Migração de histórico é outro projeto.
- `#__next, main { max-width: 100% }` fora de `@layer` em `app/globals.css`. Medido em
  31/07: com a regra antiga o `<main>` vai a 1590 px num monitor de 1600; com a correção,
  respeita `max-w-7xl` (1280 px). A correção está escrita e **não commitada**, porque
  atinge 15 telas de produção — decisão do dono do projeto, separada desta.
