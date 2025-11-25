// in real app , use your auth provider's session  to get user id
export function getUserId(req: Request) {
	return req.headers.get("x-user-id") || "demo-user";
}

/**
 * getSession().user.id etc
 */
