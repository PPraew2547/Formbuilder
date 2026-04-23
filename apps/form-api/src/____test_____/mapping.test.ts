import { describe, it, expect } from 'vitest'
import { buildMappedPayload } from '../mapping'

describe('buildMappedPayload', () => {
  it('maps flat fields into nested object', () => {
    const input = {
      name: 'test',
      email: 'test@test.com',
      phone: '0812345678',
      message: 'hello',
    }

    const mapping = {
      fieldMap: {
        name: 'customer.name',
        email: 'customer.contact.email',
        phone: 'customer.contact.phone',
        message: 'meta.note',
      },
      staticValues: {
        source: 'website',
      },
    }

    const result = buildMappedPayload(input, mapping)

    expect(result).toEqual({
      customer: {
        name: 'test',
        contact: {
          email: 'test@test.com',
          phone: '0812345678',
        },
      },
      meta: {
        note: 'hello',
      },
      source: 'website',
    })
  })

  it('returns static values even if input is empty', () => {
    const input = {}

    const mapping = {
      fieldMap: {},
      staticValues: {
        source: 'website',
        channel: 'form-builder',
      },
    }

    const result = buildMappedPayload(input, mapping)

    expect(result).toEqual({
      source: 'website',
      channel: 'form-builder',
    })
  })

  it('ignores fields not in fieldMap', () => {
    const input = {
      name: 'test',
      email: 'test@test.com',
      extraField: 'ignore me',
    }

    const mapping = {
      fieldMap: {
        name: 'customer.name',
        email: 'customer.contact.email',
      },
      staticValues: {},
    }

    const result = buildMappedPayload(input, mapping)

    expect(result).toEqual({
      customer: {
        name: 'test',
        contact: {
          email: 'test@test.com',
        },
      },
    })
  })
})