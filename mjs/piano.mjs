export const piano = new class {
    constructor(){
        const semiTone = Math.exp(1/12 * Math.log(2)),
              hz = [...Array(87).keys()].reduce((p, x) => ([p[0] * semiTone].concat(p)), [27.5]).reverse();
        const octave = [
            'A',
            'A#',
            'B',
            'C',
            'C#',
            'D',
            'D#',
            'E',
            'F',
            'F#',
            'G',
            'G#'
        ];
        const note = [];
        for(const i of hz.keys()) note.push(octave[i % octave.length] + ((i + 9) / octave.length | 0) );
        Object.assign(this, {octave, hz, note});
        {
            const m = new Map;
            for(const [i, v] of note.entries()) m.set(v, i);
            this._note2index = m;
        }
        {
            const m = new Map;
            for(const [i, v] of note.entries()) m.set(v, hz[i]);
            this._note2hz = m;
        }
    }
    note2index(note){
        const m = this._note2index;
        if(m.has(note)) return m.get(note);
        else throw 'invalid note';
    }
    note2hz(note){
        const m = this._note2hz;
        if(m.has(note)) return m.get(note);
        else throw 'invalid note';
    }
};
