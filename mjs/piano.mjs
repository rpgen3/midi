export const piano = new class {
    constructor(){
        const semiTone = Math.exp(1/12 * Math.log(2)),
              hz = [...Array(87).keys()].reduce((p, x) => ([p[0] * semiTone].concat(p)), [27.5]).reverse(),
              ar = [],
              ptn = 'AABCCDDEFFGG',
              idxs = ptn.split('').map(v => ptn.indexOf(v));
        for(const i of hz.keys()){
            const j = i % ptn.length;
            ar.push(ptn[j] + (idxs.includes(j) ? '' : '#') + ((i + 9) / ptn.length | 0));
        }
        this.hz = hz;
        this.note = ar;
        const m = new Map;
        for(const [i, v] of ar.entries()) m.set(v, hz[i]);
        this.m = m;
    }
    note2hz(note){
        if(!this.m.has(note)) throw 'invalid note';
        return this.m.get(note);
    }
};
