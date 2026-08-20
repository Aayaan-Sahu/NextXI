import { assignVideoToSession } from "@/app/dashboard/player/sessions/actions";
import { VIDEO_DISCIPLINES } from "@/lib/videos";
import type { VideoDiscipline } from "@/lib/videos";

type AssignableVideo = { id: string; originalFilename: string; tagLabel: string };

/**
 * Collapsible list of the player's standalone videos that match this session's
 * discipline, each with an "Add" button. Native <details> — no client JS.
 */
export function SessionVideoPicker({
  category,
  sessionId,
  videos,
}: {
  category: VideoDiscipline;
  sessionId: string;
  videos: AssignableVideo[];
}) {
  if (!videos.length) return null;

  const discipline = VIDEO_DISCIPLINES[category].label.toLowerCase();

  return (
    <details className="group rounded-lg border border-cream-400 bg-cream-50">
      <summary className="flex cursor-pointer items-center justify-between gap-5 px-[18px] py-3.5">
        <span>
          <span className="block text-ui font-semibold text-ink-900">Add an existing video</span>
          <span className="mt-[3px] block text-caption text-ink-600">
            Only your standalone {discipline} clips can join this session.
          </span>
        </span>
        <span className="shrink-0 text-ui font-semibold text-rust-600">
          Pick from library ▾
        </span>
      </summary>
      <ul>
        {videos.map((video) => (
          <li
            className="flex items-center gap-3.5 border-t border-cream-300 px-[18px] py-3"
            key={video.id}
          >
            <div className="min-w-0 flex-1">
              <div className="truncate text-ui font-semibold text-ink-900">
                {video.originalFilename}
              </div>
              <div className="truncate text-caption text-ink-600">{video.tagLabel}</div>
            </div>
            <form action={assignVideoToSession}>
              <input name="videoId" type="hidden" value={video.id} />
              <input name="sessionId" type="hidden" value={sessionId} />
              <button
                className="cursor-pointer rounded-md bg-cream-300 px-3.5 py-[7px] text-caption font-semibold text-ink-900 hover:bg-cream-350"
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
