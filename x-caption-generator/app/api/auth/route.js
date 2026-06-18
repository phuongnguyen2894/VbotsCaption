import { getDailyPasscode } from '../../lib/passcode.js';

export async function POST(request) {
  const { passcode } = await request.json();
  if (passcode === getDailyPasscode()) return Response.json({ ok: true });
  return Response.json({ error: 'Invalid passcode' }, { status: 401 });
}
