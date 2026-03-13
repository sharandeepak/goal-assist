-- Composite index covering queries that filter by status and sort by end_date.
-- Used by: getPageMilestoneSummary, getNextActiveMilestone, getUpcomingActiveMilestones,
--          getMilestonesEndingOnDate, subscribeToActiveMilestonesProgress
CREATE INDEX IF NOT EXISTS idx_milestones_workspace_user_status_end_date
  ON public.milestones(workspace_id, user_id, status, end_date);
