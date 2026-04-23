import { db } from './db/client'
import { forms } from './db/schema/forms'
import { and, asc, desc, eq } from 'drizzle-orm'
import { formFields } from './db/schema/form_fields'
import { formRoutes } from './db/schema/form_routes'
import { formTargets } from './db/schema/form_targets'
import { formVersions } from './db/schema/form_versions'
import { formSubmissions } from './db/schema/form_submissions'
import { submissionAttempts } from './db/schema/submission_attempts'
import { submissionEvents } from './db/schema/submission_events'
import { buildMappedPayload } from './mapping'
import { Hono } from 'hono'
import { renderer } from './renderer'
import { cors } from 'hono/cors'

type Variables = {
  requestId: string
}

const app = new Hono<{ Variables: Variables }>()
const allowedOrigins = ['http://localhost:5173']

app.use(
  '/public/*',
  cors({
    origin: (origin) => {
      if (!origin) return '*'
      return allowedOrigins.includes(origin) ? origin : null
    },
    allowMethods: ['GET', 'POST', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
  })
)

const submitRateLimitStore = new Map<string, { count: number; resetAt: number }>()

function isRateLimited(key: string, limit = 5, windowMs = 60 * 1000) {
  const now = Date.now()
  const existing = submitRateLimitStore.get(key)

  if (!existing || now > existing.resetAt) {
    submitRateLimitStore.set(key, {
      count: 1,
      resetAt: now + windowMs,
    })
    return false
  }

  if (existing.count >= limit) {
    return true
  }

  existing.count += 1
  submitRateLimitStore.set(key, existing)
  return false
}

function sanitizeValues(values: Record<string, unknown>) {
  const result: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(values)) {
    if (typeof value === 'string') {
      result[key] = value.trim()
    } else {
      result[key] = value
    }
  }

  return result
}

app.use('*', async (c, next) => {
  const requestId = crypto.randomUUID()
  c.set('requestId', requestId)
  await next()
})

app.use('*', async (c, next) => {
  const start = Date.now()
  await next()
  const duration = Date.now() - start

  console.log({
    requestId: c.get('requestId'),
    method: c.req.method,
    path: c.req.path,
    status: c.res.status,
    duration,
  })
})

app.onError((err, c) => {
  console.error({
    requestId: c.get('requestId'),
    error: err.message,
  })

  return c.json(
    {
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Internal Server Error',
      },
      requestId: c.get('requestId'),
    },
    500
  )
})

app.use(renderer)

app.get('/', (c) => {
  return c.render(<h1>Hello!</h1>)
})

app.get('/health', (c) => {
  return c.json({
    status: 'ok',
  })
})

app.get('/admin/forms', async (c) => {
  const allForms = await db
    .select()
    .from(forms)
    .where(eq(forms.isActive, true))

  return c.json(allForms)
})

app.post('/admin/forms', async (c) => {
  const body = await c.req.json()

  const newForm = await db
    .insert(forms)
    .values({
      name: body.name,
      slug: body.slug,
      status: body.status ?? 'draft',
      title: body.title,
      description: body.description,
      locale: body.locale ?? 'en',
      isActive: true,
    })
    .returning()

  return c.json(newForm[0])
})

app.get('/admin/forms/:id', async (c) => {
  const id = c.req.param('id')

  const form = await db.select().from(forms).where(eq(forms.id, id))

  if (form.length === 0) {
    return c.json(
      {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Form not found',
        },
      },
      404
    )
  }

  return c.json(form[0])
})

app.put('/admin/forms/:id', async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json()

  const updatedForm = await db
    .update(forms)
    .set({
      name: body.name,
      title: body.title,
      description: body.description,
      locale: body.locale,
      isActive: body.isActive,
    })
    .where(eq(forms.id, id))
    .returning()

  if (updatedForm.length === 0) {
    return c.json(
      {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Form not found',
        },
      },
      404
    )
  }

  return c.json(updatedForm[0])
})

app.delete('/admin/forms/:id', async (c) => {
  const id = c.req.param('id')

  const archivedForm = await db
    .update(forms)
    .set({
      status: 'archived',
      isActive: false,
    })
    .where(eq(forms.id, id))
    .returning()

  if (archivedForm.length === 0) {
    return c.json(
      {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Form not found',
        },
      },
      404
    )
  }

  return c.json({
    success: true,
    message: 'Form archived',
  })
})

