import React,{useEffect,useRef,useState} from 'react';
import {
  ArrowRight,BarChart3,Bell,BookOpen,Check,ChevronDown,ClipboardList,FileBarChart2,
  FilePenLine,FileText,LayoutDashboard,Menu,PanelLeftClose,PanelLeftOpen,Plus,Receipt,
  Search,Settings2,ShieldCheck,Tags,UserRoundCog,UsersRound,WalletCards,X
} from 'lucide-react';
import {Button,Card,DataTable,Drawer,EmptyState,Input,LoadingState,Modal,Select,StatusBadge,Textarea} from './ui.jsx';

const NAV=[
  {group:'',items:[
    ['dashboard','Dashboard',LayoutDashboard],['kasir','Kasir',WalletCards],['pesanan','Pesanan',ClipboardList],
    ['pelanggan','Pelanggan',UsersRound],['riwayat-nota','Riwayat Nota',Receipt]
  ]},
  {group:'Manajemen',items:[
    ['layanan-harga','Layanan & Harga',Tags],['karyawan','Karyawan',UserRoundCog],['koreksi-transaksi','Koreksi Transaksi',FilePenLine]
  ]},
  {group:'Keuangan',items:[
    ['pengeluaran','Pengeluaran',WalletCards],['analytics','Analytics',BarChart3],['laporan-keuangan','Laporan Keuangan',FileBarChart2]
  ]},
  {group:'',items:[['pengaturan','Pengaturan',Settings2]]}
];
const NAV_ITEMS=NAV.flatMap(section=>section.items);
const INITIAL_PAGE=()=>NAV_ITEMS.some(item=>item[0]===location.hash.slice(1))?location.hash.slice(1):'dashboard';
const SERVICES=[
  {id:'regular',name:'Reguler',unit:'kg',price:6000,status:'Aktif'},
  {id:'day',name:'Ekspres 1 Hari',unit:'kg',price:10000,status:'Aktif'},
  {id:'hour',name:'Ekspres Jam',unit:'kg',price:14000,status:'Aktif'}
];
const rupiah=value=>'Rp '+value.toLocaleString('id-ID');

function Brand(){return <div className="owner-brand"><div className="owner-brand-mark"><img src="/assets/logo.png" alt=""/></div><div className="owner-brand-type"><b>SYAQIL<br/>LAUNDRY</b><span>BERSIH • CEPAT • PRAKTIS</span></div></div>;}

function Sidebar({page,compact,mobile,open,onNavigate,onClose}){
  return <><button className={`owner-sidebar-shade ${open?'is-visible':''}`} aria-label="Tutup navigasi" tabIndex={open?0:-1} onClick={onClose}/><aside className={`owner-sidebar ${compact?'is-compact':''} ${open?'is-open':''}`} aria-label="Sidebar Owner" aria-hidden={mobile&&!open} inert={mobile&&!open}><div className="owner-sidebar-head"><div className="owner-window-dots" aria-hidden="true"><i/><i/><i/></div><button className="owner-mobile-close" onClick={onClose} aria-label="Tutup menu"><X size={21}/></button></div><Brand/><div className="owner-sidebar-scroll"><nav aria-label="Navigasi Owner">{NAV.map((section,sectionIndex)=><div className="owner-nav-section" key={sectionIndex}>{section.group&&<p className="owner-nav-group">{section.group}</p>}{section.items.map(([key,label,Icon])=><button key={key} className={`owner-nav-item ${page===key?'is-active':''}`} onClick={()=>onNavigate(key)} aria-current={page===key?'page':undefined} title={compact&&!mobile?label:undefined}><Icon size={20} strokeWidth={2} aria-hidden="true"/><span>{label}</span>{page===key&&<i aria-hidden="true"/>}</button>)}</div>)}</nav></div><div className="owner-sidebar-foot"><img src="/assets/sidebar-art-hd.png" alt="" aria-hidden="true"/><div className="owner-sidebar-role"><span className="owner-role-avatar">DG</span><span><b>Desi Gusrianita</b><small>Owner workspace</small></span></div></div></aside></>;
}

