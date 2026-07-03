import { describe, it, expect, vi, beforeEach } from 'vitest'
import { apiClient, ApiError } from './api-client'

const fetchMock = vi.fn()
vi.stubGlobal('fetch', fetchMock)

const okJson = (body: unknown) => ({
  ok: true,
  status: 200,
  json: async () => body,
})

describe('apiClient.putMultipart', () => {
  beforeEach(() => fetchMock.mockReset())

  it('sends FormData with PUT and no Content-Type header', async () => {
    fetchMock.mockResolvedValue(okJson({}))
    const form = new FormData()
    await apiClient.putMultipart('/walls/5/image', form)

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toContain('/walls/5/image')
    expect(init.method).toBe('PUT')
    expect(init.body).toBe(form)
    expect(init.headers).not.toHaveProperty('Content-Type')
  })

  it('still sets Content-Type for JSON requests', async () => {
    fetchMock.mockResolvedValue(okJson({}))
    await apiClient.post('/walls', { name: 'x' })
    const [, init] = fetchMock.mock.calls[0]
    expect(init.headers['Content-Type']).toBe('application/json')
  })
})

describe('ApiError', () => {
  beforeEach(() => fetchMock.mockReset())

  it('carries status and errorCode from a JSON error body', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 413,
      statusText: 'Payload Too Large',
      json: async () => ({ errorCode: 'PAYLOAD_TOO_LARGE', message: 'too big' }),
    })
    const err = await apiClient.get('/walls/5').catch((e: unknown) => e)
    expect(err).toBeInstanceOf(ApiError)
    expect((err as ApiError).status).toBe(413)
    expect((err as ApiError).errorCode).toBe('PAYLOAD_TOO_LARGE')
    expect((err as ApiError).message).toBe('413 Payload Too Large')
  })

  it('omits errorCode when the error body is not JSON', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 502,
      statusText: 'Bad Gateway',
      json: async () => { throw new Error('not json') },
    })
    const err = await apiClient.get('/walls/5').catch((e: unknown) => e)
    expect(err).toBeInstanceOf(ApiError)
    expect((err as ApiError).status).toBe(502)
    expect((err as ApiError).errorCode).toBeUndefined()
  })
})
