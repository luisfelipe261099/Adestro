import { Suspense } from "react";
import { CadastroClient } from "./cadastro-client";

export const metadata = {
  title: "Criar conta gratuita | Adestro",
  description: "Crie sua conta e acesse todos os módulos gratuitamente por 90 dias. Sem cartão de crédito.",
};

export default function CadastroPage() {
  return (
    <Suspense>
      <CadastroClient />
    </Suspense>
  );
}
