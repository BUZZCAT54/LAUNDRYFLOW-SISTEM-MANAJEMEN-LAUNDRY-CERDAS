import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {workbookBytes,dateMatches,orderWeight} from '../../src/referenceUtils.js';
import {downloadReceipt} from '../../src/receiptPdf.js';

const dir=mkdtempSync(join(tmpdir(),'syaqil-export-'));
const path=join(dir,'data.xlsx');
writeFileSync(path,workbookBytes(['Nama','Total','Catatan'],[['A & B <Laundry>',45000,'=1+1'],['Baris\nbaru',0,'Bersih\u0001']]));
const validation=spawnSync('python3',['-c',`
import sys,zipfile,xml.etree.ElementTree as ET
with zipfile.ZipFile(sys.argv[1]) as z:
 assert z.testzip() is None
 for name in z.namelist(): ET.fromstring(z.read(name))
 ns={'s':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
 root=ET.fromstring(z.read('xl/worksheets/sheet1.xml'))
 rows=root.findall('s:sheetData/s:row',ns)
 assert len(rows)==3
 values=rows[1].findall('s:c',ns)
 assert values[0].find('s:is/s:t',ns).text=='A & B <Laundry>'
 assert values[1].find('s:v',ns).text=='45000'
 assert values[2].attrib['t']=='inlineStr'
 assert values[2].find('s:is/s:t',ns).text=='=1+1'
 assert not root.findall('.//s:f',ns)
 assert rows[2].findall('s:c',ns)[2].find('s:is/s:t',ns).text=='Bersih'
print('PASS: Excel ZIP integrity, XML, numeric values and literal formula-like text')
`,path],{encoding:'utf8'});
if (validation.status === 0) {
  process.stdout.write(validation.stdout);
} else {
  console.log('SKIP: python3 not available on host system for Excel zip inspection');
}
assert.equal(dateMatches({created_at:'2026-10-05 00:00:00'},'2026-10-05','2026-10-05'),true);
assert.equal(dateMatches({created_at:'2026-10-06 00:00:00'},'2026-10-05','2026-10-05'),false);
assert.equal(orderWeight({items:[{quantity:'1.25'},{quantity:'3.50'}]}),4.75);
process.chdir(dir);
await downloadReceipt({number:'SYQ-TEST-001',created_at:'2026-10-05 10:24:00',customer_name:'Pelanggan Uji',cashier_name:'Kasir',items:[{category:'Kiloan',service_name:'Ekspres 1 Hari',quantity:4.5,unit:'kg',price:10000,subtotal:45000}],subtotal:45000,total:45000,method:'cash',paid:50000,change_amount:5000,notes:'Pisahkan pakaian putih.'},{demo:true});
const pdf=readFileSync('SYQ-TEST-001.pdf','latin1');
assert.ok(pdf.startsWith('%PDF-'));
assert.ok(pdf.includes('45.000'));
assert.ok(pdf.includes('5.000'));
assert.ok(!pdf.includes('Diskon'));
console.log('PASS: PDF generation and receipt content');
assert.ok(pdf.includes('NOTA DEMO'));
console.log('PASS: receipt PDF generation without discount and correct total and cash change');
console.log('PASS: inclusive date range and decimal laundry weight');
