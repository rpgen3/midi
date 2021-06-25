class Ph {
    constructor(x, events, i){
        this.head = `#PH${i} tm:0,${i ? 'sw:99,g:,' : ''}`;
        this.body = events;
        this.foot = `#PHEND${i}`;
        const next = (i + 1) % 4;
        this.ch_ph = `#CH_PH\np:${next},x:${next ? x : x + 1},y:0,`;
    }
    toStr(){
        return [
            this.head,
            this.body.concat(this.ch_ph).map(v => v + '\n#ED'),
            this.foot
        ].flat().join('\n');
    }
}
class Event {
    constructor(x, events){
        this.head = `#EPOINT tx:${x},ty:0,`;
        this.body = [];
        this.foot = '#END';
        for(let i = 0; i < 4; i++){
            const j = i * 100;
            if(j > events.length - 1) break;
            this.body.push(new Ph(x, events.slice(j, j + 100), i));
        }
    }
    toStr(){
        return [
            this.head,
            this.body.map(v => v.toStr()),
            this.foot
        ].flat().join('\n');
    }
}
export class EventMax {
    constructor(already){
        this.max = 96 - already;
    }
    make(events){
        const arr = [];
        for(let i = 0; i < this.max; i++){
            const j = i * 400;
            if(j > events.length - 1) break;
            arr.push(new Event(i, events.slice(j, j + 400)));
        }
        return arr.map(v => v.toStr()).join('\n\n');
    }
}
