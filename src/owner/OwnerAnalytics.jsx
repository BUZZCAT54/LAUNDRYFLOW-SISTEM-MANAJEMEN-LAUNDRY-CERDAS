import React,{useState} from 'react';
import {ChevronDown} from 'lucide-react';
import {Avatar} from './OwnerComponents';
import {money} from './mockData';
import {financeSummary,grouped,serviceOverview,trendRows} from './financeData';
import {BarChart,DonutChart,FinancePanel,RevenueBars,Segments,SimpleTable} from './FinanceComponents';

function Heatmap({rows}){
 const [active,setActive]=useState(null);
 const days=['Sen','Sel','Rab','Kam','Jum','Sab','Min'],hours=Array.from({length:14},(_,i)=>8+i),cells=days.map((_,day)=>hours.map(hour=>rows.filter(r=>(new Date(r.date+'T12:00:00Z').getUTCDay()+6)%7===day&&r.hour===hour).length)),max=Math.max(1,...cells.flat()),total=cells.flat().reduce((s,n)=>s+n,0);
 return <div className="fn-heatmap"><div className="fn-heatmap-grid">{days.map((day,d)=><React.Fragment key={day}><span>{day}</span>{hours.map((hour,h)=>{const count=cells[d][h],pct=total?Math.round(count/total*100):0,isActive=active&&active.d===d&&active.h===h;return <button key={hour} className={isActive?'is-active':''} aria-label={`${day}, ${hour}:00: ${count} transaksi (${pct}%)`} title={`${day}, ${hour}:00 · ${count} transaksi (${pct}%)`} onMouseEnter={()=>setActive({d,h})} onMouseLeave={()=>setActive(null)} onFocus={()=>setActive({d,h})} onBlur={()=>setActive(null)} onClick={()=>setActive(isActive?null:{d,h})} style={{background:count?`rgba(0,95,255,${.15+count/max*.85})`:'#edf4fe','--chart-delay':`${Math.min((d+h)*14,260)}ms`}}/>;})}</React.Fragment>)}<span/>{hours.map(h=><span key={h}>{h%2===0?String(h).padStart(2,'0'):''}</span>)}</div><div className="fn-heatmap-footer"><span className="fn-heatmap-readout" role="status">{active?`${days[active.d]}, ${String(hours[active.h]).padStart(2,'0')}:00 — ${cells[active.d][active.h]} transaksi (${total?Math.round(cells[active.d][active.h]/total*100):0}%)`:'Arahkan kursor atau tekan sel untuk detail'}</span><div className="fn-heatmap-key"><i/> Rendah <span/>{[.2,.4,.65,1].map(o=><i key={o} style={{background:`rgba(0,95,255,${o})`}}/>)} Tinggi</div></div></div>;
}

export default function OwnerAnalytics({transactions=[],expenses,period}){
 const [mode,setMode]=useState('day'),[serviceOrder,setServiceOrder]=useState('revenue');
 const summary=financeSummary(transactions,expenses,period);
 const trend=trendRows(mode==='month'?transactions.filter(r=>r.date>=period.from.slice(0,4)+'-01-01'&&r.date<=period.to):summary.rows,mode);
 const services=serviceOverview(summary.services).sort((a,b)=>serviceOrder==='revenue'?b.total-a.total:a.label.localeCompare(b.label));
 const topCustomers=grouped(summary.rows,'customer').sort((a,b)=>b.count-a.count||b.total-a.total).slice(0,5);
 return <div className="fn-analytics-content">
  <div className="fn-analytics-intro"><div><strong>Analitik operasional</strong><p>Telusuri pola transaksi, layanan, pelanggan, dan jam ramai pada periode terpilih.</p></div><span>{summary.count} transaksi · {summary.customers} pelanggan</span></div>
  <div className="fn-grid fn-chart-row"><FinancePanel title="Tren Pendapatan" subtitle={mode==='month'?`Tren sejak Januari ${period.from.slice(0,4)}`:undefined} action={<Segments label="Tampilan tren pendapatan" value={mode} onChange={setMode} items={[["day","Harian"],["week","Mingguan"],["month","Bulanan"]]}/>}><BarChart rows={trend}/></FinancePanel><FinancePanel title="Distribusi Layanan"><DonutChart rows={serviceOverview(summary.services)} value="count" center={summary.count} caption="Transaksi" counts/></FinancePanel></div>
  <div className="fn-grid fn-analytics-middle"><FinancePanel title="Pendapatan per Layanan" action={<button className="fn-icon-button" aria-label={serviceOrder==='revenue'?'Urutkan layanan menurut nama':'Urutkan layanan menurut pendapatan'} onClick={()=>setServiceOrder(v=>v==='revenue'?'name':'revenue')}><ChevronDown size={18}/></button>}><RevenueBars rows={services}/></FinancePanel><FinancePanel title="Jam Sibuk" subtitle="Pola transaksi menurut hari dan jam"><Heatmap rows={summary.rows}/></FinancePanel></div>
  <FinancePanel title="Pelanggan Teraktif" subtitle="Lima pelanggan dengan transaksi terbanyak pada periode terpilih" className="fn-analytics-customers"><SimpleTable columns={[{key:'no',label:'No.',render:(_,i)=><span className="fn-rank">{i+1}</span>},{key:'label',label:'Pelanggan',render:(r,i)=><span className="fn-service-cell"><Avatar name={r.label} id={i}/>{r.label}</span>},{key:'count',label:'Total Transaksi'},{key:'total',label:'Total Belanja',render:r=>money(r.total)}]} rows={topCustomers} rowKey="label"/></FinancePanel>
 </div>;
}
