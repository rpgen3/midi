(async () => {
    const {importAll, getScript, importAllSettled} = await import(`https://rpgen3.github.io/mylib/export/import.mjs`);
    await Promise.all([
        'https://code.jquery.com/jquery-3.3.1.min.js',
        'https://colxi.info/midi-parser-js/src/main.js'
    ].map(getScript));
    const {$, MidiParser} = window;
    const html = $('body').empty().css({
        'text-align': 'center',
        padding: '1em',
        'user-select': 'none'
    });
    const head = $('<header>').appendTo(html),
          main = $('<main>').appendTo(html),
          foot = $('<footer>').appendTo(html);
    $('<h1>').appendTo(head).text('MIDIファイル読み込み');
    $('<h2>').appendTo(head).text('てすと');
    const rpgen3 = await importAll([
        [
            'input',
            'css',
            'util'
        ].map(v => `https://rpgen3.github.io/mylib/export/${v}.mjs`),
        [
            'piano'
        ].map(v => `https://rpgen3.github.io/midi/mjs/${v}.mjs`)
    ].flat());
    const {piano} = rpgen3;
    const rpgen = await importAll([
        'https://rpgen3.github.io/midi/mjs/FullEvent.mjs',
        'https://rpgen3.github.io/midi/export/rpgen.mjs'
    ]);
    Promise.all([
        [
            'container',
            'btn'
        ].map(v => `https://rpgen3.github.io/spatialFilter/css/${v}.css`)
    ].flat().map(rpgen3.addCSS));
    const midi = new class {
        constructor(){
            const html = $('<div>').appendTo(main).addClass('container');
            $('<h3>').appendTo(html).text('MIDIファイルを読み込む');
            const input = $('<dl>').appendTo(html);
            this.track = $('<div>').appendTo(html);
            $('<dt>').appendTo(input).text('ファイル入力');
            this.midi = null;
            MidiParser.parse($('<input>').appendTo($('<dd>').appendTo(input)).prop({
                type: 'file',
                accept: '.mid'
            }).get(0), result => {
                this.midi = result;
                tracks.init(result);
            });
        }
        get bpm(){
            const {track} = this.midi;
            let bpm = 0;
            for(const {event} of track) {
                for(const v of event) {
                    if(v.type !== 0xFF || v.metaType !== 0x51) continue;
                    bpm = 6E7 / v.data;
                    break;
                }
                if(bpm) break;
            }
            if(bpm) return bpm;
            else throw 'BPM is none.';
        }
    };
    const tracks = new class {
        constructor(){
            const html = midi.track;
            rpgen3.addBtn(html, '反転', () => {
                for(const v of this.checks) v(!v());
            }).addClass('btn');
            this.input = $('<dl>').appendTo(html).addClass('container');
            this.checks = [];
        }
        init(midi){
            const {input} = this;
            input.empty();
            this.checks = [];
            for(const [i, {event}] of midi.track.entries()) {
                this.checks.push(rpgen3.addInputBool(input, {
                    label: `ch${i} track:${event.length}`,
                    value: true
                }));
            }
        }
        get list(){
            return this.checks.map(v => v());
        }
    };
    const config = new class {
        constructor(){
            const html = $('<div>').appendTo(main).addClass('container');
            $('<h3>').appendTo(html).text('その他の設定');
            this.bpm = $('<dl>').appendTo(html);
            this.diff = $('<dl>').appendTo(html);
            this.minTone = $('<dl>').appendTo(html);
        }
    };
    const minTone = new class {
        constructor(){
            const html = config.minTone;
            this.input = rpgen3.addSelect(html, {
                label: '下限の音階',
                save: true,
                list: piano.note
            });
        }
        get value(){
            return piano.note2index(this.input()) + 21;
        }
    };
    const diff = new class {
        constructor(){
            const html = config.diff;
            this.input = rpgen3.addInputNum(html,{
                label: 'setTimeoutの誤差を引く[ms]',
                save: true,
                value: 30,
                max: 500,
                min: 0
            });
        }
        get value(){
            return this.input();
        }
    };
    const bpm = new class {
        constructor(){
            const html = config.bpm;
            this.min = 40;
            this.max = 300;
            this.old = 0;
            this.ar = [];
            this.input = rpgen3.addInputNum(html,{
                label: 'BPM',
                save: true,
                value: 135,
                min: this.min,
                max: this.max
            });
            rpgen3.addBtn(html, 'タップでBPM計測', () => this.update()).addClass('btn');
            rpgen3.addBtn(html, '計測リセット', () => this.reset()).addClass('btn');
            rpgen3.addBtn(html, 'MIDIファイルから取得', () => this.input(midi.bgm)).addClass('btn');
        }
        reset(){
            this.old = 0;
            this.ar = [];
        }
        update(){
            const {min, max} = this;
            const now = performance.now(),
                  bpm = 1 / (now - this.old) * 1000 * 60;
            this.old = now;
            if(bpm < min || bpm > max) return;
            this.ar.push(bpm);
            this.input(this.ar.reduce((p,x) => p + x) / this.ar.length);
        }
        get value(){
            return this.input();
        }
    };
    let started = false;
    rpgen3.addBtn(main, '処理の開始', async () => {
        if(started) return;
        started = true;
        await makeMap();
        started = false;
    }).addClass('btn');
    const msg = new class {
        constructor(){
            this.html = $('<div>').appendTo(main);
        }
        async print(str){
            this.html.text(str);
            await rpgen3.sleep(0);
        }
    };
    const makeMap = async () => {
        const events = joinWait(trim(await makeMusic()));
        output(events);
    };
    const makeMusic = async () => {
        const {track} = midi.midi,
              currentIndexs = [...new Array(track.length).fill(0)],
              totalTimes = currentIndexs.slice(),
              _indexs = tracks.list.flatMap((v, i) => v ? [i] : []),
              result = [];
        let currentTime = 0;
        const getMin = () => {
            let min = Infinity,
                idx = 0;
            for(const index of _indexs) {
                const {event} = track[index],
                      {deltaTime} = event[currentIndexs[index]],
                      total = deltaTime + totalTimes[index];
                if(total > min) continue;
                min = total;
                idx = index;
            }
            return idx;
        };
        let _ = 0;
        while(_indexs.length){
            const index = getMin(),
                  {event} = track[index],
                  {deltaTime, type, data} = event[currentIndexs[index]];
            totalTimes[index] += deltaTime;
            if(deltaTime) {
                const total = totalTimes[index],
                      time = total - currentTime,
                      i = result.length - 1;
                if(isNaN(result[i])) result.push(time);
                else result[i] += time;
                currentTime = total;
            }
            switch(type){
                case 8:
                case 9: {
                    const [note, velocity] = data,
                          isNoteOFF = type === 8 || !velocity;
                    if(isNoteOFF) break;
                    if(minTone.value - 1 > note) break;
                    const id = getSoundId[note - 21];
                    if(id === void 0) break;
                    result.push(playSound(id, 100 * velocity / 0x7F | 0));
                    break;
                }
            }
            if(++currentIndexs[index] >= event.length) _indexs.splice(_indexs.indexOf(index), 1);
            if(!(++_ % 1000)) await msg.print(`処理中(${currentIndexs[index]} ${event.length})`);
        }
        return result;
    };
    const trim = arr => {
        let start = 0,
            end = arr.length;
        if(!isNaN(arr[0])) start++;
        if(!isNaN(arr[end - 1])) end--;
        return arr.slice(start, end);
    };
    const joinWait = arr => {
        const {timeDivision} = midi.midi,
              deltaToMs = 1000 * 60 / bpm.value / timeDivision,
              result = [];
        for(const v of arr){
            if(isNaN(v)) result.push(v);
            else {
                const ms = v * deltaToMs - diff.value;
                if(ms >= 0) result.push(wait(ms | 0));
            }
        }
        return result;
    };
    const playSound = (i, v) => `#PL_SD\ni:${i},v:${v},`,
          wait = t => `#WAIT\nt:${t},`;
    const getSoundId = (() => {
        const range = (start, end) => [...Array(end - start + 1).keys()].map(v => v + start);
        return [
            range(758, 821),
            range(1575, 1594),
            range(822, 825)
        ].flat();
    })();
    const mapData = await(await fetch('data/musicPlayer.txt')).text(),
          hCode = $('<div>').appendTo(foot),
          evtList = [];
    const outputCode = n => {
        const d = mapData.replace('$init$', [
            getSoundId.map(v => playSound(v, 1)),
            wait(3000)
        ].flat().map(v => v + '\n#ED').join('\n'));
        rpgen3.addInputStr(hCode.empty(), {
            value: rpgen.set(
                d + [...new Array(Math.min(n, evtList.length)).keys()]
                .map(i => new rpgen.FullEvent(1).make(evtList[evtList.length - i - 1], 3, 6 + i, 0))
                .join('\n\n')
            ),
            copy: true
        });
    }
    const print = () => msg.print(`曲の数 ${evtList.length}`);
    const output = events => {
        evtList.push(events);
        outputCode(1);
        print();
    };
    rpgen3.addBtn(foot, '全出力', () => {
        outputCode(evtList.length);
        print();
    });
    rpgen3.addBtn(foot, 'shift', () => {
        evtList.shift();
        print();
    });
    rpgen3.addBtn(foot, 'pop', () => {
        evtList.pop();
        print();
    });
})();
