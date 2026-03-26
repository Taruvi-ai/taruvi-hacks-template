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
import GroupsOutlined from "@mui/icons-material/GroupsOutlined";
import TimerOutlined from "@mui/icons-material/TimerOutlined";
import AddOutlined from "@mui/icons-material/AddOutlined";
import type { TaruviUser } from "../../providers/refineProviders";
import type {
  Assignment,
  AssignmentAssignee,
  AssignmentGroup,
  AssignmentGroupMember,
  AssignmentStep,
} from "../../features/assignments/types";
import { formatDateTime } from "../../features/assignments/utils";
import { canManageAssignments } from "../../features/assignments/access";

const StatCard = ({ title, value, caption }: { title: string; value: string; caption: string }) => (
  <Card sx={{ height: "100%" }}>
    <CardContent>
      <Stack spacing={1}>
        <Typography variant="overline" color="text.secondary">
          {title}
        </Typography>
        <Typography variant="h3" fontWeight={700}>
          {value}
        </Typography>
        <Typography color="text.secondary">{caption}</Typography>
      </Stack>
    </CardContent>
  </Card>
);

export const Home = () => {
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
  const stepsQuery = useList<AssignmentStep>({ resource: "assignment_steps", pagination: { mode: "off" } });
  const groupsQuery = useList<AssignmentGroup>({ resource: "assignment_groups", pagination: { mode: "off" } });
  const assigneesQuery = useList<AssignmentAssignee>({ resource: "assignment_assignees", pagination: { mode: "off" } });
  const membershipsQuery = useList<AssignmentGroupMember>({
    resource: "assignment_group_members",
    filters: identity?.id ? [{ field: "user_id", operator: "eq", value: identity.id }] : [],
    pagination: { mode: "off" },
    queryOptions: { enabled: Boolean(identity?.id) },
  });

  const assignments = assignmentsQuery.result?.data ?? [];
  const steps = stepsQuery.result?.data ?? [];
  const groups = groupsQuery.result?.data ?? [];
  const assignees = assigneesQuery.result?.data ?? [];
  const memberships = membershipsQuery.result?.data ?? [];

  const assignmentIdsForUser = useMemo(() => {
    const groupIds = new Set(memberships.map((membership) => membership.group_id));
    return new Set(
      assignees
        .filter((assignee) => assignee.user_id === identity?.id || (assignee.group_id && groupIds.has(assignee.group_id)))
        .map((assignee) => assignee.assignment_id),
    );
  }, [assignees, identity?.id, memberships]);

  const myAssignments = assignments.filter((assignment) => assignmentIdsForUser.has(assignment.id));
  const dueSoonCount = assignments.filter((assignment) => {
    if (!assignment.due_at) return false;
    const due = new Date(assignment.due_at).getTime();
    const now = Date.now();
    const threeDays = 3 * 24 * 60 * 60 * 1000;
    return due >= now && due <= now + threeDays;
  }).length;

  const loading = Boolean(
    assignmentsQuery.query?.isLoading ||
      stepsQuery.query?.isLoading ||
      groupsQuery.query?.isLoading ||
      assigneesQuery.query?.isLoading ||
      membershipsQuery.query?.isLoading,
  );

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Stack spacing={3}>
        <Card
          sx={{
            position: "relative",
            overflow: "hidden",
            background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
            color: theme.palette.primary.contrastText,
          }}
        >
          <CardContent sx={{ position: "relative", zIndex: 1 }}>
            <Stack spacing={2}>
              <Typography variant="overline" sx={{ color: "rgba(255,255,255,0.76)" }}>
                Startup-Clean Command Center
              </Typography>
              <Typography variant="h2" fontWeight={800} sx={{ maxWidth: 760 }}>
                Hackathon Assignment Hub
              </Typography>
              <Typography sx={{ maxWidth: 760, color: "rgba(255,255,255,0.82)" }}>
                Run assignment flows, share step-level resources, and keep teams moving without the usual admin-panel blandness.
              </Typography>
              {canAdmin ? (
                <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap sx={{ pt: 1 }}>
                  <Button
                    variant="contained"
                    startIcon={<AddOutlined />}
                    onClick={() => navigate("/assignments/create")}
                    sx={{
                      bgcolor: "rgba(255,255,255,0.94)",
                      color: theme.palette.secondary.dark,
                      "&:hover": { bgcolor: "#ffffff" },
                    }}
                  >
                    New Assignment
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<GroupsOutlined />}
                    onClick={() => navigate("/assignment-groups/create")}
                    sx={{
                      color: "#fff",
                      borderColor: "rgba(255,255,255,0.4)",
                      "&:hover": { borderColor: "rgba(255,255,255,0.7)", bgcolor: "rgba(255,255,255,0.06)" },
                    }}
                  >
                    New Group
                  </Button>
                </Stack>
              ) : null}
            </Stack>
          </CardContent>
          <Box
            sx={{
              position: "absolute",
              inset: 0,
              background:
                "radial-gradient(circle at 20% 10%, rgba(255,255,255,0.18), transparent 28%), radial-gradient(circle at 80% 0%, rgba(255,255,255,0.14), transparent 24%)",
              pointerEvents: "none",
            }}
          />
        </Card>

        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 3 }}>
                <StatCard title="Assignments" value={String(assignments.length)} caption="All assignments in this app" />
              </Grid>
              <Grid size={{ xs: 12, md: 3 }}>
                <StatCard title="My Work" value={String(myAssignments.length)} caption="Assignments targeting you or your groups" />
              </Grid>
              <Grid size={{ xs: 12, md: 3 }}>
                <StatCard title="Groups" value={String(groups.length)} caption="Reusable teams for bulk assignment" />
              </Grid>
              <Grid size={{ xs: 12, md: 3 }}>
                <StatCard title="Due Soon" value={String(dueSoonCount)} caption="Assignments due within three days" />
              </Grid>
            </Grid>

            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 7 }}>
                <Card sx={{ height: "100%" }}>
                  <CardContent>
                    <Stack spacing={2}>
                      <Typography variant="h6" fontWeight={700}>
                        Recent assignments
                      </Typography>
                      {assignments.slice(0, 5).map((assignment) => {
                        const stepCount = steps.filter((step) => step.assignment_id === assignment.id).length;
                        return (
                          <Box
                            key={assignment.id}
                            sx={{
                              p: 2,
                              border: "1px solid",
                              borderColor: "divider",
                              borderRadius: 3,
                              cursor: "pointer",
                              background: "rgba(255,255,255,0.35)",
                              transition: "transform 0.18s ease, border-color 0.18s ease",
                              "&:hover": {
                                transform: "translateY(-2px)",
                                borderColor: "primary.main",
                              },
                            }}
                            onClick={() => navigate(`/assignments/show/${assignment.id}`)}
                          >
                            <Stack spacing={1}>
                              <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={2}>
                                <Box>
                                  <Typography fontWeight={700}>{assignment.title}</Typography>
                                  <Typography variant="body2" color="text.secondary">
                                    {assignment.summary || assignment.instructions || "No summary provided."}
                                  </Typography>
                                </Box>
                                <Chip label={assignment.status} size="small" color={assignment.status === "published" ? "success" : "default"} />
                              </Stack>
                              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                                <Chip label={`${stepCount} steps`} size="small" variant="outlined" />
                                <Chip label={`Due ${formatDateTime(assignment.due_at)}`} size="small" variant="outlined" />
                              </Stack>
                            </Stack>
                          </Box>
                        );
                      })}
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>

              <Grid size={{ xs: 12, md: 5 }}>
                <Card sx={{ height: "100%" }}>
                  <CardContent>
                    <Stack spacing={2}>
                      <Typography variant="h6" fontWeight={700}>
                        What makes it hackathon-ready
                      </Typography>
                      <Stack spacing={1.5}>
                        <Chip color="primary" icon={<AssignmentOutlined />} label="Ordered assignment flows with a guided step viewer" />
                        <Chip color="primary" icon={<GroupsOutlined />} label="Group-based distribution for whole teams" />
                        <Chip color="primary" icon={<TimerOutlined />} label="Step-level downloads, screenshots, and evidence uploads" />
                      </Stack>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </>
        )}
      </Stack>
    </Container>
  );
};
