export type PaletteSwatch = {
  label: string;
  color: string;
};

export const PALETTE_COLUMNS = 9;
export const QUICK_PICK_COLOR_COUNT = 8;

/** Swatches ordered by hue so adjacent chips read as a spectrum. */
export const PALETTE: readonly PaletteSwatch[] = [
  { label: "Ember", color: "#802828" },
  { label: "Rust", color: "#913f2c" },
  { label: "Copper", color: "#91472b" },
  { label: "Clay", color: "#724d36" },
  { label: "Ochre", color: "#815d19" },
  { label: "Moss", color: "#385f2f" },
  { label: "Forest", color: "#2a5d3c" },
  { label: "Pine", color: "#1a614a" },
  { label: "Teal", color: "#19756f" },
  { label: "Ocean", color: "#17507f" },
  { label: "Slate", color: "#3b4c5e" },
  { label: "Steel", color: "#42566e" },
  { label: "Navy", color: "#1f3d70" },
  { label: "Indigo", color: "#353595" },
  { label: "Grape", color: "#4c3172" },
  { label: "Plum", color: "#5b3a6e" },
  { label: "Berry", color: "#702853" },
  { label: "Wine", color: "#70283a" },
];
