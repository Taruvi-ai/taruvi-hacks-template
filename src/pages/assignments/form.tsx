import { useEffect, useMemo, useState } from "react";
import { useGetIdentity, useList, useNotification, useOne } from "@refinedev/core";
import { useNavigate, useParams } from "react-router";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  FormControl,
  FormControlLabel,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import AddOutlined from "@mui/icons-material/AddOutlined";
import ArrowBackOutlined from "@mui/icons-material/ArrowBackOutlined";
import DeleteOutlineOutlined from "@mui/icons-material/DeleteOutlineOutlined";
import ExpandLessOutlined from "@mui/icons-material/ExpandLessOutlined";
import ExpandMoreOutlined from "@mui/icons-material/ExpandMoreOutlined";
import FileUploadOutlined from "@mui/icons-material/FileUploadOutlined";
import SaveOutlined from "@mui/icons-material/SaveOutlined";
import type { TaruviUser } from "../../providers/refineProviders";
import { taruviDataProvider } from "../../providers/refineProviders";
import { getStorageUrl, uploadFile } from "../../utils/storageHelpers";
import type {
  AppUser,
  Assignment,
  AssignmentAssignee,
  AssignmentAttachment,
  AssignmentGroup,
  AssignmentPriority,
  AssignmentStatus,
  AssignmentStep,
  AssignmentStepType,
  EditableAttachment,
  EditableStep,
} from "../../features/assignments/types";
import {
  ASSIGNMENT_PRIORITIES,
  ASSIGNMENT_STATUSES,
  ASSIGNMENT_STEP_TYPES,
  attachmentToEditable,
  createEmptyStep,
  formatGroupLabel,
  formatUserLabel,
  fromDateTimeLocalValue,
  stepToEditable,
  toDateTimeLocalValue,
} from "../../features/assignments/utils";
import { cleanupAttachmentFiles } from "../../features/assignments/data";

interface AssignmentFormProps {
  mode: "create" | "edit";
}

const buildAttachmentRecord = (
  file: File,
  filePath: string,
  stepClientId?: string,
): EditableAttachment => ({
  clientId: crypto.randomUUID(),
  stepClientId: stepClientId ?? null,
  attachment_kind: "reference",
  file_name: file.name,
  file_path: filePath,
  mime_type: file.type || undefined,
  size_bytes: file.size,
});

