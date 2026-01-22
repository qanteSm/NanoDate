/**
 * NanoDate Locale Data
 * Calendar patterns and prepositions for multiple languages
 * 
 * Target: Tree-shakable locale data
 */

export const timePrepositions = {
    en: ' at ', tr: ' ', de: ' um ', fr: ' à ', es: ' a las ',
    it: ' alle ', pt: ' às ', nl: ' om ', pl: ' o ', sv: ' kl ',
    da: ' kl ', no: ' kl ', fi: ' klo ', ja: ' ', zh: ' ', ko: ' ',
    ar: ' ', ru: ' в ', uk: ' о ', cs: ' v ', hu: ' ', ro: ' la ',
    el: ' στις ', he: ' ב', th: ' ', vi: ' lúc ', id: ' pukul ',
    ms: ' pukul ', hi: ' ', bn: ' '
};

export const weekPatterns = {
    en: { last: 'Last {weekday}', next: 'Next {weekday}' },
    tr: { last: 'Geçen {weekday}', next: 'Gelecek {weekday}' },
    de: { last: 'Letzten {weekday}', next: 'Nächsten {weekday}' },
    fr: { last: '{weekday} dernier', next: '{weekday} prochain' },
    es: { last: 'El {weekday} pasado', next: 'El próximo {weekday}' },
    it: { last: '{weekday} scorso', next: '{weekday} prossimo' },
    pt: { last: '{weekday} passado', next: 'Próximo {weekday}' },
    ja: { last: '先週{weekday}', next: '来週{weekday}' },
    zh: { last: '上周{weekday}', next: '下周{weekday}' },
    ko: { last: '지난 {weekday}', next: '다음 {weekday}' },
    ar: { last: '{weekday} الماضي', next: '{weekday} القادم' },
    ru: { last: 'В прошлый {weekday}', next: 'В следующий {weekday}' },
    nl: { last: 'Afgelopen {weekday}', next: 'Volgende {weekday}' },
    pl: { last: 'Zeszły {weekday}', next: 'Następny {weekday}' },
    sv: { last: 'Förra {weekday}', next: 'Nästa {weekday}' },
    da: { last: 'Sidste {weekday}', next: 'Næste {weekday}' },
    no: { last: 'Forrige {weekday}', next: 'Neste {weekday}' },
    fi: { last: 'Viime {weekday}', next: 'Ensi {weekday}' },
    cs: { last: 'Minulý {weekday}', next: 'Příští {weekday}' },
    hu: { last: 'Múlt {weekday}', next: 'Következő {weekday}' },
    ro: { last: '{weekday} trecută', next: '{weekday} viitoare' },
    el: { last: 'Περασμένη {weekday}', next: 'Επόμενη {weekday}' },
    he: { last: '{weekday} שעبر', next: '{weekday} הבא' },
    th: { last: '{weekday}ที่แล้ว', next: '{weekday}หน้า' },
    vi: { last: '{weekday} tuần trước', next: '{weekday} tuần sau' },
    id: { last: '{weekday} lalu', next: '{weekday} depan' },
    ms: { last: '{weekday} lepas', next: '{weekday} depan' },
    hi: { last: 'पिछले {weekday}', next: 'अगله {weekday}' },
    bn: { last: 'গত {weekday}', next: 'আগামী {weekday}' },
    uk: { last: 'Минулої {weekday}', next: 'Наступної {weekday}' }
};
