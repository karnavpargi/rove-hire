import { redirect } from 'next/navigation';

/**
 * Redirect legacy /candidates list route to dashboard pipeline.
 */
export default function CandidatesListPage() {
  redirect('/');
}