export const AssignmentForm = ({ mode }: AssignmentFormProps) => {
  const params = useParams();
  const assignmentIdFromRoute = params.id;
  const navigate = useNavigate();
  const notificationProvider = useNotification();
  const open = notificationProvider.open;
  const { data: identity } = useGetIdentity<TaruviUser>();
  const isEdit = mode === "edit";

  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [instructions, setInstructions] = useState("");
  const [status, setStatus] = useState<AssignmentStatus>("draft");
  const [priority, setPriority] = useState<AssignmentPriority>("medium");
  const [dueAt, setDueAt] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<AppUser[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<AssignmentGroup[]>([]);
  const [steps, setSteps] = useState<EditableStep[]>([createEmptyStep()]);
  const [referenceAttachments, setReferenceAttachments] = useState<EditableAttachment[]>([]);
  const [uploadingTarget, setUploadingTarget] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const assignmentQuery = useOne<Assignment>({
    resource: "assignments",
    id: assignmentIdFromRoute ?? "",
    queryOptions: { enabled: isEdit && Boolean(assignmentIdFromRoute) },
  });
  const stepsQuery = useList<AssignmentStep>({
    resource: "assignment_steps",
    filters: [{ field: "assignment_id", operator: "eq", value: assignmentIdFromRoute }],
    pagination: { mode: "off" },
    sorters: [{ field: "step_order", order: "asc" }],
    queryOptions: { enabled: isEdit && Boolean(assignmentIdFromRoute) },
  });
  const assigneesQuery = useList<AssignmentAssignee>({
    resource: "assignment_assignees",
    filters: [{ field: "assignment_id", operator: "eq", value: assignmentIdFromRoute }],
    pagination: { mode: "off" },
    queryOptions: { enabled: isEdit && Boolean(assignmentIdFromRoute) },
  });
  const referenceAttachmentsQuery = useList<AssignmentAttachment>({
    resource: "assignment_attachments",
    filters: [
      { field: "assignment_id", operator: "eq", value: assignmentIdFromRoute },
      { field: "attachment_kind", operator: "eq", value: "reference" },
    ],
    pagination: { mode: "off" },
    queryOptions: { enabled: isEdit && Boolean(assignmentIdFromRoute) },
  });
  const usersQuery = useList<AppUser>({
    resource: "users",
    dataProviderName: "user",
    pagination: {
      mode: "server",
      currentPage: 1,
      pageSize: 500,
    },
    sorters: [{ field: "username", order: "asc" }],
  });
  const groupsQuery = useList<AssignmentGroup>({
    resource: "assignment_groups",
    pagination: { mode: "off" },
    sorters: [{ field: "name", order: "asc" }],
  });

  const users = usersQuery.result?.data ?? [];
  const groups = groupsQuery.result?.data ?? [];
  const existingSteps = stepsQuery.result?.data ?? [];
  const existingAssignees = assigneesQuery.result?.data ?? [];
  const existingReferenceAttachments = referenceAttachmentsQuery.result?.data ?? [];

  useEffect(() => {
    if (assignmentQuery.result == null) return;

    setTitle(assignmentQuery.result.title ?? "");
    setSummary(assignmentQuery.result.summary ?? "");
    setInstructions(assignmentQuery.result.instructions ?? "");
    setStatus(assignmentQuery.result.status ?? "draft");
    setPriority(assignmentQuery.result.priority ?? "medium");
    setDueAt(toDateTimeLocalValue(assignmentQuery.result.due_at));
  }, [assignmentQuery.result]);

  useEffect(() => {
    if (existingSteps.length === 0) {
      if (!isEdit) setSteps([createEmptyStep()]);
      return;
    }

    setSteps(existingSteps.map(stepToEditable));
  }, [existingSteps, isEdit]);

  useEffect(() => {
    if (users.length === 0) return;
    const userIds = new Set(existingAssignees.filter((assignee) => assignee.assignee_type === "user").map((assignee) => assignee.user_id));
    setSelectedUsers(users.filter((user) => userIds.has(user.id)));
  }, [users, existingAssignees]);

  useEffect(() => {
    if (groups.length === 0) return;
    const groupIds = new Set(existingAssignees.filter((assignee) => assignee.assignee_type === "group").map((assignee) => assignee.group_id));
    setSelectedGroups(groups.filter((group) => groupIds.has(group.id)));
  }, [groups, existingAssignees]);

  const stepClientIdByPersistedId = useMemo(() => {
    const entries = steps.filter((step) => step.id).map((step) => [step.id as string, step.clientId]);
    return new Map(entries);
  }, [steps]);

  useEffect(() => {
    setReferenceAttachments(
      existingReferenceAttachments.map((attachment) => attachmentToEditable(attachment, attachment.step_id ? stepClientIdByPersistedId.get(attachment.step_id) : null)),
    );
  }, [existingReferenceAttachments, stepClientIdByPersistedId]);

  const addStep = () => {
    setSteps((current) => [...current, createEmptyStep()]);
  };

  const updateStep = <K extends keyof EditableStep>(clientId: string, key: K, value: EditableStep[K]) => {
    setSteps((current) =>
      current.map((step) => {
        if (step.clientId !== clientId) return step;
        const nextStep = { ...step, [key]: value };

        if (key === "allow_user_uploads" && !value) {
          nextStep.required_attachment = false;
          nextStep.allow_multiple_attachments = false;
        }

        return nextStep;
      }),
    );
  };

  const moveStep = (clientId: string, direction: "up" | "down") => {
    setSteps((current) => {
      const index = current.findIndex((step) => step.clientId === clientId);
      if (index < 0) return current;
      if (direction === "up" && index === 0) return current;
      if (direction === "down" && index === current.length - 1) return current;

      const next = [...current];
      const swapIndex = direction === "up" ? index - 1 : index + 1;
      [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
      return next;
    });
  };

  const removeStep = (stepToRemove: EditableStep) => {
    if (isEdit && stepToRemove.id) {
      setError("Existing steps are editable, but removal is blocked after save to preserve uploaded evidence.");
      return;
    }

    setSteps((current) => current.filter((step) => step.clientId !== stepToRemove.clientId));
    setReferenceAttachments((current) => current.filter((attachment) => attachment.stepClientId !== stepToRemove.clientId));
  };

  const handleUploadAttachments = async (files: FileList | null, stepClientId?: string) => {
    if (files == null || files.length === 0) return;

    const targetKey = stepClientId ?? "assignment";
    setUploadingTarget(targetKey);
    setError(null);

    try {
      const nextAttachments: EditableAttachment[] = [];
      for (const file of Array.from(files)) {
        const filePath = await uploadFile("assignment-files", file, { prefix: stepClientId ? "step" : "assignment" });
        nextAttachments.push(buildAttachmentRecord(file, filePath, stepClientId));
      }
      setReferenceAttachments((current) => [...current, ...nextAttachments]);
    } catch (uploadError) {
      console.error(uploadError);
      setError("File upload failed. Please try again.");
    } finally {
      setUploadingTarget(null);
    }
  };

  const removeAttachment = (clientId: string) => {
    setReferenceAttachments((current) => current.filter((attachment) => attachment.clientId !== clientId));
  };

  const handleSave = async () => {
    const trimmedTitle = title.trim();
    const normalizedSteps = steps.map((step) => ({ ...step, title: step.title.trim(), description: step.description.trim() }));

    if (trimmedTitle === "") {
      setError("Assignment title is required.");
      return;
    }

    if (normalizedSteps.length === 0 || normalizedSteps.some((step) => step.title === "")) {
      setError("Add at least one step and give every step a title.");
      return;
    }

    setSubmitting(true);
    setError(null);

    const assignmentId = isEdit && assignmentIdFromRoute ? assignmentIdFromRoute : crypto.randomUUID();
    const now = new Date().toISOString();

    try {
      const assignmentPayload = {
        title: trimmedTitle,
        summary: summary.trim(),
        instructions: instructions.trim(),
        status,
        priority,
        due_at: fromDateTimeLocalValue(dueAt),
        created_by_id: identity?.id ?? null,
        updated_at: now,
      };

      if (isEdit) {
        await taruviDataProvider.update({
          resource: "assignments",
          id: assignmentId,
          variables: assignmentPayload,
        });
      } else {
        await taruviDataProvider.create({
          resource: "assignments",
          variables: {
            id: assignmentId,
            ...assignmentPayload,
            created_at: now,
          },
        });
      }

      if (existingAssignees.length > 0) {
        await taruviDataProvider.deleteMany({
          resource: "assignment_assignees",
          ids: existingAssignees.map((assignee) => assignee.id),
        });
      }

      const keptExistingAttachmentIds = new Set(referenceAttachments.map((attachment) => attachment.id).filter(Boolean));
      const attachmentsToDelete = existingReferenceAttachments.filter((attachment) => !keptExistingAttachmentIds.has(attachment.id));

      if (attachmentsToDelete.length > 0) {
        await cleanupAttachmentFiles(attachmentsToDelete);
        await taruviDataProvider.deleteMany({
          resource: "assignment_attachments",
          ids: attachmentsToDelete.map((attachment) => attachment.id),
        });
      }

      const stepIdMap = new Map<string, string>();

      for (let index = 0; index < normalizedSteps.length; index += 1) {
        const step = normalizedSteps[index];
        const stepId = step.id ?? crypto.randomUUID();
        stepIdMap.set(step.clientId, stepId);

        if (step.id) {
          await taruviDataProvider.update({
            resource: "assignment_steps",
            id: step.id,
            variables: {
              title: step.title,
              description: step.description,
              step_type: step.step_type,
              step_order: index + 1,
              required_attachment: step.required_attachment,
              allow_multiple_attachments: step.allow_multiple_attachments,
              allow_user_uploads: step.allow_user_uploads,
              require_message_response: step.require_message_response,
            },
          });
        } else {
          await taruviDataProvider.create({
            resource: "assignment_steps",
            variables: {
              id: stepId,
              assignment_id: assignmentId,
              step_order: index + 1,
              title: step.title,
              description: step.description,
              step_type: step.step_type,
              required_attachment: step.required_attachment,
              allow_multiple_attachments: step.allow_multiple_attachments,
              allow_user_uploads: step.allow_user_uploads,
              require_message_response: step.require_message_response,
              created_at: now,
            },
          });
        }
      }

      const assigneePayload = [
        ...selectedUsers.map((user) => ({
          id: crypto.randomUUID(),
          assignment_id: assignmentId,
          assignee_type: "user",
          user_id: user.id,
          group_id: null,
          assigned_at: now,
        })),
        ...selectedGroups.map((group) => ({
          id: crypto.randomUUID(),
          assignment_id: assignmentId,
          assignee_type: "group",
          user_id: null,
          group_id: group.id,
          assigned_at: now,
        })),
      ];

      if (assigneePayload.length > 0) {
        await taruviDataProvider.createMany({
          resource: "assignment_assignees",
          variables: assigneePayload,
        });
      }

      const newAttachmentPayload = referenceAttachments
        .filter((attachment) => !attachment.id)
        .map((attachment) => ({
          id: crypto.randomUUID(),
          assignment_id: assignmentId,
          step_id: attachment.stepClientId ? stepIdMap.get(attachment.stepClientId) ?? null : null,
          attachment_kind: "reference",
          file_name: attachment.file_name,
          file_path: attachment.file_path,
          mime_type: attachment.mime_type ?? null,
          size_bytes: attachment.size_bytes ?? null,
          uploaded_by_id: identity?.id ?? null,
          created_at: now,
        }));

      if (newAttachmentPayload.length > 0) {
        await taruviDataProvider.createMany({
          resource: "assignment_attachments",
          variables: newAttachmentPayload,
        });
      }

      if (open) {
        open({
          type: "success",
          message: isEdit ? "Assignment updated" : "Assignment created",
          description: `${trimmedTitle} is ready to assign.`,
        });
      }

      navigate(`/assignments/show/${assignmentId}`);
    } catch (saveError) {
      console.error(saveError);
      setError("Unable to save the assignment right now.");
    } finally {
      setSubmitting(false);
    }
  };

  const loading = Boolean(
    assignmentQuery.query?.isLoading ||
      stepsQuery.query?.isLoading ||
      assigneesQuery.query?.isLoading ||
      referenceAttachmentsQuery.query?.isLoading ||
      usersQuery.query?.isLoading ||
      groupsQuery.query?.isLoading,
  );

  const assignmentLevelAttachments = referenceAttachments.filter((attachment) => attachment.stepClientId == null);

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Stack spacing={3}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
          <Box>
            <Typography variant="h4" fontWeight={700}>
              {isEdit ? "Edit Assignment" : "Create Assignment"}
            </Typography>
            <Typography color="text.secondary">
              Build a stepwise assignment flow, attach reference files, and target users or groups.
            </Typography>
          </Box>
          <Button startIcon={<ArrowBackOutlined />} onClick={() => navigate(-1)}>
            Back
          </Button>
        </Stack>

        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Stack spacing={3}>
            {error && <Alert severity="error">{error}</Alert>}

            <Card>
              <CardContent>
                <Grid container spacing={3}>
                  <Grid size={{ xs: 12, md: 8 }}>
                    <Stack spacing={3}>
                      <TextField label="Assignment Title" value={title} onChange={(event) => setTitle(event.target.value)} fullWidth required />
                      <TextField label="Summary" value={summary} onChange={(event) => setSummary(event.target.value)} fullWidth multiline minRows={2} />
                      <TextField
                        label="Instructions"
                        value={instructions}
                        onChange={(event) => setInstructions(event.target.value)}
                        fullWidth
                        multiline
                        minRows={4}
                      />
                    </Stack>
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <Stack spacing={3}>
                      <FormControl fullWidth>
                        <InputLabel id="assignment-status-label">Status</InputLabel>
                        <Select
                          labelId="assignment-status-label"
                          value={status}
                          label="Status"
                          onChange={(event) => setStatus(event.target.value as AssignmentStatus)}
                        >
                          {ASSIGNMENT_STATUSES.map((entry) => (
                            <MenuItem key={entry} value={entry}>
                              {entry}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>

                      <FormControl fullWidth>
                        <InputLabel id="assignment-priority-label">Priority</InputLabel>
                        <Select
                          labelId="assignment-priority-label"
                          value={priority}
                          label="Priority"
                          onChange={(event) => setPriority(event.target.value as AssignmentPriority)}
                        >
                          {ASSIGNMENT_PRIORITIES.map((entry) => (
                            <MenuItem key={entry} value={entry}>
                              {entry}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>

                      <TextField
                        label="Due At"
                        type="datetime-local"
                        value={dueAt}
                        onChange={(event) => setDueAt(event.target.value)}
                        InputLabelProps={{ shrink: true }}
                      />
                    </Stack>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <Stack spacing={3}>
                  <Typography variant="h6" fontWeight={700}>
                    Assignees
                  </Typography>
                  <Autocomplete
                    multiple
                    options={users}
                    value={selectedUsers}
                    onChange={(_, nextValue) => setSelectedUsers(nextValue)}
                    getOptionLabel={formatUserLabel}
                    isOptionEqualToValue={(option, value) => option.id === value.id}
                    renderInput={(params) => <TextField {...params} label="Assign to users" placeholder="Pick users" />}
                  />
                  <Autocomplete
                    multiple
                    options={groups}
                    value={selectedGroups}
                    onChange={(_, nextValue) => setSelectedGroups(nextValue)}
                    getOptionLabel={formatGroupLabel}
                    isOptionEqualToValue={(option, value) => option.id === value.id}
                    renderInput={(params) => <TextField {...params} label="Assign to groups" placeholder="Pick groups" />}
                  />
                </Stack>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <Stack spacing={3}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
                    <Box>
                      <Typography variant="h6" fontWeight={700}>
                        Flow Steps
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Existing steps remain editable. Once saved, they are not removable so prior evidence uploads stay intact.
                      </Typography>
                    </Box>
                    <Button variant="outlined" startIcon={<AddOutlined />} onClick={addStep}>
                      Add Step
                    </Button>
                  </Stack>

                  <Stack spacing={2}>
                    {steps.map((step, index) => {
                      const stepAttachments = referenceAttachments.filter((attachment) => attachment.stepClientId === step.clientId);
                      return (
                        <Card key={step.clientId} variant="outlined">
                          <CardContent>
                            <Stack spacing={2}>
                              <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
                                <Chip label={`Step ${index + 1}`} color="primary" size="small" />
                                <Stack direction="row" spacing={1}>
                                  <IconButton onClick={() => moveStep(step.clientId, "up")} disabled={index === 0}>
                                    <ExpandLessOutlined />
                                  </IconButton>
                                  <IconButton onClick={() => moveStep(step.clientId, "down")} disabled={index === steps.length - 1}>
                                    <ExpandMoreOutlined />
                                  </IconButton>
                                  <IconButton onClick={() => removeStep(step)} color="error">
                                    <DeleteOutlineOutlined />
                                  </IconButton>
                                </Stack>
                              </Stack>

                              <Grid container spacing={2}>
                                <Grid size={{ xs: 12, md: 8 }}>
                                  <TextField
                                    label="Step Title"
                                    value={step.title}
                                    onChange={(event) => updateStep(step.clientId, "title", event.target.value)}
                                    fullWidth
                                  />
                                </Grid>
                                <Grid size={{ xs: 12, md: 4 }}>
                                  <FormControl fullWidth>
                                    <InputLabel id={`step-type-${step.clientId}`}>Step Type</InputLabel>
                                    <Select
                                      labelId={`step-type-${step.clientId}`}
                                      value={step.step_type}
                                      label="Step Type"
                                      onChange={(event) => updateStep(step.clientId, "step_type", event.target.value as AssignmentStepType)}
                                    >
                                      {ASSIGNMENT_STEP_TYPES.map((entry) => (
                                        <MenuItem key={entry} value={entry}>
                                          {entry}
                                        </MenuItem>
                                      ))}
                                    </Select>
                                  </FormControl>
                                </Grid>
                                <Grid size={12}>
                                  <TextField
                                    label="Step Description"
                                    value={step.description}
                                    onChange={(event) => updateStep(step.clientId, "description", event.target.value)}
                                    fullWidth
                                    multiline
                                    minRows={3}
                                  />
                                </Grid>
                              </Grid>

                              <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
                                <FormControlLabel
                                  control={
                                    <Switch
                                      checked={step.allow_user_uploads}
                                      onChange={(event) => updateStep(step.clientId, "allow_user_uploads", event.target.checked)}
                                    />
                                  }
                                  label="Allow user uploads"
                                />
                                <FormControlLabel
                                  control={
                                    <Switch
                                      checked={step.required_attachment}
                                      onChange={(event) => updateStep(step.clientId, "required_attachment", event.target.checked)}
                                    />
                                  }
                                  disabled={!step.allow_user_uploads}
                                  label="Require at least one upload"
                                />
                                <FormControlLabel
                                  control={
                                    <Switch
                                      checked={step.allow_multiple_attachments}
                                      onChange={(event) => updateStep(step.clientId, "allow_multiple_attachments", event.target.checked)}
                                    />
                                  }
                                  disabled={!step.allow_user_uploads}
                                  label="Allow multiple uploads"
                                />
                                <FormControlLabel
                                  control={
                                    <Switch
                                      checked={step.require_message_response}
                                      onChange={(event) => updateStep(step.clientId, "require_message_response", event.target.checked)}
                                    />
                                  }
                                  label="Require message response"
                                />
                              </Stack>

                              <Stack spacing={1.5}>
                                <Typography variant="subtitle2" color="text.secondary">
                                  Files uploaded here are downloadable by users on this specific step.
                                </Typography>
                                <Button component="label" startIcon={<FileUploadOutlined />} variant="outlined">
                                  {uploadingTarget === step.clientId ? "Uploading..." : "Upload files for this step"}
                                  <input hidden type="file" multiple onChange={(event) => void handleUploadAttachments(event.target.files, step.clientId)} />
                                </Button>
                                {stepAttachments.length > 0 && (
                                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                                    {stepAttachments.map((attachment) => (
                                      <Chip
                                        key={attachment.clientId}
                                        label={attachment.file_name}
                                        onDelete={() => removeAttachment(attachment.clientId)}
                                        component="a"
                                        clickable
                                        href={getStorageUrl("assignment-files", attachment.file_path)}
                                        target="_blank"
                                        rel="noreferrer"
                                      />
                                    ))}
                                  </Stack>
                                )}
                              </Stack>

                              {step.allow_user_uploads ? (
                                <Typography variant="body2" color="text.secondary">
                                  Users will be able to upload screenshots or evidence on this step.
                                </Typography>
                              ) : (
                                <Typography variant="body2" color="text.secondary">
                                  User uploads are disabled for this step.
                                </Typography>
                              )}

                              {step.require_message_response ? (
                                <Typography variant="body2" color="text.secondary">
                                  Users will submit a text response on this step, which admins can review later.
                                </Typography>
                              ) : null}
                            </Stack>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </Stack>
                </Stack>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <Stack spacing={2}>
                  <Typography variant="h6" fontWeight={700}>
                    Assignment-level Files
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    These files are downloadable by users from the assignment page.
                  </Typography>
                  <Button component="label" variant="outlined" startIcon={<FileUploadOutlined />}>
                    {uploadingTarget === "assignment" ? "Uploading..." : "Upload files"}
                    <input hidden type="file" multiple onChange={(event) => void handleUploadAttachments(event.target.files)} />
                  </Button>
                  {assignmentLevelAttachments.length > 0 && (
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                      {assignmentLevelAttachments.map((attachment) => (
                        <Chip
                          key={attachment.clientId}
                          label={attachment.file_name}
                          onDelete={() => removeAttachment(attachment.clientId)}
                          component="a"
                          clickable
                          href={getStorageUrl("assignment-files", attachment.file_path)}
                          target="_blank"
                          rel="noreferrer"
                        />
                      ))}
                    </Stack>
                  )}
                </Stack>
              </CardContent>
            </Card>

            <Stack direction="row" justifyContent="flex-end" spacing={2}>
              <Button onClick={() => navigate(-1)}>Cancel</Button>
              <Button variant="contained" startIcon={<SaveOutlined />} onClick={handleSave} disabled={submitting}>
                {submitting ? "Saving..." : isEdit ? "Update Assignment" : "Create Assignment"}
              </Button>
            </Stack>
          </Stack>
        )}
      </Stack>
    </Container>
  );
};
