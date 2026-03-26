import { useMemo } from "react";
import { useList, useOne } from "@refinedev/core";
import { useNavigate, useParams } from "react-router";
import {
  alpha,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  Divider,
  Stack,
  Typography,
  useTheme,
} from "@mui/material";
import EditOutlined from "@mui/icons-material/EditOutlined";
import ArrowBackOutlined from "@mui/icons-material/ArrowBackOutlined";
import PauseCircleOutlineOutlined from "@mui/icons-material/PauseCircleOutlineOutlined";
import PlayCircleOutlineOutlined from "@mui/icons-material/PlayCircleOutlineOutlined";
import { useNotification } from "@refinedev/core";
import { taruviDataProvider } from "../../providers/refineProviders";
import type {
  AppUser,
  Assignment,
  AssignmentAssignee,
  AssignmentGroup,
  AssignmentGroupMember,
} from "../../features/assignments/types";
import { formatDateTime, formatUserLabel } from "../../features/assignments/utils";

export const AssignmentGroupShow = () => {
  const params = useParams();
  const groupId = params.id ?? "";
  const navigate = useNavigate();
  const theme = useTheme();
  const notificationProvider = useNotification();
  const open = notificationProvider.open;

  const groupQuery = useOne<AssignmentGroup>({ resource: "assignment_groups", id: groupId });
  const memberQuery = useList<AssignmentGroupMember>({
    resource: "assignment_group_members",
    filters: [{ field: "group_id", operator: "eq", value: groupId }],
    pagination: { mode: "off" },
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
  const assigneesQuery = useList<AssignmentAssignee>({
    resource: "assignment_assignees",
    filters: [{ field: "group_id", operator: "eq", value: groupId }],
    pagination: { mode: "off" },
  });
  const assignmentsQuery = useList<Assignment>({
    resource: "assignments",
    pagination: { mode: "off" },
    sorters: [{ field: "updated_at", order: "desc" }],
  });

  const members = memberQuery.result?.data ?? [];
  const users = usersQuery.result?.data ?? [];
  const assignees = assigneesQuery.result?.data ?? [];
  const assignments = assignmentsQuery.result?.data ?? [];

  const membersWithUsers = useMemo(
    () =>
      members.map((member) => ({
        member,
        user: users.find((user) => user.id === member.user_id),
      })),
    [members, users],
  );

  const targetedAssignments = useMemo(() => {
    const assignmentIds = new Set(assignees.map((assignee) => assignee.assignment_id));
    return assignments.filter((assignment) => assignmentIds.has(assignment.id));
  }, [assignees, assignments]);

  const loading = Boolean(
    groupQuery.query?.isLoading ||
      memberQuery.query?.isLoading ||
      usersQuery.query?.isLoading ||
      assigneesQuery.query?.isLoading ||
      assignmentsQuery.query?.isLoading,
  );

  const toggleActive = async () => {
    if (groupQuery.result == null) return;

    try {
      await taruviDataProvider.update({
        resource: "assignment_groups",
        id: groupId,
        variables: {
          is_active: !groupQuery.result.is_active,
          updated_at: new Date().toISOString(),
        },
      });
      await groupQuery.query?.refetch?.();
      if (open) {
        open({
          type: "success",
          message: groupQuery.result.is_active ? "Group deactivated" : "Group activated",
          description: `${groupQuery.result.name} is now ${groupQuery.result.is_active ? "inactive" : "active"}.`,
        });
      }
    } catch (toggleError) {
      console.error(toggleError);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Stack spacing={3}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
          <Button startIcon={<ArrowBackOutlined />} onClick={() => navigate(-1)}>
            Back
          </Button>
          <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
            <Button
              startIcon={groupQuery.result?.is_active ? <PauseCircleOutlineOutlined /> : <PlayCircleOutlineOutlined />}
              onClick={() => void toggleActive()}
            >
              {groupQuery.result?.is_active ? "Deactivate" : "Activate"}
            </Button>
            <Button variant="contained" startIcon={<EditOutlined />} onClick={() => navigate(`/assignment-groups/edit/${groupId}`)}>
              Edit Group
            </Button>
          </Stack>
        </Stack>

        {loading || groupQuery.result == null ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Stack spacing={3}>
            <Card>
              <CardContent>
                <Stack spacing={2}>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={2}>
                    <Box>
                      <Typography variant="overline" color="primary">
                        Team Profile
                      </Typography>
                      <Typography variant="h4" fontWeight={700}>
                        {groupQuery.result.name}
                      </Typography>
                      <Typography color="text.secondary">
                        {groupQuery.result.description || "No description provided."}
                      </Typography>
                    </Box>
                    <Chip label={groupQuery.result.is_active ? "Active" : "Inactive"} color={groupQuery.result.is_active ? "success" : "default"} />
                  </Stack>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    <Chip label={`${members.length} members`} variant="outlined" />
                    <Chip label={`${targetedAssignments.length} assignments`} variant="outlined" />
                    <Chip label={groupQuery.result.is_active ? "Ready for rollout" : "Paused"} sx={{ bgcolor: alpha(theme.palette.primary.main, 0.12) }} />
                  </Stack>
                </Stack>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <Typography variant="h6" fontWeight={700} gutterBottom>
                  Members
                </Typography>
                <Stack divider={<Divider flexItem />}>
                  {membersWithUsers.length === 0 ? (
                    <Typography color="text.secondary">No members in this group yet.</Typography>
                  ) : (
                    membersWithUsers.map(({ member, user }) => (
                      <Box key={member.id} sx={{ py: 2 }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center" gap={2}>
                          <Box>
                            <Typography fontWeight={600}>{user ? formatUserLabel(user) : "Unknown user"}</Typography>
                            <Typography variant="body2" color="text.secondary">
                              Added {formatDateTime(member.created_at)}
                            </Typography>
                          </Box>
                          <Chip label={member.member_role === "lead" ? "Lead" : "Member"} color={member.member_role === "lead" ? "primary" : "default"} size="small" />
                        </Stack>
                      </Box>
                    ))
                  )}
                </Stack>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <Typography variant="h6" fontWeight={700} gutterBottom>
                  Assignments targeting this group
                </Typography>
                <Stack divider={<Divider flexItem />}>
                  {targetedAssignments.length === 0 ? (
                    <Typography color="text.secondary">This group has not been assigned any work yet.</Typography>
                  ) : (
                    targetedAssignments.map((assignment) => (
                      <Box key={assignment.id} sx={{ py: 2 }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center" gap={2}>
                          <Box>
                            <Typography fontWeight={600}>{assignment.title}</Typography>
                            <Typography variant="body2" color="text.secondary">
                              {assignment.summary || assignment.instructions || "No summary provided."}
                            </Typography>
                          </Box>
                          <Button onClick={() => navigate(`/assignments/show/${assignment.id}`)}>Open Assignment</Button>
                        </Stack>
                      </Box>
                    ))
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
