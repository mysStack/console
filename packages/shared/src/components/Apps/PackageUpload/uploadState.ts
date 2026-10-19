export function getUploadValidationFailure(): {
  status: 'error';
  error: 'UPLOAD_AGAIN_TIP';
} {
  return {
    status: 'error',
    error: 'UPLOAD_AGAIN_TIP',
  };
}
