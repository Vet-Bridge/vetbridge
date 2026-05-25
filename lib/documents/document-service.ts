import { getSupabaseAdmin } from "../supabase-admin";

export const privateDocumentBucket = "mypawlink-documents";

export type PrivateDocumentRecord = {
  clinicId: string;
  visitId?: string;
  formId?: string;
  documentType: string;
  fileName: string;
  filePath: string;
  fileMimeType?: string;
  fileSize?: number;
  generatedBy?: string;
  isClientVisible?: boolean;
};

export const buildPrivateDocumentPath = ({
  clinicId,
  visitId,
  fileName,
}: {
  clinicId: string;
  visitId: string;
  fileName: string;
}) => {
  const safeFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-");
  return `${clinicId}/${visitId}/${Date.now()}-${safeFileName}`;
};

export const createSignedDocumentUrl = async ({
  filePath,
  expiresInSeconds = 300,
}: {
  filePath: string;
  expiresInSeconds?: number;
}) => {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.storage
    .from(privateDocumentBucket)
    .createSignedUrl(filePath, expiresInSeconds);

  if (error) throw error;
  return data.signedUrl;
};

export const recordPrivateDocument = async (document: PrivateDocumentRecord) => {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("documents")
    .insert([
      {
        clinic_id: document.clinicId,
        visit_id: document.visitId || null,
        form_id: document.formId || null,
        document_type: document.documentType,
        file_name: document.fileName,
        file_path: document.filePath,
        file_mime_type: document.fileMimeType || null,
        file_size: document.fileSize || null,
        generated_by: document.generatedBy || null,
        is_client_visible: document.isClientVisible || false,
      },
    ])
    .select("id")
    .single();

  if (error) throw error;
  return String(data.id);
};
