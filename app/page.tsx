import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { Landing } from "@/components/landing";
import { homeRouteForRole } from "@/lib/routes";

export default async function Home() {
  const session = await auth();

  // Quem já está logado não vê a landing — vai direto para a home do seu perfil.
  if (session?.user) {
    const role = (session.user as { role?: string }).role;
    redirect(homeRouteForRole(role));
  }

  return <Landing />;
}
