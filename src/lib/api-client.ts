const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8080/api';

async function request(path: string, init?: RequestInit): Promise<unknown> {
    const res = await fetch(`${API_BASE}${path}`, {
        headers: { 'Content-Type': 'application/json', ...init?.headers},
        ...init,
    });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    if (res.status === 204) return null
    return res.json()
}

export const apiClient = {
    get:    (path: string) => request(path),
    post:   (path: string, body: unknown) => request(path, { method: 'POST', body: JSON.stringify(body) }),
    put:    (path: string, body: unknown) => request(path, { method: 'PUT', body: JSON.stringify(body) }),
    delete: (path: string) => request(path, { method: 'DELETE' }),
}