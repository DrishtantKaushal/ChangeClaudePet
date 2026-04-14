import type { Roll } from "./types.ts";

// Sprite bodies — frame 0 only (static display).
// Each sprite is 5 lines tall, 12 wide (after {E} → 1-char substitution).
// Line 0 is the hat slot — blank unless a hat is applied.
const BODIES: Record<string, string[]> = {
  duck: ["            ", "    __      ", "  <({E} )___  ", "   (  ._>   ", "    `--´    "],
  goose: ["            ", "     ({E}>    ", "     ||     ", "   _(__)_   ", "    ^^^^    "],
  blob: ["            ", "   .----.   ", "  ( {E}  {E} )  ", "  (      )  ", "   `----´   "],
  cat: ["            ", "   /\\_/\\    ", "  ( {E}   {E})  ", "  (  ω  )   ", '  (")_(")   '],
  dragon: ["            ", "  /^\\  /^\\  ", " <  {E}  {E}  > ", " (   ~~   ) ", "  `-vvvv-´  "],
  octopus: ["            ", "   .----.   ", "  ( {E}  {E} )  ", "  (______)  ", "  /\\/\\/\\/\\  "],
  owl: ["            ", "   /\\  /\\   ", "  (({E})({E}))  ", "  (  ><  )  ", "   `----´   "],
  penguin: ["            ", "  .---.     ", "  ({E}>{E})     ", " /(   )\\    ", "  `---´     "],
  turtle: ["            ", "   _,--._   ", "  ( {E}  {E} )  ", " /[______]\\ ", "  ``    ``  "],
  snail: ["            ", " {E}    .--.  ", "  \\  ( @ )  ", "   \\_`--´   ", "  ~~~~~~~   "],
  ghost: ["            ", "   .----.   ", "  / {E}  {E} \\  ", "  |      |  ", "  ~`~``~`~  "],
  axolotl: ["            ", "}~(______)~{", "}~({E} .. {E})~{", "  ( .--. )  ", "  (_/  \\_)  "],
  capybara: ["            ", "  n______n  ", " ( {E}    {E} ) ", " (   oo   ) ", "  `------´  "],
  cactus: ["            ", " n  ____  n ", " | |{E}  {E}| | ", " |_|    |_| ", "   |    |   "],
  robot: ["            ", "   .[||].   ", "  [ {E}  {E} ]  ", "  [ ==== ]  ", "  `------´  "],
  rabbit: ["            ", "   (\\__/)   ", "  ( {E}  {E} )  ", " =(  ..  )= ", '  (")__(")  '],
  mushroom: ["            ", " .-o-OO-o-. ", "(__________)", "   |{E}  {E}|   ", "   |____|   "],
  chonk: ["            ", "  /\\    /\\  ", " ( {E}    {E} ) ", " (   ..   ) ", "  `------´  "],
};

const HAT_LINES: Record<string, string> = {
  none: "",
  crown: "   \\^^^/    ",
  tophat: "   [___]    ",
  propeller: "    -+-     ",
  halo: "   (   )    ",
  wizard: "    /^\\     ",
  beanie: "   (___)    ",
  tinyduck: "    ,>      ",
};

export function renderSprite(roll: Roll): string[] {
  const body = (BODIES[roll.species] ?? BODIES["blob"]!).map((line) =>
    line.replaceAll("{E}", roll.eye),
  );
  const lines = [...body];

  if (roll.hat !== "none" && !lines[0]!.trim()) {
    lines[0] = HAT_LINES[roll.hat] ?? "";
  }

  // Drop blank hat row when no hat is present
  if (!lines[0]!.trim()) {
    lines.shift();
  }

  return lines;
}
