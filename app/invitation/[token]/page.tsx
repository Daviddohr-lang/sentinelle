import { InvitationAcceptanceForm } from "@/components/invitation-acceptance-form";

export default async function InvitationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <InvitationAcceptanceForm token={token} />;
}
