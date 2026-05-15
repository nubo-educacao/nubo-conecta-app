'use client';

interface CoverImageProps {
  src: string;
  fallbackSrc: string;
  alt: string;
}

export default function CoverImage({ src, fallbackSrc, alt }: CoverImageProps) {
  return (
    <img
      src={src || fallbackSrc}
      alt={alt}
      className="w-full h-full object-cover mix-blend-soft-light opacity-80"
      onError={(e) => {
        const target = e.target as HTMLImageElement;
        if (target.src !== fallbackSrc) {
          target.src = fallbackSrc;
        }
      }}
    />
  );
}
