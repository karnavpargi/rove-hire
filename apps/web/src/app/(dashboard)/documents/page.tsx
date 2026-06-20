'use client';

/**
 * Documents Page — `/documents`
 *
 * Lists all generated documents (offer letters, NDAs, resumes) with:
 * - Document type badge, candidate name, creation date, download button
 * - Pre-signed S3 URL download via useDocumentDownload hook
 *
 * Validates: Requirements 8.7, 7.9
 */

import * as React from 'react';
import { FileTextIcon, DownloadIcon, Loader2Icon } from 'lucide-react';
import { DocumentType } from '@rove-hire/shared';
import { useQuery } from '@tanstack/react-query';
import { gql } from 'graphql-request';
import { graphqlClient } from '@/lib/graphql-client';
import { useDocumentDownload } from '@/hooks/use-document-download';
import { LoadingSkeleton } from '@/components/shared/loading-skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// GraphQL Query
// ---------------------------------------------------------------------------

const GET_ALL_DOCUMENTS = gql`
  query GetAllDocuments {
    documents {
      id
      type
      originalFilename
      fileSizeBytes
      createdAt
      candidate {
        id
        name
      }
    }
  }
`;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DocumentItem {
  id: string;
  type: DocumentType;
  originalFilename: string | null;
  fileSizeBytes: number | null;
  createdAt: string;
  candidate: {
    id: string;
    name: string;
  };
}

// ---------------------------------------------------------------------------
// Document Type Badge
// ---------------------------------------------------------------------------

function DocumentTypeBadge({ type }: { type: DocumentType }) {
  const styles: Record<DocumentType, string> = {
    [DocumentType.Resume]:
      'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200',
    [DocumentType.OfferLetter]:
      'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200',
    [DocumentType.Nda]:
      'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-200',
  };

  const labels: Record<DocumentType, string> = {
    [DocumentType.Resume]: 'Resume',
    [DocumentType.OfferLetter]: 'Offer Letter',
    [DocumentType.Nda]: 'NDA',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        styles[type],
      )}
      aria-label={`Document type: ${labels[type]}`}
    >
      {labels[type]}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Download Button
// ---------------------------------------------------------------------------

function DownloadButton({ documentId, filename }: { documentId: string; filename: string | null }) {
  const { download, isPending } = useDocumentDownload();

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => download(documentId)}
      disabled={isPending}
      aria-label={`Download ${filename ?? 'document'}`}
    >
      {isPending ? (
        <Loader2Icon className="mr-1 h-3.5 w-3.5 animate-spin" />
      ) : (
        <DownloadIcon className="mr-1 h-3.5 w-3.5" />
      )}
      Download
    </Button>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function DocumentsPage() {
  const {
    data: documents,
    isLoading,
    error,
    refetch,
  } = useQuery<DocumentItem[]>({
    queryKey: ['documents'],
    queryFn: async () => {
      const data = await graphqlClient.request<{ documents: DocumentItem[] }>(
        GET_ALL_DOCUMENTS,
      );
      return data.documents;
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader />
        <LoadingSkeleton variant="list" rows={5} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader />
        <ErrorState
          message="Failed to load documents"
          description="We couldn't fetch the documents. Please try again."
          onRetry={refetch}
        />
      </div>
    );
  }

  if (!documents || documents.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader />
        <EmptyState
          icon={<FileTextIcon className="h-10 w-10 text-muted-foreground" />}
          title="No documents yet"
          description="Documents will appear here once offer letters or NDAs are generated for candidates."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader />

      {/* Documents table */}
      <div className="rounded-lg border">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Type
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Candidate
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Filename
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Created
                </th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {documents.map((doc) => (
                <tr
                  key={doc.id}
                  className="border-b last:border-0 transition-colors hover:bg-muted/30"
                >
                  <td className="px-4 py-3">
                    <DocumentTypeBadge type={doc.type} />
                  </td>
                  <td className="px-4 py-3 font-medium">
                    {doc.candidate.name}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {doc.originalFilename ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatDate(doc.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <DownloadButton
                      documentId={doc.id}
                      filename={doc.originalFilename}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function PageHeader() {
  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Documents</h1>
      <p className="text-sm text-muted-foreground">
        All generated offer letters, NDAs, and uploaded resumes
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
