export function isUnauthorizedError(statusOrError: any): boolean {
  // Handle status codes directly
  if (typeof statusOrError === 'number') {
    return statusOrError === 401;
  }

  // Handle error objects
  if (statusOrError?.status === 401 || statusOrError?.response?.status === 401) {
    return true;
  }

  // Handle error messages
  if (statusOrError instanceof Error && statusOrError.message === 'Unauthorized') {
    return true;
  }

  return false;
}