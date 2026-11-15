import React,{useState} from 'react';
import {ArrowRight,BadgeCheck,CalendarDays,ChartNoAxesColumnIncreasing,ChevronRight,ClipboardList,FilePenLine,FileText,HandCoins,Receipt,Shirt,UsersRound,Wallet,WalletCards,Zap} from 'lucide-react';
import {Button,Modal} from './ui';
import {Metric,PageBanner,Panel,PrototypeFooter} from './OwnerComponents';
import {dateLabel,money} from './mockData';

const collectedAmount=r=>(r.payment_status==='unpaid'||r.method==='Bayar Nanti')?0:Number(r.total??r.amount??0);
const offsetIso=(iso,days)=>{const d=new Date(iso+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10);};
const periodRanges=period=>{
 const today=new Date().toISOString().slice(0,10);
 if(period==='today')return {from:today,to:today,prevFrom:offsetIso(today,-1),prevTo:offsetIso(today,-1),days:[today]};
 if(period==='week'){const from=offsetIso(today,-6),days=Array.from({length:7},(_,i)=>offsetIso(from,i));return {from,to:today,prevFrom:offsetIso(today,-13),prevTo:offsetIso(today,-7),days};}
 const y=Number(today.slice(0,4)),m=Number(today.slice(5,7)),from=`${y}-${String(m).padStart(2,'0')}-01`,to=new Date(Date.UTC(y,m,0)).toISOString().slice(0,10);
 const prevEnd=new Date(Date.UTC(y,m-1,0)),py=prevEnd.getUTCFullYear(),pm=String(prevEnd.getUTCMonth()+1).padStart(2,'0'),prevFrom=`${py}-${pm}-01`,prevTo=prevEnd.toISOString().slice(0,10);
 const days=Array.from({length:7},(_,i)=>offsetIso(today,i-6));
 return {from,to,prevFrom,prevTo,days};
};

function OrderStatus({values,total}){
 const labels=['Selesai','Diproses','Diterima','Diambil'],colors=['#4dcc69','#ffd84c','#2775ff','#a344fa'];
 let angle=0;const segments=values.map((n,i)=>{const start=angle;angle+=total?n/total*100:0;return `${colors[i]} ${start}% ${angle}%`;});
 return <Panel title="Status Pesanan" icon={BadgeCheck} className="ow-status-panel"><div className="ow-status-body"><div className="ow-donut" role="img" aria-label={labels.map((label,i)=>`${label} ${values[i]}`).join(', ')} style={{background:total?`conic-gradient(${segments.join(',')})`:'#edf2fb'}}><div><strong>{total}</strong><small>Total</small></div></div><ul>{labels.map((label,i)=><li key={label}><i style={{background:colors[i]}}/><span>{label}</span><b>{values[i]}</b><small>{total?Math.round(values[i]/total*100):0}%</small></li>)}</ul></div></Panel>;
}

function OperationalFocus({corrections,expenses,receipts,navigate}){
 const pending=corrections.filter(row=>row.status==='Diproses').length;
 const recentExpense=[...expenses].sort((a,b)=>b.date.localeCompare(a.date)||b.id-a.id)[0];
 const recentReceipt=[...receipts].sort((a,b)=>(b.date+b.time).localeCompare(a.date+a.time)||b.id-a.id)[0];
 return <Panel title="Aktivitas Terbaru" icon={ClipboardList} className="ow-focus-panel" action={<button className="ow-text-link" onClick={()=>navigate('koreksi-transaksi')}>Buka Koreksi <ArrowRight size={15}/></button>}><div className="ow-focus-list"><article><span className="ow-focus-icon is-blue"><FilePenLine size={21}/></span><div><strong>Koreksi tercatat</strong><small>Total catatan koreksi transaksi</small></div><b>{pending||corrections.length}</b></article><article><span className="ow-focus-icon is-amber"><WalletCards size={21}/></span><div><strong>Pengeluaran terakhir</strong><small>{recentExpense?.description||'Belum ada pengeluaran'}</small></div><b className="is-money">{recentExpense?money(recentExpense.amount):'—'}</b></article><article><span className="ow-focus-icon is-green"><Receipt size={21}/></span><div><strong>Nota terakhir</strong><small>{recentReceipt?.customer||'Belum ada nota'}</small></div><b className="is-receipt">{recentReceipt?.number||'—'}</b></article></div><p className="ow-focus-note">Ringkasan aktivitas terkini langsung dari database.</p></Panel>;
}

