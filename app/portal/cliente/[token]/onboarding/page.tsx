import { PortalOnboardingClient } from "./portal-onboarding-client";

type Params = {
  params: Promise<{ token: string }>;
};

export default async function PortalOnboardingPage({ params }: Params) {
  const { token } = await params;
  return <PortalOnboardingClient token={token} />;
}