app.post('/admin/forms/:id/fields', async (c) => {
  const formId = c.req.param('id')
  const body = await c.req.json()

  const newField = await db
    .insert(formFields)
    .values({
      formId,
      fieldKey: body.fieldKey,
      label: body.label,
      type: body.type,
      placeholder: body.placeholder,
      required: body.required,
      optionsJson: body.optionsJson,
      validationJson: body.validationJson,
      visibilityJson: body.visibilityJson,
      defaultValueJson: body.defaultValueJson,
      sortOrder: body.sortOrder,
      isActive: true,
    })
    .returning()

  return c.json(newField[0])
})

app.put('/admin/fields/:id', async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json()

  const updatedField = await db
    .update(formFields)
    .set({
      fieldKey: body.fieldKey,
      label: body.label,
      type: body.type,
      placeholder: body.placeholder,
      required: body.required,
      optionsJson: body.optionsJson,
      validationJson: body.validationJson,
      visibilityJson: body.visibilityJson,
      defaultValueJson: body.defaultValueJson,
      sortOrder: body.sortOrder,
      isActive: body.isActive,
    })
    .where(eq(formFields.id, id))
    .returning()

  if (updatedField.length === 0) {
    return c.json(
      {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Field not found',
        },
      },
      404
    )
  }

  return c.json(updatedField[0])
})

app.delete('/admin/fields/:id', async (c) => {
  const id = c.req.param('id')

  const deletedField = await db
    .update(formFields)
    .set({
      isActive: false,
    })
    .where(eq(formFields.id, id))
    .returning()

  if (deletedField.length === 0) {
    return c.json(
      {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Field not found',
        },
      },
      404
    )
  }

  return c.json({
    success: true,
    message: 'Field deactivated',
  })
})

app.post('/admin/forms/:id/fields/reorder', async (c) => {
  const body = await c.req.json()

  for (const field of body.fieldOrders) {
    await db
      .update(formFields)
      .set({
        sortOrder: field.sortOrder,
      })
      .where(eq(formFields.id, field.fieldId))
  }

  return c.json({
    success: true,
    message: 'Fields reordered',
  })
})

app.post('/admin/forms/:id/routes', async (c) => {
  const formId = c.req.param('id')
  const body = await c.req.json()

  const newRoute = await db
    .insert(formRoutes)
    .values({
      formId,
      siteId: body.siteId,
      matchType: body.matchType,
      urlPattern: body.urlPattern,
      priority: body.priority,
      isActive: body.isActive,
      startAt: body.startAt,
      endAt: body.endAt,
    })
    .returning()

  return c.json(newRoute[0])
})

app.put('/admin/routes/:id', async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json()

  const updatedRoute = await db
    .update(formRoutes)
    .set({
      siteId: body.siteId,
      matchType: body.matchType,
      urlPattern: body.urlPattern,
      priority: body.priority,
      isActive: body.isActive,
      startAt: body.startAt,
      endAt: body.endAt,
    })
    .where(eq(formRoutes.id, id))
    .returning()

  if (updatedRoute.length === 0) {
    return c.json(
      {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Route not found',
        },
      },
      404
    )
  }

  return c.json(updatedRoute[0])
})

app.delete('/admin/routes/:id', async (c) => {
  const id = c.req.param('id')

  const deletedRoute = await db
    .update(formRoutes)
    .set({
      isActive: false,
    })
    .where(eq(formRoutes.id, id))
    .returning()

  if (deletedRoute.length === 0) {
    return c.json(
      {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Route not found',
        },
      },
      404
    )
  }

  return c.json({
    success: true,
    message: 'Route deactivated',
  })
})

app.post('/admin/forms/:id/targets', async (c) => {
  const formId = c.req.param('id')
  const body = await c.req.json()

  const newTarget = await db
    .insert(formTargets)
    .values({
      formId,
      targetType: body.targetType,
      httpMethod: body.httpMethod,
      targetUrl: body.targetUrl,
      headersJson: body.headersJson,
      authConfigJson: body.authConfigJson,
      mappingJson: body.mappingJson,
      isActive: body.isActive,
      priority: body.priority,
    })
    .returning()

  return c.json(newTarget[0])
})

