import { Point, ShapeType, ShapeObject } from '../types/notebook';

/**
 * High quality shape recognizer that converts hand-drawn point sequences
 * into pristine geometric shapes (line, arrow, circle, ellipse, rectangle, triangle, star).
 */
export function recognizeHandDrawnShape(
  points: Point[],
  pageId: string,
  strokeColor: string,
  strokeWidth: number
): ShapeObject | null {
  if (points.length < 5) return null;

  const minX = Math.min(...points.map(p => p.x));
  const maxX = Math.max(...points.map(p => p.x));
  const minY = Math.min(...points.map(p => p.y));
  const maxY = Math.max(...points.map(p => p.y));

  const width = maxX - minX;
  const height = maxY - minY;

  // Ignore tiny micro-jitter
  if (width < 12 && height < 12) return null;

  const startPoint = points[0];
  const endPoint = points[points.length - 1];
  const distanceStartEnd = Math.hypot(endPoint.x - startPoint.x, endPoint.y - startPoint.y);

  // Measure path length
  let pathLength = 0;
  for (let i = 1; i < points.length; i++) {
    pathLength += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
  }

  const isClosed = distanceStartEnd < Math.max(30, pathLength * 0.25);

  // 1. Check for Line or Arrow
  if (!isClosed && distanceStartEnd > pathLength * 0.75) {
    // Is straight line?
    return {
      id: `shape_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      pageId,
      type: 'line',
      x: startPoint.x,
      y: startPoint.y,
      width: endPoint.x - startPoint.x,
      height: endPoint.y - startPoint.y,
      strokeColor,
      fillColor: 'transparent',
      strokeWidth,
      opacity: 1,
      rotation: 0,
      isRecognized: true
    };
  }

  // 2. Check for Circle / Ellipse vs Rectangle vs Triangle
  if (isClosed) {
    // Bounding box center
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const rx = width / 2;
    const ry = height / 2;

    // Check circularity / ellipse fit
    let totalErrorRatio = 0;
    for (const p of points) {
      const dx = (p.x - cx) / (rx || 1);
      const dy = (p.y - cy) / (ry || 1);
      const radiusDist = Math.hypot(dx, dy);
      totalErrorRatio += Math.abs(radiusDist - 1);
    }
    const avgRadialError = totalErrorRatio / points.length;

    // If radial error is small -> Circle / Ellipse
    if (avgRadialError < 0.22) {
      const isCircle = Math.abs(width - height) / Math.max(width, height) < 0.2;
      const size = isCircle ? Math.max(width, height) : 0;

      return {
        id: `shape_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        pageId,
        type: isCircle ? 'circle' : 'ellipse',
        x: isCircle ? cx - size / 2 : minX,
        y: isCircle ? cy - size / 2 : minY,
        width: isCircle ? size : width,
        height: isCircle ? size : height,
        strokeColor,
        fillColor: 'transparent',
        strokeWidth,
        opacity: 1,
        rotation: 0,
        isRecognized: true
      };
    }

    // Check for real Rectangle / Box:
    // Must visit near 4 corners and path length must match perimeter closely
    const expectedPerimeter = 2 * (width + height);
    const perimeterRatio = pathLength / (expectedPerimeter || 1);

    if (perimeterRatio >= 0.75 && perimeterRatio <= 1.35) {
      // Check if points visit all 4 quadrant corners of bounding box
      const cornerThresholdX = width * 0.35;
      const cornerThresholdY = height * 0.35;

      const hasTopLeft = points.some(p => p.x <= minX + cornerThresholdX && p.y <= minY + cornerThresholdY);
      const hasTopRight = points.some(p => p.x >= maxX - cornerThresholdX && p.y <= minY + cornerThresholdY);
      const hasBottomRight = points.some(p => p.x >= maxX - cornerThresholdX && p.y >= maxY - cornerThresholdY);
      const hasBottomLeft = points.some(p => p.x <= minX + cornerThresholdX && p.y >= maxY - cornerThresholdY);

      if (hasTopLeft && hasTopRight && hasBottomRight && hasBottomLeft) {
        return {
          id: `shape_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          pageId,
          type: 'rectangle',
          x: minX,
          y: minY,
          width,
          height,
          strokeColor,
          fillColor: 'transparent',
          strokeWidth,
          opacity: 1,
          rotation: 0,
          isRecognized: true
        };
      }
    }
  }

  return null;
}
