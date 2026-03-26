import type {
  AppUser,
  AssignmentAttachment,
  AssignmentGroup,
  AssignmentStep,
  EditableAttachment,
  EditableStep,
} from "./types";

export const ASSIGNMENT_STATUSES = ["draft", "published", "archived"] as const;
export const ASSIGNMENT_PRIORITIES = ["low", "medium", "high", "critical"] as const;
export const ASSIGNMENT_STEP_TYPES = ["instruction", "upload", "review", "complete"] as const;

export const formatUserLabel = (user: AppUser): string => {
  const first = user.first_name ?? "";
  const last = user.last_name ?? "";
  const derivedName = (first + " " + last).trim();
  const fullName = (user.full_name ?? "").trim() || derivedName;
  if (fullName) {
    return fullName + " (" + user.username + ")";
  }

  return user.username + " (" + user.email + ")";
};

export const formatGroupLabel = (group: AssignmentGroup): string => group.name;

export const formatDateTime = (value?: string | null): string => {
  if (!value) return "No date";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

export const toDateTimeLocalValue = (value?: string | null): string => {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60000);
  return localDate.toISOString().slice(0, 16);
};

export const fromDateTimeLocalValue = (value: string): string | null => {
  if (!value) return null;
  return new Date(value).toISOString();
};

export const createEmptyStep = (): EditableStep => ({
  clientId: crypto.randomUUID(),
  title: "",
  description: "",
  step_type: "instruction",
  required_attachment: false,
  allow_multiple_attachments: false,
  allow_user_uploads: false,
  require_message_response: false,
});

export const attachmentToEditable = (
  attachment: AssignmentAttachment,
  stepClientId?: string | null,
): EditableAttachment => ({
  clientId: crypto.randomUUID(),
  id: attachment.id,
  stepClientId: stepClientId ?? null,
  stepId: attachment.step_id ?? null,
  attachment_kind: attachment.attachment_kind,
  file_name: attachment.file_name || attachment.file_path,
  file_path: attachment.file_path,
  mime_type: attachment.mime_type,
  size_bytes: attachment.size_bytes ?? undefined,
});

export const stepToEditable = (step: AssignmentStep): EditableStep => ({
  clientId: crypto.randomUUID(),
  id: step.id,
  title: step.title,
  description: step.description ?? "",
  step_type: step.step_type,
  required_attachment: Boolean(step.required_attachment),
  allow_multiple_attachments: Boolean(step.allow_multiple_attachments),
  allow_user_uploads: Boolean(step.allow_user_uploads),
  require_message_response: Boolean(step.require_message_response),
});
