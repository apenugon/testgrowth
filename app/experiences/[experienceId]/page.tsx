import { whopApi } from "@/lib/whop-api";
import { verifyUserToken } from "@whop/api";
import { headers } from "next/headers";
import { isUserAdmin, isUserWhitelistedCreator, ensureAdminUser } from "@/lib/permissions";
// Import the client component for the experience page
import { ExperiencePageClient } from "@/app/experiences/[experienceId]/experience-page-client";

export default async function ExperiencePage({
  params,
}: {
  params: Promise<{ experienceId: string }>;
}) {
  // The headers contains the user token
  const headersList = await headers();
  
  // The experienceId is a path param
  const { experienceId } = await params;

  // The user token is in the headers
  const { userId } = await verifyUserToken(headersList);

  const result = await whopApi.checkIfUserHasAccessToExperience({
    userId,
    experienceId,
  });

  const user = (await whopApi.getUser({ userId })).publicUser;
  const experience = (await whopApi.getExperience({ experienceId })).experience;

  // Ensure admin user exists if this is the hardcoded admin
  if (user && user.username === "akulkid") {
    await ensureAdminUser(userId, user.username)
  }

  // Check permissions
  const isAdmin = await isUserAdmin(userId)
  const isWhitelistedCreator = await isUserWhitelistedCreator(userId)

  // Either: 'admin' | 'customer' | 'no_access';
  const { accessLevel } = result.hasAccessToExperience;

  // If user doesn't have access, show access denied
  if (!result.hasAccessToExperience.hasAccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <div className="w-8 h-8 text-red-600">🚫</div>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
            <p className="text-gray-600 mb-4">
              You don&apos;t have access to this contest platform. Please check your membership status.
            </p>
            <p className="text-sm text-gray-500">
              Experience: <strong>{experience.name}</strong>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Get the user token from headers to pass to client
  const userToken = headersList.get('x-whop-user-token');

  return (
    <ExperiencePageClient
      userId={userId}
      user={user}
      experience={experience}
      experienceId={experienceId}
      accessLevel={accessLevel}
      userToken={userToken}
      isAdmin={isAdmin}
      isWhitelistedCreator={isWhitelistedCreator}
    />
  );
}
