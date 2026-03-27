const TOKEN_KEY = 'everythingllm_token'

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function isAuthenticated(): boolean {
  return !!getToken()
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY)
}

// Phase 1: stores a mock token — real Cognito wired in Phase 1 auth flow completion
export async function signIn(email: string, _password: string): Promise<void> {
  setToken(`mock-token-${email}-${Date.now()}`)
}

export async function signOut(): Promise<void> {
  clearToken()
}
