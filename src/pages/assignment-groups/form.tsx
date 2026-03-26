import { useEffect, useMemo, useState } from "react";
import { useList, useNotification, useOne } from "@refinedev/core";
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
  FormControlLabel,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import SaveOutlined from "@mui/icons-material/SaveOutlined";
import ArrowBackOutlined from "@mui/icons-material/ArrowBackOutlined";
import { taruviDataProvider } from "../../providers/refineProviders";
import type { AppUser, AssignmentGroup, AssignmentGroupMember } from "../../features/assignments/types";
import { formatUserLabel } from "../../features/assignments/utils";

interface AssignmentGroupFormProps {
  mode: "create" | "edit";
}

export const AssignmentGroupForm = ({ mode }: AssignmentGroupFormProps) => {
  const params = useParams();
  const groupIdFromRoute = params.id;
  const navigate = useNavigate();
  const notificationProvider = useNotification();
  const open = notificationProvider.open;
  const isEdit = mode === "edit";
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [selectedUsers, setSelectedUsers] = useState<AppUser[]>([]);
  const [leadUserId, setLeadUserId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const groupQuery = useOne<AssignmentGroup>({
    resource: "assignment_groups",
    id: groupIdFromRoute ?? "",
    queryOptions: { enabled: isEdit && Boolean(groupIdFromRoute) },
  });

  const membersQuery = useList<AssignmentGroupMember>({
    resource: "assignment_group_members",
    filters: [{ field: "group_id", operator: "eq", value: groupIdFromRoute }],
    pagination: { mode: "off" },
    queryOptions: { enabled: isEdit && Boolean(groupIdFromRoute) },
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

  const users = usersQuery.result?.data ?? [];
  const memberRecords = membersQuery.result?.data ?? [];

  useEffect(() => {
    if (groupQuery.result == null) return;

    setName(groupQuery.result.name ?? "");
    setDescription(groupQuery.result.description ?? "");
    setIsActive(groupQuery.result.is_active ?? true);
  }, [groupQuery.result]);

  useEffect(() => {
    if (users.length === 0) {
      setSelectedUsers([]);
      setLeadUserId(null);
      return;
    }

    const nextSelected = users.filter((user) => memberRecords.some((member) => member.user_id === user.id));
    setSelectedUsers(nextSelected);

    const lead = memberRecords.find((member) => member.member_role === "lead");
    setLeadUserId(lead?.user_id ?? null);
  }, [users, memberRecords]);

  const selectedUserIds = useMemo(() => selectedUsers.map((user) => user.id), [selectedUsers]);

  const handleSave = async () => {
    if (!name.trim()) {
      setError("Group name is required.");
      return;
    }

    setSubmitting(true);
    setError(null);

    const groupId = isEdit && groupIdFromRoute ? groupIdFromRoute : crypto.randomUUID();
    const now = new Date().toISOString();

    try {
      if (isEdit) {
        await taruviDataProvider.update({
          resource: "assignment_groups",
          id: groupId,
          variables: {
            name: name.trim(),
            description: description.trim(),
            is_active: isActive,
            updated_at: now,
          },
        });
      } else {
        await taruviDataProvider.create({
          resource: "assignment_groups",
          variables: {
            id: groupId,
            name: name.trim(),
            description: description.trim(),
            is_active: isActive,
            created_at: now,
            updated_at: now,
          },
        });
      }

      if (memberRecords.length > 0) {
        await taruviDataProvider.deleteMany({
          resource: "assignment_group_members",
          ids: memberRecords.map((member) => member.id),
        });
      }

      if (selectedUsers.length > 0) {
        await taruviDataProvider.createMany({
          resource: "assignment_group_members",
          variables: selectedUsers.map((user) => ({
            id: crypto.randomUUID(),
            group_id: groupId,
            user_id: user.id,
            member_role: leadUserId === user.id ? "lead" : "member",
            created_at: now,
          })),
        });
      }

      if (open) {
        open({
          type: "success",
          message: isEdit ? "Group updated" : "Group created",
          description: name.trim() + " is ready to receive assignments.",
        });
      }
      navigate("/assignment-groups/show/" + groupId);
    } catch (saveError) {
      console.error(saveError);
      setError("Unable to save the group right now.");
    } finally {
      setSubmitting(false);
    }
  };

  const loading = Boolean(groupQuery.query?.isLoading || membersQuery.query?.isLoading || usersQuery.query?.isLoading);

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Stack spacing={3}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
          <Box>
            <Typography variant="h4" fontWeight={700}>
              {isEdit ? "Edit Assignment Group" : "Create Assignment Group"}
            </Typography>
            <Typography color="text.secondary">
              Build reusable teams so admins can assign the same flow to multiple users.
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
          <Card>
            <CardContent>
              <Stack spacing={3}>
                {error && <Alert severity="error">{error}</Alert>}

                <TextField
                  label="Group Name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  fullWidth
                  required
                />

                <TextField
                  label="Description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  fullWidth
                  multiline
                  minRows={3}
                />

                <FormControlLabel
                  control={<Switch checked={isActive} onChange={(event) => setIsActive(event.target.checked)} />}
                  label="Active group"
                />

                <Autocomplete
                  multiple
                  options={users}
                  value={selectedUsers}
                  onChange={(_, nextValue) => {
                    setSelectedUsers(nextValue);
                    if (leadUserId && !nextValue.some((user) => user.id === leadUserId)) {
                      setLeadUserId(null);
                    }
                  }}
                  getOptionLabel={formatUserLabel}
                  isOptionEqualToValue={(option, value) => option.id === value.id}
                  renderTags={(value, getTagProps) =>
                    value.map((option, index) => (
                      <Chip
                        {...getTagProps({ index })}
                        key={option.id}
                        label={formatUserLabel(option)}
                        color={leadUserId === option.id ? "primary" : "default"}
                      />
                    ))
                  }
                  renderInput={(params) => <TextField {...params} label="Members" placeholder="Select users" />}
                />

                <Autocomplete
                  options={selectedUsers}
                  value={selectedUsers.find((user) => user.id === leadUserId) ?? null}
                  onChange={(_, value) => setLeadUserId(value?.id ?? null)}
                  getOptionLabel={formatUserLabel}
                  isOptionEqualToValue={(option, value) => option.id === value.id}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Group Lead"
                      helperText={selectedUserIds.length > 0 ? "Optional. The lead is highlighted in the group." : "Select members first."}
                    />
                  )}
                  disabled={selectedUsers.length === 0}
                />

                <Stack direction="row" justifyContent="flex-end">
                  <Button variant="contained" startIcon={<SaveOutlined />} onClick={handleSave} disabled={submitting}>
                    {submitting ? "Saving..." : isEdit ? "Update Group" : "Create Group"}
                  </Button>
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        )}
      </Stack>
    </Container>
  );
};