app.put('/admin/targets/:id', async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json()

  const updatedTarget = await db
    .update(formTargets)
    .set({
      targetType: body.targetType,
      httpMethod: body.httpMethod,
      targetUrl: body.targetUrl,
      headersJson: body.headersJson,
      authConfigJson: body.authConfigJson,
      mappingJson: body.mappingJson,
      isActive: body.isActive,
      priority: body.priority,
    })
    .where(eq(formTargets.id, id))
    .returning()

  if (updatedTarget.length === 0) {
    return c.json(
      {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Target not found',
        },
      },
      404
    )
  }

  return c.json(updatedTarget[0])
})

app.delete('/admin/targets/:id', async (c) => {
  const id = c.req.param('id')

  const deletedTarget = await db
    .update(formTargets)
    .set({
      isActive: false,
    })
    .where(eq(formTargets.id, id))
    .returning()

  if (deletedTarget.length === 0) {
    return c.json(
      {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Target not found',
        },
      },
      404
    )
  }

  return c.json({
    success: true,
    message: 'Target deactivated',
  })
})

app.post('/admin/forms/:id/versions/publish', async (c) => {
  const formId = c.req.param('id')

  const form = await db.select().from(forms).where(eq(forms.id, formId))

  if (form.length === 0) {
    return c.json(
      {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Form not found',
        },
      },
      404
    )
  }

  const fields = await db
    .select()
    .from(formFields)
    .where(and(eq(formFields.formId, formId), eq(formFields.isActive, true)))
    .orderBy(formFields.sortOrder)

  const existingVersions = await db
    .select()
    .from(formVersions)
    .where(eq(formVersions.formId, formId))

  const nextVersion = existingVersions.length + 1

  const schemaJson = {
    form: form[0],
    fields,
  }

  await db
    .update(formVersions)
    .set({ isPublished: false })
    .where(eq(formVersions.formId, formId))

  const publishedVersion = await db
    .insert(formVersions)
    .values({
      formId,
      version: nextVersion,
      schemaJson,
      isPublished: true,
    })
    .returning()

  return c.json(publishedVersion[0])
})

app.get('/admin/forms/:id/versions/published', async (c) => {
  const formId = c.req.param('id')

  const publishedVersion = await db
    .select()
    .from(formVersions)
    .where(and(eq(formVersions.formId, formId), eq(formVersions.isPublished, true)))

  if (publishedVersion.length === 0) {
    return c.json(
      {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Published version not found',
        },
      },
      404
    )
  }

  return c.json(publishedVersion[0])
})

app.get('/admin/forms/:id/versions', async (c) => {
  const formId = c.req.param('id')

  const rows = await db
    .select()
    .from(formVersions)
    .where(eq(formVersions.formId, formId))
    .orderBy(desc(formVersions.version))

  return c.json({
    success: true,
    data: rows,
  })
})

app.post('/admin/forms/:id/versions/:version/rollback', async (c) => {
  const formId = c.req.param('id')
  const version = Number(c.req.param('version'))

  const targetVersion = await db
    .select()
    .from(formVersions)
    .where(and(eq(formVersions.formId, formId), eq(formVersions.version, version)))

  if (targetVersion.length === 0) {
    return c.json(
      {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Version not found',
        },
      },
      404
    )
  }

  await db
    .update(formVersions)
    .set({ isPublished: false })
    .where(eq(formVersions.formId, formId))

  const updated = await db
    .update(formVersions)
    .set({ isPublished: true })
    .where(and(eq(formVersions.formId, formId), eq(formVersions.version, version)))
    .returning()

  return c.json(updated[0])
})

app.get('/admin/forms/:id/submissions', async (c) => {
  const formId = c.req.param('id')
  const status = c.req.query('status')
  const forwardStatus = c.req.query('forwardStatus')

  let rows = await db
    .select()
    .from(formSubmissions)
    .where(eq(formSubmissions.formId, formId))
    .orderBy(desc(formSubmissions.createdAt))

  if (status) {
    rows = rows.filter((row) => row.status === status)
  }

  if (forwardStatus) {
    rows = rows.filter((row) => row.forwardStatus === forwardStatus)
  }

  return c.json({
    success: true,
    data: rows,
  })
})

app.get('/admin/submissions/:submissionId', async (c) => {
  const submissionId = c.req.param('submissionId')

  const submissionRows = await db
    .select()
    .from(formSubmissions)
    .where(eq(formSubmissions.id, submissionId))
    .limit(1)

  if (submissionRows.length === 0) {
    return c.json(
      {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Submission not found',
        },
      },
      404
    )
  }

  const submission = submissionRows[0]

  const attempts = await db
    .select()
    .from(submissionAttempts)
    .where(eq(submissionAttempts.submissionId, submissionId))
    .orderBy(desc(submissionAttempts.attemptedAt))

  const events = await db
    .select()
    .from(submissionEvents)
    .where(eq(submissionEvents.submissionId, submissionId))
    .orderBy(desc(submissionEvents.createdAt))

  return c.json({
    success: true,
    data: {
      ...submission,
      attempts,
      events,
    },
  })
})

