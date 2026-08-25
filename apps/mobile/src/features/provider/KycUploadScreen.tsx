import React, { useCallback, useState } from "react";
import { Center, FlatList, HStack, Text, VStack } from "@gluestack-ui/themed";
import { useFocusEffect } from "@react-navigation/native";
import { FileText, Upload } from "lucide-react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { VerificationDocumentStatus, VerificationDocumentType } from "@motiq/types";
import { ProviderStackParamList } from "../../navigation/types";
import { providerApi } from "../../api/providerApi";
import { A11Y_LABELS } from "../../accessibility/a11y";
import { Badge, Button, Chip, Input } from "../../components/ui";
import { documentBadgeTone } from "./verificationBadgeTone";

type Props = NativeStackScreenProps<ProviderStackParamList, "KycUpload">;

const DOCUMENT_TYPES = Object.values(VerificationDocumentType);

interface DocumentRow {
  id: string;
  documentType: VerificationDocumentType;
  status: VerificationDocumentStatus;
  submittedAt: string;
}

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
    <FlatList
      flex={1}
      bg="$backgroundLight0"
      data={documents}
      keyExtractor={(item) => (item as DocumentRow).id}
      ListHeaderComponent={
        <VStack p="$6" space="md">
          <VStack space="xs" mb="$2">
            <Text size="xl" fontWeight="$extrabold" color="$textLight900">
              Verification documents
            </Text>
            <Text color="$textLight500">Submit KYC documents to reach full verification.</Text>
          </VStack>

          <VStack space="xs">
            <Text size="sm" color="$textLight500">
              Document type
            </Text>
            <HStack flexWrap="wrap" gap="$2">
              {DOCUMENT_TYPES.map((type) => (
                <Chip
                  key={type}
                  label={type.replace("_", " ")}
                  selected={documentType === type}
                  accessibilityLabel={`Document type: ${type}`}
                  onPress={() => setDocumentType(type)}
                />
              ))}
            </HStack>
          </VStack>

          <Input
            label="Document reference / URL"
            value={fileUrl}
            onChangeText={setFileUrl}
            placeholder="e.g. a link to your scanned document"
          />

          {status ? <Text color="$textLight700">{status}</Text> : null}

          <Button
            label={submitting ? "Submitting…" : "Submit document"}
            icon={Upload}
            accessibilityLabel={A11Y_LABELS.uploadDocumentButton}
            disabled={submitting}
            loading={submitting}
            onPress={handleSubmit}
          />

          <Text fontWeight="$bold" size="md" mt="$2">
            Your submissions
          </Text>
        </VStack>
      }
      renderItem={({ item }: { item: unknown }) => {
        const document = item as DocumentRow;
        return (
          <HStack px="$6" py="$3" borderBottomWidth={1} borderBottomColor="$borderLight200" justifyContent="space-between" alignItems="center">
            <Text fontWeight="$semibold" textTransform="capitalize">
              {document.documentType.replace("_", " ")}
            </Text>
            <Badge label={document.status} tone={documentBadgeTone(document.status)} />
          </HStack>
        );
      }}
      ListEmptyComponent={
        <Center py="$8">
          <FileText size={28} color="#94A3B8" />
          <Text color="$textLight500" textAlign="center" mt="$2">
            No documents submitted yet.
          </Text>
        </Center>
      }
    />
  );
}
