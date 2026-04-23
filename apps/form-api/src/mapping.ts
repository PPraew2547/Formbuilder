type MappingConfig = {
  fieldMap?: Record<string, string>
  staticValues?: Record<string, unknown>
}

function setByPath(obj: Record<string, any>, path: string, value: unknown) {
  const keys = path.split('.')
  let current = obj

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i]

    if (!current[key] || typeof current[key] !== 'object') {
      current[key] = {}
    }

    current = current[key]
  }

  current[keys[keys.length - 1]] = value
}

export function buildMappedPayload(
  values: Record<string, unknown>,
  mapping: MappingConfig
) {
  const result: Record<string, unknown> = {}

  if (mapping.fieldMap) {
    for (const [sourceField, targetPath] of Object.entries(mapping.fieldMap)) {
      if (sourceField in values) {
        setByPath(result, targetPath, values[sourceField])
      }
    }
  }

  if (mapping.staticValues) {
    for (const [key, value] of Object.entries(mapping.staticValues)) {
      result[key] = value
    }
  }

  return result
}