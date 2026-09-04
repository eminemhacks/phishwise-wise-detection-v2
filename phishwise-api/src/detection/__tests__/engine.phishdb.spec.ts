/**
 * PhishDB validation — measures recall/false-positive after improvements.
 * Run: npm run test:detection:phishdb
 */
import { analyzeUrl, analyzeMessage } from '../detection.engine';
import * as fs from 'fs';
import * as path from 'path';

const dbBase = process.env.PHISH_DB || 'C:\\Users\\alabu\\Documents\\Phishing.Database-master\\Phishing.Database-master';

function verdictRank(v: string) { return ['Safe','Suspicious','Likely Phishing','Dangerous'].indexOf(v); }

async function main() {
  if (!fs.existsSync(path.join(dbBase, 'phishing-links-ACTIVE.txt'))) {
    console.log('Phishing.DB not found at', dbBase, '— skipping');
    process.exit(0);
  }
  const links = fs.readFileSync(path.join(dbBase, 'phishing-links-ACTIVE.txt'),'utf8').split(/\r?\n/).filter(Boolean);
  const domains = fs.readFileSync(path.join(dbBase, 'phishing-domains-ACTIVE.txt'),'utf8').split(/\r?\n/).filter(Boolean);

  let total=500;
  let counts:any={Safe:0,Suspicious:0,'Likely Phishing':0,Dangerous:0};
  let misses=0;
  for(let i=0;i<total;i++){
    const r = analyzeUrl(links[i]);
    counts[r.verdict]++;
    if(r.verdict==='Safe') misses++;
  }
  console.log(`\n500 ACTIVE links ->`, counts, `missRate ${(misses/total*100).toFixed(1)}% (target <15%)`);

  counts={Safe:0,Suspicious:0,'Likely Phishing':0,Dangerous:0};
  misses=0; total=500;
  for(let i=0;i<total;i++){
    const r = analyzeUrl('http://'+domains[i]+'/login');
    counts[r.verdict]++;
    if(r.verdict==='Safe') misses++;
  }
  console.log(`500 ACTIVE domains as http://domain/login ->`, counts, `missRate ${(misses/total*100).toFixed(1)}%`);

  // false positive check on benign
  const benign = ['https://www.google.com','https://www.gtbank.com/login','https://github.com','https://www.paypal.com/signin','https://www.microsoft.com','https://www.amazon.com/dp/B08N5WRWNW','https://mtn.ng','https://www.gtbank.com','https://facebook.com','https://netflix.com/browse'];
  let fp=0;
  for(const u of benign){
    const r=analyzeUrl(u);
    if(r.verdict!=='Safe') { fp++; console.log(`FP benign ${u} -> ${r.verdict} ${r.score} ${r.signals.map(s=>s.id).join(',')}`); }
  }
  console.log(`Benign FP ${fp}/${benign.length} (${(fp/benign.length*100).toFixed(1)}% target <3%)`);

  // tricky cases
  const tricky = [
    'https://secure-appleid.apple.com-verify.tk/login',
    'http://000000000a0uutlook.weebly.com',
    'http://162.241.69.15/login',
    'http://paypal.com@evil-login.xyz/verify',
    'https://bit.ly/3xTz9',
    'http://paypa1.com/login',
    'https://paypal-secure-login.com/',
    'http://gtbank-secure.tk/account/update',
    'https://microsoftonline-verify.cf/auth',
    'http://000025123.com/banks/cibc',
    'http://00003485.com/banks/tangerine',
    'https://organisasi.bulungan.go.id/phishing',
  ];
  console.log('\nTricky:');
  for(const u of tricky){ const r=analyzeUrl(u); console.log(`${u} -> ${r.verdict} ${r.score} [${r.signals.map(s=>s.id).join(',')}]`); }

  if (misses/total > 0.25) console.log('WARN: missRate still high — consider tuning');
  if (fp>0) console.log('WARN: false positives detected');
}

main();