app.post('/admin/submissions/:submissionId/retry', async (c) => {
  const submissionId = c.req.param('submissionId')

  const submissionRows = await db
    .select()
    .from(formSubmissions)
    .where(eq(formSubmissions.id, submissionId))
    .limit(1)

  if (submissionRows.length === 0) {
    return c.json(
      {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Submission not found',
        },
      },
      404
    )
  }

  const submission = submissionRows[0]

  const activeTargets = await db
    .select()
    .from(formTargets)
    .where(
      and(
        eq(formTargets.formId, submission.formId),
        eq(formTargets.isActive, true)
      )
    )
    .orderBy(asc(formTargets.priority))

  if (activeTargets.length === 0) {
    return c.json(
      {
        success: false,
        error: {
          code: 'NO_ACTIVE_TARGET',
          message: 'No active target found',
        },
      },
      400
    )
  }

  const originalPayload =
    (submission.payloadJson as Record<string, unknown> | null) ?? {}

  const storedNormalizedPayload =
    (submission.normalizedPayloadJson as Record<string, unknown> | null) ??
    originalPayload

  let hasFailure = false
  const failedTargets: Array<{
    targetId: string
    targetUrl: string
    error: string
    responseStatusCode: number | null
  }> = []

  for (const target of activeTargets) {
    const targetPayload = target.mappingJson
      ? buildMappedPayload(
          originalPayload,
          target.mappingJson as {
            fieldMap?: Record<string, string>
            staticValues?: Record<string, unknown>
          }
        )
      : storedNormalizedPayload

    const previousAttemptsForTarget = await db
      .select()
      .from(submissionAttempts)
      .where(
        and(
          eq(submissionAttempts.submissionId, submissionId),
          eq(submissionAttempts.targetId, target.id)
        )
      )

    const attemptNo = previousAttemptsForTarget.length + 1

    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 5000)

      console.log('RETRY_FORWARD_DEBUG', {
        targetId: target.id,
        targetUrl: target.targetUrl,
        method: target.httpMethod || 'POST',
        headers: {
          'content-type': 'application/json',
          ...(target.headersJson as Record<string, string> | null),
        },
        payload: targetPayload,
      })

      let response: Response

      try {
        response = await fetch(target.targetUrl, {
          method: target.httpMethod || 'POST',
          headers: {
            'content-type': 'application/json',
            ...(target.headersJson as Record<string, string> | null),
          },
          body: JSON.stringify(targetPayload),
          signal: controller.signal,
        })
      } catch (err: any) {
        if (err.name === 'AbortError') {
          throw new Error('FORWARD_TIMEOUT')
        }
        throw err
      } finally {
        clearTimeout(timeout)
      }

      const responseText = await response.text()

      await db.insert(submissionAttempts).values({
        submissionId,
        targetId: target.id,
        attemptNo,
        status: response.ok ? 'success' : 'failed',
        responseStatusCode: response.status,
        responseBody: responseText,
        errorMessage: response.ok ? null : 'Retry forwarding failed',
        attemptedAt: new Date(),
        nextRetryAt: null,
      })

      if (response.ok) {
        await db.insert(submissionEvents).values({
          submissionId,
          eventType: 'forwarded',
          message: 'Submission retry forwarded successfully',
          metaJson: {
            targetId: target.id,
            targetUrl: target.targetUrl,
            responseStatusCode: response.status,
          },
          createdAt: new Date(),
        })
      } else {
        hasFailure = true

        failedTargets.push({
          targetId: target.id,
          targetUrl: target.targetUrl,
          error: 'Retry forwarding failed',
          responseStatusCode: response.status,
        })

        await db.insert(submissionEvents).values({
          submissionId,
          eventType: 'failed',
          message: 'Submission retry forwarding failed',
          metaJson: {
            targetId: target.id,
            targetUrl: target.targetUrl,
            responseStatusCode: response.status,
            responseBody: responseText,
          },
          createdAt: new Date(),
        })
      }
    } catch (error) {
      hasFailure = true

      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error'

      failedTargets.push({
        targetId: target.id,
        targetUrl: target.targetUrl,
        error: errorMessage,
        responseStatusCode: null,
      })

      await db.insert(submissionAttempts).values({
        submissionId,
        targetId: target.id,
        attemptNo,
        status: 'failed',
        responseStatusCode: null,
        responseBody: null,
        errorMessage,
        attemptedAt: new Date(),
        nextRetryAt: null,
      })

      await db.insert(submissionEvents).values({
        submissionId,
        eventType: 'failed',
        message: 'Submission retry failed with exception',
        metaJson: {
          targetId: target.id,
          targetUrl: target.targetUrl,
          errorMessage,
        },
        createdAt: new Date(),
      })
    }
  }

  await db
    .update(formSubmissions)
    .set({
      normalizedPayloadJson: storedNormalizedPayload,
      status: hasFailure ? 'failed' : 'forwarded',
      forwardStatus: hasFailure ? 'failed' : 'success',
      retryCount: (submission.retryCount ?? 0) + 1,
      updatedAt: new Date(),
    })
    .where(eq(formSubmissions.id, submissionId))

  if (hasFailure) {
    return c.json(
      {
        success: false,
        error: {
          code: 'RETRY_FAILED',
          message: 'Retry failed for one or more targets',
        },
        submissionId,
        failedTargets,
      },
      502
    )
  }

  return c.json({
    success: true,
    submissionId,
    message: 'Retry succeeded',
  })
})

