const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8080/api';

let getToken: (() => Promise<string>) | null = null

export const configureAuth = (fn: () => Promise<string>) => {
  getToken = fn
}

export class ApiError extends Error {
  status: number
  errorCode?: string

  constructor(status: number, statusText: string, errorCode?: string) {
    // Keep the `<status> <statusText>` format — provider.tsx matches on it.
    super(`${status} ${statusText}`)
    this.name = 'ApiError'
    this.status = status
    this.errorCode = errorCode
  }
}

async function request(path: string, init?: RequestInit): Promise<unknown> {
    const headers: Record<string, string> = {}
    // FormData must set its own multipart boundary — no manual Content-Type.
    if (!(init?.body instanceof FormData)) {
        headers['Content-Type'] = 'application/json'
    }
    if (getToken) {
        const token = await getToken()
        headers['Authorization'] = `Bearer ${token}`
    }
    const res = await fetch(`${API_BASE}${path}`, {
        ...init,
        headers,
    });
    if (!res.ok) {
        let errorCode: string | undefined
        try {
            const body = (await res.json()) as { errorCode?: unknown }
            if (typeof body?.errorCode === 'string') errorCode = body.errorCode
        } catch {
            // non-JSON error body — status alone is enough
        }
        throw new ApiError(res.status, res.statusText, errorCode)
    }
    if (res.status === 204) return null
    return res.json()
}

export const apiClient = {
    get:    (path: string) => request(path),
    post:   (path: string, body: unknown) => request(path, { method: 'POST', body: JSON.stringify(body) }),
    put:    (path: string, body: unknown) => request(path, { method: 'PUT', body: JSON.stringify(body) }),
    putMultipart: (path: string, form: FormData) => request(path, { method: 'PUT', body: form }),
    delete: (path: string) => request(path, { method: 'DELETE' }),
}
