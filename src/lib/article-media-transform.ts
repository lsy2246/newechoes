export type MediaSize = {
  width: number;
  height: number;
};

export type MediaPoint = {
  x: number;
  y: number;
};

export type MediaTransform = {
  scale: number;
  x: number;
  y: number;
};

const round = (value: number) => Math.round(value * 1_000_000) / 1_000_000;

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value));

export function clampMediaTransform(
  transform: MediaTransform,
  media: MediaSize,
  stage: MediaSize,
  visibleEdge = 48,
): MediaTransform {
  const displayedWidth = media.width * transform.scale;
  const displayedHeight = media.height * transform.scale;
  const x = displayedWidth <= stage.width
    ? (stage.width - displayedWidth) / 2
    : clamp(
        transform.x,
        stage.width - visibleEdge - displayedWidth,
        visibleEdge,
      );
  const y = displayedHeight <= stage.height
    ? (stage.height - displayedHeight) / 2
    : clamp(
        transform.y,
        stage.height - visibleEdge - displayedHeight,
        visibleEdge,
      );

  return {
    scale: round(transform.scale),
    x: round(x),
    y: round(y),
  };
}

export function fitMediaToStage(
  media: MediaSize,
  stage: MediaSize,
  padding = 24,
): MediaTransform {
  const availableWidth = Math.max(1, stage.width - padding * 2);
  const availableHeight = Math.max(1, stage.height - padding * 2);
  const scale = Math.min(
    availableWidth / Math.max(1, media.width),
    availableHeight / Math.max(1, media.height),
    1,
  );

  return clampMediaTransform({ scale, x: 0, y: 0 }, media, stage);
}

export function zoomMediaAtPoint(
  transform: MediaTransform,
  media: MediaSize,
  stage: MediaSize,
  point: MediaPoint,
  requestedScale: number,
  minimumScale: number,
  maximumScale: number,
): MediaTransform {
  const nextScale = clamp(requestedScale, minimumScale, maximumScale);
  const ratio = nextScale / Math.max(transform.scale, Number.EPSILON);

  return clampMediaTransform(
    {
      scale: nextScale,
      x: point.x - (point.x - transform.x) * ratio,
      y: point.y - (point.y - transform.y) * ratio,
    },
    media,
    stage,
  );
}