app.get('/public/form-resolver', async (c) => {
  const url = c.req.query('url')

  if (!url) {
    return c.json(
      {
        success: false,
        error: {
          code: 'MISSING_URL',
          message: 'url is required',
        },
      },
      400
    )
  }

  const now = new Date()

  const routes = await db
    .select({
      id: formRoutes.id,
      formId: formRoutes.formId,
      matchType: formRoutes.matchType,
      urlPattern: formRoutes.urlPattern,
      priority: formRoutes.priority,
      isActive: formRoutes.isActive,
      startAt: formRoutes.startAt,
      endAt: formRoutes.endAt,
    })
    .from(formRoutes)
    .where(eq(formRoutes.isActive, true))
    .orderBy(asc(formRoutes.priority))

  const activeRoutes = routes.filter((route) => {
    if (route.startAt && new Date(route.startAt) > now) return false
    if (route.endAt && new Date(route.endAt) < now) return false
    return true
  })

  const matchedRoute = activeRoutes.find((route) => {
    if (route.matchType === 'exact') return url === route.urlPattern
    if (route.matchType === 'prefix') return url.startsWith(route.urlPattern)
    if (route.matchType === 'contains') return url.includes(route.urlPattern)
    if (route.matchType === 'regex') {
      try {
        return new RegExp(route.urlPattern).test(url)
      } catch {
        return false
      }
    }
    return false
  })

  if (!matchedRoute) {
    return c.json(
      {
        matched: false,
        message: 'No matching form found',
      },
      404
    )
  }

  const formRows = await db
    .select()
    .from(forms)
    .where(eq(forms.id, matchedRoute.formId))
    .limit(1)

  if (formRows.length === 0) {
    return c.json(
      {
        matched: false,
        message: 'No matching form found',
      },
      404
    )
  }

  const form = formRows[0]

  const versionRows = await db
    .select()
    .from(formVersions)
    .where(and(eq(formVersions.formId, form.id), eq(formVersions.isPublished, true)))
    .limit(1)

  if (versionRows.length === 0) {
    return c.json(
      {
        matched: false,
        message: 'No published form version found',
      },
      404
    )
  }

  const version = versionRows[0]
  const schema = version.schemaJson as {
    title?: string
    description?: string
    fields?: Array<{
      key: string
      label: string
      type: string
      placeholder?: string
      required?: boolean
      options?: Array<{ label: string; value: string }>
      validation?: Record<string, unknown>
      defaultValue?: unknown
    }>
  }

  return c.json({
    matched: true,
    formId: form.id,
    formVersion: version.version,
    viewUrl: `/f/${form.slug}`,
    submitUrl: `/public/forms/${form.slug}/submit`,
    form: {
      title: schema?.title || form.title,
      description: schema?.description || form.description,
      fields: schema?.fields || [],
    },
  })
})

