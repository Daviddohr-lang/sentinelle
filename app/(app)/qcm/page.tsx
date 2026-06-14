import { redirect } from "next/navigation";
import { QcmManager } from "@/components/qcm-manager";
import { getSessionFromCookies } from "@/lib/auth";

export default async function QcmPage() {
  const user = await getSessionFromCookies();
  if (!user) redirect("/login");
  return <QcmManager userRole={user.role} />;
}
