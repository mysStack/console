export interface ServiceAccountSecretReference {
  name: string;
}

export function mapServiceAccountSecrets(secrets: unknown): ServiceAccountSecretReference[] {
  if (!Array.isArray(secrets)) {
    return [];
  }

  return secrets.reduce<ServiceAccountSecretReference[]>((references, secret) => {
    if (!secret || typeof secret !== 'object') {
      return references;
    }

    const name = (secret as { name?: unknown }).name;
    if (typeof name === 'string' && name !== '') {
      references.push({ name });
    }

    return references;
  }, []);
}
