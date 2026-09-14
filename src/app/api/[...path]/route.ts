import { createApi } from '../../../server/web/api.js';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;
const handle = createApi();
async function route(request: Request, context: { params: Promise<{ path: string[] }> }) {
  return handle(request, (await context.params).path);
}
export { route as GET, route as POST, route as PUT, route as PATCH, route as DELETE };