function Topbar({page,compact,mobile,onToggle,onNavigate}){
  const [search,setSearch]=useState(''),[profileOpen,setProfileOpen]=useState(false),[noticeOpen,setNoticeOpen]=useState(false);
  const searchRef=useRef(null);
  const matches=search.trim()?NAV_ITEMS.filter(item=>item[1].toLowerCase().includes(search.toLowerCase())).slice(0,6):[];
  const current=NAV_ITEMS.find(item=>item[0]===page);
  useEffect(()=>{
    const keydown=event=>{
      if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='k'){event.preventDefault();searchRef.current?.focus();}
      if(event.key==='Escape'){setSearch('');setProfileOpen(false);setNoticeOpen(false);}
    };
    window.addEventListener('keydown',keydown);
    return()=>window.removeEventListener('keydown',keydown);
  },[]);
  function choose(key){onNavigate(key);setSearch('');searchRef.current?.blur();}
  return <header className="owner-topbar"><div className="owner-topbar-start"><button className="owner-topbar-icon" onClick={onToggle} aria-label={mobile?'Buka menu Owner':compact?'Perluas sidebar':'Ringkas sidebar'}>{mobile?<Menu size={21}/>:compact?<PanelLeftOpen size={21}/>:<PanelLeftClose size={21}/>}</button><div className="owner-breadcrumb"><span>Owner Workspace</span><b>/</b><strong>{current?.[1]||'Dashboard'}</strong></div></div><div className="owner-topbar-end"><div className="owner-search"><button type="button" className="owner-search-trigger" onClick={()=>searchRef.current?.focus()} aria-label="Cari halaman"><Search size={19} aria-hidden="true"/></button><input ref={searchRef} value={search} onChange={event=>setSearch(event.target.value)} onKeyDown={event=>{if(event.key==='Enter'&&matches[0])choose(matches[0][0]);}} placeholder="Cari halaman..." aria-label="Cari halaman Owner"/><kbd>⌘ K</kbd>{search&&<div className="owner-search-results" role="listbox" aria-label="Hasil pencarian halaman">{matches.length?matches.map(([key,label,Icon])=><button key={key} onClick={()=>choose(key)} role="option" aria-selected={false}><Icon size={17}/>{label}<ArrowRight size={15}/></button>):<p>Halaman tidak ditemukan.</p>}</div>}</div><span className="owner-topbar-date">{new Date().toLocaleDateString('id-ID',{weekday:'short',day:'numeric',month:'short',year:'numeric'})}</span><div className="owner-popover-anchor"><button className="owner-topbar-icon owner-notification-button" onClick={()=>{setNoticeOpen(!noticeOpen);setProfileOpen(false);}} aria-label="Informasi prototipe" aria-expanded={noticeOpen}><Bell size={19}/></button>{noticeOpen&&<div className="owner-popover"><b>Belum ada notifikasi</b><p>Notifikasi operasional akan dirancang pada fase berikutnya.</p></div>}</div><div className="owner-popover-anchor"><button className="owner-profile" onClick={()=>{setProfileOpen(!profileOpen);setNoticeOpen(false);}} aria-expanded={profileOpen}><span className="owner-profile-avatar">DG</span><span><b>Desi Gusrianita</b><small>Owner · Data mock</small></span><ChevronDown size={16}/></button>{profileOpen&&<div className="owner-popover owner-profile-popover"><b>Desi Gusrianita</b><p>Identitas contoh dari PRD. Login Owner belum dibuat pada fase ini.</p><StatusBadge tone="info">Prototipe UI</StatusBadge></div>}</div></div></header>;
}

