import { Panel } from "@/components/ui";

type CoachVideo = {
  id: string;
  originalFilename: string;
  player: {
    name: string;
  };
};

export function CoachVideos({ videos }: { videos: CoachVideo[] }) {
  return (
    <Panel title="Player videos">
      {videos.length ? (
        <ul className="grid gap-2">
          {videos.map((video) => (
            <li
              className="flex justify-between gap-3 border-t border-stone-300 pt-2 text-sm"
              key={video.id}
            >
              <span className="min-w-0 truncate">{video.originalFilename}</span>
              <span className="shrink-0 text-stone-600">
                {video.player.name}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-stone-600">No videos yet.</p>
      )}
    </Panel>
  );
}
