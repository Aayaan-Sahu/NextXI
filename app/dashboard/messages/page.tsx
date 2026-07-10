export default function MessagesPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-1 p-6 text-center">
      <p className="font-display text-xl font-semibold uppercase">Your messages</p>
      <p className="text-sm text-ink-600">
        Select a conversation to start chatting.
      </p>
    </div>
  );
}
