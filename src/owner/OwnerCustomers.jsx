import React,{useEffect,useState} from 'react';
import {CalendarDays,ClipboardList,Copy,Crown,Mail,MapPin,MoreHorizontal,MoreVertical,Pencil,Plus,Smartphone,Star,Trash2,UsersRound,WalletCards,Zap} from 'lucide-react';
import {Button,Drawer,EmptyState,Input,Modal,Select,Textarea} from './ui';
import {Avatar,Category,Metric,PageBanner,Pagination,PrototypeFooter,SearchField} from './OwnerComponents';
import {dateLabel,money,phoneLabel,validateCustomer} from './mockData';
import {ownerApi} from './api';

const BLANK={name:'',phone:'',email:'',notes:''};

function CustomerEditor({customer,customers,busy,onClose,onSave}){
 const [values,setValues]=useState(customer||BLANK),[errors,setErrors]=useState({});
 function submit(event){event.preventDefault();const result=validateCustomer(values,customers,customer?.id);setErrors(result.errors);if(!Object.keys(result.errors).length)onSave({...values,name:values.name.trim(),phone:result.phone});}
 const field=key=>({value:values[key],onChange:event=>setValues({...values,[key]:event.target.value}),error:errors[key]});
 return <Modal open onClose={onClose} title={customer?'Edit data pelanggan':'Tambah pelanggan'} description="Perubahan pelanggan disimpan ke database." footer={<><Button variant="secondary" onClick={onClose}>Batal</Button><Button type="submit" form="owner-customer-form" loading={busy}>Simpan Pelanggan</Button></>}><form id="owner-customer-form" onSubmit={submit} noValidate className="ow-form"><Input label="Nama pelanggan *" autoComplete="name" maxLength={80} {...field('name')}/><Input label="No. WhatsApp *" type="tel" autoComplete="tel" placeholder="08xx xxxx xxxx" {...field('phone')}/><Input label="Email" type="email" autoComplete="email" {...field('email')}/><Textarea label="Catatan" rows={2} maxLength={500} {...field('notes')}/></form></Modal>;
}

