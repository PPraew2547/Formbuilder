import { describe, it, expect, beforeAll } from 'vitest'
import app from '../index'
import { db } from '../db/client'
import { forms } from '../db/schema/forms'
import { formRoutes } from '../db/schema/form_routes'
import { formVersions } from '../db/schema/form_versions'

describe('form resolver', () => {
  let testFormId: string
  let testSlug: string
  let testUrl: string

  beforeAll(async () => {
    testSlug = `resolver-test-form-${Date.now()}`
    testUrl = `/test-page-${Date.now()}`

    const form = await db
      .insert(forms)
      .values({
        name: 'Test Resolver Form',
        slug: testSlug,
        status: 'published',
        title: 'Resolver Test',
        description: 'test',
        locale: 'en',
        isActive: true,
      })
      .returning()

    testFormId = form[0].id

    await db.insert(formRoutes).values({
      formId: testFormId,
      matchType: 'exact',
      urlPattern: testUrl,
      priority: 1,
      isActive: true,
    })

    await db.insert(formVersions).values({
      formId: testFormId,
      version: 1,
      isPublished: true,
      schemaJson: {
        title: 'Resolver Test',
        fields: [],
      },
    })
  })

  it('should resolve correct form by URL', async () => {
    const res = await app.request(`/public/form-resolver?url=${encodeURIComponent(testUrl)}`)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.matched).toBe(true)
    expect(json.formId).toBe(testFormId)
    expect(json.submitUrl).toBe(`/public/forms/${testSlug}/submit`)
  })
})

