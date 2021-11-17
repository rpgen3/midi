import {getScript} from 'https://rpgen3.github.io/mylib/export/import.mjs';
getScript('https://cdnjs.cloudflare.com/ajax/libs/lz-string/1.4.4/lz-string.min.js');
const toStr = func => String(func).replace(/\/\/.*\n/g,'');
export const set = input => {
    const data = LZString.compressToEncodedURIComponent(input),
          code = () => 'avascript:(function(){var map="' + data + '";(' + toStr(write) + ')();})();';
    return {
        valueOf: code,
        toString: code,
        data
    };
};
export const get = () => "avascript:(" + toStr(getFile) + ")();";
function getFile(){
    var e = document.createElement("textarea");
    e.textContent = LZString.compressToEncodedURIComponent(g_dqFile);
    document.body.appendChild(e);
    e.select();
    document.execCommand('copy');
    document.body.removeChild(e);
    apprise('コピー完了');
}
function write(){
    var mapTextOld = map, mapText = LZString.compressToEncodedURIComponent(mapTextOld);
    if (mapTextOld != LZString.decompressFromEncodedURIComponent(mapText)) return apprise('out');
    if (dq.bOpenScr) mapText = mapTextOld
    else mapText = 'L1' + mapText
    $.ajax({
        type: 'POST',
        url: dqSock.getRPGBase() + 'cons/writeMap.php',
        async: false,
        data: {token: g_token, i: parseInt(dq.mapNum), m: mapText, p: ''},
    }).done(function(r){
        if ( r != 0 ){
            isError = true
            apprise('failed')
            g_oldWriteText = ''
        }
    }).fail(function(){
        isError = true
        apprise('failed')
        g_oldWriteText = ''
    })
}
