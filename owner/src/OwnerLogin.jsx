import React,{useState} from 'react';
import {ArrowRight,Eye,EyeOff,LockKeyhole,UserRound} from 'lucide-react';
import './owner-login.css';

export default function OwnerLogin({onLogin}){
 const [identifier,setIdentifier]=useState(''),[password,setPassword]=useState(''),[remember,setRemember]=useState(true),[showPassword,setShowPassword]=useState(false),[forgotOpen,setForgotOpen]=useState(false);
 function submit(event){event.preventDefault();if(!identifier.trim()||!password.trim())return;onLogin(remember);}
 return <main className="owner-login">
  <div className="owner-login-shell">
   <section className="owner-login-form-panel" aria-labelledby="owner-login-title">
    <div className="owner-login-brand" role="img" aria-label="Syaqil Laundry"><img src="/assets/logo.png" alt=""/><div>Syaqil<br/>Laundry<small>BERSIH • CEPAT • PRAKTIS</small></div></div>
    <div className="owner-login-content">
     <span className="owner-login-eyebrow">SELAMAT DATANG KEMBALI</span>
     <h1 id="owner-login-title">Masuk ke<br/>dashboard owner.</h1>
     <p>Kelola usaha laundry, beres dalam satu tempat.</p>
     <form onSubmit={submit}>
      <label htmlFor="owner-identifier">Email atau Username</label>
      <div className="owner-login-field"><UserRound size={18}/><input id="owner-identifier" type="text" name="identifier" autoComplete="username" placeholder="Masukkan email atau username" value={identifier} onChange={event=>setIdentifier(event.target.value)} required/></div>
      <label htmlFor="owner-password">Password</label>
      <div className="owner-login-field"><LockKeyhole size={18}/><input id="owner-password" type={showPassword?'text':'password'} name="password" autoComplete="current-password" placeholder="Masukkan password" value={password} onChange={event=>setPassword(event.target.value)} required/><button type="button" className="owner-login-reveal" aria-label={showPassword?'Sembunyikan kata sandi':'Tampilkan kata sandi'} aria-pressed={showPassword} onClick={()=>setShowPassword(value=>!value)}>{showPassword?<EyeOff size={18}/>:<Eye size={18}/>}</button></div>
      <div className="owner-login-options"><label className="owner-login-remember"><input type="checkbox" checked={remember} onChange={event=>setRemember(event.target.checked)}/><span>Ingat saya</span></label><button type="button" className="owner-login-forgot" onClick={()=>setForgotOpen(value=>!value)} aria-expanded={forgotOpen}>Lupa kata sandi?</button></div>
      {forgotOpen&&<p className="owner-login-help" role="status">Pemulihan kata sandi belum tersedia di prototipe ini. Hubungi pengelola akun saat sistem autentikasi sudah aktif.</p>}
      <button className="owner-login-submit" type="submit">Masuk ke owner <ArrowRight size={18}/></button>
     </form>
     <div className="owner-login-demo"><span>Ingin mencoba dulu?</span><button type="button" onClick={()=>onLogin(false)}>Buka demo owner</button><small>Data contoh, bebas menjelajahi dashboard usaha.</small></div>
     <p className="owner-login-demo-note">Pratinjau UI · login belum terhubung ke autentikasi.</p>
    </div>
    <small>© {new Date().getFullYear()} Syaqil Laundry</small>
   </section>
   <section className="owner-login-poster" aria-label="Bersih, cepat, beres. Syaqil Laundry">
    <div className="owner-login-poster-top"><span>SYAQIL LAUNDRY</span><span>EST. CLEAN</span></div>
    <h2>BERSIH.<br/>CEPAT.<br/><span>BERES.</span></h2>
    <div className="owner-login-logo"><img src="/assets/logo.png" alt=""/></div>
    <span className="owner-login-price">MULAI<br/><strong>6K</strong> / KG</span>
    <span className="owner-login-tag">Cucian beres,<br/>hari lebih ringan!</span>
    <div className="owner-login-poster-bottom"><b>CUCI • BERSIH • PRAKTIS</b><span>REGULER / EXPRESS</span></div>
   </section>
  </div>
 </main>;
}
