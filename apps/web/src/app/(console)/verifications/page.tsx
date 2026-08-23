import { apiFetch } from "@/lib/api";
import { ReviewButtons } from "./review-buttons";
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
      <h1 className="text-2xl font-semibold">Verification queue</h1>
      <p className="mt-1 text-sm text-slate-600">
        Ch98's KYC review — approving/rejecting a document never changes a provider's tier by itself;
        do that from the Providers page once you've judged enough documents.
      </p>

      <div className="mt-6 overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-2">Provider</th>
              <th className="px-4 py-2">Document type</th>
              <th className="px-4 py-2">File</th>
              <th className="px-4 py-2">Submitted</th>
              <th className="px-4 py-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {documents.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                  No pending documents.
                </td>
              </tr>
            ) : (
              documents.map((document) => (
                <tr key={document.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-2 font-mono text-xs">{document.providerProfileId}</td>
                  <td className="px-4 py-2">{document.documentType.replace(/_/g, " ")}</td>
                  <td className="px-4 py-2">
                    <a
                      href={document.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-600 underline"
                    >
                      View
                    </a>
                  </td>
                  <td className="px-4 py-2">{new Date(document.submittedAt).toLocaleString()}</td>
                  <td className="px-4 py-2">
                    <ReviewButtons documentId={document.id} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
