// diff@5 emits an invalid first hunk when the old value is an empty string.
// A single empty YAML line keeps the first revision semantically empty while
// producing a patch that diff2html can parse without logging an error.
export const EMPTY_REVISION_YAML = '\n';
