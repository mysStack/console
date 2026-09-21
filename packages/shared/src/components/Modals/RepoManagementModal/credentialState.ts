export type CredentialListState = 'loading' | 'error' | 'empty' | 'ready';

export function getCredentialListState(
  isLoading: boolean,
  isError: boolean,
  credentialCount: number,
): CredentialListState {
  if (isLoading) {
    return 'loading';
  }

  if (isError) {
    return 'error';
  }

  return credentialCount ? 'ready' : 'empty';
}
