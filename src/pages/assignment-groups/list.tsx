import { useMemo } from "react";
import { useList } from "@refinedev/core";
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
import GroupsOutlined from "@mui/icons-material/GroupsOutlined";
import AddOutlined from "@mui/icons-material/AddOutlined";
import ArrowForwardOutlined from "@mui/icons-material/ArrowForwardOutlined";
import type { AssignmentGroup, AssignmentGroupMember } from "../../features/assignments/types";

export const AssignmentGroupList = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const groupsQuery = useList<AssignmentGroup>({
    resource: "assignment_groups",
    pagination: { mode: "off" },
    sorters: [{ field: "name", order: "asc" }],
  });
  const membersQuery = useList<AssignmentGroupMember>({
    resource: "assignment_group_members",
    pagination: { mode: "off" },
  });

  const groups = groupsQuery.result?.data ?? [];
  const members = membersQuery.result?.data ?? [];

  const memberCountByGroup = useMemo(() => {
    const counts: Record<string, number> = {};
    members.forEach((member) => {
      counts[member.group_id] = (counts[member.group_id] ?? 0) + 1;
    });
    return counts;
  }, [members]);

  const loading = Boolean(groupsQuery.query?.isLoading || membersQuery.query?.isLoading);

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Stack spacing={3}>
        <Card
          sx={{
            background: `linear-gradient(135deg, ${theme.palette.info.main} 0%, ${theme.palette.secondary.main} 100%)`,
            color: "#fff",
          }}
        >
          <CardContent>
            <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
              <Box>
                <Typography variant="overline" sx={{ color: "rgba(255,255,255,0.72)" }}>
                  Team Routing Layer
                </Typography>
                <Typography variant="h3" fontWeight={700}>
                  Assignment Groups
                </Typography>
                <Typography sx={{ color: "rgba(255,255,255,0.82)", maxWidth: 700 }}>
                  Build reusable squads so assignments can be launched across teams without repetitive user-by-user setup.
                </Typography>
              </Box>
              <Button
                variant="contained"
                startIcon={<AddOutlined />}
                onClick={() => navigate("/assignment-groups/create")}
                sx={{ bgcolor: "rgba(255,255,255,0.95)", color: theme.palette.secondary.dark, "&:hover": { bgcolor: "#fff" } }}
              >
                New Group
              </Button>
            </Stack>
          </CardContent>
        </Card>

        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
            <CircularProgress />
          </Box>
        ) : groups.length === 0 ? (
          <Card>
            <CardContent sx={{ py: 8, textAlign: "center" }}>
              <GroupsOutlined sx={{ fontSize: 56, color: "text.secondary", mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                No groups yet
              </Typography>
              <Typography color="text.secondary" sx={{ mb: 3 }}>
                Create your first group to start assigning stepwise hackathon tasks to teams.
              </Typography>
              <Button variant="contained" onClick={() => navigate("/assignment-groups/create")}>
                Create First Group
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Grid container spacing={3}>
            {groups.map((group) => (
              <Grid key={group.id} size={{ xs: 12, md: 6, xl: 4 }}>
                <Card sx={{ height: "100%" }}>
                  <CardContent sx={{ height: "100%" }}>
                    <Stack spacing={2} sx={{ height: "100%" }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={2}>
                        <Box>
                          <Typography variant="h6" fontWeight={700}>
                            {group.name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {group.description || "No description provided yet."}
                          </Typography>
                        </Box>
                        <Chip label={group.is_active ? "Active" : "Inactive"} color={group.is_active ? "success" : "default"} size="small" />
                      </Stack>

                      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                        <Chip label={`${memberCountByGroup[group.id] ?? 0} members`} variant="outlined" />
                      </Stack>

                      <Box sx={{ mt: "auto" }}>
                        <Button endIcon={<ArrowForwardOutlined />} onClick={() => navigate(`/assignment-groups/show/${group.id}`)}>
                          Open Group
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
