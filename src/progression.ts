export interface Character { id:string; price:number; stats:{speed:number;gravity:number;attachRadius:number}; tradeoff:string; referenceSha256:string|null; }
export const CHARACTERS:readonly Character[]=[
 {id:'街灯客',price:600,stats:{speed:1,gravity:1,attachRadius:1},tradeoff:'baseline',referenceSha256:null},
 {id:'走绳伎',price:1800,stats:{speed:1.08,gravity:1.12,attachRadius:.94},tradeoff:'faster-but-heavier',referenceSha256:null},
 {id:'双钩客',price:4200,stats:{speed:.94,gravity:.9,attachRadius:1.12},tradeoff:'safer-but-slower',referenceSha256:null},
 {id:'提灯童',price:9000,stats:{speed:1.02,gravity:.86,attachRadius:1.04},tradeoff:'gentle-arc-lower-multiplier',referenceSha256:null},
 {id:'铁索僧',price:18000,stats:{speed:1.2,gravity:1.2,attachRadius:.86},tradeoff:'fast-but-tight',referenceSha256:null},
];
export function validateRosterTradeoffs():boolean { const b=CHARACTERS[0]!.stats; return CHARACTERS.slice(1).every(c=>c.stats.speed<b.speed||c.stats.gravity<b.gravity||c.stats.attachRadius<b.attachRadius); }
export interface Mission { id:string; title:string; reward:number; requires?:'endless'|'sky'; }
export function missionForProgress(p:{endlessUnlocked:boolean;skyUnlocked:boolean;characters:string[]}):Mission[] { return [
 {id:'gate-1',title:'通过 1 道门',reward:200}, {id:'gate-3',title:'通过 3 道门',reward:400}, {id:'combo-3',title:'连续 3 次华丽飞行',reward:200},
 ...(p.endlessUnlocked?[{id:'gate-5',title:'通过 5 道门',reward:600}]:[]), ...(p.skyUnlocked?[{id:'sky-1',title:'穿越一次天空段',reward:500,requires:'sky' as const}]:[])
 ]; }
