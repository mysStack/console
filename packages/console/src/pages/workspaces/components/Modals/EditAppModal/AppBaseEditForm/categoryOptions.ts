export function getCategoryDisplayName(name?: string, categoryId?: string): string {
  return name || categoryId || '-';
}