function CustomerDetail({customer,receipts,edit,remove,saveNote,notify}){
 const [tab,setTab]=useState('Informasi'),[note,setNote]=useState(customer.notes);
 useEffect(()=>{setTab('Informasi');},[customer.id]);
 useEffect(()=>{setNote(customer.notes);},[customer.id,customer.notes]);
 const history=receipts.filter(row=>String(row.customer||'').toLowerCase()===String(customer.name||'').toLowerCase());
 async function copy(value){try{await navigator.clipboard.writeText(value);notify('Informasi pelanggan disalin.');}catch{notify('Belum dapat menyalin. Pilih dan salin teks secara manual.');}}
 return <div className="ow-customer-detail"><header className="ow-customer-identity"><Avatar name={customer.name} id={customer.id-1} large/><div><h2>{customer.name}</h2></div><button className="ow-icon-button" aria-label="Edit pelanggan terpilih" onClick={()=>edit(customer)}><MoreVertical size={21}/></button></header><div className="ow-detail-tabs" role="tablist" aria-label="Detail pelanggan">{['Informasi','Riwayat','Catatan'].map(value=><button key={value} role="tab" aria-selected={tab===value} aria-controls="customer-tab-panel" id={`customer-tab-${value}`} className={tab===value?'is-active':''} onClick={()=>setTab(value)} onKeyDown={e=>{if(['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();const tabs=['Informasi','Riwayat','Catatan'],next=tabs[(tabs.indexOf(value)+(e.key==='ArrowRight'?1:2))%3];setTab(next);document.getElementById(`customer-tab-${next}`)?.focus();}}}>{value}</button>)}</div><div className="ow-detail-body" role="tabpanel" id="customer-tab-panel" aria-labelledby={`customer-tab-${tab}`}>
 {tab==='Informasi'?<><div className="ow-contact-info">{[[Smartphone,'No. HP',phoneLabel(customer.phone),customer.phone],[Mail,'Email',customer.email||'Belum diisi',customer.email]].map(([Icon,label,value,raw])=><div className="ow-contact-row" key={label}><Icon size={20}/><div><span>{label}</span><p>{value}</p></div>{raw&&<button aria-label={`Salin ${label}`} className="ow-icon-button" onClick={()=>copy(raw)}><Copy size={15}/></button>}</div>)}</div><div className="ow-contact-totals">{[[ClipboardList,'Total Transaksi',`${customer.transactions} transaksi`],[WalletCards,'Total Pengeluaran',money(customer.spent)],[CalendarDays,'Terakhir Transaksi',dateLabel(customer.last,true)]].map(([Icon,label,value])=><div className="ow-contact-row" key={label}><Icon size={21}/><div><span>{label}</span><p>{value}</p></div></div>)}</div></>:tab==='Riwayat'?history.length?<div className="ow-customer-history">{history.slice(0,10).map(row=><article key={row.id}><b>{row.number}</b><span>{row.service} · {dateLabel(row.date)}</span><strong>{money(row.total??row.amount??0)}</strong></article>)}<small>Riwayat transaksi pelanggan yang tercatat di basis data.</small></div>:<EmptyState title="Belum ada transaksi" description="Pelanggan ini belum memiliki riwayat nota di basis data."/>:<div className="ow-form"><Textarea label="Catatan pelanggan" value={note} onChange={e=>setNote(e.target.value)} rows={6} maxLength={500}/><Button onClick={()=>saveNote(customer.id,note)}>Simpan Catatan</Button></div>}
 </div><footer className="ow-customer-detail-actions"><Button icon={Pencil} variant="secondary" onClick={()=>edit(customer)}>Edit Data</Button><Button icon={Trash2} variant="danger" onClick={()=>remove(customer)}>Hapus Pelanggan</Button></footer></div>;
}

export default function OwnerCustomers({customers,setCustomers,receipts,notify,initialQuery=''}){
 const monthPrefix=new Date().toISOString().slice(0,7);
 const [search,setSearch]=useState(initialQuery),[sort,setSort]=useState('default'),[page,setPage]=useState(1),[selectedId,setSelectedId]=useState(customers[0]?.id);
 const [editor,setEditor]=useState(null),[deleting,setDeleting]=useState(null),[busy,setBusy]=useState(false),[small,setSmall]=useState(()=>innerWidth<1050),[drawerOpen,setDrawerOpen]=useState(false);
 useEffect(()=>{setSearch(initialQuery);setPage(1);},[initialQuery]);
 useEffect(()=>{const resize=()=>setSmall(innerWidth<1050);addEventListener('resize',resize);return()=>removeEventListener('resize',resize);},[]);
 const filtered=customers.filter(row=>[row.name,row.phone,row.email||''].join(' ').toLowerCase().includes(search.trim().toLowerCase())).sort((a,b)=>sort==='active'?(b.transactions||0)-(a.transactions||0):sort==='name'?(a.name||'').localeCompare(b.name||''):sort==='newest'?(b.joined||'').localeCompare(a.joined||''):0);
 const current=Math.min(page,Math.max(1,Math.ceil(filtered.length/10))),visible=filtered.slice((current-1)*10,current*10),selected=filtered.find(row=>row.id===selectedId)||visible[0];
 const mostActive=[...customers].sort((a,b)=>(b.transactions||0)-(a.transactions||0))[0];
 function mapCustomer(c,extra={}){const cnt=Number(c.order_count??extra.transactions??0),last=c.last_order?String(c.last_order).slice(0,10):'';return {...extra,...c,order_count:cnt,transactions:cnt,spent:Number(c.total_spent??extra.spent??0),last_order:c.last_order||'',last,joined:(c.created_at||'').slice(0,10)||new Date().toISOString().slice(0,10),notes:c.notes||'',email:c.email!==undefined?(c.email||''):(extra.email||'')};}
 function change(setter,value){setter(value);setPage(1);}
 function choose(customer){setSelectedId(customer.id);if(small)setDrawerOpen(true);}
 async function save(values){
  if(busy)return;
  setBusy(true);
  try{
   if(editor.customer){
    const res=await ownerApi(`/customers/${editor.customer.id}`,{name:values.name,phone:values.phone,email:values.email||'',notes:values.notes||''});
    const updated=mapCustomer(res.customer,editor.customer);
    setCustomers(rows=>rows.map(row=>row.id===updated.id?updated:row));
    notify('Data pelanggan berhasil diperbarui.');
   }else{
    const res=await ownerApi('/customers',{name:values.name,phone:values.phone,email:values.email||'',notes:values.notes?.trim()||''});
    const created=mapCustomer(res.customer);
    setCustomers(rows=>[created,...rows]);setSelectedId(created.id);setSearch('');setSort('default');setPage(1);
    notify('Pelanggan ditambahkan ke database.');
   }
   setEditor(null);
  }catch(err){notify(err.message||'Gagal menyimpan pelanggan.');}finally{setBusy(false);}
 }
 async function saveNote(id,notes){const target=customers.find(row=>row.id===id);if(!target)return;try{const res=await ownerApi(`/customers/${id}`,{name:target.name,phone:target.phone,email:target.email||'',notes});const updated=mapCustomer(res.customer,target);setCustomers(rows=>rows.map(row=>row.id===id?updated:row));notify('Catatan pelanggan disimpan.');}catch(err){notify(err.message||'Gagal menyimpan catatan.');}}
 async function confirmDelete(){
  if(!deleting||busy)return;
  setBusy(true);
  try{
   await ownerApi(`/customers/${deleting.id}`,undefined,{method:'DELETE'});
   setCustomers(rows=>{const next=rows.filter(r=>r.id!==deleting.id);if(selectedId===deleting.id)setSelectedId(next[0]?.id??null);return next;});
   setChecked(ids=>ids.filter(id=>id!==deleting.id));
   setDeleting(null);
   notify('Pelanggan dihapus dari database.');
  }catch(err){notify(err.message||'Gagal menghapus pelanggan.');}finally{setBusy(false);}
 }
 const detail=selected?<CustomerDetail customer={selected} receipts={receipts} edit={customer=>setEditor({customer})} remove={customer=>{if((customer.transactions||0)>0){notify('Pelanggan yang sudah memiliki transaksi tidak dapat dihapus demi menjaga histori nota.');return;}setDeleting(customer);}} notify={notify} saveNote={saveNote}/>:<EmptyState title="Pilih pelanggan" description="Detail pelanggan akan tampil di sini."/>;
 return <div className="ow-page ow-customers"><PageBanner kind="customers" title="Data Pelanggan" description="Kelola hubungan pelanggan Syaqil Laundry dalam satu tampilan."/><div className="ow-metrics"><Metric label="Total Pelanggan" value={customers.length} icon={UsersRound} trend={0} caption="terdaftar" soft/><Metric label="Pelanggan Baru" value={customers.filter(row=>(row.joined||'').startsWith(monthPrefix)).length} icon={Star} tone="purple" trend={0} caption="bulan ini" soft/><Metric label="Pelanggan Teraktif" value={mostActive?.name||'Belum ada'} icon={Zap} tone="green" detail={`${mostActive?.transactions||0} transaksi`} soft/></div><div className="ow-customer-toolbar"><div><Button icon={Plus} onClick={()=>setEditor({customer:null})}>Tambah Pelanggan</Button></div></div><div className="ow-customer-workspace"><section className="ow-panel ow-customer-list" aria-label="Daftar pelanggan"><div className="ow-customer-list-controls"><select aria-label="Urutkan pelanggan" value={sort} onChange={e=>change(setSort,e.target.value)}><option value="default">Urutkan</option><option value="active">Teraktif</option><option value="name">Nama A–Z</option><option value="newest">Terbaru</option></select><SearchField label="Cari pelanggan dalam tabel" placeholder="Cari pelanggan..." value={search} onChange={e=>change(setSearch,e.target.value)}/></div><div className="ow-table-scroll"><table className="ow-table ow-customer-table"><thead><tr>{['No.','Nama Pelanggan','No. HP','Total Transaksi','Terakhir Transaksi','Aksi'].map(label=><th key={label}>{label}</th>)}</tr></thead><tbody>{visible.map((row,i)=><tr key={row.id} className={selected?.id===row.id?'is-selected':''}><td>{(current-1)*10+i+1}</td><td><button className="ow-customer-name" onClick={()=>choose(row)}><Avatar name={row.name} id={row.id-1}/><strong>{row.name}</strong></button></td><td>{phoneLabel(row.phone)}</td><td>{row.transactions}</td><td>{dateLabel(row.last)}</td><td><button className="ow-icon-button" aria-label={`Detail ${row.name}`} onClick={()=>choose(row)}><MoreHorizontal size={20}/></button></td></tr>)}</tbody></table>{!filtered.length&&<EmptyState title="Pelanggan tidak ditemukan" description="Coba nama atau nomor WhatsApp lain." action={<Button variant="secondary" onClick={()=>setSearch('')}>Reset Filter</Button>}/>}</div><Pagination page={current} total={filtered.length} onChange={setPage}/></section>{!small&&<aside className="ow-panel ow-customer-side" aria-label="Detail pelanggan">{detail}</aside>}</div><PrototypeFooter/>{small&&<Drawer open={drawerOpen} onClose={()=>setDrawerOpen(false)} title="Detail pelanggan">{detail}</Drawer>}{editor&&<CustomerEditor key={editor.customer?.id||'new'} customer={editor.customer} customers={customers} busy={busy} onClose={()=>setEditor(null)} onSave={save}/>}<Modal open={!!deleting} onClose={()=>setDeleting(null)} title="Hapus pelanggan?" description={deleting?`${deleting.name} (${phoneLabel(deleting.phone)}) akan dihapus permanen dari database.`:''} footer={<><Button variant="secondary" onClick={()=>setDeleting(null)}>Batal</Button><Button variant="danger" loading={busy} onClick={confirmDelete}>Ya, Hapus Pelanggan</Button></>}/></div>;
}