export default function OwnerDashboard({navigate,corrections=[],expenses=[],receipts=[]}){
 const [period,setPeriod]=useState('month'),[dailyOpen,setDailyOpen]=useState(false);
 const range=periodRanges(period);
 const inWin=(d,f,t)=>Boolean(d)&&d>=f&&d<=t;
 const orders=receipts.filter(r=>inWin(r.date,range.from,range.to));
 const prevOrders=receipts.filter(r=>inWin(r.date,range.prevFrom,range.prevTo));
 const costs=expenses.filter(r=>inWin(r.date,range.from,range.to));
 const prevCosts=expenses.filter(r=>inWin(r.date,range.prevFrom,range.prevTo));
 const stats={
  revenue:orders.reduce((s,r)=>s+collectedAmount(r),0),
  transactions:orders.length,
  expense:costs.reduce((s,r)=>s+Number(r.amount||0),0),
  previous:{
   revenue:prevOrders.reduce((s,r)=>s+collectedAmount(r),0),
   transactions:prevOrders.length,
   expense:prevCosts.reduce((s,r)=>s+Number(r.amount||0),0),
  },
  status:['Selesai','Diproses','Diterima','Diambil'].map(st=>orders.filter(r=>r.status===st).length),
 };
 const profit=stats.revenue-stats.expense,previousProfit=stats.previous.revenue-stats.previous.expense;
 const trend=(value,previous)=>previous?Math.round((value-previous)/previous*100):0;
 const days=range.days.map(date=>{
  const dayOrders=receipts.filter(r=>r.date===date);
  const dayCosts=expenses.filter(r=>r.date===date);
  return {date,transactions:dayOrders.length,revenue:dayOrders.reduce((s,r)=>s+collectedAmount(r),0),expense:dayCosts.reduce((s,r)=>s+Number(r.amount||0),0)};
 });
 const renderDailyTable=rows=><div className="ow-table-scroll"><table className="ow-table ow-daily-table"><thead><tr>{['Tanggal','Transaksi','Pendapatan','Pengeluaran','Laba Bersih'].map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>{[...rows].reverse().map((day,i)=><tr key={day.date} className={i===0?'is-selected':''}><td>{dateLabel(day.date)}</td><td>{day.transactions}</td><td>{money(day.revenue)}</td><td>{money(day.expense)}</td><td>{money(day.revenue-day.expense)}</td></tr>)}</tbody></table></div>;
 return <div className="ow-page ow-dashboard"><PageBanner kind="dashboard" title="Dashboard Owner" description="Pantau kondisi usaha Syaqil Laundry dalam satu tampilan."/><div className="ow-metrics-context"><span>Ringkasan usaha <b>· Live Database</b></span><select aria-label="Periode ringkasan usaha" value={period} onChange={e=>setPeriod(e.target.value)}><option value="month">Bulan ini</option><option value="week">7 hari terakhir</option><option value="today">Hari ini</option></select></div><div className="ow-metrics"><Metric label="Total Pendapatan" value={money(stats.revenue)} icon={HandCoins} trend={trend(stats.revenue,stats.previous.revenue)} caption="dari periode sebelumnya"/><Metric label="Total Transaksi" value={stats.transactions} icon={ClipboardList} tone="green" trend={trend(stats.transactions,stats.previous.transactions)} caption="dari periode sebelumnya"/><Metric label={period==='month'?'Pengeluaran Bulan Ini':'Total Pengeluaran'} value={money(stats.expense)} icon={Wallet} tone="orange" trend={trend(stats.expense,stats.previous.expense)} caption="dari periode sebelumnya"/><Metric label="Laba Bersih" value={money(profit)} icon={ChartNoAxesColumnIncreasing} tone="purple" trend={trend(profit,previousProfit)} caption="dari periode sebelumnya"/></div><div className="ow-dashboard-charts"><OperationalFocus corrections={corrections} expenses={expenses} receipts={receipts} navigate={navigate}/><OrderStatus values={stats.status} total={stats.transactions}/></div><div className="ow-dashboard-bottom"><Panel title="Ringkasan Harian" icon={CalendarDays} className="ow-daily-panel" action={<button className="ow-text-link" onClick={()=>setDailyOpen(true)}>Lihat Semua <ArrowRight size={15}/></button>}>{renderDailyTable(days.slice(-5))}</Panel><div className="ow-dashboard-actions"><Panel title="Aksi Cepat" icon={Zap}><div className="ow-quick-grid">{[
  ['Kelola Pelanggan','Lihat dan kelola data pelanggan','pelanggan',UsersRound,'blue'],
  ['Kelola Layanan','Atur layanan dan harga','layanan-harga',Shirt,'green'],
  ['Tambah Pengeluaran','Catat pengeluaran usaha','pengeluaran',WalletCards,'orange'],
  ['Lihat Laporan','Analisis performa usaha','laporan-keuangan',FileText,'purple']
 ].map(([title,description,key,Icon,tone])=><button className={`ow-quick-action ow-tone-${tone}`} key={key} onClick={()=>navigate(key)}><span className="ow-quick-icon"><Icon size={27}/></span><span><b>{title}</b><small>{description}</small></span><ChevronRight size={19}/></button>)}</div></Panel></div></div><PrototypeFooter/><Modal open={dailyOpen} onClose={()=>setDailyOpen(false)} title="Ringkasan harian usaha" description="Rekap transaksi, pendapatan, pengeluaran, dan laba harian." footer={<Button variant="secondary" onClick={()=>setDailyOpen(false)}>Tutup</Button>}>{renderDailyTable(days)}</Modal></div>;
}
