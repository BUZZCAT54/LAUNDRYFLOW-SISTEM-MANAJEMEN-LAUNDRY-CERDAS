import React,{useEffect,useState} from 'react';
import {ArrowRight,Clock3,Crown,Eye,KeyRound,LogIn,Pencil,Plus,Power,RotateCcw,Save,Settings,UserRound,UsersRound} from 'lucide-react';
import {Button,Drawer,EmptyState,Input,Modal,Select} from './ui';
import {Avatar,Metric,PageBanner,Pagination,PrototypeFooter,ReferenceArt,SearchField} from './OwnerComponents';
import {ActiveBadge,ActivityTable,ManagementHeading,RoleBadge,Toggle,useDetailDrawer} from './ManagementUI';
import {dateLabel} from './mockData';
import {validateEmployee} from './managementData';
import {ownerApi} from './api';

const blankEmployee={name:'',username:'',password:'',role:'Kasir',phone:'',shift:'Pagi',active:true};
const roles=[{value:'Kasir',label:'Kasir'},{value:'Owner',label:'Admin / Owner'}];
const shifts=[{value:'Pagi',label:'Pagi (07:00 - 15:00)'},{value:'Sore',label:'Sore (15:00 - 23:00)'},{value:'Fleksibel',label:'Fleksibel'}];
function EmployeeForm({employee,employees,onSave,onResetPassword,busy=false,isNew=false}){
 const [values,setValues]=useState(employee||blankEmployee),[errors,setErrors]=useState({});
 useEffect(()=>{setValues(employee||blankEmployee);setErrors({});},[employee]);
 const change=(key,value)=>{setValues(v=>({...v,[key]:value}));setErrors(e=>({...e,[key]:''}));};
 function submit(e){e.preventDefault();const result=validateEmployee(values,employees,employee?.id);if(isNew&&String(values.password||'').length<6)result.errors.password='Password minimal 6 karakter.';setErrors(result.errors);if(!Object.keys(result.errors).length)onSave({...result.values,password:values.password||''});}
 return <form className="mg-editor" onSubmit={submit} noValidate>{!isNew&&<div className="mg-identity"><Avatar name={employee.name} id={employee.id-1} large/><div><h3>{employee.name}</h3><RoleBadge role={employee.role}/><small>{employee.active?'Akun aktif dan dapat melakukan transaksi.':'Akun dinonaktifkan.'}</small></div><ActiveBadge active={employee.active}/></div>}<div className="mg-form-grid"><Input label="Nama Lengkap" value={values.name} onChange={e=>change('name',e.target.value)} error={errors.name} maxLength={70}/><Input label="Username" value={values.username} onChange={e=>change('username',e.target.value)} error={errors.username} disabled={!isNew} autoCapitalize="none" autoComplete="off" maxLength={24}/>{isNew&&<Input label="Password Awal" type="password" value={values.password||''} onChange={e=>change('password',e.target.value)} error={errors.password} minLength={6} autoComplete="new-password"/>}<Select label="Role" value={values.role} onChange={e=>change('role',e.target.value)} options={roles} error={errors.role}/><Input label="No. WhatsApp" value={values.phone} onChange={e=>change('phone',e.target.value)} error={errors.phone} inputMode="tel" maxLength={20}/><Select className="mg-full" label="Shift Kerja" value={values.shift} onChange={e=>change('shift',e.target.value)} options={shifts}/></div><div className="mg-field-status"><Toggle checked={values.active} onChange={v=>change('active',v)} label="Status karyawan"/><span>{values.active?'Aktif':'Nonaktif'}<small>{values.active?'Akses akun diaktifkan.':'Akses akun dinonaktifkan.'}</small></span></div>{!isNew&&<div className="mg-password"><KeyRound size={20}/><div><b>Reset Password</b><small>Tetapkan password baru untuk akun ini.</small></div><Button type="button" variant="secondary" size="sm" onClick={()=>onResetPassword(employee)}>Reset Password</Button></div>}<div className="mg-form-actions"><Button type="submit" icon={Save} loading={busy}>{isNew?'Tambah Karyawan':'Simpan Perubahan'}</Button><Button type="button" icon={RotateCcw} variant="secondary" onClick={()=>{setValues(employee||blankEmployee);setErrors({});}}>Reset</Button></div></form>;
}

