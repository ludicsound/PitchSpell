class PitchClassSet {
  constructor(set) {
    this.set = set;
    this.matrixL = {
      c: ['Cbb', 'Cb', 'C', 'C#', 'C##'],
      d: ['Dbb', 'Db', 'D', 'D#', 'D##'],
      e: ['Ebb', 'Eb', 'E', 'E#', 'E##'],
      f: ['Fbb', 'Fb', 'F', 'F#', 'F##'],
      g: ['Gbb', 'Gb', 'G', 'G#', 'G##'],
      a: ['Abb', 'Ab', 'A', 'A#', 'A##'],
      b: ['Bbb', 'Bb', 'B', 'B#', 'B##'],
    };

    this.matrixN = {
      c: [10, 11, 0, 1, 2],
      d: [0, 1, 2, 3, 4],
      e: [2, 3, 4, 5, 6],
      f: [3, 4, 5, 6, 7],
      g: [5, 6, 7, 8, 9],
      a: [7, 8, 9, 10, 11],
      b: [9, 10, 11, 0, 1],
    };
  }

  spell() {
    // do stage 1
    let paths = this.s1_columnsPath();
    console.log("Stage 1 Paths: " + paths.length);

    if (paths.length > 1) {
      // do stage 2
      paths = this.s2_minimizeExtremeIntervals(paths);
      console.log("Stage 2 Paths: " + paths.length);

      if (paths.length > 1) {
        // do stage 3
        paths = this.s3_mostNaturalSpellings(paths);
        console.log("Stage 3 Paths: " + paths.length);

        if (paths.length > 1) {
          // do stage 4
          paths = this.s4_leastDoubleSharpsFlats(paths);
          console.log("Stage 4 Paths: " + paths.length);

          if (paths.length > 1) {
            // do stage 4
            paths = this.s5_favorAccidentals(paths);
            console.log("Stage 5 Paths: " + paths.length);

            if (paths.length > 1) {
              for (let p in paths) {
                console.log(this.mapToMatrixL(paths[p]));
              }
            }
          }
        }
      }
    }

    // map the best path to matrixL
    const bestPath = this.mapToMatrixL(paths[0]);

    //console.log("number of paths: " + paths.length);
    console.log(bestPath);

    return bestPath;
  }

  mapToMatrixL(path) {
    return path.map(({ letter, index }) => this.matrixL[letter][index]);
  }

  minIntervalDifference(i, j) {
    return i < j ? i - j + 12 : i - j;
  }

  calculateStage1PenaltyPoints(path) {
    let penaltyPoints = 0;

    for (let i = 0; i < path.length - 1; i++) {
      if (path[i].letter === path[i + 1].letter) {
        penaltyPoints += 1;
      }
    }

    return penaltyPoints;
  }

  calculateStage2PenaltyPoints(letter1, index1, letter2, index2) {
    const c =
      this.letterToNumber(letter1) < this.letterToNumber(letter2)
        ? this.letterToNumber(letter1) - this.letterToNumber(letter2) + 7
        : this.letterToNumber(letter1) - this.letterToNumber(letter2);

    const s = this.minIntervalDifference(
      this.matrixN[letter1][index1],
      this.matrixN[letter2][index2]
    );

    let basePenalty = 0;

    if (c === 0) {
      basePenalty = 1;
    } else if ([1, 2].includes(c) && s > (2 * c)) {
      basePenalty = s - (2 * c);
    } else if ([1, 2, 3, 4].includes(c) && s < (2 * c) - 1) {
      basePenalty = (2 * c) - 1 - s;
    } else if ([3, 4, 5, 6].includes(c) && s > (2 * c) - 1) {
      basePenalty = s - (2 * c) + 1;
    } else if ([5, 6].includes(c) && s < (2 * c) - 2) {
      basePenalty = (2 * c) - 2 - s;
    }
    //const extremeIntervalPenalty = Math.abs(interval - letterDiff) * 4;

    return basePenalty;
  }

  letterToNumber(letter) {
    const letterValues = {
      c: 0,
      d: 1,
      e: 2,
      f: 3,
      g: 4,
      a: 5,
      b: 6,
    };
    return letterValues[letter];
  }

  s1_columnsPath() {
    const pitchClasses = this.set.map((midi) => midi % 12);
    console.log(pitchClasses);
    let bestPaths = [];
    let maxDifferentiationScore = -Infinity;

    const findPaths = (pitchClasses, currentPath, lettersUsed) => {
      if (!pitchClasses.length) {
        const penaltyPoints = this.calculateStage1PenaltyPoints(currentPath);
        const differentiationScore = pitchClasses.length - penaltyPoints;
        if (differentiationScore > maxDifferentiationScore) {
          maxDifferentiationScore = differentiationScore;
          bestPaths = [currentPath.slice()];
        } else if (differentiationScore === maxDifferentiationScore) {
          bestPaths.push(currentPath.slice());
        }
        return;
      }

      const pitchClass = pitchClasses.shift();

      Object.entries(this.matrixN).forEach(([letter, row]) => {
        row.forEach((spelling, index) => {
          if (spelling === pitchClass) {
            const newPath = currentPath.slice();
            newPath.push({ letter, index });
            const newLettersUsed = new Set(lettersUsed);
            newLettersUsed.add(letter);
            findPaths(pitchClasses, newPath, newLettersUsed);
          }
        });
      });

      pitchClasses.unshift(pitchClass);
    };

    findPaths(pitchClasses.slice(), [], new Set());

    return bestPaths;
  }


  s2_minimizeExtremeIntervals(paths) {
    let minPenalty = Infinity;
    let bestPaths = [];

    paths.forEach((path) => {
      let penalty = 0;

      for (let i = 0; i < path.length - 1; i++) {
        penalty += this.calculateStage2PenaltyPoints(
          path[i].letter,
          path[i].index,
          path[i + 1].letter,
          path[i + 1].index
        );
      }

      if (penalty < minPenalty) {
        minPenalty = penalty;
        bestPaths = [path];
      } else if (penalty === minPenalty) {
        bestPaths.push(path);
      }
    });

    return bestPaths;
  }

  s3_mostNaturalSpellings(paths) {
    let bestPaths = [];
    let maxNaturalSpellings = -Infinity;

    paths.forEach((path) => {
      const naturalSpellings = path.filter(({ index }) => index === 2).length;

      if (naturalSpellings > maxNaturalSpellings) {
        maxNaturalSpellings = naturalSpellings;
        bestPaths = [path];
      } else if (naturalSpellings === maxNaturalSpellings) {
        bestPaths.push(path);
      }
    });

    return bestPaths;
  }

  s4_leastDoubleSharpsFlats(paths) {
    let bestPaths = [];
    let minDoubleSharpsFlats = Infinity;

    paths.forEach((path) => {
      const doubleSharpsFlats = path.filter(({ index }) => index === 0 || index === 4).length;

      if (doubleSharpsFlats < minDoubleSharpsFlats) {
        minDoubleSharpsFlats = doubleSharpsFlats;
        bestPaths = [path];
      } else if (doubleSharpsFlats === minDoubleSharpsFlats) {
        bestPaths.push(path);
      }
    });

    return bestPaths;
  }

  s5_favorAccidentals(paths) {
    let bestPaths = [];
    let maxPoints = -Infinity;

    paths.forEach((path) => {
      let points = 0;
      const n = path.length;

      for (let i = 0; i < n; i++) {
        const u = this.matrixN[path[i].letter][path[i].index];
        const v = this.matrixN[path[(i + 1) % n].letter][path[(i + 1) % n].index];
        const w = this.matrixN[path[(i + 2) % n].letter][path[(i + 2) % n].index];

        const index1 = path[i].index;
        const index2 = path[(i + 2) % n].index;
        const letterDiff = (path[(i + 2) % n].letter.charCodeAt(0) - path[i].letter.charCodeAt(0)) % 7;

        if (
          index1 === 2 &&
          index2 === 2 &&
          letterDiff === 1 &&
          ((u < v && v < w) || (u < w && w < v) || (v < w && w < u))
        ) {
          points += 1;
        }

        if (
          index1 === 2 &&
          index2 === 2 &&
          letterDiff === 1 &&
          !(u < v && v < w) &&
          !(u < w && w < v) &&
          !(v < w && w < u)
        ) {
          points += 1;
        }
      }

      if (points > maxPoints) {
        maxPoints = points;
        bestPaths = [path];
      } else if (points === maxPoints) {
        bestPaths.push(path);
      }
    });

    return bestPaths;
  }

// Example usage
/*
const pitchClassSet = new PitchClassSet([60, 62, 64, 65, 67, 69, 71]); // C D E F G A B
console.log(pitchClassSet.spell());
*/

// Prime Form calculations
  mostCompactOrdering(pitchClasses) {
    const sortedPitchClasses = [...pitchClasses].sort((a, b) => a - b);
    let minRange = Infinity;
    let minRangeIndex = -1;

    for (let i = 0; i < sortedPitchClasses.length; i++) {
      const range = (sortedPitchClasses[(i - 1 + sortedPitchClasses.length) % sortedPitchClasses.length] - sortedPitchClasses[i] + 12) % 12;
      if (range < minRange) {
        minRange = range;
        minRangeIndex = i;
      }
    }

    const compactOrdering = sortedPitchClasses.slice(minRangeIndex).concat(sortedPitchClasses.slice(0, minRangeIndex));

    return compactOrdering;
  }

  transposeToC(pitchClasses) {
    const first = pitchClasses[0];
    return pitchClasses.map(pc => (pc - first + 12) % 12);
  }

  invert(pitchClasses) {
    const inverted = [0]; // We start with 0, as it's the transposed normal form
    const differentials = [];

    // Calculate differentials
    for (let i = 1; i < pitchClasses.length; i++) {
      differentials.push((pitchClasses[i] - pitchClasses[i - 1] + 12) % 12);
    }

    // Calculate inverted pitch classes
    for (let i = 0; i < differentials.length; i++) {
      inverted.push((inverted[i] - differentials[i] + 12) % 12);
    }

    return inverted;
  }

  comparePitchClassSets(set1, set2) {
    for (let i = 0; i < set1.length; i++) {
  		let s1_delta = set1[i+1]-set1[i];
  		let s2_delta = set2[i+1]-set2[i];
      if (s1_delta < s2_delta) {
        return -1;
      } else if (s1_delta > s2_delta) {
        return 1;
      } else if (i === set1.length-1) {
      	return 0;
      }
    }
  }

  getPrimeForm() {
    const pitchClasses = this.set.map(midiNote => midiNote % 12);
    const uniquePitchClasses = Array.from(new Set(pitchClasses)).sort((a, b) => a - b);

    // Step 2: Determine normal form
    const normalForm = this.mostCompactOrdering(uniquePitchClasses);

    // Step 3: Transpose normal form to start on C
    const transposedNormalForm = this.transposeToC(normalForm);

    // Step 4: Calculate the inversion of transposed normal form
    const inverted = this.invert(transposedNormalForm);

    // Step 5: Order the inverted transposed normal form in the most compact ordering
    const invertedCompact = this.mostCompactOrdering(inverted);

    // Step 6: Transpose the result of step 5 to start on C
    const invertedTransposed = this.transposeToC(invertedCompact);

    // Step 7: Compare options 1 and 2 for Prime Form
  	console.log(transposedNormalForm, invertedTransposed);

  	const primeForm =
      this.comparePitchClassSets(transposedNormalForm, invertedTransposed) < 0
        ? transposedNormalForm
        : invertedTransposed;

    return primeForm;
  }
}
