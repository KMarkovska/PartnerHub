import { supabase } from '../config/supabase.js';

export async function getDashboardOverview() {
  const today = getLocalDateString();
  const [
    applicationsCount,
    pendingApplicationsCount,
    activeProjectsCount,
    recentApplications,
    upcomingDeadlines,
  ] = await Promise.all([
    supabase.from('applications').select('id', { count: 'exact', head: true }),
    supabase.from('applications')
      .select('id', { count: 'exact', head: true })
      .in('status', ['Submitted', 'Under Review']),
    supabase.from('projects')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'In Progress'),
    supabase.from('applications')
      .select(`
        id,
        title,
        requested_amount,
        status,
        created_at,
        customer:customers(name),
        program:funding_programs(name, currency)
      `)
      .order('created_at', { ascending: false })
      .limit(5),
    supabase.from('applications')
      .select(`
        id,
        title,
        deadline,
        status,
        customer:customers(name)
      `)
      .in('status', ['Draft', 'Submitted', 'Under Review'])
      .gte('deadline', today)
      .order('deadline', { ascending: true })
      .limit(5),
  ]);

  for (const result of [
    applicationsCount,
    pendingApplicationsCount,
    activeProjectsCount,
    recentApplications,
    upcomingDeadlines,
  ]) {
    if (result.error) throw result.error;
  }

  if (
    applicationsCount.count === null
    || pendingApplicationsCount.count === null
    || activeProjectsCount.count === null
  ) {
    throw new Error('The dashboard could not retrieve one or more workspace totals.');
  }

  const fundingApplications = await getFundingApplications(applicationsCount.count);
  const fundingTotals = new Map();
  const fundingTrends = new Map();
  let fundingTotalsIncomplete = false;
  for (const application of fundingApplications) {
    const currency = application.program?.currency;
    const createdAt = new Date(application.created_at);
    if (Number.isNaN(createdAt.getTime())) {
      throw new Error('An application has an invalid creation date.');
    }

    const requestedAmount = Number(application.requested_amount);
    if (!Number.isFinite(requestedAmount)) {
      throw new Error('An application has an invalid requested amount.');
    }

    const isApproved = application.status === 'Approved';
    const approvedAmount = isApproved
      ? application.approved_amount === null
        ? requestedAmount
        : Number(application.approved_amount)
      : 0;
    if (!Number.isFinite(approvedAmount)) {
      throw new Error('An approved application has an invalid approved amount.');
    }

    if (!currency) {
      fundingTotalsIncomplete = true;
      continue;
    }

    const totals = fundingTotals.get(currency) ?? { requested: 0, approved: 0 };
    totals.requested += requestedAmount;
    totals.approved += approvedAmount;
    fundingTotals.set(currency, totals);

    const trend = fundingTrends.get(currency) ?? {
      monthly: new Map(),
      yearly: new Map(),
    };
    const month = `${createdAt.getUTCFullYear()}-${String(createdAt.getUTCMonth() + 1).padStart(2, '0')}`;
    const year = String(createdAt.getUTCFullYear());
    addFundingTrend(trend.monthly, month, requestedAmount, approvedAmount, isApproved);
    addFundingTrend(trend.yearly, year, requestedAmount, approvedAmount, isApproved);
    fundingTrends.set(currency, trend);
  }

  return {
    totalApplications: applicationsCount.count,
    pendingApplications: pendingApplicationsCount.count,
    activeProjects: activeProjectsCount.count,
    recentApplications: recentApplications.data ?? [],
    upcomingDeadlines: upcomingDeadlines.data ?? [],
    fundingTotalsIncomplete,
    fundingTotals: [...fundingTotals.entries()]
      .map(([currency, totals]) => ({ currency, ...totals }))
      .sort((left, right) => left.currency.localeCompare(right.currency)),
    fundingTrends: [...fundingTrends.entries()]
      .map(([currency, trend]) => ({
        currency,
        monthly: serializeFundingTrend(trend.monthly),
        yearly: serializeFundingTrend(trend.yearly),
      }))
      .sort((left, right) => left.currency.localeCompare(right.currency)),
  };
}

export async function getProjectCalendarEvents(startDate, endDate) {
  const [projectStarts, projectEnds, milestones] = await Promise.all([
    supabase
      .from('projects')
      .select('id, name, status, start_date')
      .gte('start_date', startDate)
      .lte('start_date', endDate),
    supabase
      .from('projects')
      .select('id, name, status, end_date')
      .gte('end_date', startDate)
      .lte('end_date', endDate),
    supabase
      .from('milestones')
      .select('id, project_id, title, status, due_date, project:projects(name)')
      .gte('due_date', startDate)
      .lte('due_date', endDate),
  ]);

  for (const result of [projectStarts, projectEnds, milestones]) {
    if (result.error) throw result.error;
  }

  return [
    ...(projectStarts.data ?? []).map((project) => ({
      id: `start-${project.id}`,
      projectId: project.id,
      date: project.start_date,
      title: project.name,
      detail: 'Project kickoff',
      status: project.status,
      type: 'start',
    })),
    ...(projectEnds.data ?? []).map((project) => ({
      id: `end-${project.id}`,
      projectId: project.id,
      date: project.end_date,
      title: project.name,
      detail: 'Target completion',
      status: project.status,
      type: 'end',
    })),
    ...(milestones.data ?? []).map((milestone) => ({
      id: `milestone-${milestone.id}`,
      projectId: milestone.project_id,
      date: milestone.due_date,
      title: milestone.title,
      detail: milestone.project?.name ?? 'Project milestone',
      status: milestone.status,
      type: 'milestone',
    })),
  ].sort((left, right) => left.date.localeCompare(right.date) || left.title.localeCompare(right.title));
}

async function getFundingApplications(totalCount) {
  const pageSize = 500;
  const applications = [];
  for (let offset = 0; offset < totalCount; offset += pageSize) {
    const { data, error } = await supabase
      .from('applications')
      .select('requested_amount, approved_amount, status, created_at, program:funding_programs(currency)')
      .range(offset, offset + pageSize - 1);
    if (error) throw error;
    applications.push(...(data ?? []));
  }
  return applications;
}

function addFundingTrend(periods, period, requestedAmount, approvedAmount, isApproved) {
  const totals = periods.get(period) ?? {
    requested: 0,
    approved: 0,
    applications: 0,
    approvedApplications: 0,
  };
  totals.requested += requestedAmount;
  totals.approved += approvedAmount;
  totals.applications += 1;
  if (isApproved) totals.approvedApplications += 1;
  periods.set(period, totals);
}

function serializeFundingTrend(periods) {
  return [...periods.entries()]
    .map(([period, totals]) => ({ period, ...totals }))
    .sort((left, right) => left.period.localeCompare(right.period));
}

function getLocalDateString() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
