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
    await Promise.all(
      attachments.map((attachment) =>
        taruviDataProvider.deleteOne({ resource: "assignment_attachments", id: attachment.id }),
      ),
    );
  }

  if (assignees.length > 0) {
    await Promise.all(
      assignees.map((assignee) =>
        taruviDataProvider.deleteOne({ resource: "assignment_assignees", id: assignee.id }),
      ),
    );
  }

  if (steps.length > 0) {
    await Promise.all(
      steps.map((step) =>
        taruviDataProvider.deleteOne({ resource: "assignment_steps", id: step.id }),
      ),
    );
  }

  await taruviDataProvider.deleteOne({
    resource: "assignments",
    id: assignmentId,
  });
};
