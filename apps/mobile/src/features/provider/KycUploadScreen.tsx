import React, { useCallback, useState } from "react";
import { Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { FileText, Upload } from "lucide-react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { VerificationDocumentStatus, VerificationDocumentType } from "@motiq/types";
import { ProviderStackParamList } from "../../navigation/types";
import { providerApi } from "../../api/providerApi";
import { A11Y_LABELS } from "../../accessibility/a11y";
import { Badge, Button, Chip, EmptyState, Input } from "../../components/ui";
import { KeyboardScreen } from "../../components/KeyboardScreen";
import { documentBadgeTone } from "./verificationBadgeTone";
import { COLORS, FONTS } from "../../theme/colors";

type Props = NativeStackScreenProps<ProviderStackParamList, "KycUpload">;

const DOCUMENT_TYPES = Object.values(VerificationDocumentType);

interface DocumentRow {
  id: string;
  documentType: VerificationDocumentType;
  status: VerificationDocumentStatus;
  submittedAt: string;
}

function titleCase(value: string): string {
  return value
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

const sectionTitle = {
  fontFamily: FONTS.bodyBold,
  fontSize: 12.5,
  letterSpacing: 0.6,
  color: COLORS.textSecondary,
  textTransform: "uppercase" as const,
  paddingHorizontal: 4,
};

/**
 * Ch98's KYC submission — previously API-only (POST /providers/me/
 * verification-documents existed with zero mobile UI, see docs/roadmap.md's
 * Reconciliation Notes). fileUrl is an honest client-supplied reference, not
 * a real upload — see ADR 0016's "no real file storage" note; this screen
 * doesn't pretend otherwise by faking a file picker.
 */
export function KycUploadScreen(_props: Props) {
  const [documentType, setDocumentType] = useState<VerificationDocumentType>(
    VerificationDocumentType.DRIVING_LICENSE,
  );
  const [fileUrl, setFileUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [documents, setDocuments] = useState<DocumentRow[]>([]);

  const loadDocuments = useCallback(() => {
    providerApi
      .listVerificationDocuments()
      .then((response) => setDocuments(response.data as DocumentRow[]))
      .catch(() => undefined);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadDocuments();
    }, [loadDocuments]),
  );

  async function handleSubmit() {
    if (!fileUrl.trim()) {
      setStatus("Enter a document reference/URL first.");
      return;
    }
    setSubmitting(true);
    setStatus(null);
    try {
      await providerApi.submitVerificationDocument(documentType, fileUrl.trim());
      setFileUrl("");
      setStatus("Document submitted for review.");
      loadDocuments();
    } catch {
      setStatus("Couldn't submit that document — try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KeyboardScreen contentContainerStyle={{ gap: 20 }}>
      <View style={{ gap: 4 }}>
        <Text style={{ fontFamily: FONTS.display, fontSize: 26, color: COLORS.text }}>Verification documents</Text>
        <Text style={{ fontFamily: FONTS.body, fontSize: 14, color: COLORS.textSecondary }}>
          Submit KYC documents to reach full verification.
        </Text>
      </View>

      <View style={{ gap: 10 }}>
        <Text style={sectionTitle}>Document type</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {DOCUMENT_TYPES.map((type) => (
            <Chip
              key={type}
              label={titleCase(type)}
              selected={documentType === type}
              accessibilityLabel={`Document type: ${type}`}
              onPress={() => setDocumentType(type)}
            />
          ))}
        </View>
      </View>

      <Input
        label="Document reference / URL"
        value={fileUrl}
        onChangeText={setFileUrl}
        placeholder="e.g. a link to your scanned document"
        autoCapitalize="none"
      />

      {status ? (
        <Text style={{ fontFamily: FONTS.body, fontSize: 14, color: COLORS.warning }}>{status}</Text>
      ) : null}

      <Button
        label={submitting ? "Submitting…" : "Submit document"}
        icon={Upload}
        accessibilityLabel={A11Y_LABELS.uploadDocumentButton}
        disabled={submitting}
        loading={submitting}
        onPress={handleSubmit}
      />

      <View style={{ gap: 10 }}>
        <Text style={sectionTitle}>Your submissions</Text>
        {documents.length === 0 ? (
          <EmptyState icon={FileText} title="No documents yet" description="Submitted documents and their review status show up here." />
        ) : (
          <View style={{ backgroundColor: COLORS.surface, borderRadius: 22, borderWidth: 1, borderColor: COLORS.border, overflow: "hidden" }}>
            {documents.map((document, index) => (
              <View
                key={document.id}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  borderBottomWidth: index === documents.length - 1 ? 0 : 1,
                  borderBottomColor: COLORS.border,
                }}
              >
                <View style={{ gap: 2, flexShrink: 1 }}>
                  <Text style={{ fontFamily: FONTS.bodyBold, fontSize: 15, color: COLORS.text }}>{titleCase(document.documentType)}</Text>
                  <Text style={{ fontFamily: FONTS.body, fontSize: 12.5, color: COLORS.textMuted }}>
                    {new Date(document.submittedAt).toLocaleDateString([], { day: "numeric", month: "short" })}
                  </Text>
                </View>
                <Badge label={document.status.toLowerCase()} tone={documentBadgeTone(document.status)} />
              </View>
            ))}
          </View>
        )}
      </View>
    </KeyboardScreen>
  );
}
