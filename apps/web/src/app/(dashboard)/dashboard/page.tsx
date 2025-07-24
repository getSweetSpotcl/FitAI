import { auth, clerkClient } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

// Force dynamic rendering for Clerk server functions
export const dynamic = "force-dynamic";

import DashboardClient from "./DashboardClient";

export default async function DashboardPage() {
  const { userId, sessionClaims } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  // Obtener información completa del usuario
  const client = await clerkClient();
  const user = await client.users.getUser(userId);

  // Verificar rol del usuario - Clerk puede almacenar metadata en diferentes ubicaciones
  const userRole =
    (sessionClaims as any)?.metadata?.role ||
    (sessionClaims as any)?.publicMetadata?.role ||
    user.publicMetadata?.role ||
    user.privateMetadata?.role ||
    "user";

  // Verificación adicional para admin basada en email (como fallback)
  const isAdminUser =
    userRole === "admin" ||
    user.primaryEmailAddress?.emailAddress === "gcortinez@getsweetspot.io";

  // Preparar datos para el componente cliente
  const userData = {
    firstName: user.firstName || "",
    lastName: user.lastName || "",
    email: user.primaryEmailAddress?.emailAddress || "",
    isAdmin: isAdminUser,
  };

  return <DashboardClient userData={userData} />;
}
