import assert from 'node:assert/strict';
import {test} from 'node:test';
import {initialCustomers,initialReceipts,dashboardPeriods,validateCustomer,parseCustomerCsv} from '../../src/owner/mockData.js';

test('fixture IDs and receipt numbers remain unique for selection and pagination',()=>{
 assert.equal(new Set(initialCustomers.map(row=>row.id)).size,124);
 assert.equal(new Set(initialReceipts.map(row=>row.number)).size,286);
 assert.equal(initialCustomers.filter(row=>row.category==='Member').length,38);
 assert.equal(initialReceipts.filter(row=>row.date==='2026-10-06').length,24);
 assert.equal(initialReceipts.filter(row=>row.status==='Dicetak Ulang').length,18);
});
test('dashboard status and service distributions account for every transaction',()=>{
 for(const period of Object.values(dashboardPeriods)){
  assert.equal(period.status.reduce((a,b)=>a+b,0),period.transactions);
  assert.equal(period.services.reduce((a,b)=>a+b,0),period.transactions);
  assert.ok(period.expense<=period.revenue);
 }
});
test('WhatsApp normalization prevents duplicate 08 and +62 representations',()=>{
 const values={name:'Nama Uji',phone:'+62 852 7712 9011',email:''};
 assert.equal(validateCustomer(values,initialCustomers).errors.phone,'Nomor WhatsApp sudah dipakai pelanggan lain.');
 assert.deepEqual(validateCustomer(values,initialCustomers,1),{errors:{},phone:'085277129011'});
 assert.ok(validateCustomer({...values,phone:'8123',email:'email-salah'},[]).errors.email);
});
test('CSV supports quoted commas, escaped quotes, line breaks, optional alamat, and BOM',()=>{
 const rows=parseCustomerCsv('\uFEFFnama,whatsapp,email\r\n"Dina ""Putri""",081277770099,dina@example.com');
 assert.equal(rows[0].nama,'Dina "Putri"');
 assert.equal(rows[0].email,'dina@example.com');
 assert.equal(parseCustomerCsv('nama;whatsapp;catatan\nDina;081277770099;VIP')[0].whatsapp,'081277770099');
});
test('CSV rejects missing required columns, incomplete quotes and empty imports',()=>{
 assert.throws(()=>parseCustomerCsv('nama,email\nDina,dina@example.com'),/whatsapp/);
 assert.throws(()=>parseCustomerCsv('nama,whatsapp\n"Dina,0812'),/kutip/);
 assert.throws(()=>parseCustomerCsv('nama,whatsapp'),/tidak memiliki data/);
});
