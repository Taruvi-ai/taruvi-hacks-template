import { taruviDataProvider } from "../../providers/refineProviders";
import { deleteFile } from "../../utils/storageHelpers";
import type { AssignmentAttachment, AssignmentAssignee, AssignmentStep } from "./types";

const ASSIGNMENT_BUCKET = "assignment-files";

export const cleanupAttachmentFiles = async (attachments: AssignmentAttachment[]) => {
  for (const attachment of attachments) {
    try {
      await deleteFile(ASSIGNMENT_BUCKET, attachment.file_path);
    } catch (error) {
      console.warn("Failed to delete attachment file", attachment.file_path, error);
    }
  }
};

export const deleteAssignmentCascade = async (params: {
  assignmentId: string;
  attachments: AssignmentAttachment[];
  steps: AssignmentStep[];
  assignees: AssignmentAssignee[];
}) => {
  const { assignmentId, attachments, steps, assignees } = params;

  await cleanupAttachmentFiles(attachments);

  if (attachments.length > 0) {
    await taruviDataProvider.deleteMany({
      resource: "assignment_attachments",
      ids: attachments.map((attachment) => attachment.id),
    });
  }

  if (assignees.length > 0) {
    await taruviDataProvider.deleteMany({
      resource: "assignment_assignees",
      ids: assignees.map((assignee) => assignee.id),
    });
  }

  if (steps.length > 0) {
    await taruviDataProvider.deleteMany({
      resource: "assignment_steps",
      ids: steps.map((step) => step.id),
    });
  }

  await taruviDataProvider.deleteOne({
    resource: "assignments",
    id: assignmentId,
  });
};
