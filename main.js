(async () => {
    await Promise.all([
        'https://rpgen3.github.io/lib/lib/jquery-3.5.1.min.js',
        'https://cdnjs.cloudflare.com/ajax/libs/tone/14.8.26/Tone.js'
    ].map(v => import(v)));
    $.getScript('https://cdnjs.cloudflare.com/ajax/libs/lz-string/1.4.4/lz-string.min.js');
    const rpgen3 = await Promise.all([
        'input',
        'util'
    ].map(v => import(`https://rpgen3.github.io/mylib/export/${v}.mjs`))).then(v => Object.assign({},...v));
    const h = $('body').css({
        'text-align': 'center',
        padding: '1em'
    });
    const addBtn = (parent, ttl, func) => $('<button>').appendTo(parent).text(ttl).on('click', func);
    $('<h1>').appendTo(h).text('MIDIファイルを読み込む');
    const msg = (()=>{
        const elm = $('<div>').appendTo(h);
        return (str, isError) => $('<span>').appendTo(elm.empty()).text(str).css({
            color: isError ? 'red' : 'blue',
            backgroundColor: isError ? 'pink' : 'lightblue'
        });
    })();
    const sleep = ms => new Promise(resolve=>setTimeout(resolve, ms));
    const dialog = async str => {
        msg(str);
        await sleep(30);
    };
    const inputBPM = rpgen3.addInputNum(h,{
        label: 'BPM(優先度低)',
        save: true,
        value: 130,
        max: 500,
        min: 50
    });
    const importantBPM = rpgen3.addInputBool(h,{
        label: '手動入力のBPMを優先',
        save: true
    })
    const inputMin = rpgen3.addInputNum(h,{
        label: '下限のwait時間[ms]',
        save: true,
        value: 30,
        max: 100,
        min: 0
    });
    const piano = (()=>{
        const semiTone = Math.exp(1/12 * Math.log(2)),
              hz = [...new Array(87)].reduce((p, x) => ([p[0] * semiTone].concat(p)), [27.5]).reverse();
        const ar = [],
              ptn = 'AABCCDDEFFGG',
              idxs = ptn.split('').map(v => ptn.indexOf(v));
        for(const i of hz.keys()){
            const j = i % ptn.length;
            ar.push(ptn[j] + (idxs.includes(j) ? '' : '#') + ((i + 9) / ptn.length | 0));
        }
        return {semiTone, hz, hzToNote: ar};
    })();
    const inputMinTone = rpgen3.addInputNum(h,{
        label: '下限の音階',
        save: true,
        value: 10,
        max: piano.hz.length,
        min: 0
    });
    const hMinTone = $('<div>').appendTo(h);
    inputMinTone.elm.on('input click',() => {
        const note = piano.hzToNote[inputMinTone - 1];
        hMinTone.text(note);
        new Tone.Synth().toMaster().triggerAttackRelease(note, '16n');
    }).trigger('input');
    $('<input>').appendTo(h).prop({
        type: 'file',
        accept: '.mid'
    }).on('change', e => {
        msg('読み込み中');
        const fr = new FileReader;
        fr.onload = () => {
            loaded = fr.result;
            msg('読み込み完了');
        };
        fr.readAsArrayBuffer(e.target.files[0]);
    });
    let loaded;
    addBtn(h, '処理開始', () => {
        if(!loaded) return msg('MIDIファイルを読み込んでください', true);
        load(new Uint8Array(loaded)); // 型付配列に
        output.empty();
    });
    let deltaToMs;
    const load = async data => {
        await dialog('MIDIファイルを解析します');
        tracks = [];
        const header = parseHeader(data);
        parseTracks(data.subarray(8 + header.size));
        const tempo = importantBPM() ? inputBPM() : findTempo(tracks) || inputBPM();
        deltaToMs = 1000 * 60 / tempo / header.timeBase;
        await dialog('どのトラックを使う？');
        const checks = await selectTracks(tracks),
              events = joinWait(trim(makeMusic(tracks, checks)));
        await dialog(`イベントの数：${events.length}`);
        makeCode(events);
        console.log(debug.map);
    };
    const debug = (()=>{
        const map = new Map;
        const f = (...arr) => {
            const [a, b] = arr;
            if(arr.length === 1){
                if(map.has(a)) map.set(a, map.get(a) + 1);
                else map.set(a, 1);
            }
            else {
                if(!map.has(a)) map.set(a, []);
                map.get(a).push(b);
            }
        };
        f.map = map;
        return f;
    })();
    const toNum = arr => arr.reduce((p, x) => (p << 8) + x);
    const isEqual = (a, b) => JSON.stringify(a) === JSON.stringify(b);
    const parseHeader = data => {
        if(isEqual(data.subarray(0, 3), [0x4D, 0x54, 0x68, 0x64])) throw new Error('this is not MIDI header');
        return {
            size : toNum(data.subarray(4, 8)), // ヘッダのサイズ
            format : data[9], // SMFフォーマット
            trackSize : toNum(data.subarray(10, 12)), // トラック数
            timeType : data[12], // 時間管理
            timeBase : toNum(data.subarray(12, 14)) // 分解能
        };
    };
    let tracks;
    const parseTracks = data => {
        while(1){
            if(isEqual(data.subarray(0, 3), [0x4D, 0x54, 0x72, 0x6B])) throw new Error('this is not MIDI track');
            const size = toNum(data.subarray(4, 8)),
                  next = 8 + size,
                  track = data.subarray(8, next);
            tracks.push([]);
            parseTrackData(track);
            if(data.length <= next) break;
            data = data.subarray(next, data.length);
        }
    };
    const parseTrackData = data => {
        while(1){
            const [nextData, deltaTime] = getDeltaTime(data),
                  [nextData2, event] = getEvent(nextData);
            tracks[tracks.length - 1].push({deltaTime, event});
            if(nextData2.length === 0) break;
            data = nextData2;
        }
    };
    const getDeltaTime = data => {
        let deltaTime = 0,
            i = 0;
        while(1){
            const tmp = data[i++];
            deltaTime |= tmp & 0x7f; // 下位7bitを格納
            if((tmp & 0x80) === 0) break; // 最上位1bitが0ならデータ終了
            deltaTime <<= 7; // 次の下位7bit用にビット移動
        }
        return [data.subarray(i, data.length), deltaTime];
    };
    const getEvent = data => {
        const event = {};
        event.status = data[0]; // ステータスバイトを取得
        if(event.status === 0xFF){ // メタイベントの場合
            event.type = data[1]; // イベントタイプ
            event.size = toNum(data.subarray(2,3)); // メタイベントのデータ量は3バイト目に保持されている
            event.data = data.subarray(3,3+event.size); // データ
            data = data.subarray(3+event.size,data.length); // 残りの配列
        }
        else if(event.status >=0x80 && event.status <=0x9F){
            event.channel = event.status & 0xf; // チャンネル
            event.note = data[1]; // 音高は2バイト目
            event.velocity=data[2]; // ヴェロシティ
            data = data.subarray(3,data.length); // 残りの配列
        }
        return [data, event]; // 取得したイベントと配列の残りをリターン
    };
    const findTempo = tracks => {
        const MICROSECONDS_PER_MINUTE = 60000000;
        for(const track of tracks){
            for(const t of track){
                const {event} = t,
                      {status, type, data} = event;
                if(type === 0x51) return MICROSECONDS_PER_MINUTE / toNum(data);
            }
        }
    };
    const hChecks = $('<div>').appendTo(h);
    const selectTracks = tracks => {
        hChecks.empty();
        const arr = [];
        for(const [i,v] of tracks.entries()) arr.push(rpgen3.addInputBool(hChecks,{
            label: `チャンネル${i}　トラック数：${v.length}`,
            value: true
        }));
        return new Promise(resolve => addBtn(hChecks, '選択を確定', () => {
            hChecks.empty();
            resolve(arr.map(v => v()));
        }));
    };
    const makeMusic = (tracks, checks) => {
        const result = [],
              useIndex = checks.map((v,i) => v ? i : false).filter(v=>v !== false),
              index = checks.map(() => 0),
              totalTime = index.slice();
        let currentTime = 0;
        while(useIndex.length){
            let dt, idx, min = Infinity;
            for(const i of useIndex){
                const {deltaTime} = tracks[i][index[i]],
                      total = deltaTime + totalTime[i];
                if(total > min) continue;
                min = total;
                idx = i;
                dt = deltaTime;
            }
            totalTime[idx] += dt;
            const t = tracks[idx],
                  {deltaTime, event} = t[index[idx]],
                  {note, status, velocity, type, data} = event;
            if(deltaTime) {
                const total = totalTime[idx],
                      ms = (total - currentTime) * deltaToMs,
                      i = result.length - 1;
                if(isNaN(result[i])) result.push(ms);
                else result[i] += ms;
                currentTime = total;
            }
            switch(status & 0xF0){
                case 0x90: { // ノートオン
                    const v = 100 * velocity / 0x7F | 0;
                    if(!v) break;
                    const tone = note - 21;
                    if(inputMinTone - 1 > tone) break;
                    const id = getSoundId[tone];
                    if(id === void 0) break;
                    result.push(playSound(id, v));
                    break;
                }
                case 0xF0: { // メタイベント
                    break;
                }
                default:
                    debug(status.toString(16));
                    break;
            }
            if(++index[idx] >= t.length) useIndex.splice(useIndex.indexOf(idx), 1);
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
        const result = [];
        for(const v of arr){
            if(isNaN(v)) result.push(v);
            else {
                const ms = v | 0;
                if(ms > inputMin) result.push(wait(ms));
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
    const rpgen = await Promise.all([
        './export/rpgen.mjs',
        './export/fullEvent.mjs'
    ].map(v=>import(v))).then(v => Object.assign({},...v));
    const output = $('<div>').appendTo(h),
          mapData = await(await fetch('data.txt')).text();
    const makeCode = events => rpgen3.addInputStr(output.empty(),{
        value: rpgen.set(mapData.replace('$music$', `${startEvent}\n\n${new rpgen.FullEvent(10).make(events)}`.trim())),
        copy: true
    });
    const startEvent = new rpgen.FullEvent().make(['#CH_PH\np:0,x:0,y:0,'], 42, 3);
})();
