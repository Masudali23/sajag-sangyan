import { describe, expect, it } from 'vitest';
import fixture from './fixtures/metamorphic-development-v2.json';
import { analyzeClaim } from '../shared/engine';
import { assessRisk } from '../shared/risk';
import type { Language } from '../shared/types';

// Additional known development perturbations prompted by the external review.
// These reuse20 seeds and are not independent accuracy observations.
const lookalikes: Record<string,string> = {a:'а',e:'е',o:'ο',p:'р',c:'с',u:'υ',O:'Ο',P:'Р'};
const transforms: [string,(s:string)=>string][] = [
  ['soft-hyphen',s=>s.replace(/([\p{L}\p{M}])(?=[\p{L}\p{M}])/gu,'$1\u00ad')],
  ['combining-grapheme-joiner',s=>s.replace(/([\p{L}\p{M}])(?=[\p{L}\p{M}])/gu,'$1\u034f')],
  ['invisible-separator',s=>s.replaceAll(' ','\u2063 ')],
  ['emoji-word-boundary',s=>s.replaceAll(' ',' 🔥 ')],
  ['mixed-latin-lookalikes',s=>s.replace(/[aeopcuOP]/g,c=>lookalikes[c])],
  ['spaced-credential-aliases',s=>s.replace(/\b(?:OTP|UPI|PIN|CVV)\b/g,s=>s.split('').join(' '))],
];
const cases=fixture.items.filter(i=>i.variant==='plain').flatMap(i=>transforms.map(([kind,transform])=>({...i,id:i.id+'-'+kind,text:transform(i.text)})));
describe('reviewed obfuscation and cautions',()=>{
  it.each(cases)('$id',item=>{
    const result=analyzeClaim(item.text,item.language.split('-')[0] as Language);
    const attention=result.findings.filter(f=>f.severity==='attention').map(f=>f.id);
    if(item.group==='attention')expect(attention).toContain(item.category);
    else expect(attention).toEqual([]);
    expect(assessRisk(result).safetyEstablished).toBe(false);
  });
});

describe('quoted cautions cannot conceal a separate solicitation',()=>{
  it.each([
    ['credentials', 'A fake bank SMS says "send your OTP now". Never follow it. For our actual support, please "send your OTP to me".'],
    ['guarantee', 'This safety lesson says "never share your OTP". Do not follow scam instructions. Our own investment plan offers "guaranteed 3% daily returns". Join our plan.'],
    ['credentials', 'A safety exercise says "never share your OTP". Do not follow suspicious instructions. Our agent requests: "send your OTP now to receive the refund".'],
    ['release-fee', 'A fake message says "send your OTP". Never follow it. Our actual withdrawal desk says "pay the tax to release your withdrawal".'],
  ])('%s survives an unrelated quoted lesson', (category,text)=>{
    expect(analyzeClaim(text).findings.filter(f=>f.severity==='attention').map(f=>f.id)).toContain(category);
  });
});
