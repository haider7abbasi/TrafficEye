export function mapAuthError(e: unknown): string {
  const code = (e as { code?: string })?.code;
  switch (code) {
    case 'auth/invalid-email':
      return 'Invalid email address.';
    case 'auth/user-disabled':
      return 'This account has been disabled.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Invalid email or password.';
    case 'auth/network-request-failed':
      return 'Network error. Check your connection.';
    case 'auth/email-already-in-use':
      return 'This email is already in use.';
    case 'auth/weak-password':
      return 'Password should be at least 6 characters.';
    default:
      return (e as Error)?.message || 'Sign in failed. Try again.';
  }
}
