import { useEffect, useMemo, useState } from "react";
import { useGetIdentity, useList, useNotification, useOne } from "@refinedev/core";
import { useNavigate, useParams } from "react-router";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
  useTheme,
} from "@mui/material";
import ArrowBackOutlined from "@mui/icons-material/ArrowBackOutlined";
import ArrowForwardOutlined from "@mui/icons-material/ArrowForwardOutlined";
import DeleteOutlineOutlined from "@mui/icons-material/DeleteOutlineOutlined";
import EditOutlined from "@mui/icons-material/EditOutlined";
import FileUploadOutlined from "@mui/icons-material/FileUploadOutlined";
import DownloadOutlined from "@mui/icons-material/DownloadOutlined";
import type { TaruviUser } from "../../providers/refineProviders";
import { taruviDataProvider } from "../../providers/refineProviders";
import { downloadStorageFile, uploadFile } from "../../utils/storageHelpers";
import { FormattedText } from "../../components/text/FormattedText";
import { MarkdownText } from "../../components/text/MarkdownText";
import type {
  Assignment,
  AssignmentAssignee,
  AssignmentAttachment,
  AssignmentGroupMember,
  AssignmentStepResponse,
  AssignmentStep,
} from "../../features/assignments/types";
import { formatDateTime } from "../../features/assignments/utils";
import { deleteAssignmentCascade } from "../../features/assignments/data";
import { canManageAssignments } from "../../features/assignments/access";

type EvidenceKind = "screenshot" | "evidence";

