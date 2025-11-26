// TODO: Replace this with your actual auth implementation
// Examples:
// - NextAuth: const session = await auth(); return session?.user?.id ?? "anonymous";
// - Clerk: const { userId } = await auth(); return userId ?? "anonymous";
// - Supabase: const { data: { user } } = await supabase.auth.getUser(); return user?.id ?? "anonymous";

/**
 * Get the current user ID from the request.
 * Returns "anonymous" if no user is authenticated.
 */
export async function getUserId(req: Request): Promise<string> {
	// For development/testing only - returns a demo user
	// You can also check the request headers, cookies, etc.
	const userId = req.headers.get("x-user-id");
	return userId || "demo-user";
}
