const beatUnits = [
  {
    value: '1',
    desc: '全音符',
    note: '𝅝',
    noteType: 1,
    dotted: false,
  },
  {
    value: '2',
    desc: '二分音符',
    note: '𝅗𝅥',
    noteType: 2,
    dotted: false,
  },
  { value: 'doted2', desc: '符点二分音符', note: '𝅗𝅥.', noteType: 2, dotted: true },
  {
    value: '4',
    desc: '四分音符',
    note: '𝅘𝅥',
    noteType: 4,
    dotted: false,
  },
  {
    value: '4.',
    desc: '符点四分音符',
    note: '𝅘𝅥.',
    noteType: 4,
    dotted: true,
  },
  {
    value: '8',
    desc: '八分音符',
    note: '𝅘𝅥𝅮',
    noteType: 8,
    dotted: false,
  },
  {
    value: '8.',
    desc: '符点八分音符',
    note: '𝅘𝅥𝅮.',
    noteType: 8,
    dotted: true,
  },
  {
    value: '16',
    desc: '十六分音符',
    note: '𝅘𝅥𝅯',
    noteType: 16,
    dotted: false,
  },
];

function getBeatUnit(value) {
  const unit = beatUnits.find((unit) => unit.value == value);
  if (!unit) {
    throw new Error(`Invalid beat unit: ${value}`);
  }
  return unit;
}

function noteDuration(tempo, beatNum, unitNoteType, unitNoteDotted) {
  let multiplier = 4 / unitNoteType;
  if (unitNoteDotted) {
    multiplier /= 1.5;
  }
  multiplier *= 4 / beatNum;
  return (60 / tempo) * multiplier;
}

export { beatUnits, noteDuration, getBeatUnit };
