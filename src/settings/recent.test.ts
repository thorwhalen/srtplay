import { createInMemoryProvider } from '@zodal/store';
import { describe, expect, it } from 'vitest';
import { RECENT_MAX, recentStore, type RecentFile } from './recent';

const store = () => recentStore(createInMemoryProvider<RecentFile>([], { idField: 'id' }));

describe('recent files', () => {
  it('remembers where a file stopped, and the same file opened again keeps it', async () => {
    const r = store();
    await r.opened('a.srt', 'text a');
    await r.progress('a.srt', 42_000, false);
    const again = await r.opened('a.srt', 'text a');
    expect(again.position).toBe(42_000);
  });
  it('played to the end: done, and the next open starts from the top', async () => {
    const r = store();
    await r.opened('a.srt', 'x');
    await r.progress('a.srt', 99_000, true);
    const [a] = await r.all();
    expect(a).toMatchObject({ done: true, position: 0 });
  });
  it('a different file under the same name starts fresh; the list keeps the newest few', async () => {
    const r = store();
    await r.opened('a.srt', 'one');
    await r.progress('a.srt', 5_000, false);
    expect((await r.opened('a.srt', 'two')).position).toBe(0);
    for (let i = 0; i < RECENT_MAX + 3; i++) await r.opened(`f${i}.srt`, `t${i}`);
    expect((await r.all()).length).toBe(RECENT_MAX);
  });
});
