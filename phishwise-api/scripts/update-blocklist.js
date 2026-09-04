#!/usr/bin/env node
/**
 * Generate offline phishing blocklist from Phishing.Database.
 * Reads phishing-domains-ACTIVE.txt (and optionally phishing-links-ACTIVE.txt)
 * and writes src/detection/signals/phishing-blocklist.ts as a Set of registrable domains.
 *
 * Usage:
 *   node scripts/update-blocklist.js
 *   node scripts/update-blocklist.js --db "C:\\path\\to\\Phishing.Database-master" --limit 400000
 */

const fs = require('fs');
const path = require('path');

// --- registrable domain logic mirrors url-analyzer.ts ---
const TWO_LABEL_SUFFIXES = new Set([
  'com.ng', 'org.ng', 'gov.ng', 'edu.ng', 'net.ng', 'sch.ng',
  'co.uk', 'org.uk', 'gov.uk', 'ac.uk', 'me.uk',
  'co.za', 'com.au', 'net.au', 'org.au', 'co.nz', 'com.gh',
  'co.ke', 'com.br', 'co.in', 'com.gh', 'com.ng',
]);
function registrableDomain(host) {
  const labels = host.toLowerCase().split('.').filter(Boolean);
  if (labels.length <= 2) return labels.join('.');
  const lastTwo = labels.slice(-2).join('.');
  if (TWO_LABEL_SUFFIXES.has(lastTwo)) return labels.slice(-3).join('.');
  return labels.slice(-2).join('.');
}

function parseArgs() {
  const args = process.argv.slice(2);
  let db = 'C:\\Users\\alabu\\Documents\\Phishing.Database-master\\Phishing.Database-master';
  let limit = 400000;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--db' && args[i+1]) db = args[++i];
    if (args[i] === '--limit' && args[i+1]) limit = parseInt(args[++i], 10);
  }
  if (process.env.PHISH_DB) db = process.env.PHISH_DB;
  return { db, limit };
}

async function main() {
  const { db, limit } = parseArgs();
  const domainsPath = path.join(db, 'phishing-domains-ACTIVE.txt');
  const linksPath = path.join(db, 'phishing-links-ACTIVE.txt');

  if (!fs.existsSync(domainsPath)) {
    console.error(`DB not found: ${domainsPath}`);
    console.error(`Set --db path or PHISH_DB env`);
    process.exit(1);
  }

  const rawDomains = fs.readFileSync(domainsPath, 'utf8').split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
  console.log(`Read ${rawDomains.length} domains from ACTIVE`);

  const seen = new Set();
  const ipv4 = /^\d{1,3}(\.\d{1,3}){3}$/;

  // Exclusions: never blocklist known-legit, shorteners, or free-host suffixes themselves
  const EXCLUDE = new Set([
    // legit brands
    'gtbank.com','gtco.com','zenithbank.com','accessbankplc.com','firstbanknigeria.com','ubagroup.com','fcmb.com','sterling.ng','kuda.com','opayweb.com','palmpay.com','moniepoint.com',
    'mtn.ng','mtnonline.com','gloworld.com','airtel.com.ng','airtel.com','nimc.gov.ng',
    'paypal.com','microsoft.com','live.com','office.com','outlook.com','apple.com','icloud.com','google.com','gmail.com','amazon.com','facebook.com','instagram.com','whatsapp.com','netflix.com','dhl.com',
    'chase.com','wellsfargo.com','cibc.com','cibc.mobi','desjardins.com','scotiabank.com','tangerine.ca','atb.com','hsbc.com','hsbc.co.uk','santander.com','santander.co.uk','bmo.com','rbc.com',
    'github.com','google.com','mail.google.com','outlook.live.com','yahoo.com',
    // shorteners
    'bit.ly','tinyurl.com','t.co','goo.gl','ow.ly','is.gd','buff.ly','cutt.ly','rebrand.ly','shorturl.at','rb.gy','bit.do','tiny.cc','t.ly','v.gd','shorte.st','tiny.one','u.to',
    // free hosting suffixes themselves (we flag via separate signal, not blocklist)
    '000webhostapp.com','weebly.com','weeblysite.com','godaddysites.com','wixsite.com','workers.dev','pages.dev','vercel.app','netlify.app','web.app','firebaseapp.com','appspot.com','azurewebsites.net','cloudfront.net','s3.amazonaws.com','wcomhost.com','cf-ipfs.com','my.id','site123.me','business.site','000webhost.com',
    // common benign
    'com','net','org',
  ]);

  let added = 0;
  for (const line of rawDomains) {
    // line is like "example.com" or "sub.example.com/path" — take host part
    let host = line.split('/')[0].split(':')[0].trim().toLowerCase();
    // skip IPs (handled by url-ip-host already)
    if (ipv4.test(host) || host.includes('[')) continue;
    // skip entries with spaces or invalid
    if (!host.includes('.')) continue;
    // normalize to registrable
    try {
      const reg = registrableDomain(host);
      if (!reg || !reg.includes('.')) continue;
      if (EXCLUDE.has(reg)) continue;
      if (!seen.has(reg)) {
        seen.add(reg);
        added++;
        if (added >= limit) break;
      }
    } catch {}
  }

  // Optionally also harvest hosts from links (adds ~ extra coverage)
  if (fs.existsSync(linksPath)) {
    const rawLinks = fs.readFileSync(linksPath, 'utf8').split(/\r?\n/).slice(0, 200000);
    console.log(`Also scanning ${rawLinks.length} links for extra hosts`);
    for (const l of rawLinks) {
      try {
        const u = new URL(l);
        const host = u.hostname.toLowerCase();
        if (!host || ipv4.test(host) || host.startsWith('[')) continue;
        const reg = registrableDomain(host);
        if (!reg || EXCLUDE.has(reg)) continue;
        if (reg && !seen.has(reg)) {
          seen.add(reg);
          if (seen.size >= limit) break;
        }
      } catch {}
    }
  }

  console.log(`Final deduped registrable domains: ${seen.size}`);

  // Sort for deterministic output
  const sorted = Array.from(seen).sort();

  const outPath = path.join(__dirname, '..', 'src', 'detection', 'signals', 'phishing-blocklist.ts');
  const header = `/**
 * Offline phishing blocklist — AUTO-GENERATED. Do not edit by hand.
 * Source: Phishing.Database ACTIVE feed (${new Date().toISOString().slice(0,10)})
 * Entries: ${sorted.length}
 * Generated via: node scripts/update-blocklist.js --db "${db}" --limit ${limit}
 */
export const PHISHING_BLOCKLIST: Set<string> = new Set<string>([
`;

  const footer = `]);
`;

  // Write in chunks to avoid huge line
  const chunkSize = 5000;
  let body = '';
  for (let i = 0; i < sorted.length; i++) {
    body += `  '${sorted[i]}',\n`;
    // flush periodically for huge file (not needed but keeps memory low)
  }

  fs.writeFileSync(outPath, header + body + footer, 'utf8');
  console.log(`Wrote ${outPath} (${(fs.statSync(outPath).size/1024/1024).toFixed(2)} MB, ${sorted.length} entries)`);
  console.log('Done. Rebuild with: npm run build');
}

main().catch(e => { console.error(e); process.exit(1); });
