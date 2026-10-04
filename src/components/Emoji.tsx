// Local decorative assets; labels live in the surrounding text.
export function Emoji({
  name,
  size = 40,
  className = "",
}: {
  name: string;
  size?: number;
  className?: string;
}) {
  return (
    <img
      className={`emoji-art ${className}`}
      src={`/emoji/${name}.webp`}
      width={size}
      height={size}
      alt=""
      draggable={false}
      decoding="async"
    />
  );
}
