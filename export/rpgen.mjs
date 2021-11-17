import {getScript} from 'https://rpgen3.github.io/mylib/export/import.mjs';
getScript('https://cdnjs.cloudflare.com/ajax/libs/lz-string/1.4.4/lz-string.min.js');
const toStr = func => String(func).replace(/\/\/.*\n/g,'');
export const set = input => {
    const pass = Date.now().toString(16),
          mapText = input.split('\n').join(pass);
    const code = () => `avascript:(()=>{
    const copy = window.getCurrentMapText;
    window.getCurrentMapText = () => {
    window.getCurrentMapText = copy;
    return '${mapText}'.split('${pass}').join('\\n');
    };
    $('#idBtnDqEditEnd').click();
    })();`;
    return {
        valueOf: code,
        toString: code,
        data: LZString.compressToEncodedURIComponent(input)
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
