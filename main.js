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
        label: 'BPM',
        value: 120,
        max: 300,
        min: 30
    });
    $('<input>').appendTo(h).prop({
        type: 'file',
        accept: '.mid'
    }).on('change', e => {
        msg('読み込み中');
        const fr = new FileReader;
        fr.onload = () => load(new Uint8Array(fr.result)); // 型付配列に
        fr.readAsArrayBuffer(e.target.files[0]);
    });
    let tick;
    const load = async data => {
        await dialog('MIDIファイルを解析します');
        tracks = [];
        const header = parseHeader(data);
        tick = 60 / inputBPM / header.timeBase;
        parseTracks(data.subarray(8 + header.size));
        console.log(tracks)
        await dialog('どのトラックを使う？');
        const checks = await selectTracks(tracks),
              eventArr = checkTime(makeMusic(tracks, checks));
        await dialog(`イベントの数：${eventArr.length}`);
        console.log(eventArr)
        makeCode(eventArr.map(v=>`${v}\n${end}\n`));
    };
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
        let value = 0,
            i = 0;
        while(data[i] >= 0x80){ // 最上位ビットが1ならループ
            const a = data[i] ^ (1 << 7); // 1.最上位ビットのみ反転(例：1000 0001 => 0000 0001にする)
            value = value << 7 | a; // 2.valueに反転した値を保持しておく
            i++;
        }
        value = value | data[i]; // 最後の値を連結
        return [data.subarray(i + 1, data.length), value];
    }

    const getEvent = data => {
        const d = {};
        d.status = data[0]; // ステータスバイトを取得
        if(d.status === 0xFF){ // メタイベントの場合
            d.type = data[1]; // イベントタイプ
            d.size = toNum(data.subarray(2, 3)); // メタイベントのデータ量は3バイト目に保持されている
            d.data = data.subarray(3, 3 + d.size); // データ
            data = data.subarray(3 + d.size, data.length); // 残りの配列
        }
        else if(d.status >=0x80 && d.status <=0x9F){
            d.channel = d.status & 0xf; // チャンネル
            d.note = data[1]; // 音高は2バイト目
            d.velocity = data[2]; // ヴェロシティ
            data = data.subarray(3, data.length); // 残りの配列
        }
        return [data, d];
    };
    const hChecks = $('<div>').appendTo(h);
    const selectTracks = tracks => {
        hChecks.empty();
        const arr = [];
        for(const [i,v] of tracks.entries()) arr.push(rpgen3.addInputBool(hChecks,{
            label: `チャンネル${i}　トラック数：${v.length}`,
            value: true
        }));
        return new Promise(resolve => addBtn(hChecks, '選択を確定', () => resolve(arr.map(v => v()))));
    };
    const makeMusic = (tracks, checks) => {
        const result = [];
        let useIndex = checks.map((v,i)=>v&&i).filter(v=>v!==false),
            index = checks.map(() => 0);
        while(useIndex.length){
            let idx, min = Infinity;
            for(const i of useIndex){
                const time = tracks[i][index[i]].deltaTime;
                if(time > min) continue;
                min = time;
                idx = i;
            }
            const t = tracks[idx],
                  {deltaTime, event} = t[index[idx]],
                  {note, status, velocity} = event;
            if(deltaTime) {
                const time = deltaTime * tick,
                      lastIdx = result.length - 1;
                if(isNaN(result[lastIdx])) result.push(time);
                else result[lastIdx] += time;
            }
            switch(status & 0xF0){
                case 0x90: { // ノートオン
                    const v = velocity / 0x7F | 0;
                    if(!v) break;
                    const id = getSoundId[note - 21];
                    if(id === void 0) break;
                    result.push(playSound(id, v));
                    break;
                }
                default:
                    break;
            }
            if(++index[idx] >= t.length) useIndex = useIndex.filter(v => v !== idx);
        }
        return result;
    };
    const checkTime = eventArr => {
        const arr = [];
        for(const v of eventArr){
            if(isNaN(v)) arr.push(v);
            else {
                const vv = v | 0;
                if(vv > minTime) arr.push(wait(vv));
            }
        }
        return arr;
    };
    const playSound = (i, v) => `#PL_SD\ni:${i},v:${v},`,
          wait = t => `#WAIT\nt:${t},`,
          end = '#ED',
          minTime = 0;
    const getSoundId = (() => {
        const range = (start, end) => [...Array(end - start + 1).keys()].map(v => v + start);
        return [
            range(758, 821),
            range(1575, 1594),
            range(822, 825)
        ].flat();
    })();
    const output = $('<div>').appendTo(h),
          rpgen = await import('./rpgen.mjs'),
          mapData = await(await fetch('data.txt')).text();
    const makeCode = str => rpgen3.addInputStr(output.empty(),{
        value: mapData.replace('$music$', str),
        copy: true
    });
})();
