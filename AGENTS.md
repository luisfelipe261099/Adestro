<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Tutorial sempre em dia

Ao adicionar ou mudar uma funcionalidade visível ao usuário, atualize NO MESMO commit/PR:

- `app/tutorial/page.tsx` — guia do adestrador (fluxo, mapa de telas, destaques, FAQ) e guia do admin.
- `app/tutorial/cliente/page.tsx` — se a mudança afeta o portal do cliente.
- `components/product-tour.tsx` — passos dos tours guiados (`TRAINER_STEPS`, `ADMIN_STEPS`, `TUTOR_STEPS`); adicione âncoras `data-tour` na tela nova quando fizer sentido destacá-la.

O tutorial desatualizado é pior que nenhum: o usuário confia nele para descobrir o sistema.
