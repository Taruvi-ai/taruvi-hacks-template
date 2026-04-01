import { useMemo } from "react";
import { useGetIdentity, useList } from "@refinedev/core";
import { useNavigate } from "react-router";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  Grid,
  Stack,
  Typography,
  useTheme,
} from "@mui/material";
import AssignmentOutlined from "@mui/icons-material/AssignmentOutlined";
import AddOutlined from "@mui/icons-material/AddOutlined";
import ArrowForwardOutlined from "@mui/icons-material/ArrowForwardOutlined";
import type { TaruviUser } from "../../providers/refineProviders";
import type { Assignment, AssignmentAssignee, AssignmentGroupMember, AssignmentStep } from "../../features/assignments/types";
import { formatDateTime } from "../../features/assignments/utils";
import { canManageAssignments } from "../../features/assignments/access";

export const AssignmentList = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const { data: identity } = useGetIdentity<TaruviUser>();
  const canAdmin = canManageAssignments(identity);
  const assignmentsQuery = useList<Assignment>({
    resource: "assignments",
    filters: canAdmin ? [] : [{ field: "status", operator: "eq", value: "published" }],
    pagination: { mode: "off" },
    sorters: [{ field: "updated_at", order: "desc" }],
  });
  const stepsQuery = useList<AssignmentStep>({
    resource: "assignment_steps",
    pagination: { mode: "off" },
  });
  const assigneesQuery = useList<AssignmentAssignee>({
    resource: "assignment_assignees",
    pagination: { mode: "off" },
  });
  const groupMembersQuery = useList<AssignmentGroupMember>({
    resource: "assignment_group_members",
    pagination: { mode: "off" },
    queryOptions: { enabled: !canAdmin },
  });

  const allAssignments = assignmentsQuery.result?.data ?? [];
  const steps = stepsQuery.result?.data ?? [];
  const assignees = assigneesQuery.result?.data ?? [];
  const groupMembers = groupMembersQuery.result?.data ?? [];

  // Non-admins only see assignments they are assigned to (directly or via group)
  const assignments = useMemo(() => {
    if (canAdmin) return allAssignments;
    if (!identity?.id) return [];

    const myGroupIds = new Set(
      groupMembers
        .filter((gm) => gm.user_id === identity.id)
        .map((gm) => gm.group_id),
    );

    const myAssignmentIds = new Set(
      assignees
        .filter(
          (a) =>
            (a.assignee_type === "user" && a.user_id === identity.id) ||
            (a.assignee_type === "group" && a.group_id && myGroupIds.has(a.group_id)),
        )
        .map((a) => a.assignment_id),
    );

    return allAssignments.filter((a) => myAssignmentIds.has(a.id));
  }, [allAssignments, assignees, groupMembers, identity?.id, canAdmin]);

  const stepCountByAssignment = useMemo(() => {
    const counts: Record<string, number> = {};
    steps.forEach((step) => {
      counts[step.assignment_id] = (counts[step.assignment_id] ?? 0) + 1;
    });
    return counts;
  }, [steps]);

  const assigneeCountByAssignment = useMemo(() => {
    const counts: Record<string, number> = {};
    assignees.forEach((assignee) => {
      counts[assignee.assignment_id] = (counts[assignee.assignment_id] ?? 0) + 1;
    });
    return counts;
  }, [assignees]);

  const loading = Boolean(assignmentsQuery.query?.isLoading || stepsQuery.query?.isLoading || assigneesQuery.query?.isLoading || (!canAdmin && groupMembersQuery.query?.isLoading));

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Stack spacing={3}>
        <Card
          sx={{
            background: `linear-gradient(135deg, ${theme.palette.secondary.main} 0%, ${theme.palette.primary.main} 100%)`,
            color: "#fff",
          }}
        >
          <CardContent>
            <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
              <Box>
                <Typography variant="overline" sx={{ color: "rgba(255,255,255,0.72)" }}>
                  Live Assignment Board
                </Typography>
                <Typography variant="h3" fontWeight={700}>
                  Assignments
                </Typography>
                <Typography sx={{ color: "rgba(255,255,255,0.82)", maxWidth: 720 }}>
                  Structured workstreams with status, deadlines, downloads, and guided progress through each step.
                </Typography>
              </Box>
              {canAdmin ? (
                <Button
                  variant="contained"
                  startIcon={<AddOutlined />}
                  onClick={() => navigate("/assignments/create")}
                  sx={{ bgcolor: "rgba(255,255,255,0.95)", color: theme.palette.secondary.dark, "&:hover": { bgcolor: "#fff" } }}
                >
                  New Assignment
                </Button>
              ) : null}
            </Stack>
          </CardContent>
        </Card>

        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
            <CircularProgress />
          </Box>
        ) : assignments.length === 0 ? (
          <Card>
            <CardContent sx={{ py: 8, textAlign: "center" }}>
              <AssignmentOutlined sx={{ fontSize: 56, color: "text.secondary", mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                No assignments yet
              </Typography>
              <Typography color="text.secondary" sx={{ mb: 3 }}>
                Create your first step-by-step assignment and attach the context participants need.
              </Typography>
              {canAdmin ? (
                <Button variant="contained" onClick={() => navigate("/assignments/create")}>
                  Create First Assignment
                </Button>
              ) : null}
            </CardContent>
          </Card>
        ) : (
          <Grid container spacing={3}>
            {assignments.map((assignment) => (
              <Grid key={assignment.id} size={{ xs: 12, md: 6 }}>
                <Card sx={{ height: "100%" }}>
                  <CardContent sx={{ height: "100%" }}>
                    <Stack spacing={2} sx={{ height: "100%" }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={2}>
                        <Box>
                          <Typography variant="h6" fontWeight={700}>
                            {assignment.title}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {assignment.summary || assignment.instructions || "No summary provided."}
                          </Typography>
                        </Box>
                        <Stack direction="row" spacing={1}>
                          <Chip label={assignment.status} color={assignment.status === "published" ? "success" : "default"} size="small" />
                          <Chip label={assignment.priority} variant="outlined" size="small" />
                        </Stack>
                      </Stack>

                      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                        <Chip label={`${stepCountByAssignment[assignment.id] ?? 0} steps`} variant="outlined" />
                        <Chip label={`${assigneeCountByAssignment[assignment.id] ?? 0} assignees`} variant="outlined" />
                        <Chip label={`Due ${formatDateTime(assignment.due_at)}`} variant="outlined" />
                      </Stack>

                      <Box sx={{ mt: "auto" }}>
                        <Button
                          endIcon={<ArrowForwardOutlined />}
                          onClick={() => navigate(`/assignments/show/${assignment.id}`)}
                          sx={{ alignSelf: "flex-start" }}
                        >
                          Open Assignment
                        </Button>
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Stack>
    </Container>
  );
};
