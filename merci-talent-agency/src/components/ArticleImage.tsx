import { useState } from 'react';

export default function ArticleImage({ src, title, grayscale = false, className = '' }: {
  src?: string; title: string; grayscale?: boolean; className?: string;
}) {
  const [failedSrc, setFailedSrc] = useState<string>();
  return <div className={`overflow-hidden bg-black/5 ${className}`}>
    {src && src !== failedSrc ? <img src={src} alt={title} loading="lazy" referrerPolicy="no-referrer"
      onError={() => setFailedSrc(src)} className={`h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02] ${grayscale ? 'grayscale' : ''}`} />
      : <div className="flex h-full w-full items-center justify-center text-brand-gray text-[10px] tracking-[0.2em]" role="img" aria-label={`${title} — image unavailable`}>MERCI</div>}
  </div>;
}
