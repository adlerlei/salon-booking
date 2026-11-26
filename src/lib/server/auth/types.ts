export type AuthProvider = 'line' | 'guest';

export type BookingSource = AuthProvider;

export type AuthIdentity = {
	provider: AuthProvider;
	subject: string;
	name?: string | null;
	email?: string | null;
	phone?: string | null;
};