function FoundationDashboard(){
  const [query,setQuery]=useState(''),[service,setService]=useState('all'),[note,setNote]=useState(''),[modalOpen,setModalOpen]=useState(false),[drawerOpen,setDrawerOpen]=useState(false),[loading,setLoading]=useState(false),[feedback,setFeedback]=useState('');
  const filtered=SERVICES.filter(row=>(service==='all'||row.id===service)&&row.name.toLowerCase().includes(query.toLowerCase()));
  const columns=[
    {key:'name',label:'Layanan',render:row=><strong>{row.name}</strong>},
    {key:'unit',label:'Satuan'},
    {key:'price',label:'Harga awal',render:row=><strong>{rupiah(row.price)}</strong>},
    {key:'status',label:'Status',render:row=><StatusBadge tone="success">{row.status}</StatusBadge>}
  ];
  function saveExample(){setModalOpen(false);setFeedback('Contoh interaksi berhasil. Data mock tidak disimpan.');}
  return <div className="owner-page-inner"><section className="owner-hero" aria-labelledby="owner-hero-title"><div className="owner-hero-content"><span className="owner-hero-kicker">RUANG OWNER / FASE 00</span><h1 id="owner-hero-title">Satu fondasi.<br/><em>Siap untuk semua layar.</em></h1><p>Kerangka aplikasi Owner Syaqil Laundry. Dashboard lengkap, manajemen, dan keuangan akan mengikuti fase berikutnya.</p><div className="owner-hero-actions"><button type="button" onClick={()=>document.getElementById("component-foundation")?.scrollIntoView({behavior:"smooth",block:"start"})} className="owner-hero-link">Lihat fondasi komponen <ArrowRight size={18}/></button><span>Frontend • Data mock</span></div></div><div className="owner-hero-art" aria-hidden="true"><div className="owner-hero-disc"><img src="/assets/logo.png" alt=""/></div><span className="owner-hero-burst">OWNER<br/>SPACE!</span><span className="owner-hero-wash">BERSIH<br/>CEPAT<br/>PRAKTIS</span><span className="owner-hero-wave wave-one"/><span className="owner-hero-wave wave-two"/></div></section><div className="owner-page-heading" id="component-foundation"><div><span className="ui-eyebrow">DESIGN FOUNDATION</span><h2>Komponen siap pakai</h2><p>Contoh interaksi untuk memastikan sistem visual konsisten sebelum layar Owner dibuat.</p></div><StatusBadge tone="info">Phase 00</StatusBadge></div><div className="owner-showcase-grid"><Card className="owner-control-card" title="Kontrol & input" eyebrow="OPERASIONAL"><div className="owner-form-grid"><Input label="Cari layanan" value={query} onChange={event=>setQuery(event.target.value)} placeholder="Coba ketik Reguler..." icon={Search} helper="Filter langsung pada tabel contoh di bawah."/><Select label="Jenis layanan" value={service} onChange={event=>setService(event.target.value)} options={[{value:'all',label:'Semua layanan'},...SERVICES.map(row=>({value:row.id,label:row.name}))]}/></div><Textarea label="Catatan contoh" rows={2} maxLength={160} value={note} onChange={event=>setNote(event.target.value)} placeholder="Catatan hanya untuk melihat tampilan input..."/><div className="owner-button-row"><Button icon={Plus} onClick={()=>setModalOpen(true)}>Buka modal</Button><Button variant="secondary" onClick={()=>setDrawerOpen(true)}>Buka drawer</Button><Button variant="ghost" onClick={()=>setFeedback('Tombol sekunder aktif pada prototipe ini.')}>Aksi ringan</Button></div></Card><Card className="owner-states-card" title="Status antarmuka" eyebrow="KOMPONEN RESPONSIF"><div className="owner-state-list"><div><span>Diterima</span><StatusBadge tone="info">Diterima</StatusBadge></div><div><span>Diproses</span><StatusBadge tone="warning">Diproses</StatusBadge></div><div><span>Selesai</span><StatusBadge tone="success">Selesai</StatusBadge></div><div><span>Dibatalkan</span><StatusBadge tone="danger">Dibatalkan</StatusBadge></div></div><div className="owner-state-divider"/><Button variant="secondary" size="sm" onClick={()=>setLoading(!loading)}>{loading?'Tampilkan tabel':'Tampilkan loading'}</Button></Card></div><Card className="owner-table-card" title="Tabel contoh" eyebrow="DATA MOCK DARI PRD" action={<span className="owner-table-count">{filtered.length} dari {SERVICES.length} layanan</span>}>{loading?<LoadingState label="Menyiapkan daftar layanan..." rows={4}/>:<DataTable columns={columns} rows={filtered} emptyTitle="Layanan tidak ditemukan"/>}</Card><div className="owner-foundation-footer"><ShieldCheck size={17}/><span>Semua data di halaman ini contoh. Belum terhubung ke kasir atau database.</span></div>{feedback&&<div className="owner-toast" role="status"><Check size={17}/><span>{feedback}</span><button onClick={()=>setFeedback('')} aria-label="Tutup pemberitahuan"><X size={17}/></button></div>}<Modal open={modalOpen} onClose={()=>setModalOpen(false)} title="Contoh modal Owner" description="Pola dialog yang bisa dipakai oleh layar manajemen berikutnya." footer={<><Button variant="secondary" onClick={()=>setModalOpen(false)}>Batal</Button><Button onClick={saveExample}>Simpan contoh</Button></>}><Input label="Nama contoh" placeholder="Masukkan nama" helper="Komponen formulir mengikuti token yang sama."/><p className="owner-overlay-note">Tombol simpan hanya memperlihatkan umpan balik prototipe.</p></Modal><Drawer open={drawerOpen} onClose={()=>setDrawerOpen(false)} title="Contoh drawer" description="Panel detail untuk layar Owner berikutnya." footer={<Button variant="secondary" onClick={()=>setDrawerOpen(false)}>Tutup panel</Button>}><div className="owner-drawer-preview"><span className="owner-drawer-icon"><FileText size={29}/></span><h3>Detail akan muncul di sini</h3><p>Drawer memakai komponen yang sama untuk informasi pelanggan, pesanan, atau koreksi transaksi pada fase selanjutnya.</p><StatusBadge tone="neutral">Belum ada data</StatusBadge></div></Drawer></div>;
}

