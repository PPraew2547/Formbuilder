import { db } from './db/client'
import { forms } from './db/schema/forms'
import { formFields } from './db/schema/form_fields'
import { formRoutes } from './db/schema/form_routes'
import { formTargets } from './db/schema/form_targets'
import { formVersions } from './db/schema/form_versions'

async function seed() {
  console.log('🌱 Seeding database...')

  const slug = 'test-form'

  // 1. create form
  const form = await db
    .insert(forms)
    .values({
      name: 'Test Form',
      slug,
      status: 'published',
      title: 'Test Form',
      description: 'Simple test form',
      locale: 'en',
      isActive: true,
    })
    .onConflictDoNothing()
    .returning()

  const formId = form[0]?.id

  if (!formId) {
    console.log('⚠️ Form already exists, skipping...')
    return
  }

  console.log('✅ Form created:', formId)

  // 2. create fields
  await db.insert(formFields).values([
    {
      formId,
      fieldKey: 'name',
      label: 'Name',
      type: 'text',
      required: true,
      sortOrder: 1,
      isActive: true,
    },
    {
      formId,
      fieldKey: 'email',
      label: 'Email',
      type: 'email',
      required: true,
      sortOrder: 2,
      isActive: true,
    },
    {
      formId,
      fieldKey: 'phone',
      label: 'Phone',
      type: 'phone',
      required: false,
      sortOrder: 3,
      isActive: true,
    },
  ])

  console.log('✅ Fields created')

  // 3. create route
  await db.insert(formRoutes).values({
    formId,
    matchType: 'exact',
    urlPattern: '/test-page',
    priority: 1,
    isActive: true,
  })

  console.log('✅ Route created')

  // 4. create targets (2 targets)
  await db.insert(formTargets).values([
    {
      formId,
      targetType: 'webhook',
      httpMethod: 'POST',
      targetUrl: 'https://webhook.site/66758dfd-50c3-498d-972e-cfb70c368242',
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
    },
    {
      formId,
      targetType: 'webhook',
      httpMethod: 'POST',
      targetUrl: 'https://webhook.site/66758dfd-50c3-498d-972e-cfb70c368242',
      headersJson: null,
      authConfigJson: null,
      mappingJson: null,
      isActive: true,
      priority: 2,
    },
  ])

  console.log('✅ Targets created')

  // 5. create version
  await db.insert(formVersions).values({
    formId,
    version: 1,
    isPublished: true,
    schemaJson: {
      fields: [
        { fieldKey: 'name', label: 'Name', required: true },
        { fieldKey: 'email', label: 'Email', required: true },
        { fieldKey: 'phone', label: 'Phone', required: false },
      ],
    },
  })

  console.log('✅ Version created')

  console.log('🎉 Seeding complete!')
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err)
})