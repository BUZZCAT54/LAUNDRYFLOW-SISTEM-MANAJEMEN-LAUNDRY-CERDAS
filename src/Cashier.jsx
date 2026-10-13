import React,{useState,useEffect} from 'react';
import {UserRound,Plus,Trash2,Minus,Wallet,Banknote,QrCode,Landmark,Zap,Clock3,Shirt,Check,UserPlus,ArrowRight,Printer,ClipboardList,ChevronDown} from 'lucide-react';
import {api,rupiah,localPhone,methodName} from './lib';
import {Modal,Receipt,ErrorBox} from './components';
import {ReferenceBanner} from './ReferenceUI';
import './cashier-reference.css';

const blank=()=>({customer_id:'',items:[],paid:'',method:'cash',notes:'',request_key:crypto.randomUUID()});
export default function Cashier({data,user,onOrder,onCustomer,print,toast}) {
 const storageKey='syaqil-draft-'+user.id;
 const [draft,setDraft]=useState(()=>{try{
  const saved=JSON.parse(localStorage.getItem(storageKey));
  if(!saved)return blank();
  const {discount,discount_percent,...rest}=saved;
  return rest;
 }catch{return blank();}});
 const [selectedService,setSelectedService]=useState(Number((data.services[1]||data.services[0])?.id));
 const category='Kiloan';
 const [weight,setWeight]=useState('1');
 const [search,setSearch]=useState('');
 const [picker,setPicker]=useState(false);
 const [addCustomer,setAddCustomer]=useState(false);
 const [error,setError]=useState('');
 const [busy,setBusy]=useState(false);
 const [clearDialog,setClearDialog]=useState(false);
 const [confirmPayment,setConfirmPayment]=useState(false);
 const [success,setSuccess]=useState(null);
 const [storageWarning,setStorageWarning]=useState(false);
 const [conflict,setConflict]=useState(false);
 useEffect(()=>{try{localStorage.setItem(storageKey,JSON.stringify(draft));}catch{setStorageWarning(true);}},[draft,storageKey]);
 const change=patch=>{setDraft(d=>({...d,...patch}));setError('');};
 const customer=data.customers.find(c=>Number(c.id)===Number(draft.customer_id));
 const items=draft.items.map(i=>({...i,subtotal:Math.round(Number(i.quantity)*Number(i.price))}));
 const subtotal=items.reduce((n,i)=>n+i.subtotal,0);
 const total=subtotal,paid=Number(draft.paid||0),changeAmount=Math.max(0,paid-total);
 const selected=data.services.find(s=>Number(s.id)===selectedService);
 const invalidQty=items.some(i=>!/^\d{1,4}(\.\d{1,2})?$/.test(String(i.quantity))||Number(i.quantity)<=0||Number(i.quantity)>1000);
 const configured=draft.method==='cash'||(draft.method==='qris'?!!data.settings.qris_image:!!(data.settings.bank_name&&data.settings.bank_account&&data.settings.bank_holder));
 const paymentMethods=[['cash',Banknote,'Tunai'],['qris',QrCode,'QRIS'],['transfer',Landmark,'Transfer']];
 useEffect(()=>{if(!['cash','qris','transfer'].includes(draft.method))setDraft(current=>({...current,method:'cash'}));},[draft.method]);
 const canPay=customer&&items.length>0&&!invalidQty&&(draft.method!=='cash'||paid>=total)&&configured;
 function addItem(){
  if(!selected)return;
  if(!/^\d{1,4}(\.\d{1,2})?$/.test(weight)||Number(weight)<=0||Number(weight)>1000){setError('Masukkan berat lebih dari 0, maksimal 1.000, dengan maksimal 2 desimal.');return;}
  const existing=items.find(i=>i.service_id===selectedService&&i.category===category);
  const line={key:crypto.randomUUID(),service_id:selectedService,service_name:selected.name,price:Number(selected.price),unit:selected.unit,category,quantity:Number(weight)};
  const updated=existing?draft.items.map(i=>i.key===existing.key?{...i,quantity:Number((Number(i.quantity)+Number(weight)).toFixed(2))}:i):[...draft.items,line];
  change({items:updated}); toast(category+' ditambahkan ke pesanan.');
 }
 function setQty(key,value){change({items:draft.items.map(i=>i.key===key?{...i,quantity:value}:i)});}
 async function pay(confirmed=false){
  if(busy)return;
  if(!canPay){setError(!customer?'Pilih atau tambahkan pelanggan terlebih dahulu.':!items.length?'Tambahkan cucian ke daftar pesanan.':invalidQty?'Periksa berat/jumlah setiap item.':!configured?'Metode pembayaran ini belum dikonfigurasi.':'Jumlah dibayar masih kurang.');return;}
  if(draft.method!=='cash'&&!confirmed){setConfirmPayment(true);return;}
  setBusy(true);setError('');
  try{const response=await api('/orders',{...draft,discount_percent:0,confirmed,expected_total:total});onOrder(response.order);setSuccess(response.order);setConfirmPayment(false);setDraft(blank());setConflict(false);}catch(e){setError(e.message);setConflict(e.code==='draft_conflict');setConfirmPayment(false);}finally{setBusy(false);}
 }
 return <><div className="ref-cashier-page"><ReferenceBanner variant="cashier"/>
 <div className="pos-layout"><section className="pos-main">
 <div className="form-card"><div className="cashier-section-heading"><span className="cashier-step">1</span><div><h2>Pelanggan & layanan</h2><p>Data dasar untuk pesanan baru.</p></div></div>
 <div className="customer-picker"><label htmlFor="customer-search">Pelanggan <span>*</span></label><div className="input-icon"><UserRound size={19}/><input id="customer-search" placeholder="Cari nama atau nomor WhatsApp..." value={picker?search:(customer?.name||'')} onFocus={()=>{setPicker(true);setSearch('');}} onChange={e=>setSearch(e.target.value)} onKeyDown={e=>{if(e.key==='Escape')setPicker(false);}} autoComplete="off"/><button className="icon-button" title="Tambah pelanggan" aria-label="Tambah pelanggan" onClick={()=>{setPicker(false);setAddCustomer(true);}}><Plus size={19}/></button></div>{customer&&<p className="cashier-customer-hint">WhatsApp {localPhone(customer.phone)}</p>}{picker&&<><button className="picker-backdrop" aria-label="Tutup pencarian pelanggan" onClick={()=>setPicker(false)}/><div className="customer-options">{data.customers.filter(c=>(c.name+' '+c.phone+' '+localPhone(c.phone)).toLowerCase().includes(search.toLowerCase())).slice(0,6).map(c=><button key={c.id} onClick={()=>{change({customer_id:c.id});setPicker(false);}}><span className="customer-initial">{c.name[0]}</span><span><b>{c.name}</b><small>{localPhone(c.phone)}</small></span>{Number(c.id)===Number(draft.customer_id)&&<Check size={15}/>}</button>)}<button className="add-customer-option" onClick={()=>{setPicker(false);setAddCustomer(true);}}><UserPlus size={18}/> Tambah pelanggan baru</button></div></>}</div>
 <div className="section-label"><h3>Pilih layanan</h3><span>Harga per {selected?.unit||'kg'}</span></div><div className="service-grid">{data.services.map((s,index)=>{const Icon=[Shirt,Clock3,Zap][index%3];return <button key={s.id} className={'service-card '+(selectedService===Number(s.id)?'selected':'')} onClick={()=>setSelectedService(Number(s.id))} aria-pressed={selectedService===Number(s.id)}><Icon size={27}/><span><b>{s.name}</b><small>{rupiah(s.price)} / {s.unit}</small></span></button>;})}</div>
 <div className="cashier-add-row"><div className="ref-weight-field"><label htmlFor="weight">Berat cucian</label><div className="weight-input"><button type="button" aria-label="Kurangi berat" onClick={()=>setWeight(String(Math.max(0.1,Number((Number(weight)-0.5).toFixed(2)))))}><Minus size={16}/></button><input id="weight" type="number" min="0.01" max="1000" step="0.01" value={weight} onChange={e=>setWeight(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')addItem();}}/><span>{selected?.unit||'kg'}</span><button type="button" aria-label="Tambah berat" onClick={()=>setWeight(String(Math.min(1000,Number((Number(weight)+0.5).toFixed(2)))))}><Plus size={16}/></button></div></div><button className="primary cashier-add-button" onClick={addItem}><Plus size={18}/> Tambah ke daftar</button></div></div>
 <div className="order-card"><div className="cashier-section-heading"><span className="cashier-step">2</span><div><h2>Daftar cucian <small>{items.length} layanan</small></h2><p>Periksa berat dan subtotal sebelum dibayar.</p></div>{items.length>0&&<button className="danger-link" onClick={()=>setClearDialog(true)}><Trash2 size={15}/> Hapus semua</button>}</div><div className="table-scroll"><table className="cart-table"><thead><tr><th>Layanan</th><th>Berat</th><th>Subtotal</th><th><span className="sr-only">Aksi</span></th></tr></thead><tbody>{items.map(i=><tr key={i.key}><td><div className="cart-item"><span><b>{i.service_name}</b><small>{i.category&&i.category!=='Kiloan'?i.category+' · ':''}{rupiah(i.price)} / {i.unit}</small></span></div></td><td><div className="ref-cart-weight"><input aria-label={'Berat '+i.service_name+(i.category!=='Kiloan'?' '+i.category:'')} type="number" min="0.01" max="1000" step="0.01" value={i.quantity} onChange={e=>setQty(i.key,e.target.value)}/><span>{i.unit}</span></div></td><td><b>{rupiah(i.subtotal)}</b></td><td><button className="icon-button delete" aria-label={'Hapus '+i.service_name+(i.category!=='Kiloan'?' '+i.category:'')} onClick={()=>change({items:draft.items.filter(item=>item.key!==i.key)})}><Trash2 size={17}/></button></td></tr>)}</tbody></table>{!items.length&&<div className="cart-empty"><ClipboardList size={29}/><b>Daftar cucian masih kosong</b><span>Pilih layanan dan isi berat cucian di atas.</span></div>}</div><details className="cashier-notes" open={!!draft.notes||undefined}><summary><span>Catatan laundry {draft.notes?'· tersimpan':'· opsional'}</span><ChevronDown size={17}/></summary><textarea id="notes" aria-label="Catatan laundry" rows="2" maxLength="1000" placeholder="Contoh: pisahkan pakaian putih atau perhatikan noda di kerah." value={draft.notes} onChange={e=>change({notes:e.target.value})}/></details></div>
 {storageWarning&&<ErrorBox message="Draft tidak dapat disimpan di browser ini. Jangan tutup halaman sebelum menyelesaikan transaksi."/>}</section>
 <aside className="payment-column"><div className="payment-card"><div className="cashier-section-heading"><span className="cashier-step">3</span><div><h2>Pembayaran</h2><p>Ringkasan transaksi</p></div></div><div className="summary-line"><span>Subtotal</span><b>{rupiah(subtotal)}</b></div><div className="total-highlight"><b>Total bayar</b><strong>{rupiah(total)}</strong></div><h3 className="payment-heading">Metode pembayaran</h3><div className="payment-methods">{paymentMethods.map(([key,Icon,label])=><button key={key} onClick={()=>change({method:key})} className={draft.method===key?'selected':''} aria-pressed={draft.method===key}><Icon size={23}/><b>{label}</b></button>)}</div>{draft.method==='cash'?<><div className="summary-line paid-line"><label htmlFor="paid">Jumlah dibayar</label><div className="money-input"><span>Rp</span><input id="paid" placeholder="0" type="number" min="0" step="1" value={draft.paid} onChange={e=>change({paid:e.target.value})}/></div></div><div className="summary-line change-line"><span>{paid>0&&paid<total?'Kekurangan':'Kembalian'}</span><b className={paid>0&&paid<total?'amount-short':''}>{rupiah(paid>0&&paid<total?total-paid:changeAmount)}</b></div></>:<div className="payment-info">{!configured?<><b>{draft.method==='qris'?'QRIS':'Rekening transfer'} belum diatur</b><p>Minta owner mengatur {draft.method==='qris'?'kode QRIS merchant':'rekening tujuan'}. Gunakan tunai untuk transaksi ini.</p></>:draft.method==='qris'?<><img className="qris-image" src={data.settings.qris_image} alt="Kode QRIS merchant Syaqil Laundry"/><p>Periksa pembayaran masuk sebelum konfirmasi.</p></>:<><b>{data.settings.bank_name}</b><strong>{data.settings.bank_account}</strong><p>a.n. {data.settings.bank_holder}</p><p>Periksa mutasi rekening sebelum konfirmasi.</p></>}</div>}<ErrorBox message={error}/><button className="primary payment-cta" disabled={busy||(!configured&&draft.method!=='cash')} onClick={()=>pay()}><Wallet size={21}/>{busy?'Menyimpan...':'Proses pembayaran'}<ArrowRight size={20}/></button><p className="cashier-payment-footnote">Nota dapat dilihat dan dicetak lagi di Riwayat Nota.</p></div></aside></div></div>
 {conflict&&<Modal title="Periksa transaksi sebelumnya" onClose={()=>setConflict(false)}><p>{error}</p><p>Jika ini memang pesanan yang berbeda, buat nomor baru. Semua isian draft akan dipertahankan.</p><div className="modal-actions"><button className="secondary" onClick={()=>setConflict(false)}>Periksa dulu</button><button className="primary" onClick={()=>{change({request_key:crypto.randomUUID()});setConflict(false);}}>Buat nomor baru</button></div></Modal>}
 {addCustomer&&<CustomerForm onClose={()=>setAddCustomer(false)} onSaved={c=>{onCustomer(c);change({customer_id:c.id});setAddCustomer(false);toast('Pelanggan berhasil ditambahkan.');}}/>}
 {clearDialog&&<Modal title="Hapus semua item?" onClose={()=>setClearDialog(false)}><p>Semua item pada draft ini akan dihapus. Data pelanggan tetap tersimpan.</p><div className="modal-actions"><button className="secondary" onClick={()=>setClearDialog(false)}>Batal</button><button className="danger-button" onClick={()=>{change({items:[]});setClearDialog(false);}}>Hapus item</button></div></Modal>}
 {confirmPayment&&<Modal title="Konfirmasi pembayaran" onClose={()=>!busy&&setConfirmPayment(false)}><div className="confirmation-total">{rupiah(total)}</div><p>Pastikan pembayaran {methodName[draft.method]} sudah benar-benar masuk ke rekening merchant. Transaksi akan dicatat lunas setelah konfirmasi.</p><div className="modal-actions"><button className="secondary" disabled={busy} onClick={()=>setConfirmPayment(false)}>Periksa kembali</button><button className="primary" disabled={busy} onClick={()=>pay(true)}>{busy?'Menyimpan...':'Dana sudah diterima'}</button></div></Modal>}
 {success&&<Modal title="Pembayaran berhasil" onClose={()=>setSuccess(null)}><div className="success-heading"><span><Check size={30}/></span><h3>Pesanan berhasil disimpan!</h3><p>{success.number} · {success.customer_name}</p></div><div className="success-receipt"><Receipt order={success} settings={data.settings}/></div><div className="modal-actions"><button className="secondary" onClick={()=>print(success)}><Printer size={16}/> Cetak nota</button><button className="primary" onClick={()=>setSuccess(null)}><Plus size={16}/> Transaksi baru</button></div></Modal>}</>;
}
export function CustomerForm({onClose,onSaved}){
 const [form,setForm]=useState({name:'',phone:''});const[error,setError]=useState('');const[busy,setBusy]=useState(false);
 async function submit(e){e.preventDefault();setBusy(true);setError('');try{const r=await api('/customers',form);onSaved(r.customer);}catch(e){setError(e.message);}finally{setBusy(false);}}
 return <Modal title="Tambah pelanggan baru" onClose={()=>!busy&&onClose()}><p className="modal-description">Simpan data pelanggan untuk transaksi berikutnya.</p><form onSubmit={submit} className="customer-form"><label htmlFor="new-name">Nama pelanggan *</label><input id="new-name" required minLength="2" maxLength="100" autoFocus placeholder="Nama lengkap" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/><label htmlFor="new-phone">No. WhatsApp *</label><input id="new-phone" required type="tel" placeholder="0812 3456 7890" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/><ErrorBox message={error}/><div className="modal-actions"><button className="secondary" type="button" disabled={busy} onClick={onClose}>Batal</button><button className="primary" disabled={busy}>{busy?'Menyimpan...':'Simpan pelanggan'}</button></div></form></Modal>;
}
