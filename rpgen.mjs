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
    $.post(dqSock.getRPGBase() + 'cons/writeMapText.php',{
        token: g_token,
        index: parseInt(dq.mapNum),
        mapText: (dq.bOpenScr ? '' : 'L1') + map,
    }).done(function(r){
        if ( r != 0 ) apprise("error");
    }).fail(function(){
        apprise("error");
    });
}