function FuturePlaceholder({page}){
  const item=NAV_ITEMS.find(entry=>entry[0]===page)||NAV_ITEMS[0],Icon=item[2];
  return <div className="owner-page-inner owner-future"><div className="owner-page-heading"><div><span className="ui-eyebrow">OWNER WORKSPACE</span><h1>{item[1]}</h1><p>Ruang halaman ini disiapkan dalam navigasi Owner.</p></div><StatusBadge tone="neutral">Fase berikutnya</StatusBadge></div><Card><EmptyState icon={Icon} title={`${item[1]} belum dirancang pada Phase 00`} description="Shell dan komponen dasarnya sudah siap. Isi halaman akan dibuat pada fase khusus modul ini."/></Card></div>;
}

export default function OwnerApp(){
  const [page,setPage]=useState(INITIAL_PAGE),[compact,setCompact]=useState(()=>window.innerWidth<1200),[mobile,setMobile]=useState(()=>window.innerWidth<768),[mobileOpen,setMobileOpen]=useState(false);
  const lastWidth=useRef(window.innerWidth);
  useEffect(()=>{
    const hash=()=>{setPage(INITIAL_PAGE());setMobileOpen(false);};
    const resize=()=>{const width=window.innerWidth;setMobile(width<768);if(width<1200&&lastWidth.current>=1200)setCompact(true);if(width>=1200&&lastWidth.current<1200)setCompact(false);if(width>=768)setMobileOpen(false);lastWidth.current=width;};
    window.addEventListener('hashchange',hash);window.addEventListener('resize',resize);
    return()=>{window.removeEventListener('hashchange',hash);window.removeEventListener('resize',resize);};
  },[]);
  useEffect(()=>{
    if(!mobileOpen)return;
    document.querySelector('.owner-mobile-close')?.focus();
    const escape=event=>{if(event.key==='Escape'){setMobileOpen(false);document.querySelector('.owner-topbar-start .owner-topbar-icon')?.focus();}};
    window.addEventListener('keydown',escape);
    return()=>window.removeEventListener('keydown',escape);
  },[mobileOpen]);
  function navigate(key){location.hash=key;setPage(key);setMobileOpen(false);document.querySelector('.owner-content')?.scrollTo({top:0});}
  function toggle(){if(window.innerWidth<768)setMobileOpen(open=>!open);else setCompact(value=>!value);}
  return <div className={`owner-app ${compact?'is-compact':''}`}><Sidebar page={page} compact={compact} mobile={mobile} open={mobileOpen} onNavigate={navigate} onClose={()=>setMobileOpen(false)}/><div className="owner-main"><Topbar page={page} compact={compact} mobile={mobile} onToggle={toggle} onNavigate={navigate}/><main className="owner-content" id="owner-main-content">{page==='dashboard'?<FoundationDashboard/>:<FuturePlaceholder page={page}/>}</main></div></div>;
}
