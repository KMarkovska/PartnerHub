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
  let fundingTotalsIncomplete = false;
  for (const application of fundingApplications) {
    const currency = application.program?.currency;
    if (!currency) {
      fundingTotalsIncomplete = true;
      continue;
    }

    const totals = fundingTotals.get(currency) ?? { requested: 0, approved: 0 };
    const requestedAmount = Number(application.requested_amount);
    if (!Number.isFinite(requestedAmount)) {
      throw new Error('An application has an invalid requested amount.');
    }
    totals.requested += requestedAmount;

    if (application.status === 'Approved') {
      const approvedAmount = application.approved_amount === null
        ? requestedAmount
        : Number(application.approved_amount);
      if (!Number.isFinite(approvedAmount)) {
        throw new Error('An approved application has an invalid approved amount.');
      }
      totals.approved += approvedAmount;
    }
    fundingTotals.set(currency, totals);
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
  };
}

async function getFundingApplications(totalCount) {
  const pageSize = 500;
  const applications = [];
  for (let offset = 0; offset < totalCount; offset += pageSize) {
    const { data, error } = await supabase
      .from('applications')
      .select('requested_amount, approved_amount, status, program:funding_programs(currency)')
      .range(offset, offset + pageSize - 1);
    if (error) throw error;
    applications.push(...(data ?? []));
  }
  return applications;
}

function getLocalDateString() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
