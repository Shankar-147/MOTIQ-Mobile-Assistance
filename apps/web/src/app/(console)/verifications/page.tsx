import { apiFetch } from "@/lib/api";
import { ReviewButtons } from "./review-buttons";
import { Table, Th, Td } from "@/components/ui/Table";
import { EmptyState } from "@/components/ui/EmptyState";
import type { VerificationDocumentType } from "@motiq/types";

interface PendingDocument {
  id: string;
  providerProfileId: string;
  documentType: VerificationDocumentType;
  fileUrl: string;
  submittedAt: string;
}

export default async function VerificationsPage() {
  const documents = await apiFetch<PendingDocument[]>("/admin/providers/verification-documents");

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-slate-900">Verification queue</h1>
      <p className="mt-1 max-w-3xl text-sm text-slate-500">
        Ch98&apos;s KYC review — approving/rejecting a document never changes a provider&apos;s tier by
        itself; do that from the Providers page once you&apos;ve judged enough documents.
      </p>

      <div className="mt-6">
        {documents.length === 0 ? (
          <EmptyState title="No pending documents" />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Provider</Th>
                <Th>Document type</Th>
                <Th>File</Th>
                <Th>Submitted</Th>
                <Th>Action</Th>
              </tr>
            </thead>
            <tbody>
              {documents.map((document) => (
                <tr key={document.id}>
                  <Td className="font-mono text-xs">{document.providerProfileId}</Td>
                  <Td>{document.documentType.replace(/_/g, " ")}</Td>
                  <Td>
                    <a href={document.fileUrl} target="_blank" rel="noreferrer" className="font-medium text-primary hover:underline">
                      View
                    </a>
                  </Td>
                  <Td className="whitespace-nowrap">{new Date(document.submittedAt).toLocaleString()}</Td>
                  <Td>
                    <ReviewButtons documentId={document.id} />
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </div>
    </div>
  );
}
