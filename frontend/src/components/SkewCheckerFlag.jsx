// Skewed checkered race flag — parallelograms in a 3-row offset pattern
// matching the reference (italic checker, dark slate fills).
export default function SkewCheckerFlag({ width = 44, height = 32, color = "#E8E8EC" }) {
  // Skew transform: each cell is a parallelogram leaning right.
  // viewBox is sized 80x60 (3 rows of 4 cells, each cell ~16 wide + skew).
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 80 60"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Row 1 — offset 0 */}
      <polygon points="6,2 22,2 18,20 2,20" fill={color} />
      <polygon points="30,2 46,2 42,20 26,20" fill={color} />
      <polygon points="54,2 70,2 66,20 50,20" fill={color} />
      {/* Row 2 — offset by half cell */}
      <polygon points="18,21 34,21 30,39 14,39" fill={color} />
      <polygon points="42,21 58,21 54,39 38,39" fill={color} />
      <polygon points="66,21 82,21 78,39 62,39" fill={color} />
      {/* Row 3 — offset 0 */}
      <polygon points="6,40 22,40 18,58 2,58" fill={color} />
      <polygon points="30,40 46,40 42,58 26,58" fill={color} />
      <polygon points="54,40 70,40 66,58 50,58" fill={color} />
    </svg>
  );
}
