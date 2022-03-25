const key = 'ABCDEFG',
      reg = /^([ABDEG])b([0-9])$/;
export const flat2sharp = note => {
    if(!reg.test(note)) return note;
    const [a, b, c] = note.match(reg);
    return key[(key.indexOf(b) + key.length - 1) % key.length] + '#' + c;
};
