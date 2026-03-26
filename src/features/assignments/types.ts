export type AssignmentStatus = "draft" | "published" | "archived";
export type AssignmentPriority = "low" | "medium" | "high" | "critical";
export type AssignmentStepType = "instruction" | "upload" | "review" | "complete";
export type AssignmentAttachmentKind = "reference" | "screenshot" | "evidence";
export type AssignmentMemberRole = "member" | "lead";

export interface AppUser {
  id: number;
  username: string;
  email: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
}

export interface AssignmentGroup {
  id: string;
  name: string;
  description?: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface AssignmentGroupMember {
  id: string;
  group_id: string;
  user_id: number;
  member_role: AssignmentMemberRole;
  created_at?: string;
}

export interface Assignment {
  id: string;
  title: string;
  summary?: string;
  instructions?: string;
  status: AssignmentStatus;
  priority: AssignmentPriority;
  due_at?: string | null;
  created_by_id?: number | null;
  created_at?: string;
  updated_at?: string;
}

export interface AssignmentStep {
  id: string;
  assignment_id: string;
  step_order: number;
  title: string;
  description?: string;
  step_type: AssignmentStepType;
  required_attachment?: boolean;
  allow_multiple_attachments?: boolean;
  allow_user_uploads?: boolean;
  require_message_response?: boolean;
  created_at?: string;
}

export interface AssignmentAssignee {
  id: string;
  assignment_id: string;
  assignee_type: "user" | "group";
  user_id?: number | null;
  group_id?: string | null;
  assigned_at?: string;
}

export interface AssignmentAttachment {
  id: string;
  assignment_id: string;
  step_id?: string | null;
  attachment_kind: AssignmentAttachmentKind;
  file_name?: string;
  file_path: string;
  mime_type?: string;
  size_bytes?: number | null;
  uploaded_by_id?: number | null;
  created_at?: string;
}

export interface AssignmentStepResponse {
  id: string;
  assignment_id: string;
  step_id: string;
  user_id: number;
  response_text?: string;
  created_at?: string;
  updated_at?: string;
}

export interface SelectOption<TValue extends string | number> {
  value: TValue;
  label: string;
}

export interface EditableAttachment {
  clientId: string;
  id?: string;
  stepClientId?: string | null;
  stepId?: string | null;
  attachment_kind: AssignmentAttachmentKind;
  file_name: string;
  file_path: string;
  mime_type?: string;
  size_bytes?: number;
}

export interface EditableStep {
  clientId: string;
  id?: string;
  title: string;
  description: string;
  step_type: AssignmentStepType;
  required_attachment: boolean;
  allow_multiple_attachments: boolean;
  allow_user_uploads: boolean;
  require_message_response: boolean;
}
