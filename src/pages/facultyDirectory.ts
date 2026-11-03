export interface FacultyBranch {
  id: string;
  name: string;
}

export function facultyList(payload: any, key: string): any[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.[key])) return payload.data[key];
  if (Array.isArray(payload?.[key])) return payload[key];
  throw new Error(`Invalid ${key} response from server.`);
}

export async function loadFacultyDirectory(
  baseUrl: string,
  branches: FacultyBranch[],
  query: string,
  signal?: AbortSignal,
  request: typeof fetch = fetch
) {
  const results = await Promise.all(branches.map(async branch => {
    const teachers: any[] = [];
    const cursors = new Set<string>();
    let cursor = '';
    do {
      const params = new URLSearchParams(query ? { q: query } : { limit: '100' });
      if (cursor) params.set('cursor', cursor);
      const response = await request(
        `${baseUrl}/api/branch/${branch.id}/teachers${query ? '/search' : ''}?${params}`,
        { signal }
      );
      if (!response.ok) {
        throw new Error(response.status === 403
          ? `Access to the faculty directory for ${branch.name} was denied (403). Your administrator must check the API permissions for your account.`
          : `Unable to load faculty for ${branch.name} (${response.status}).`);
      }
      const payload = await response.json();
      teachers.push(...facultyList(payload, 'teachers'));
      const meta = payload.meta || payload.data?.meta;
      cursor = !query && meta?.hasNextPage && meta.nextCursor ? String(meta.nextCursor) : '';
      if (cursor && cursors.has(cursor)) throw new Error('The faculty API returned a repeated pagination cursor.');
      if (cursor) cursors.add(cursor);
    } while (cursor);

    return Promise.all(teachers.map(async teacher => {
      const item = { ...teacher, branch_id: branch.id, branchName: branch.name };
      try {
        const response = await request(`${baseUrl}/api/teachers/${teacher.id}/subjects`, { signal });
        if (!response.ok) throw new Error(`Unable to load subjects (${response.status}).`);
        return { ...item, subjects: facultyList(await response.json(), 'subjects'), subjectsError: false };
      } catch (error) {
        if (signal?.aborted) throw error;
        return { ...item, subjects: [], subjectsError: true };
      }
    }));
  }));
  return Array.from(new Map(results.flat().map(teacher => [String(teacher.id), teacher])).values());
}