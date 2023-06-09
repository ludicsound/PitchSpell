let midiInputsDropdown;
let renderer;
let context;
let stave;
let activeNotes = {};
//const Midi = Tonal.Midi;
const Chord = Tonal.Chord;

const {
	Renderer,
	Stave
} = Vex.Flow;

function setup() {
  createCanvas(windowWidth, windowHeight);
  midiInputsDropdown = createSelect();
  midiInputsDropdown.id('midi-inputs');
  midiInputsDropdown.parent('midi-controller');
  midiInputsDropdown.changed(selectMIDIInput);

  renderer = new Renderer(canvas, Vex.Flow.Renderer.Backends.CANVAS);
  context = renderer.getContext();

	background(255);    // Setting the background to white
	stroke(0);          // Setting the outline (stroke) to black
	fill(0);

  WebMidi.enable(function (err) {
    if (err) {
      console.error("WebMidi could not be enabled:", err);
      return;
    }
    populateMIDIDropdown();
  });
}

function populateMIDIDropdown() {
  midiInputsDropdown.option('Select MIDI input device');
  for (let input of WebMidi.inputs) {
    midiInputsDropdown.option(input.name, input.id);
  }

  // Set the default input to the last device in the dropdown
  if (WebMidi.inputs.length > 0) {
    const lastInputId = WebMidi.inputs[WebMidi.inputs.length - 1].id;
    midiInputsDropdown.value(lastInputId);
    selectMIDIInput();
  }
}

function selectMIDIInput() {
  let selectedInputId = midiInputsDropdown.value();
  if (selectedInputId === 'Select MIDI input device') return;

  let input = WebMidi.getInputById(selectedInputId);
  input.removeListener('noteon', 'all');
  input.removeListener('noteoff', 'all');

  input.addListener('noteon', 'all', handleNoteOn);
  input.addListener('noteoff', 'all', handleNoteOff);
}

function getOctave(midiNote) {
  return Math.floor(midiNote / 12) - 1;
}

function insertSlash(combinedString) {
  const noteName = combinedString.slice(0, -1);
  const octave = combinedString.slice(-1);
  return noteName + "/" + octave;
}

function midiToVexFlow(midiNote, spelledNote) {
  const octave = Math.floor(midiNote / 12 - 1);
  const note = spelledNote + octave;
  const key = insertSlash(note);
  const clef = midiNote < 60 ? 'bass' : 'treble';
  const accidental = note.includes('#') ? '#' : note.includes('b') ? 'b' : null;
  console.log({ key });
  return {
    key,
    clef,
    accidental,
  };
}

function handleNoteOn(event) {
  let midiNote = event.note.number;
  activeNotes[midiNote] = true; // Just store the MIDI note for now
	let pitchClass = new PitchClassSet(Object.keys(activeNotes).map(Number));
  let spelledNotes = pitchClass.spell();
  console.log(spelledNotes);

  // Update activeNotes with spelled notes
  spelledNotes.forEach((spelledNote, index) => {
    const midiValue = Object.keys(activeNotes).map(Number)[index];
    activeNotes[midiValue] = midiToVexFlow(midiValue, spelledNote);
  });

  drawGrandStaff();
}

function handleNoteOff(event) {
	let midiNote = event.note.number;
	if (activeNotes.hasOwnProperty(midiNote)) {
		delete activeNotes[midiNote];
    drawGrandStaff();
  }
}

function drawStave (x, y, clef) {
	let newStave = new Stave(x, y, width - 20);
  newStave.addClef(clef);
  newStave.setContext(context).draw();
	return newStave;
}

function getNotes(clef) {
  const restClef = clef === 'treble' ? 'bass' : 'treble';
  let chords = {
    treble: [],
    bass: [],
  };

  const notes = Object.values(activeNotes).map((vexNote) => {
    const mainNote = new Vex.Flow.StaveNote({
      keys: [vexNote.key],
      clef: vexNote.clef,
      duration: 'w',
    });

    if (vexNote.accidental) {
      mainNote.addModifier(new Vex.Flow.Accidental(vexNote.accidental), 0);
    }

    const restNote = new Vex.Flow.StaveNote({
      keys: [restClef === 'treble' ? 'b/4' : 'd/3'],
      clef: restClef,
      duration: 'wr',
    });

		chords[vexNote.clef].push(vexNote.key);

    return vexNote.clef === clef ? mainNote : restNote;
  });

  if (chords[clef].length > 1 || (chords[clef].length > 0) && (chords[restClef].length > 0)) {
    const chordNote = new Vex.Flow.StaveNote({
      keys: chords[clef],
      clef: clef,
      duration: 'w',
    });

		chords[clef].forEach((key, index) => {
			const accidental = key.includes('#') ? '#' : key.includes('b') ? 'b' : null;
      if (accidental) {
        chordNote.addModifier(
          new Vex.Flow.Accidental(accidental).setAsCautionary(),
					index
        );
      }
    });

    notes.push(chordNote);
  }
	else {
		if(chords[restClef].length > 1 || (chords[clef].length > 0) && (chords[restClef].length > 0)) {
			notes.push(new Vex.Flow.StaveNote({
	    	keys: [restClef === 'treble' ? 'b/4' : 'd/3'],
	    	clef: restClef,
	    	duration: 'wr',
	  	}));
		}
	}

	return notes;
}

function textMarkup (note, markup, position) {
	const noteBoundingBox = note.getBoundingBox();
	let x, y;
	if(position === 'pf') {
		x = 20;
		y = 400;
	} else if (position === 'iv') {
		x = 20;
		y = 430;
	}
	else {
		x = noteBoundingBox.x + 2;
		y = noteBoundingBox.y - 30;
	}

	fill(0);
	textSize(20);
	textAlign(LEFT, CENTER);
	text(markup, x, y);
}

function drawNotes (notes, stave, clef){
	if (notes.length > 0) {
    const voice = new Vex.Flow.Voice({ num_beats: notes.length, beat_value: 1 });
    voice.addTickables(notes);

		notes.forEach((note, index) => {
      note.setStave(stave);
    });

    const formatter = new Vex.Flow.Formatter()
			//.joinVoices([voice])
			.format([voice], width - 100);
    voice.draw(context, stave);

		const set = new PitchClassSet(Object.keys(activeNotes).map(Number));

		notes.forEach((note, index) => {
      if (!note.isRest() && !(notes.length > 1 && index === (notes.length - 1))) {
        const key = note.keys[0];
        const pitchClassName = key.substring(0, key.length - 2);
        // Use p5.js to draw the text label
				textMarkup(note, pitchClassName, 'above');
      }
			//draw Prime Form for PcSet
			else if (notes.length > 1 && index === (notes.length - 1) && clef === "treble") {
				textMarkup(note, "Prime Form: (" + set.primeForm().join('') + ")", 'pf');
      }
			//draw IntervalVector for PcSet
			else if (notes.length > 1 && index === (notes.length - 1) && clef === "bass") {
				textMarkup(note, "Interval Vector: " + set.intervalVector().join('') + "", 'iv');
			}
    });
  }
}

function drawGrandStaff() {
  context.clearRect(0, 0, canvas.width, canvas.height);

  const trebleStave = drawStave(10, 120, "treble");
	const bassStave = drawStave(10, 200, "bass");

  const trebleNotes = getNotes("treble");
	const bassNotes = getNotes("bass");

	drawNotes(trebleNotes, trebleStave, "treble");
	drawNotes(bassNotes, bassStave, "bass");
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  renderer.resize(windowWidth, windowHeight);
  drawGrandStaff();
}
