import { auth, clerkClient } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { UserService } from "@/services/userService";
import { AnalyticsService } from "@/services/analyticsService";

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

  // Obtener datos de la API en paralelo
  let userStats = null;
  let adminStats = null;
  
  try {
    const promises = [
      AnalyticsService.getUserStats(),
    ];
    
    if (isAdminUser) {
      promises.push(AnalyticsService.getAdminStats());
    }
    
    const results = await Promise.allSettled(promises);
    
    userStats = results[0].status === 'fulfilled' ? results[0].value : null;
    adminStats = results[1]?.status === 'fulfilled' ? results[1].value : null;
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    // Continue with null data - component will show loading/error states
  }

  return (
    <DashboardClient 
      userData={userData} 
      userStats={userStats}
      adminStats={adminStats}
    />
  );
}
