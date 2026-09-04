import { runAutoPending } from '../route.js';
import { kvGet, kvSet } from '../../../lib/kv.js';

const SCHEDULE_KEY = 'x-schedule';
const CONFIG_KEY = 'xgen-config-v1';

// Called hourly by Vercel Cron. Only executes when a scheduled datetime is configured and due.
export async function GET(request) {
  const auth = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && auth !== `Bearer ${cronSecret}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const schedule = await kvGet(SCHEDULE_KEY);
  if (!schedule?.scheduledAt) {
    return Response.json({ skipped: 'No schedule set' });
  }

  const now = Date.now();
  const due = new Date(schedule.scheduledAt).getTime();

  if (now < due) {
    return Response.json({ skipped: 'Not time yet', scheduledAt: schedule.scheduledAt });
  }

  // Don't re-run if already ran for this scheduled datetime
  if (schedule.lastRunAt && new Date(schedule.lastRunAt) >= new Date(schedule.scheduledAt)) {
    return Response.json({ skipped: 'Already ran for this schedule', lastRunAt: schedule.lastRunAt });
  }

  const host = request.headers.get('host') || 'vbots-caption.vercel.app';
  const result = await runAutoPending(`https://${host}`);

  await kvSet(SCHEDULE_KEY, { ...schedule, lastRunAt: new Date().toISOString() });
  return Response.json(result);
}
