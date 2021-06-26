class Ph {
    constructor(xx, yy, last, x, events, i){
        this.head = `#PH${i} tm:0,${i ? 'sw:99,g:,' : ''}`;
        this.body = events;
        this.foot = `#PHEND${i}`;
        const next = (i + 1) % 4;
        if(last - events.length > 100) events.push(`#CH_PH\np:${next},x:${(next ? x : x + 1) + xx},y:${yy},`);
    }
    toStr(){
        return [
            this.head,
            this.body.map(v => v + '\n#ED'),
            this.foot
        ].flat().join('\n');
    }
}
class Event {
    constructor(xx, yy, last, x, events){
        this.head = `#EPOINT tx:${x + xx},ty:${yy},`;
        this.body = [];
        this.foot = '#END';
        for(let i = 0; i < 4; i++){
            const j = i * 100,
                  last2 = last - j;
            this.body.push(new Ph(xx, yy, last2, x, events.slice(j, j + 100), i));
            if(last2 < 100) break;
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
    make(events, x = 0, y = 0){
        const arr = [];
        for(let i = 0; i < this.max; i++){
            const j = i * 400,
                  last = events.length - j;
            arr.push(new Event(x, y, last, i, events.slice(j, j + 400)));
            if(last < 400) break;
        }
        return arr.map(v => v.toStr()).join('\n\n');
    }
}
