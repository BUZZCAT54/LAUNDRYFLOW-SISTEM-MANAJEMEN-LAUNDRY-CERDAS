import React from 'react';
import {ArrowUpRight,Check,Download,FileText,Printer} from 'lucide-react';
import {Button,EmptyState} from './ui';
import {dateLabel,money} from './mockData';
import './receipt-preview.css';

export function ReceiptPaper({receipt,settings}){
 if (!receipt) return null;
 const profile = settings?.profile || {};
 const prefs = settings?.receipt || {};
 const storeName = profile.name || 'Syaqil Laundry';
 const showLogo = prefs.showLogo !== false;
 const logo = showLogo ? (profile.logo || '/assets/logo.png') : null;
 const total = Number(receipt.total ?? receipt.amount ?? 0);
 const paid = Number(receipt.paid ?? total);
 const change = Math.max(0, paid - total);
 const rawWeight = receipt.weight ?? (receipt.items && receipt.items[0]?.quantity) ?? 1;
 const weight = Number(rawWeight) || 0;
 return <article className="receipt-document" aria-label={`Nota ${receipt.number || ''}`}>
  <header className="receipt-document-brand">
   <div className="receipt-document-logo">{logo&&<img src={logo} alt=""/>}<b>{storeName.toUpperCase()}</b></div>
   <div className="receipt-document-brand-info">
    <span>{prefs.showAddress!==false&&profile.address?profile.address:'Bersih · Cepat · Praktis'}</span>
    {prefs.showPhone!==false&&profile.phone&&<small>{`Telp.\u00a0${profile.phone}`}</small>}
   </div>
  </header>
  <div className="receipt-document-heading"><span>NOTA PEMBAYARAN</span><span className="receipt-document-paid"><Check size={12} aria-hidden="true"/>{receipt.payment_status === 'unpaid' ? 'Belum Lunas' : 'Lunas'}</span></div>
  <dl className="receipt-document-meta">
   <div><dt>Nomor nota</dt><dd>{receipt.number || '-'}</dd></div>
   <div><dt>Tanggal</dt><dd>{dateLabel(receipt.date)} <span>· {receipt.time || ''}</span></dd></div>
   <div><dt>Pelanggan</dt><dd className="receipt-document-customer">{receipt.customer || '-'}</dd></div>
   {prefs.showCashier!==false&&receipt.employee&&<div><dt>Kasir</dt><dd>{receipt.employee}</dd></div>}
  </dl>
  <section className="receipt-document-service" aria-label="Rincian layanan"><div><span>Layanan</span><span>Jumlah</span></div><div><b>{receipt.service || 'Cucian'}</b><b>{money(total)}</b></div><small>{weight.toLocaleString('id-ID',{maximumFractionDigits:3})} kg cucian</small></section>
  <div className="receipt-document-total"><span>Total pembayaran</span><strong>{money(total)}</strong></div>
  <dl className="receipt-document-payment">
   <div><dt>Metode pembayaran</dt><dd>{receipt.method || 'Tunai'}</dd></div>
   <div><dt>Jumlah dibayar</dt><dd>{money(paid)}</dd></div>
   <div><dt>Kembalian</dt><dd>{money(change)}</dd></div>
  </dl>
  <footer><b>{(prefs.footer||'Terima kasih sudah mempercayakan cucian Anda kepada kami.').split('\n')[0]}</b><small>Nota {storeName}</small></footer>
 </article>;
}

export default function ReceiptPreview({receipt,settings,pdfBusy,onPdf,onPrint,onDetail}){
 return <section className="ow-receipt-preview receipt-preview" aria-labelledby="receipt-preview-title">
  <header className="receipt-preview-header"><span className="receipt-preview-icon"><FileText size={21} aria-hidden="true"/></span><div><h2 id="receipt-preview-title">Preview Nota</h2><p>Ringkasan transaksi yang dipilih</p></div></header>
  {receipt?<>
   <div className="receipt-preview-stage"><ReceiptPaper receipt={receipt} settings={settings}/></div>
   <div className="receipt-preview-actions"><Button icon={Download} loading={pdfBusy} onClick={onPdf}>Download PDF</Button><Button icon={Printer} variant="secondary" onClick={onPrint}>Cetak Ulang</Button></div>
   <button className="receipt-preview-detail" onClick={onDetail}>Lihat detail transaksi<ArrowUpRight size={16} aria-hidden="true"/></button>
  </>:<EmptyState icon={FileText} title="Belum ada nota dipilih" description="Pilih nota dari daftar atau sesuaikan filter untuk melihat ringkasan transaksi."/>}
 </section>;
}