export const AssignmentShow = () => {
  const params = useParams();
  const assignmentId = params.id ?? "";
  const navigate = useNavigate();
  const theme = useTheme();
  const notificationProvider = useNotification();
  const open = notificationProvider.open;
  const { data: identity } = useGetIdentity<TaruviUser>();
  const canAdmin = canManageAssignments(identity);

  const [error, setError] = useState<string | null>(null);
  const [uploadingStepId, setUploadingStepId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [attachmentKindByStep, setAttachmentKindByStep] = useState<Record<string, EvidenceKind>>({});
  const [responseText, setResponseText] = useState("");
  const [savingResponse, setSavingResponse] = useState(false);

  const assignmentQuery = useOne<Assignment>({ resource: "assignments", id: assignmentId });
  const stepsQuery = useList<AssignmentStep>({
    resource: "assignment_steps",
    filters: [{ field: "assignment_id", operator: "eq", value: assignmentId }],
    pagination: { mode: "off" },
    sorters: [{ field: "step_order", order: "asc" }],
  });
  const assigneesQuery = useList<AssignmentAssignee>({
    resource: "assignment_assignees",
    filters: [{ field: "assignment_id", operator: "eq", value: assignmentId }],
    pagination: { mode: "off" },
  });
  const attachmentsQuery = useList<AssignmentAttachment>({
    resource: "assignment_attachments",
    filters: [{ field: "assignment_id", operator: "eq", value: assignmentId }],
    pagination: { mode: "off" },
    sorters: [{ field: "created_at", order: "desc" }],
  });
  const responsesQuery = useList<AssignmentStepResponse>({
    resource: "assignment_step_responses",
    filters: [{ field: "assignment_id", operator: "eq", value: assignmentId }],
    pagination: { mode: "off" },
    sorters: [{ field: "updated_at", order: "desc" }],
  });
  const groupMembersQuery = useList<AssignmentGroupMember>({
    resource: "assignment_group_members",
    pagination: { mode: "off" },
    queryOptions: { enabled: !canAdmin },
  });
  const usersQuery = useList<{ id: number; username: string; full_name?: string }>({
    resource: "users",
    dataProviderName: "user",
    pagination: {
      mode: "server",
      currentPage: 1,
      pageSize: 500,
    },
    sorters: [{ field: "username", order: "asc" }],
    queryOptions: { enabled: canAdmin },
  });

  const steps = stepsQuery.result?.data ?? [];
  const assignees = assigneesQuery.result?.data ?? [];
  const attachments = attachmentsQuery.result?.data ?? [];
  const responses = responsesQuery.result?.data ?? [];
  const groupMembers = groupMembersQuery.result?.data ?? [];
  const users = usersQuery.result?.data ?? [];

  // Check if the current user is assigned to this assignment (directly or via group)
  const isAssigned = useMemo(() => {
    if (canAdmin) return true;
    if (!identity?.id) return false;

    const myGroupIds = new Set(
      groupMembers
        .filter((gm) => gm.user_id === identity.id)
        .map((gm) => gm.group_id),
    );

    return assignees.some(
      (a) =>
        (a.assignee_type === "user" && a.user_id === identity.id) ||
        (a.assignee_type === "group" && a.group_id && myGroupIds.has(a.group_id)),
    );
  }, [assignees, groupMembers, identity?.id, canAdmin]);

  useEffect(() => {
    if (steps.length === 0) {
      setCurrentStepIndex(0);
      return;
    }

    setCurrentStepIndex((current) => Math.min(current, steps.length - 1));
  }, [steps]);

  const currentStep = steps[currentStepIndex] ?? null;
  const stepAttachments = useMemo(() => {
    const map = new Map<string, AssignmentAttachment[]>();
    steps.forEach((step) => {
      map.set(step.id, attachments.filter((attachment) => attachment.step_id === step.id));
    });
    return map;
  }, [steps, attachments]);
  const assignmentLevelAttachments = attachments.filter((attachment) => attachment.step_id == null);

  const uploadEvidence = async (step: AssignmentStep, files: FileList | null) => {
    if (files == null || files.length === 0) return;

    setUploadingStepId(step.id);
    setError(null);
    const selectedKind = attachmentKindByStep[step.id] ?? "screenshot";

    try {
      for (const file of Array.from(files)) {
        const path = await uploadFile("assignment-files", file, { prefix: selectedKind });
        await taruviDataProvider.create({
          resource: "assignment_attachments",
          variables: {
            id: crypto.randomUUID(),
            assignment_id: assignmentId,
            step_id: step.id,
            attachment_kind: selectedKind,
            file_name: file.name,
            file_path: path,
            mime_type: file.type || null,
            size_bytes: file.size,
            uploaded_by_id: identity?.id ?? null,
            created_at: new Date().toISOString(),
          },
        });
      }

      await attachmentsQuery.query?.refetch?.();
      if (open) {
        open({
          type: "success",
          message: "Attachment uploaded",
          description: `${files.length} file(s) added to ${step.title}.`,
        });
      }
    } catch (uploadError) {
      console.error(uploadError);
      setError("Unable to upload evidence for this step.");
    } finally {
      setUploadingStepId(null);
    }
  };

  const handleDeleteAssignment = async () => {
    if (!window.confirm("Delete this assignment and all of its steps, assignees, and attachments?")) {
      return;
    }

    setDeleting(true);
    setError(null);

    try {
      await deleteAssignmentCascade({
        assignmentId,
        attachments,
        steps,
        assignees,
      });

      if (open) {
        open({
          type: "success",
          message: "Assignment deleted",
          description: "The assignment and its attachments were removed.",
        });
      }

      navigate("/assignments");
    } catch (deleteError) {
      console.error(deleteError);
      setError("Unable to delete this assignment.");
    } finally {
      setDeleting(false);
    }
  };

  const loading = Boolean(
    assignmentQuery.query?.isLoading ||
      stepsQuery.query?.isLoading ||
      assigneesQuery.query?.isLoading ||
      attachmentsQuery.query?.isLoading ||
      responsesQuery.query?.isLoading ||
      (!canAdmin && groupMembersQuery.query?.isLoading),
  );

  const currentStepAttachments = currentStep ? stepAttachments.get(currentStep.id) ?? [] : [];
  const currentStepReferenceFiles = currentStepAttachments.filter((attachment) => attachment.attachment_kind === "reference");
  const currentStepEvidenceFiles = currentStepAttachments.filter((attachment) => attachment.attachment_kind !== "reference");
  const currentStepResponses = currentStep ? responses.filter((response) => response.step_id === currentStep.id) : [];
  const myCurrentResponse = currentStepResponses.find((response) => response.user_id === identity?.id) ?? null;
  const isHiddenDraft = !canAdmin && assignmentQuery.result?.status !== "published";

  useEffect(() => {
    setResponseText(myCurrentResponse?.response_text ?? "");
  }, [myCurrentResponse?.id, myCurrentResponse?.response_text]);

  useEffect(() => {
    if (loading) return;
    if (assignmentQuery.result == null) return;
    if (isHiddenDraft || !isAssigned) {
      navigate("/assignments", { replace: true });
    }
  }, [assignmentQuery.result, isHiddenDraft, isAssigned, loading, navigate]);

  const handleSaveResponse = async () => {
    if (!currentStep || !identity?.id) return;

    setSavingResponse(true);
    setError(null);

    try {
      const now = new Date().toISOString();
      if (myCurrentResponse) {
        await taruviDataProvider.update({
          resource: "assignment_step_responses",
          id: myCurrentResponse.id,
          variables: {
            response_text: responseText.trim(),
            updated_at: now,
          },
        });
      } else {
        await taruviDataProvider.create({
          resource: "assignment_step_responses",
          variables: {
            id: crypto.randomUUID(),
            assignment_id: assignmentId,
            step_id: currentStep.id,
            user_id: identity.id,
            response_text: responseText.trim(),
            created_at: now,
            updated_at: now,
          },
        });
      }

      await responsesQuery.query?.refetch?.();
      open?.({
        type: "success",
        message: "Response saved",
        description: "Your step response has been recorded.",
      });
    } catch (saveError) {
      console.error(saveError);
      setError("Unable to save your response.");
    } finally {
      setSavingResponse(false);
    }
  };

  const handleDownloadAttachment = async (attachment: AssignmentAttachment) => {
    try {
      await downloadStorageFile("assignment-files", attachment.file_path, attachment.file_name);
    } catch (downloadError) {
      console.error(downloadError);
      setError(`Unable to download ${attachment.file_name || "this file"}.`);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Stack spacing={3}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
          <Button startIcon={<ArrowBackOutlined />} onClick={() => navigate(-1)}>
            Back
          </Button>
          {canAdmin ? (
            <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
              <Button color="error" startIcon={<DeleteOutlineOutlined />} onClick={() => void handleDeleteAssignment()} disabled={deleting}>
                {deleting ? "Deleting..." : "Delete Assignment"}
              </Button>
              <Button variant="contained" startIcon={<EditOutlined />} onClick={() => navigate(`/assignments/edit/${assignmentId}`)}>
                Edit Assignment
              </Button>
            </Stack>
          ) : null}
        </Stack>

        {loading || assignmentQuery.result == null || isHiddenDraft ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Stack spacing={3}>
            {error && <Alert severity="error">{error}</Alert>}

            <Card>
              <CardContent>
                <Stack spacing={2}>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={2} flexWrap="wrap">
                    <Box>
                      <Typography variant="overline" color="primary">
                        Guided Assignment
                      </Typography>
                      <Typography variant="h4" fontWeight={700}>
                        {assignmentQuery.result.title}
                      </Typography>
                      <MarkdownText color="text.secondary" text={assignmentQuery.result.summary || "No summary provided."} />
                    </Box>
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                      <Chip label={assignmentQuery.result.status} color={assignmentQuery.result.status === "published" ? "success" : "default"} />
                      <Chip label={assignmentQuery.result.priority} variant="outlined" />
                    </Stack>
                  </Stack>
                  <MarkdownText text={assignmentQuery.result.instructions || "No additional instructions."} />
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    <Chip label={`Due ${formatDateTime(assignmentQuery.result.due_at)}`} variant="outlined" />
                    <Chip label={`${steps.length} steps`} variant="outlined" />
                    <Chip label={`${attachments.length} attachments`} variant="outlined" />
                  </Stack>
                </Stack>
              </CardContent>
            </Card>

            {assignmentLevelAttachments.length > 0 && (
              <Card>
                <CardContent>
                  <Stack spacing={2}>
                    <Typography variant="h6" fontWeight={700}>
                      Assignment files
                    </Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                      {assignmentLevelAttachments.map((attachment) => (
                        <Chip
                          key={attachment.id}
                          label={`Download ${attachment.file_name || attachment.file_path}`}
                          clickable
                          icon={<DownloadOutlined />}
                          color="primary"
                          variant="outlined"
                          onClick={() => void handleDownloadAttachment(attachment)}
                        />
                      ))}
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardContent>
                <Stack spacing={3}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
                    <Box>
                      <Typography variant="h6" fontWeight={700}>
                        Stepwise flow
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Move through one step at a time.
                      </Typography>
                    </Box>
                    {currentStep ? <Chip label={`Step ${currentStepIndex + 1} of ${steps.length}`} color="primary" /> : null}
                  </Stack>

                  {steps.length > 0 && (
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                      {steps.map((step, index) => (
                        <Chip
                          key={step.id}
                          label={`${index + 1}. ${step.title}`}
                          clickable
                          color={index === currentStepIndex ? "primary" : "default"}
                          variant={index === currentStepIndex ? "filled" : "outlined"}
                          sx={
                            index === currentStepIndex
                              ? {
                                  boxShadow: `0 8px 20px ${theme.palette.mode === "light" ? "rgba(255,107,61,0.22)" : "rgba(255,122,79,0.24)"}`,
                                }
                              : undefined
                          }
                          onClick={() => setCurrentStepIndex(index)}
                        />
                      ))}
                    </Stack>
                  )}

                  {currentStep == null ? (
                    <Typography color="text.secondary">No steps have been added to this assignment yet.</Typography>
                  ) : (
                    <Card variant="outlined">
                      <CardContent>
                        <Stack spacing={3}>
                          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                            <Chip label={currentStep.step_type} size="small" />
                            {currentStep.allow_user_uploads && currentStep.required_attachment ? <Chip label="Upload required" color="warning" size="small" /> : null}
                            {currentStep.require_message_response ? <Chip label="Message required" color="info" size="small" /> : null}
                          </Stack>

                          <Box>
                            <Typography variant="h5" fontWeight={700} gutterBottom>
                              {currentStep.title}
                            </Typography>
                            <MarkdownText color="text.secondary" text={currentStep.description || "No extra description."} />
                          </Box>

                          {currentStepReferenceFiles.length > 0 || currentStep.allow_user_uploads || currentStep.require_message_response ? (
                            <>
                              <Box>
                                <Typography variant="subtitle2" gutterBottom>
                                  Step attachments
                                </Typography>
                                {currentStepReferenceFiles.length === 0 ? (
                                  <Typography variant="body2" color="text.secondary">
                                    No admin files attached to this step.
                                  </Typography>
                                ) : (
                                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                                    {currentStepReferenceFiles.map((attachment) => (
                                      <Chip
                                        key={attachment.id}
                                        label={`Download ${attachment.file_name || attachment.file_path}`}
                                        clickable
                                        icon={<DownloadOutlined />}
                                        color="primary"
                                        variant="outlined"
                                        onClick={() => void handleDownloadAttachment(attachment)}
                                      />
                                    ))}
                                  </Stack>
                                )}
                              </Box>

                              {currentStep.allow_user_uploads ? (
                                <>
                                  <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ sm: "center" }}>
                                    <FormControl sx={{ minWidth: 180 }}>
                                      <InputLabel id={`attachment-kind-${currentStep.id}`}>Upload As</InputLabel>
                                      <Select
                                        labelId={`attachment-kind-${currentStep.id}`}
                                        value={attachmentKindByStep[currentStep.id] ?? "screenshot"}
                                        label="Upload As"
                                        onChange={(event) =>
                                          setAttachmentKindByStep((current) => ({ ...current, [currentStep.id]: event.target.value as EvidenceKind }))
                                        }
                                      >
                                        <MenuItem value="screenshot">screenshot</MenuItem>
                                        <MenuItem value="evidence">evidence</MenuItem>
                                      </Select>
                                    </FormControl>
                                    <Button component="label" variant="outlined" startIcon={<FileUploadOutlined />}>
                                      {uploadingStepId === currentStep.id ? "Uploading..." : "Upload file"}
                                      <input hidden type="file" multiple onChange={(event) => void uploadEvidence(currentStep, event.target.files)} />
                                    </Button>
                                  </Stack>

                                  <Box>
                                    <Typography variant="subtitle2" gutterBottom>
                                      Uploaded screenshots and evidence
                                    </Typography>
                                    {currentStepEvidenceFiles.length === 0 ? (
                                      <Typography variant="body2" color="text.secondary">
                                        No screenshots or evidence uploaded yet.
                                      </Typography>
                                    ) : (
                                      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                                        {currentStepEvidenceFiles.map((attachment) => (
                                          <Chip
                                            key={attachment.id}
                                            label={`${attachment.attachment_kind}: ${attachment.file_name || attachment.file_path}`}
                                            clickable
                                            icon={<DownloadOutlined />}
                                            onClick={() => void handleDownloadAttachment(attachment)}
                                          />
                                        ))}
                                      </Stack>
                                    )}
                                  </Box>
                                </>
                              ) : null}

                              {currentStep.require_message_response ? (
                                <Box>
                                  <Typography variant="subtitle2" gutterBottom>
                                    Submit your response
                                  </Typography>
                                  <Stack spacing={2}>
                                    <TextField
                                      value={responseText}
                                      onChange={(event) => setResponseText(event.target.value)}
                                      placeholder="Write your message or final response here"
                                      multiline
                                      minRows={5}
                                      fullWidth
                                    />
                                    <Button
                                      variant="contained"
                                      onClick={() => void handleSaveResponse()}
                                      disabled={savingResponse}
                                      sx={{ alignSelf: "flex-start" }}
                                    >
                                      {savingResponse ? "Saving..." : myCurrentResponse ? "Update response" : "Submit response"}
                                    </Button>
                                  </Stack>
                                </Box>
                              ) : null}

                              {canAdmin && currentStepResponses.length > 0 ? (
                                <Box>
                                  <Typography variant="subtitle2" gutterBottom>
                                    Submitted responses
                                  </Typography>
                                  <Stack spacing={1.5}>
                                    {currentStepResponses.map((response) => {
                                      const author = users.find((user) => user.id === response.user_id);
                                      return (
                                        <Box
                                          key={response.id}
                                          sx={{
                                            p: 2,
                                            border: "1px solid",
                                            borderColor: "divider",
                                            borderRadius: 2,
                                          }}
                                        >
                                          <Typography variant="subtitle2">
                                            {author?.full_name || author?.username || `User ${response.user_id}`}
                                          </Typography>
                                          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                                            Updated {formatDateTime(response.updated_at || response.created_at)}
                                          </Typography>
                                          <FormattedText text={response.response_text || "No message submitted."} />
                                        </Box>
                                      );
                                    })}
                                  </Stack>
                                </Box>
                              ) : null}
                            </>
                          ) : null}

                          <Stack direction="row" justifyContent="space-between" alignItems="center" gap={2}>
                            <Button
                              startIcon={<ArrowBackOutlined />}
                              onClick={() => setCurrentStepIndex((current) => Math.max(current - 1, 0))}
                              disabled={currentStepIndex === 0}
                            >
                              Previous step
                            </Button>
                            <Button
                              endIcon={<ArrowForwardOutlined />}
                              variant="contained"
                              onClick={() => setCurrentStepIndex((current) => Math.min(current + 1, steps.length - 1))}
                              disabled={currentStepIndex === steps.length - 1}
                            >
                              Next step
                            </Button>
                          </Stack>
                        </Stack>
                      </CardContent>
                    </Card>
                  )}
                </Stack>
              </CardContent>
            </Card>
          </Stack>
        )}
      </Stack>
    </Container>
  );
};
