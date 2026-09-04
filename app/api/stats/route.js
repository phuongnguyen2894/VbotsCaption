import { kvGet } from '../../lib/kv.js';
import { getDailyPasscode } from '../../lib/passcode.js';
import { hanoiDateString } from '../../lib/timezone.js';

function normTopic(t) {
  if (!t || typeof t === 'number') return { captions: t || 0, users: [] };
  return t;
}

export async function POST(request) {
  const { passcode } = await request.json();
  if (passcode !== getDailyPasscode()) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Vietnam has no DST, so subtracting whole days in ms and formatting each in Hanoi
  // time always lands on the right calendar day.
  const days = [];
  for (let i = 0; i < 7; i++) {
    days.push(hanoiDateString(new Date(Date.now() - i * 86400000)));
  }

  const [allUsers, allTopicsRaw, ...dayDataArr] = await Promise.all([
    kvGet('stats:all-users'),
    kvGet('stats:topics'),
    ...days.map(d => kvGet(`stats:day:${d}`)),
  ]);

  const allTopicsRaw2 = allTopicsRaw || {};
  const topicsAllTime = Object.fromEntries(
    Object.entries(allTopicsRaw2).map(([label, v]) => {
      const t = normTopic(v);
      return [label, { captions: t.captions, users: t.users.length, lastAt: t.lastAt || null }];
    })
  );

  return Response.json({
    totalUsers: (allUsers || []).length,
    topicsAllTime,
    days: days.map((date, i) => {
      const raw = dayDataArr[i]?.topics || {};
      const topics = Object.fromEntries(
        Object.entries(raw).map(([label, v]) => {
          const t = normTopic(v);
          return [label, { captions: t.captions, users: t.users.length }];
        })
      );
      return {
        date,
        captions: dayDataArr[i]?.captions || 0,
        users: dayDataArr[i]?.users?.length || 0,
        topics,
      };
    }),
  });
}
