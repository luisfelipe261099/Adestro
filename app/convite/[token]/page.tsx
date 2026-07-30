import { InviteClient } from "./invite-client";

export const metadata = { title: "Cadastro | Adestro" };

// Rota pública: quem abre este link ainda não é cliente e não tem sessão.
export default async function ConvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <InviteClient token={token} />;
}
