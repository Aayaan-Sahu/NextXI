import { assignVideoToSession } from "@/app/dashboard/player/sessions/actions";

type AssignableVideo = { id: string; originalFilename: string; tagLabel: string };

/**
 * Collapsible list of the player's standalone videos that match this session's
 * discipline, each with an "Add" button. Native <details> — no client JS.
 */
export function SessionVideoPicker({
  sessionId,
  videos,
}: {
  sessionId: string;
  videos: AssignableVideo[];
}) {
  if (!videos.length) return null;

  return (
    <details className="rounded-[10px] border border-cream-400 bg-white">
      <summary className="cursor-pointer px-5 py-3.5 text-sm font-semibold text-ink-900">
        Add an existing video ({videos.length})
      </summary>
      <ul className="border-t border-cream-400">
        {videos.map((video) => (
          <li
            className="flex items-center justify-between gap-3 border-b border-cream-400 px-5 py-3 last:border-b-0"
            key={video.id}
          >
            <div className="min-w-0">
              <div className="truncate text-sm font-medium text-ink-900">
                {video.originalFilename}
              </div>
              <div className="truncate font-mono text-[11.5px] text-ink-600">{video.tagLabel}</div>
            </div>
            <form action={assignVideoToSession}>
              <input name="videoId" type="hidden" value={video.id} />
              <input name="sessionId" type="hidden" value={sessionId} />
              <button
                className="cursor-pointer rounded-md border border-cream-500 px-3 py-1.5 text-[13px] font-semibold text-ink-900 hover:bg-cream-200"
                type="submit"
              >
                Add
              </button>
            </form>
          </li>
        ))}
      </ul>
    </details>
  );
}
