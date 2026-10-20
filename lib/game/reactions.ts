/** Shared by client and server. The server only ever accepts an id from this list (never raw emoji text). */
export const REACTIONS = [
  { id: 'laugh', emoji: '😂', label: 'Laughing' },
  { id: 'cry', emoji: '😭', label: 'Crying' },
  { id: 'fire', emoji: '🔥', label: 'Fire' },
  { id: 'clap', emoji: '👏', label: 'Clapping' },
  { id: 'angry', emoji: '😤', label: 'Frustrated' },
  { id: 'mind', emoji: '🤯', label: 'Mind blown' },
  { id: 'cool', emoji: '😎', label: 'Cool' },
  { id: 'skull', emoji: '💀', label: 'Dead' },
  { id: 'pray', emoji: '🙏', label: 'Please' },
  { id: 'shock', emoji: '😱', label: 'Shocked' },
  { id: 'party', emoji: '🎉', label: 'Celebrate' },
  { id: 'thumbs', emoji: '👍', label: 'Thumbs up' },
] as const;

export type ReactionId = (typeof REACTIONS)[number]['id'];

export function isReactionId(x: unknown): x is ReactionId {
  return typeof x === 'string' && REACTIONS.some((r) => r.id === x);
}
export function reactionEmoji(id: string): string {
  return REACTIONS.find((r) => r.id === id)?.emoji ?? '';
}
export function reactionLabel(id: string): string {
  return REACTIONS.find((r) => r.id === id)?.label ?? 'Reaction';
}
