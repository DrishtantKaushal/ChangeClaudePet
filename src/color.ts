const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";

function fg(cssColor: string) {
  return (text: string) => {
    const ansi = Bun.color(cssColor, "ansi");
    return ansi ? `${ansi}${text}${RESET}` : text;
  };
}

function bgFg(bgCss: string, fgCss: string) {
  return (text: string) => {
    const bgAnsi = Bun.color(bgCss, "ansi")?.replace("[38;", "[48;");
    const fgAnsi = Bun.color(fgCss, "ansi");
    if (!bgAnsi || !fgAnsi) return text;
    return `${bgAnsi}${fgAnsi}${text}${RESET}`;
  };
}

export const c = {
  bold: (text: string) => `${BOLD}${text}${RESET}`,
  dim: (text: string) => `${DIM}${text}${RESET}`,
  red: fg("red"),
  green: fg("lime"),
  blue: fg("dodgerblue"),
  yellow: fg("yellow"),
  magenta: fg("magenta"),
  cyan: fg("cyan"),
  bgCyanBlack: bgFg("cyan", "black"),
};
