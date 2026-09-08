/**
 * Shared width/padding for every authenticated and note-related screen, so
 * the dashboard, note view, editor, and public share page can't drift apart
 * the way the edit page once did.
 */
export function PageContainer({ children }: { children: React.ReactNode }) {
  return <div className='mx-auto w-full max-w-3xl p-6'>{children}</div>;
}
