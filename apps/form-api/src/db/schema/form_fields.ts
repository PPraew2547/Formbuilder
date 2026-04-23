import { pgTable, uuid, text, boolean, integer, timestamp, jsonb } from 'drizzle-orm/pg-core'

export const formFields = pgTable('form_fields', {
  id: uuid('id').defaultRandom().primaryKey(),

  formId: uuid('form_id'),

  fieldKey: text('field_key'),
  label: text('label'),
  type: text('type'),

  placeholder: text('placeholder'),

  required: boolean('required'),

  optionsJson: jsonb('options_json'),
  validationJson: jsonb('validation_json'),
  visibilityJson: jsonb('visibility_json'),
  defaultValueJson: jsonb('default_value_json'),

  sortOrder: integer('sort_order'),

  isActive: boolean('is_active'),

  createdAt: timestamp('created_at'),
  updatedAt: timestamp('updated_at'),
})