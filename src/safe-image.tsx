import { useEffect, useState, type ImgHTMLAttributes } from 'react';
import { sanitizeOptionalMediaSrc } from './media';

interface SafeImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src?: string | null;
  collapseOnMissing?: boolean;
}

export function SafeImage({
  src,
  alt = '',
  collapseOnMissing = true,
  onError,
  ...rest
}: SafeImageProps) {
  const safeSrc = sanitizeOptionalMediaSrc(src);
  const [hasFailed, setHasFailed] = useState(false);

  useEffect(() => {
    setHasFailed(false);
  }, [safeSrc]);

  if (!safeSrc && collapseOnMissing) {
    return null;
  }

  if (hasFailed && collapseOnMissing) {
    return null;
  }

  return (
    <img
      {...rest}
      alt={alt}
      src={safeSrc ?? undefined}
      onError={(event) => {
        setHasFailed(true);
        onError?.(event);
      }}
    />
  );
}
