const AUTHENTICATION_ENDPOINT = /^\/?(?:oauth\/)?login(?:\/|$)/;

export function shouldRedirectAfterUnauthorized(
  status: number | undefined,
  url: string = '',
): boolean {
  return status === 401 && !AUTHENTICATION_ENDPOINT.test(url);
}

export function createUnauthorizedRedirect(navigate: (url: string) => void) {
  let redirecting = false;

  return (): void => {
    if (redirecting) {
      return;
    }

    redirecting = true;
    navigate('/logout');
  };
}
