import { describe, it, expect, beforeAll, vi } from 'vitest'
import app from '../index'
import { db } from '../db/client'
import { forms } from '../db/schema/forms'
import { formVersions } from '../db/schema/form_versions'
import { formTargets } from '../db/schema/form_targets'
import { formSubmissions } from '../db/schema/form_submissions'
import { submissionAttempts } from '../db/schema/submission_attempts'
import { submissionEvents } from '../db/schema/submission_events'
import { eq } from 'drizzle-orm'

describe('submit form', () => {
  let testFormId: string
  let testSlug: string

  beforeAll(async () => {
    testSlug = `submit-test-form-${Date.now()}`

    const form = await db
      .insert(forms)
      .values({
        name: 'Submit Test Form',
        slug: testSlug,
        status: 'published',
        title: 'Submit Test',
        description: 'submit test',
        locale: 'en',
        isActive: true,
      })
      .returning()

    testFormId = form[0].id

    await db.insert(formVersions).values({
      formId: testFormId,
      version: 1,
      isPublished: true,
      schemaJson: {
        fields: [
          {
            fieldKey: 'name',
            label: 'Name',
            type: 'text',
            required: true,
          },
          {
            fieldKey: 'email',
            label: 'Email',
            type: 'email',
            required: true,
          },
        ],
      },
    })

    await db.insert(formTargets).values({
      formId: testFormId,
      targetType: 'webhook',
      httpMethod: 'POST',
      targetUrl: 'https://example.com/webhook',
      headersJson: null,
      authConfigJson: null,
      mappingJson: {
        fieldMap: {
          name: 'customer.name',
          email: 'customer.contact.email',
        },
        staticValues: {
          source: 'website',
        },
      },
      isActive: true,
      priority: 1,
    })
  })

  it('should submit form successfully', async () => {
    const originalFetch = global.fetch

    const fetchMock = vi
      .spyOn(global, 'fetch')
      .mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url

        if (url === 'https://example.com/webhook') {
          return {
            ok: true,
            status: 200,
            text: async () => 'ok',
          } as Response
        }

        return originalFetch(input, init)
      })

    const res = await app.request(`/public/forms/${testSlug}/submit`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        values: {
          name: 'Test User',
          email: 'test@example.com',
        },
      }),
    })

    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.submissionId).toBeTruthy()

    const submissionId = json.submissionId

    const submissions = await db
      .select()
      .from(formSubmissions)
      .where(eq(formSubmissions.id, submissionId))

    expect(submissions.length).toBe(1)
    expect(submissions[0].status).toBe('forwarded')
    expect(submissions[0].forwardStatus).toBe('success')

    const attempts = await db
      .select()
      .from(submissionAttempts)
      .where(eq(submissionAttempts.submissionId, submissionId))

    expect(attempts.length).toBe(1)
    expect(attempts[0].status).toBe('success')

    const events = await db
      .select()
      .from(submissionEvents)
      .where(eq(submissionEvents.submissionId, submissionId))

    const eventTypes = events.map((e) => e.eventType)

    expect(eventTypes).toContain('received')
    expect(eventTypes).toContain('validated')
    expect(eventTypes).toContain('stored')
    expect(eventTypes).toContain('forwarded')

    fetchMock.mockRestore()
  })
})