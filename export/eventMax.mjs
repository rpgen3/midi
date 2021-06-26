class Ph {
    constructor(xx, yy, isLast, x, events, i){
        this.head = `#PH${i} tm:0,${i ? 'sw:99,g:,' : ''}`;
        this.body = events;
        this.foot = `#PHEND${i}`;
        const next = (i + 1) % 4;
        if(!isLast) events.push(`#CH_PH\np:${next},x:${(next ? x : x + 1) + xx},y:${yy},`);
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
    constructor(xx, yy, isLast, x, events){
        this.head = `#EPOINT tx:${x + xx},ty:${yy},`;
        this.body = [];
        this.foot = '#END';
        for(let i = 0; i < 4; i++){
            const j = i * 100,
                  isLast = events.length > j + 100;
            this.body.push(new Ph(xx, yy, isLast, x, events.slice(j, j + 100), i));
            if(isLast) break;
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
                  isLast = events.length > j + 400;
            if(j > events.length - 1) break;
            arr.push(new Event(x, y, isLast, i, events.slice(j, j + 400)));
        }
        return arr.map(v => v.toStr()).join('\n\n');
    }
}