export default function OwnerEmployees({employees,setEmployees,activity,setActivity,notify,initialQuery=''}){
 const todayPrefix=new Date().toISOString().slice(0,10);
 const [search,setSearch]=useState(initialQuery),[role,setRole]=useState('all'),[status,setStatus]=useState('all'),[page,setPage]=useState(1),[selectedId,setSelectedId]=useState(()=>employees[0]?.id??null),[adding,setAdding]=useState(false),[confirm,setConfirm]=useState(null),[resetPassword,setResetPassword]=useState(''),[allActivity,setAllActivity]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const drawer=useDetailDrawer();
 useEffect(()=>{setSearch(initialQuery);setPage(1);},[initialQuery]);
 useEffect(()=>{if(selectedId==null&&employees.length)setSelectedId(employees[0].id);},[employees,selectedId]);
 const filtered=employees.filter(e=>[e.name,e.username,e.role].join(' ').toLowerCase().includes(search.trim().toLowerCase())&&(role==='all'||e.role===role)&&(status==='all'||String(e.active)===status));
 const current=Math.min(page,Math.max(1,Math.ceil(filtered.length/6))),visible=filtered.slice((current-1)*6,current*6),selected=employees.find(e=>e.id===selectedId);
 function log(name,type,detail){setActivity(rows=>[{id:Date.now(),date:new Date().toISOString().slice(0,16),name,type,detail},...rows]);}
 function choose(row){setSelectedId(row.id);setError('');if(drawer.small)drawer.setOpen(true);}
 async function save(values,isNew=false){
  if(busy)return;
  setBusy(true);
  try{
   const roleSlug=values.role==='Owner'?'owner':'cashier';
   const payload={name:values.name,username:values.username,phone:values.phone,shift:values.shift,role:roleSlug,active:values.active,...(isNew?{password:values.password}:{})};
   const res=await ownerApi(isNew?'/owner/employees':`/owner/employees/${values.id}`,payload);
   const saved={lastLogin:'',resets:0,...res.employee};
   setEmployees(rows=>isNew?[...rows,saved]:rows.map(e=>e.id===saved.id?{...e,...saved}:e));
   log(saved.name,isNew?'Akun Dibuat':'Update Data',isNew?'Menambahkan akun baru.':'Memperbarui informasi karyawan.');
   setSelectedId(saved.id);setAdding(false);
   if(isNew){setPage(Math.ceil((employees.length+1)/6));setSearch('');setRole('all');setStatus('all');}
   notify(isNew?'Karyawan ditambahkan ke database.':'Perubahan karyawan disimpan.');
  }catch(err){notify(err.message||'Gagal menyimpan data karyawan.');}finally{setBusy(false);}
 }
 function openConfirm(row,type){setConfirm({row,type});setResetPassword('');setError('');}
 async function confirmAction(){
  if(busy)return;
  const {row,type}=confirm;
  if(type==='password'&&resetPassword.length<6){setError('Password baru minimal 6 karakter.');return;}
  setBusy(true);setError('');
  try{
   if(type==='status'){
    const result=validateEmployee({...row,active:!row.active},employees,row.id);
    if(Object.keys(result.errors).length){setError(Object.values(result.errors)[0]);setBusy(false);return;}
    const res=await ownerApi(`/owner/employees/${row.id}`,{name:row.name,phone:row.phone,shift:row.shift,role:row.role==='Owner'?'owner':'cashier',active:!row.active});
    setEmployees(rows=>rows.map(e=>e.id===row.id?{...e,...res.employee}:e));
    log(row.name,'Status Diubah',`${row.active?'Menonaktifkan':'Mengaktifkan'} akun.`);
    notify('Status karyawan diperbarui.');
   }else{
    await ownerApi(`/owner/employees/${row.id}/reset-password`,{password:resetPassword});
    setEmployees(rows=>rows.map(e=>e.id===row.id?{...e,resets:(e.resets||0)+1}:e));
    log(row.name,'Reset Password','Password akun direset oleh Owner.');
    notify('Password baru tersimpan.');
   }
   setConfirm(null);setResetPassword('');
  }catch(err){setError(err.message||'Gagal memproses aksi.');}finally{setBusy(false);}
 }
 const detail=selected?<EmployeeForm employee={selected} employees={employees} busy={busy} onSave={save} onResetPassword={row=>openConfirm(row,'password')}/>:<EmptyState title="Pilih karyawan"/>;
 return <div className="ow-page mg-page mg-employees"><PageBanner kind="employees" title="Karyawan" description="Kelola tim, akun kasir, dan status kerja Syaqil Laundry."/><div className="mg-toolbar"><SearchField label="Cari karyawan" placeholder="Cari nama karyawan..." value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}}/><select aria-label="Filter role" value={role} onChange={e=>{setRole(e.target.value);setPage(1);}}><option value="all">Semua Role</option><option value="Kasir">Kasir</option><option value="Owner">Admin / Owner</option></select><select aria-label="Filter status karyawan" value={status} onChange={e=>{setStatus(e.target.value);setPage(1);}}><option value="all">Semua Status</option><option value="true">Aktif</option><option value="false">Nonaktif</option></select><Button icon={Plus} onClick={()=>setAdding(true)}>Tambah Karyawan</Button></div><div className="ow-metrics"><Metric label="Total Karyawan" value={employees.length} icon={UsersRound} trend={0}/><Metric label="Kasir Aktif" value={employees.filter(e=>e.role==='Kasir'&&e.active).length} icon={UserRound} tone="green" trend={0}/><Metric label="Admin / Owner" value={employees.filter(e=>e.role==='Owner').length} icon={Crown} tone="orange" trend={0}/><Metric label="Login Hari Ini" value={employees.filter(e=>(e.lastLogin||'').startsWith(todayPrefix)).length} icon={LogIn} tone="purple" trend={0} caption="hari ini"/></div><div className="mg-workspace"><section className="ow-panel mg-list"><ManagementHeading icon={UsersRound} title="Daftar Karyawan" description="Kelola data pegawai dan akun kasir yang terdaftar."/><div className="ow-table-scroll"><table className="ow-table mg-employee-table"><thead><tr>{['Nama','Username','Role','Status','Last Login','Aksi'].map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>{visible.map(row=><tr key={row.id} className={selectedId===row.id?'is-selected':''}><td><button className="ow-customer-name" onClick={()=>choose(row)}><Avatar name={row.name} id={row.id-1}/><strong>{row.name}</strong></button></td><td>{row.username}</td><td><RoleBadge role={row.role}/></td><td><ActiveBadge active={row.active}/></td><td>{row.lastLogin?<>{dateLabel(row.lastLogin)}<br/>{row.lastLogin.slice(11,16)}</>:'Belum login'}</td><td><div className="mg-row-actions">{[[Eye,'Lihat',()=>choose(row),'blue'],[Pencil,'Edit',()=>choose(row),'blue'],[KeyRound,'Reset password',()=>openConfirm(row,'password'),'amber'],[Power,row.active?'Nonaktifkan':'Aktifkan',()=>openConfirm(row,'status'),'red']].map(([Icon,label,action,tone])=><button key={label} className={`mg-action mg-action--${tone}`} aria-label={`${label} ${row.name}`} title={label} onClick={action}><Icon size={17}/></button>)}</div></td></tr>)}</tbody></table>{!filtered.length&&<EmptyState title="Karyawan tidak ditemukan" description="Coba nama, role, atau status yang lain." action={<Button variant="secondary" onClick={()=>{setSearch('');setRole('all');setStatus('all');}}>Reset Filter</Button>}/>}</div><Pagination page={current} total={filtered.length} size={6} onChange={setPage} label="karyawan"/></section>{!drawer.small&&<aside className="ow-panel mg-detail"><ManagementHeading icon={Settings} title="Detail Karyawan" description="Lihat dan ubah informasi karyawan."/>{detail}</aside>}<section className="ow-panel mg-history"><ManagementHeading icon={Clock3} title="Riwayat Aktivitas Akun" description="Log aktivitas terbaru dari semua akun karyawan." action={<button className="ow-text-link" onClick={()=>setAllActivity(true)}>Lihat Semua <ArrowRight size={16}/></button>}/><ActivityTable rows={activity.slice(0,4)}/></section><ReferenceArt kind="employeePromo" className="mg-promo"/></div><PrototypeFooter/>{drawer.small&&<Drawer open={drawer.open} onClose={()=>drawer.setOpen(false)} title="Detail Karyawan">{detail}</Drawer>}<Modal open={adding} onClose={()=>setAdding(false)} title="Tambah Karyawan" description="Buat akun karyawan baru di database.">{adding&&<EmployeeForm employees={employees} busy={busy} isNew onSave={values=>save(values,true)}/>}</Modal><Modal open={!!confirm} onClose={()=>setConfirm(null)} title={confirm?.type==='password'?'Reset password akun?':`${confirm?.row.active?'Nonaktifkan':'Aktifkan'} karyawan?`} description={confirm?.type==='password'?`Tetapkan password baru untuk akun ${confirm?.row.name} (${confirm?.row.username}).`:`Ubah status akun ${confirm?.row.name}.`} footer={<><Button variant="secondary" onClick={()=>setConfirm(null)}>Batal</Button><Button loading={busy} onClick={confirmAction}>Konfirmasi</Button></>}>{confirm?.type==='password'&&<Input label="Password Baru (minimal 6 karakter)" type="password" value={resetPassword} onChange={e=>{setResetPassword(e.target.value);setError('');}} minLength={6} autoComplete="new-password"/>}{error&&<p className="ow-error" role="alert">{error}</p>}</Modal><Modal open={allActivity} onClose={()=>setAllActivity(false)} title="Riwayat Aktivitas Akun" description="Aktivitas akun tercatat di sistem."><ActivityTable rows={activity}/></Modal></div>;
}
