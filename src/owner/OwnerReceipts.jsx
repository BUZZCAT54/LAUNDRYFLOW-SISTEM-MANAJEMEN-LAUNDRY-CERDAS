import React,{useEffect,useState} from 'react';
import {createPortal} from 'react-dom';
import {CalendarDays,ChevronRight,Clock3,Download,Eye,FileText,HandCoins,MoreHorizontal,Plus,Printer,Search} from 'lucide-react';
import {Button,EmptyState,Input,Modal,Select} from './ui';
import {Metric,PageBanner,Pagination,Panel,PrototypeFooter} from './OwnerComponents';
import ReceiptPreview,{ReceiptPaper} from './ReceiptPreview';
import {dateLabel,money} from './mockData';
import {downloadReceipt} from '../../src/receiptPdf';
import {ownerApi} from './api';

const RECEIPT_STATUS_CLASS={Diterima:'is-diterima',Diproses:'is-diproses',Selesai:'is-selesai',Diambil:'is-diambil',Dibatalkan:'is-dibatalkan'};

export default function OwnerReceipts({receipts,setReceipts,activities,setActivities,settings,currentUser,demo=false,notify,initialQuery=''}){
 const todayStr=new Date().toISOString().slice(0,10),monthPrefix=todayStr.slice(0,7);
 const blank={search:'',period:'all',method:'Semua',status:'Semua',from:'',to:''};
 const [draft,setDraft]=useState({...blank,search:initialQuery}),[filters,setFilters]=useState({...blank,search:initialQuery}),[page,setPage]=useState(1),[selectedId,setSelectedId]=useState(null);
 const [error,setError]=useState(''),[pdfBusy,setPdfBusy]=useState(false),[detailOpen,setDetailOpen]=useState(false),[activityOpen,setActivityOpen]=useState(false),[options,setOptions]=useState(null),[printReceipt,setPrintReceipt]=useState(null);
 useEffect(()=>{setDraft(values=>({...values,search:initialQuery}));setFilters(values=>({...values,search:initialQuery}));setPage(1);},[initialQuery]);
 const filtered=receipts.filter(row=>{
  const text=`${row.number} ${row.customer}`.toLowerCase();
  return text.includes(filters.search.trim().toLowerCase())&&(filters.method==='Semua'||row.method===filters.method)&&(filters.status==='Semua'||row.status===filters.status)&&(filters.period==='all'||filters.period==='today'&&row.date===todayStr||filters.period==='month'&&(row.date||'').startsWith(monthPrefix)||filters.period==='custom'&&(!filters.from||row.date>=filters.from)&&(!filters.to||row.date<=filters.to));
 }).sort((a,b)=>(b.date||'').localeCompare(a.date||'')||b.id-a.id);
 const current=Math.min(page,Math.max(1,Math.ceil(filtered.length/8))),visible=filtered.slice((current-1)*8,current*8),selected=filtered.find(row=>row.id===selectedId)||visible[0];
 const todayCount=receipts.filter(row=>row.date===todayStr).length,monthReceipts=receipts.filter(row=>(row.date||'').startsWith(monthPrefix));
 const totalReprints=receipts.reduce((sum,row)=>sum+Number(row.reprint_count||0),0);
 const actorName=currentUser?.name||'Owner';
 function apply(event){event.preventDefault();if(draft.period==='custom'&&draft.from&&draft.to&&draft.from>draft.to){setError('Tanggal akhir harus sama dengan atau setelah tanggal awal.');return;}setError('');setFilters({...draft});setPage(1);}
 function recordLocal(type,receipt){setActivities(rows=>[{id:`local-${Date.now()}`,type,number:receipt.number,actor:actorName,date:new Date().toLocaleString('id-ID',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})},...rows]);}
 async function logBackend(action,receipt){
  try{
   const res=await ownerApi(`/owner/receipts/${receipt.id}/activity`,{action});
   if(res?.activity)setActivities(rows=>[res.activity,...rows]);
   if(typeof res?.reprint_count==='number')setReceipts(rows=>rows.map(r=>r.id===receipt.id?{...r,reprint_count:res.reprint_count}:r));
  }catch{
   recordLocal(action,receipt);
  }
 }
 function view(receipt,detail=false){setSelectedId(receipt.id);if(detail)setDetailOpen(true);recordLocal('view',receipt);}
 async function pdf(receipt){
  setPdfBusy(true);setError('');
  try{
   const total=Number(receipt.total??receipt.amount??0),rawWeight=receipt.weight??(receipt.items&&receipt.items[0]?.quantity)??1,weight=Number(rawWeight)||1,paid=Number(receipt.paid??total),items=Array.isArray(receipt.items)&&receipt.items.length?receipt.items:[{category:'Kiloan',service_name:receipt.service||'Cucian',quantity:weight,unit:'kg',price:total/weight,subtotal:total}];
   await downloadReceipt({number:receipt.number,created_at:`${receipt.date} ${receipt.time}:00`,customer_name:receipt.customer,cashier_name:receipt.employee||'Kasir',items,subtotal:receipt.subtotal??total,discount:Number(receipt.discount||0),discount_percent:Number(receipt.discount_percent||0),total,paid,change_amount:receipt.change_amount??Math.max(0,paid-total),payment_status:receipt.payment_status,method:{Tunai:'cash',QRIS:'qris',Transfer:'transfer','Bayar Nanti':'later'}[receipt.method]||'cash'}, {name:settings?.profile?.name,owner:settings?.profile?.owner,logo:settings?.profile?.logo,address:settings?.profile?.address,phone:settings?.profile?.phone,receipt_prefs:settings?.receipt,demo});
   await logBackend('download',receipt);
   notify('PDF nota siap diunduh.');
  }catch{setError('PDF belum dapat dibuat. Silakan coba lagi atau gunakan Cetak Ulang.');}finally{setPdfBusy(false);}
 }
 async function print(receipt){
  setPrintReceipt(receipt);setOptions(null);
  requestAnimationFrame(()=>requestAnimationFrame(()=>window.print()));
  await logBackend('print',receipt);
 }
 const activityKind=item=>{if(item.type==='print'||item.type==='Struk Dicetak Ulang')return 'print';if(item.type==='download'||item.type==='Struk Diunduh PDF')return 'download';return 'view';};
 const activityTitle=item=>{if(item.type==='print'||item.type==='Struk Dicetak Ulang')return `Cetak ulang nota ${item.number}`;if(item.type==='download'||item.type==='Struk Diunduh PDF')return `Download PDF nota ${item.number}`;return `Lihat detail nota ${item.number}`;};
 const activityDate=item=>(item.date&&item.date.includes('T'))?`${dateLabel(item.date)}, ${item.date.slice(11,16)}`:item.date;
 const activityList=(limit)=><ol className="ow-activity-list">{activities.slice(0,limit).map(item=>{const kind=activityKind(item),Icon=kind==='print'?Printer:kind==='download'?Download:Eye;return <li key={item.id}><span className={`ow-activity-icon is-${kind}`}><Icon size={18}/></span><div><b>{activityTitle(item)}</b><small>oleh {item.actor||actorName}</small></div><time>{activityDate(item)}</time></li>;})}</ol>;
 return <div className="ow-page ow-receipts">
  <PageBanner kind="receipts" title="Riwayat Nota" description="Cari, tinjau ulang, dan cetak kembali nota transaksi Syaqil Laundry."/>
  <form className="ow-receipt-filters" onSubmit={apply} noValidate>
   <Input label="Cari nota atau nama pelanggan" icon={Search} value={draft.search} placeholder="Masukkan nomor nota atau nama pelanggan..." onChange={e=>setDraft({...draft,search:e.target.value})}/>
   <Select label="Periode Tanggal" value={draft.period} onChange={e=>setDraft({...draft,period:e.target.value})} options={[{value:'all',label:'Semua tanggal'},{value:'today',label:'Hari ini'},{value:'month',label:'Bulan ini'},{value:'custom',label:'Pilih rentang tanggal'}]}/>
   <Select label="Metode Pembayaran" value={draft.method} onChange={e=>setDraft({...draft,method:e.target.value})} options={['Semua','Tunai','QRIS','Transfer','Bayar Nanti'].map(value=>({value,label:value}))}/>
   <Select label="Status Cucian" value={draft.status} onChange={e=>setDraft({...draft,status:e.target.value})} options={['Semua',...Object.keys(RECEIPT_STATUS_CLASS)].map(value=>({value,label:value}))}/>
   <Button type="submit" icon={Plus}>Terapkan Filter</Button>
   {draft.period==='custom'&&<div className="ow-date-range">
    <Input label="Dari tanggal" type="date" value={draft.from} onInput={e=>setDraft({...draft,from:e.target.value})} onChange={e=>setDraft({...draft,from:e.target.value})}/>
    <Input label="Sampai tanggal" type="date" min={draft.from||undefined} value={draft.to} onInput={e=>setDraft({...draft,to:e.target.value})} onChange={e=>setDraft({...draft,to:e.target.value})}/>
   </div>}
  </form>
  {error&&<p className="ow-error" role="alert">{error}</p>}
  <div className="ow-metrics">
   <Metric label="Nota Hari Ini" value={todayCount} icon={FileText} detail="hari ini"/>
   <Metric label="Nota Bulan Ini" value={monthReceipts.length} icon={CalendarDays} tone="green" detail="bulan ini"/>
   <Metric label="Cetak Ulang" value={totalReprints} icon={Printer} tone="purple" detail="kali dicetak"/>
   <Metric label="Pendapatan Bulan Ini" value={money(monthReceipts.reduce((sum,row)=>sum+Number(row.total??row.amount??0),0))} icon={HandCoins} tone="orange" detail="tercatat"/>
  </div>
  <div className="ow-receipt-workspace">
   <div className="ow-receipt-records">
    <Panel title="Daftar Riwayat Nota" icon={FileText} className="ow-receipt-list">
     <div className="ow-table-scroll">
      <table className="ow-table ow-receipt-table">
       <thead><tr>{['No Nota','Tanggal','Pelanggan','Layanan','Total','Pembayaran','Status','Aksi',''].map((label,i)=><th key={i} scope="col">{label}</th>)}</tr></thead>
       <tbody>{visible.map(row=><tr key={row.id} className={selected?.id===row.id?'is-selected':''}>
        <td><button className="ow-table-link" onClick={()=>view(row)}>{row.number}</button></td>
        <td>{dateLabel(row.date)}</td><td>{row.customer}</td><td>{row.service}</td><td>{money(row.total??row.amount??0)}</td><td>{row.method}</td>
        <td><span className={`ow-receipt-status ${RECEIPT_STATUS_CLASS[row.status]||''}`}>{row.status}</span>{Number(row.reprint_count||0)>0&&<small className="ow-receipt-status is-reprinted" style={{marginLeft:'4px'}}>Cetak {row.reprint_count}×</small>}</td>
        <td><button className="ow-text-link" onClick={()=>view(row)}>Lihat</button></td>
        <td><button className="ow-icon-button" aria-label={`Opsi ${row.number}`} onClick={()=>setOptions(row)}><MoreHorizontal size={19}/></button></td>
       </tr>)}</tbody>
      </table>
      {!filtered.length&&<EmptyState title="Transaksi tidak ditemukan" description="Ubah kata kunci, rentang tanggal, atau metode pembayaran." action={<Button variant="secondary" onClick={()=>{setDraft(blank);setFilters(blank);setPage(1);}}>Reset Filter</Button>}/>}
     </div>
     <Pagination page={current} total={filtered.length} size={8} onChange={setPage} label="nota"/>
    </Panel>
    <Panel title="Aktivitas Nota Terbaru" icon={Clock3} className="ow-receipt-activity" action={<button className="ow-text-link" onClick={()=>setActivityOpen(true)}>Lihat Semua<ChevronRight size={14}/></button>}>{activityList(4)}</Panel>
   </div>
   <ReceiptPreview receipt={selected} settings={settings} pdfBusy={pdfBusy} onPdf={()=>pdf(selected)} onPrint={()=>print(selected)} onDetail={()=>view(selected,true)}/>
  </div>
  <PrototypeFooter/>
  <Modal open={detailOpen&&!!selected} onClose={()=>setDetailOpen(false)} title="Detail nota" description="Rincian transaksi dan pembayaran nota." footer={<><Button variant="secondary" onClick={()=>setDetailOpen(false)}>Tutup</Button><Button icon={Download} loading={pdfBusy} onClick={()=>pdf(selected)}>Download PDF</Button></>}>{selected&&<ReceiptPaper receipt={selected} settings={settings}/>}</Modal>
  <Modal open={!!options} onClose={()=>setOptions(null)} title={options?.number||'Opsi nota'} description="Pilih tindakan untuk nota transaksi ini."><div className="ow-options-list"><Button variant="secondary" icon={Eye} onClick={()=>{view(options,true);setOptions(null);}}>Lihat Detail</Button><Button variant="secondary" icon={Printer} onClick={()=>print(options)}>Cetak Ulang</Button><Button variant="secondary" icon={Download} loading={pdfBusy} onClick={()=>{pdf(options);setOptions(null);}}>Download PDF</Button></div></Modal>
  <Modal open={activityOpen} onClose={()=>setActivityOpen(false)} title="Semua Aktivitas Nota" description="Riwayat cetak ulang dan unduhan PDF yang tersimpan di basis data." footer={<Button variant="secondary" onClick={()=>setActivityOpen(false)}>Tutup</Button>}>{activityList(50)}</Modal>
  {printReceipt&&createPortal(<div id="owner-print-area"><ReceiptPaper receipt={printReceipt} settings={settings}/></div>,document.body)}
 </div>;
}
