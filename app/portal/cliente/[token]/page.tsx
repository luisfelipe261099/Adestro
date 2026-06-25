import { PortalPublicClient } from "@/app/portal/cliente/portal-public-client";

type Params = {
  params: Promise<{ token: string }>;
};

export default async function PortalClienteTokenPage({ params }: Params) {
  const { token } = await params;
  return <PortalPublicClient token={token} />;
}