app.get('/public/forms/:slug', async (c) => {
  const slug = c.req.param('slug')

  const form = await db.select().from(forms).where(eq(forms.slug, slug))

  if (form.length === 0) {
    return c.json(
      {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Form not found',
        },
      },
      404
    )
  }

  const publishedVersion = await db
    .select()
    .from(formVersions)
    .where(and(eq(formVersions.formId, form[0].id), eq(formVersions.isPublished, true)))

  if (publishedVersion.length === 0) {
    return c.json(
      {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Published version not found',
        },
      },
      404
    )
  }

  return c.json({
    success: true,
    data: {
      formId: form[0].id,
      slug: form[0].slug,
      version: publishedVersion[0].version,
      ...publishedVersion[0].schemaJson,
      submit: {
        url: `/public/forms/${form[0].slug}/submit`,
        method: 'POST',
      },
    },
  })
})

app.post('/public/forms/:slug/submit', async (c) => {
  const slug = c.req.param('slug')

  const contentLength = Number(c.req.header('content-length') ?? 0)
  const MAX_SIZE = 100 * 1024

  if (contentLength > MAX_SIZE) {
    return c.json(
      {
        success: false,
        error: {
          code: 'PAYLOAD_TOO_LARGE',
          message: 'Request body too large',
        },
      },
      413
    )
  }

  const clientIp =
    c.req.header('cf-connecting-ip') ??
    c.req.header('x-forwarded-for') ??
    'unknown'

  const rateLimitKey = `${slug}:${clientIp}`

  if (isRateLimited(rateLimitKey)) {
    return c.json(
      {
        success: false,
        error: {
          code: 'RATE_LIMITED',
          message: 'Too many requests. Please try again later.',
        },
      },
      429
    )
  }

  const body = await c.req.json()
  const rawValues = (body.values ?? {}) as Record<string, unknown>
  const values = sanitizeValues(rawValues)

  if (body.hp && body.hp !== '') {
    return c.json(
      {
        success: false,
        error: {
          code: 'SPAM_DETECTED',
          message: 'Spam detected',
        },
      },
      400
    )
  }

  const formRows = await db
    .select()
    .from(forms)
    .where(eq(forms.slug, slug))
    .limit(1)

  if (formRows.length === 0) {
    return c.json(
      {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Form not found' },
      },
      404
    )
  }

  const form = formRows[0]

  const versionRows = await db
    .select()
    .from(formVersions)
    .where(and(eq(formVersions.formId, form.id), eq(formVersions.isPublished, true)))
    .orderBy(desc(formVersions.version))
    .limit(1)

  if (versionRows.length === 0) {
    return c.json(
      {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Published version not found' },
      },
      404
    )
  }

  const version = versionRows[0]

  const schema = version.schemaJson as {
    fields: {
      fieldKey: string
      label: string
      required?: boolean
      type?: string
      validation?: {
        pattern?: string
        minLength?: number
        maxLength?: number
        min?: number
        max?: number
      }
      options?: { label: string; value: string | number | boolean }[]
    }[]
  }

  if (
    typeof body.formVersion === 'number' &&
    body.formVersion !== version.version
  ) {
    return c.json(
      {
        success: false,
        error: {
          code: 'VERSION_MISMATCH',
          message: 'Submitted formVersion does not match published version',
        },
      },
      400
    )
  }

  const errors: { field: string; code: string; message: string }[] = []

  for (const field of schema.fields ?? []) {
    const value = values[field.fieldKey]

    if (
      field.required &&
      (value === undefined ||
        value === null ||
        value === '' ||
        (Array.isArray(value) && value.length === 0))
    ) {
      errors.push({
        field: field.fieldKey,
        code: 'REQUIRED',
        message: `${field.label} is required`,
      })
      continue
    }

    if (value === undefined || value === null || value === '') {
      continue
    }

    if (field.type === 'email' && typeof value === 'string') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(value)) {
        errors.push({
          field: field.fieldKey,
          code: 'INVALID_EMAIL',
          message: `${field.label} must be a valid email`,
        })
      }
    }

    if (field.type === 'phone' && typeof value === 'string') {
      const phoneRegex = /^[0-9+\-\s()]{8,20}$/
      if (!phoneRegex.test(value)) {
        errors.push({
          field: field.fieldKey,
          code: 'INVALID_PHONE',
          message: `${field.label} must be a valid phone number`,
        })
      }
    }

    if (field.validation?.minLength && typeof value === 'string') {
      if (value.length < field.validation.minLength) {
        errors.push({
          field: field.fieldKey,
          code: 'MIN_LENGTH',
          message: `${field.label} must be at least ${field.validation.minLength} characters`,
        })
      }
    }

    if (field.validation?.maxLength && typeof value === 'string') {
      if (value.length > field.validation.maxLength) {
        errors.push({
          field: field.fieldKey,
          code: 'MAX_LENGTH',
          message: `${field.label} must be at most ${field.validation.maxLength} characters`,
        })
      }
    }

    if (field.validation?.pattern && typeof value === 'string') {
      const regex = new RegExp(field.validation.pattern)
      if (!regex.test(value)) {
        errors.push({
          field: field.fieldKey,
          code: 'PATTERN',
          message: `${field.label} format is invalid`,
        })
      }
    }

    if (
      field.options &&
      field.options.length > 0 &&
      !field.options.some((option) => option.value === value)
    ) {
      errors.push({
        field: field.fieldKey,
        code: 'INVALID_OPTION',
        message: `${field.label} contains an invalid option`,
      })
    }
  }

  if (errors.length > 0) {
    return c.json(
      {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          fields: errors,
        },
      },
      400
    )
  }

  const mappingTargets = await db
    .select()
    .from(formTargets)
    .where(eq(formTargets.formId, form.id))
    .orderBy(asc(formTargets.priority))

  let normalizedPayload: Record<string, unknown> = values

  if (mappingTargets.length > 0 && mappingTargets[0].mappingJson) {
    normalizedPayload = buildMappedPayload(
      values,
      mappingTargets[0].mappingJson as {
        fieldMap?: Record<string, string>
        staticValues?: Record<string, unknown>
      }
    )
  }

  const activeTargets = await db
    .select()
    .from(formTargets)
    .where(and(eq(formTargets.formId, form.id), eq(formTargets.isActive, true)))
    .orderBy(asc(formTargets.priority))

  const recentSubmissions = await db
    .select()
    .from(formSubmissions)
    .where(eq(formSubmissions.formId, form.id))
    .orderBy(desc(formSubmissions.createdAt))
    .limit(20)

  const isDuplicate = recentSubmissions.some((submission) => {
    const samePayload =
      JSON.stringify(submission.payloadJson) === JSON.stringify(values)

    const submittedRecently =
      new Date(submission.createdAt).getTime() > Date.now() - 60 * 1000

    return samePayload && submittedRecently
  })

  if (isDuplicate) {
    return c.json(
      {
        success: false,
        error: {
          code: 'DUPLICATE_SUBMISSION',
          message: 'Duplicate submission detected',
        },
      },
      409
    )
  }

  const submissionRows = await db
    .insert(formSubmissions)
    .values({
      formId: form.id,
      formVersionId: version.id,
      status: 'received',
      sourceType: 'web',
      sourceUrl: typeof body.sourceUrl === 'string' ? body.sourceUrl : null,
      submitToken: null,
      payloadJson: values,
      normalizedPayloadJson: null,
      contextJson:
        typeof body.meta === 'object' && body.meta !== null ? body.meta : {},
      ipAddress:
        c.req.header('cf-connecting-ip') ??
        c.req.header('x-forwarded-for') ??
        null,
      userAgent: c.req.header('user-agent') ?? null,
      referer: c.req.header('referer') ?? null,
      forwardStatus: 'pending',
      retryCount: 0,
      submittedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning()

  const submission = submissionRows[0]

  await db.insert(submissionEvents).values({
    submissionId: submission.id,
    eventType: 'received',
    message: 'Submission received',
    metaJson: null,
    createdAt: new Date(),
  })

  await db
    .update(formSubmissions)
    .set({
      status: 'validated',
      updatedAt: new Date(),
    })
    .where(eq(formSubmissions.id, submission.id))

  await db.insert(submissionEvents).values({
    submissionId: submission.id,
    eventType: 'validated',
    message: 'Submission validated successfully',
    metaJson: null,
    createdAt: new Date(),
  })

  await db
    .update(formSubmissions)
    .set({
      status: 'stored',
      normalizedPayloadJson: normalizedPayload,
      updatedAt: new Date(),
    })
    .where(eq(formSubmissions.id, submission.id))

  await db.insert(submissionEvents).values({
    submissionId: submission.id,
    eventType: 'stored',
    message: 'Submission stored successfully',
    metaJson: null,
    createdAt: new Date(),
  })

  if (activeTargets.length === 0) {
    await db.insert(submissionEvents).values({
      submissionId: submission.id,
      eventType: 'stored',
      message: 'No active target configured, submission stored only',
      metaJson: null,
      createdAt: new Date(),
    })

    return c.json({
      success: true,
      submissionId: submission.id,
      message: 'Form submitted successfully',
    })
  }

  let hasFailure = false
  const failedTargets: Array<{
    targetId: string
    targetUrl: string
    error: string
    responseStatusCode: number | null
  }> = []

  for (const target of activeTargets) {
    const targetPayload =
      target.mappingJson
        ? buildMappedPayload(
            values,
            target.mappingJson as {
              fieldMap?: Record<string, string>
              staticValues?: Record<string, unknown>
            }
          )
        : normalizedPayload

    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 5000)

      console.log('FORWARD_DEBUG', {
        targetId: target.id,
        targetUrl: target.targetUrl,
        method: target.httpMethod || 'POST',
        headers: {
          'content-type': 'application/json',
          ...(target.headersJson as Record<string, string> | null),
        },
        payload: targetPayload,
      })

      let response: Response

      try {
        response = await fetch(target.targetUrl, {
          method: target.httpMethod || 'POST',
          headers: {
            'content-type': 'application/json',
            ...(target.headersJson as Record<string, string> | null),
          },
          body: JSON.stringify(targetPayload),
          signal: controller.signal,
        })
      } catch (err: any) {
        if (err.name === 'AbortError') {
          throw new Error('FORWARD_TIMEOUT')
        }
        throw err
      } finally {
        clearTimeout(timeout)
      }

      const responseText = await response.text()

      await db.insert(submissionAttempts).values({
        submissionId: submission.id,
        targetId: target.id,
        attemptNo: 1,
        status: response.ok ? 'success' : 'failed',
        responseStatusCode: response.status,
        responseBody: responseText,
        errorMessage: response.ok ? null : 'Forwarding failed',
        attemptedAt: new Date(),
        nextRetryAt: null,
      })

      if (response.ok) {
        await db.insert(submissionEvents).values({
          submissionId: submission.id,
          eventType: 'forwarded',
          message: 'Submission forwarded successfully',
          metaJson: {
            targetId: target.id,
            targetUrl: target.targetUrl,
            responseStatusCode: response.status,
          },
          createdAt: new Date(),
        })
      } else {
        hasFailure = true

        failedTargets.push({
          targetId: target.id,
          targetUrl: target.targetUrl,
          error: 'Forwarding failed',
          responseStatusCode: response.status,
        })

        await db.insert(submissionEvents).values({
          submissionId: submission.id,
          eventType: 'failed',
          message: 'Submission forwarding failed',
          metaJson: {
            targetId: target.id,
            targetUrl: target.targetUrl,
            responseStatusCode: response.status,
            responseBody: responseText,
          },
          createdAt: new Date(),
        })
      }
    } catch (error) {
      hasFailure = true

      const errorMessage = error instanceof Error ? error.message : 'Unknown error'

      failedTargets.push({
        targetId: target.id,
        targetUrl: target.targetUrl,
        error: errorMessage,
        responseStatusCode: null,
      })

      await db.insert(submissionAttempts).values({
        submissionId: submission.id,
        targetId: target.id,
        attemptNo: 1,
        status: 'failed',
        responseStatusCode: null,
        responseBody: null,
        errorMessage,
        attemptedAt: new Date(),
        nextRetryAt: null,
      })

      await db.insert(submissionEvents).values({
        submissionId: submission.id,
        eventType: 'failed',
        message: 'Submission forwarding failed with exception',
        metaJson: {
          targetId: target.id,
          targetUrl: target.targetUrl,
          errorMessage,
        },
        createdAt: new Date(),
      })
    }
  }

  await db
    .update(formSubmissions)
    .set({
      status: hasFailure ? 'failed' : 'forwarded',
      forwardStatus: hasFailure ? 'failed' : 'success',
      updatedAt: new Date(),
    })
    .where(eq(formSubmissions.id, submission.id))

  if (hasFailure) {
    return c.json(
      {
        success: false,
        error: {
          code: 'FORWARD_FAILED',
          message: 'Submission saved but one or more targets failed',
        },
        submissionId: submission.id,
        failedTargets,
      },
      502
    )
  }

  return c.json({
    success: true,
    submissionId: submission.id,
    message: 'Form submitted successfully',
  })
})

export default app