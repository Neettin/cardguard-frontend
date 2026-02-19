/**
 * CardGuard — Complete Premium App v2.2
 * ✅ PapaParse: ES module import (npm), NOT window.Papa CDN check
 * ✅ Built-in CSV parser for non-standard "quoted-row" format files
 * ✅ fraudApi.js is now the source of truth for API calls
 * ✅ Mobile-first responsive, hamburger nav, fluid layouts
 * ✅ Navbar/Footer: text-only status, no dots
 * ✅ Predict presets: no emoji
 * ✅ Dashboard empty state: SVG icon, no emoji
 */

import { useState, useEffect, useRef } from "react";
import Papa from "papaparse"; // requires: npm install papaparse
import { predictSingle, predictBatch, healthCheck } from "./api/fraudApi";

// ─────────────────────────────────────────────────────────────────
//  API — thin wrappers over fraudApi.js (single source of truth)
// ─────────────────────────────────────────────────────────────────
async function apiHealth() {
  return healthCheck();
}
async function apiPredict(payload) {
  try {
    return await predictSingle(payload);
  } catch (err) {
    throw new Error(err.response?.data?.detail || err.message || "Prediction failed");
  }
}
async function apiBatchPredict(rows) {
  try {
    return await predictBatch(rows);
  } catch (err) {
    throw new Error(err.response?.data?.detail || err.message || "Batch prediction failed");
  }
}

// ─────────────────────────────────────────────────────────────────
//  BUILT-IN CSV PARSER (fallback + handles quirky quoted-row format)
//
//  Your test-transaction.csv has this unusual format where EACH ROW
//  is wrapped in outer double-quotes:
//    "step,type,amount,oldbalanceOrg,..."   ← header as one quoted string
//    "1,PAYMENT,9839.64,170136,..."         ← each row as one quoted string
//
//  Standard CSV parsers (including PapaParse) see this as a 1-column
//  file where the "column" value is the entire row. This parser
//  detects and handles that format automatically.
// ─────────────────────────────────────────────────────────────────
function parseCSVBuiltIn(text) {
  const lines = text.trim().split(/\r?\n/).filter(l => l.trim());
  if (!lines.length) throw new Error("Empty file");

  // Detect "quoted-row" format: every line is a single outer-quoted string
  // e.g.  "step,type,amount"  instead of  step,type,amount
  const firstLine = lines[0].trim();
  const isQuotedRow =
    firstLine.startsWith('"') &&
    firstLine.endsWith('"') &&
    !firstLine.slice(1, -1).includes('"'); // no internal quotes

  let headers, dataLines;

  if (isQuotedRow) {
    // Strip outer quotes, then split on commas normally
    const stripped = lines.map(l => {
      const t = l.trim();
      return t.startsWith('"') && t.endsWith('"') ? t.slice(1, -1) : t;
    });
    headers   = stripped[0].split(",").map(h => h.trim());
    dataLines = stripped.slice(1);
  } else {
    // Standard CSV
    headers   = firstLine.split(",").map(h => h.trim().replace(/^"|"$/g, ""));
    dataLines = lines.slice(1);
  }

  const rows = dataLines
    .map(line => {
      const vals = line.split(",").map(v => v.trim().replace(/^"|"$/g, ""));
      const obj  = {};
      headers.forEach((h, i) => {
        const raw = vals[i] ?? "";
        obj[h] = raw !== "" && !isNaN(raw) ? Number(raw) : raw;
      });
      return obj;
    })
    .filter(r => Object.values(r).some(v => v !== "" && v !== null));

  return { headers, rows };
}

// ─────────────────────────────────────────────────────────────────
//  STYLES
// ─────────────────────────────────────────────────────────────────
const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;0,800;1,400;1,600&family=Inter:wght@200;300;400;500;600&family=Space+Mono:wght@400;700&display=swap');

*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:smooth;overflow-x:hidden}
body{font-family:'Inter',-apple-system,BlinkMacSystemFont,sans-serif;background:#050508;color:#F5F5F7;min-height:100vh;overflow-x:hidden;-webkit-font-smoothing:antialiased;}
::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:#050508}::-webkit-scrollbar-thumb{background:linear-gradient(180deg,#D4AF37,#8B7536);border-radius:3px}
::selection{background:rgba(212,175,55,.3);color:#fff}

#fg-cursor,#fg-ring{display:none;}
@media(pointer:fine){
  body{cursor:none;}
  #fg-cursor{display:block;position:fixed;width:8px;height:8px;background:#D4AF37;border-radius:50%;pointer-events:none;z-index:9999;mix-blend-mode:difference;}
  #fg-ring{display:block;position:fixed;width:34px;height:34px;border:1px solid rgba(212,175,55,.45);border-radius:50%;pointer-events:none;z-index:9998;}
}

.orb{position:fixed;border-radius:50%;filter:blur(100px);pointer-events:none;z-index:0;}
.orb-1{width:600px;height:600px;top:-200px;left:-100px;background:radial-gradient(circle,rgba(212,175,55,.12),transparent 70%);animation:orb1 20s ease-in-out infinite;}
.orb-2{width:500px;height:500px;bottom:50px;right:-100px;background:radial-gradient(circle,rgba(48,209,88,.06),transparent 70%);animation:orb2 25s ease-in-out infinite;}
.orb-3{width:350px;height:350px;top:50%;left:50%;transform:translate(-50%,-50%);background:radial-gradient(circle,rgba(212,175,55,.04),transparent 70%);animation:orb3 18s ease-in-out infinite;}
@keyframes orb1{0%,100%{transform:translate(0,0)}33%{transform:translate(60px,-40px)}66%{transform:translate(-30px,60px)}}
@keyframes orb2{0%,100%{transform:translate(0,0)}33%{transform:translate(-50px,30px)}66%{transform:translate(40px,-50px)}}
@keyframes orb3{0%,100%{transform:translate(-50%,-50%) translateY(0)}50%{transform:translate(-50%,-50%) translateY(-30px)}}
.noise-overlay{position:fixed;inset:0;background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E");pointer-events:none;z-index:0;opacity:.35;}

.navbar{position:fixed;top:0;left:0;right:0;z-index:200;height:60px;display:flex;align-items:center;justify-content:space-between;padding:0 20px;background:rgba(5,5,8,.7);backdrop-filter:blur(40px) saturate(180%);border-bottom:1px solid rgba(255,255,255,.06);transition:all .4s ease;}
.navbar.scrolled{background:rgba(5,5,8,.92);border-color:rgba(212,175,55,.18);}
@media(min-width:600px){.navbar{padding:0 32px;}}
@media(min-width:1024px){.navbar{height:64px;padding:0 48px;}}
.nav-logo{display:flex;align-items:center;gap:9px;cursor:pointer;flex-shrink:0;}
.logo-mark{width:32px;height:32px;background:linear-gradient(135deg,#D4AF37,#F5E679);border-radius:9px;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 16px rgba(212,175,55,.35),inset 0 1px 0 rgba(255,255,255,.3);overflow:hidden;position:relative;flex-shrink:0;}
.logo-mark::after{content:'';position:absolute;inset:0;background:linear-gradient(135deg,transparent 40%,rgba(255,255,255,.25) 60%,transparent 70%);animation:logoShine 4s ease-in-out infinite;}
@keyframes logoShine{0%,100%{transform:translateX(-120%)}50%{transform:translateX(120%)}}
.logo-text{font-family:'Playfair Display',serif;font-weight:700;font-size:16px;letter-spacing:-.02em;color:#F5F5F7;}
.logo-text span{color:#D4AF37;}
.nav-tabs{display:none;}
@media(min-width:768px){.nav-tabs{display:flex;gap:2px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06);border-radius:20px;padding:4px;}}
.nav-tab{padding:6px 15px;border-radius:14px;font-size:13px;font-weight:500;color:rgba(245,245,247,.5);cursor:pointer;transition:all .25s;border:none;background:none;font-family:inherit;letter-spacing:-.01em;white-space:nowrap;}
.nav-tab:hover{color:#F5F5F7;background:rgba(255,255,255,.07);}
.nav-tab.active{color:#D4AF37;background:rgba(212,175,55,.12);}
.nav-status-pill{display:none;font-family:'Space Mono',monospace;font-size:10px;border-radius:20px;padding:5px 13px;white-space:nowrap;flex-shrink:0;letter-spacing:.04em;}
@media(min-width:900px){.nav-status-pill{display:flex;align-items:center;}}
.nav-status-pill.online{color:#30D158;background:rgba(48,209,88,.08);border:1px solid rgba(48,209,88,.2);}
.nav-status-pill.offline{color:#FF3B30;background:rgba(255,59,48,.08);border:1px solid rgba(255,59,48,.2);}
.hamburger{display:flex;flex-direction:column;justify-content:center;gap:5px;width:36px;height:36px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:10px;cursor:pointer;padding:9px 8px;flex-shrink:0;}
.hamburger span{display:block;height:1.5px;background:rgba(245,245,247,.65);border-radius:2px;transition:all .3s ease;}
.hamburger.open span:nth-child(1){transform:rotate(45deg) translate(4.5px,4.5px);}
.hamburger.open span:nth-child(2){opacity:0;transform:scaleX(0);}
.hamburger.open span:nth-child(3){transform:rotate(-45deg) translate(4.5px,-4.5px);}
@media(min-width:768px){.hamburger{display:none;}}
.mobile-drawer{position:fixed;top:60px;left:0;right:0;z-index:190;background:rgba(5,5,8,.98);backdrop-filter:blur(40px);border-bottom:1px solid rgba(255,255,255,.07);padding:10px 16px 18px;display:flex;flex-direction:column;gap:3px;transform:translateY(-110%);transition:transform .35s cubic-bezier(.16,1,.3,1);}
.mobile-drawer.open{transform:translateY(0);}
.mob-tab{display:flex;align-items:center;gap:10px;padding:13px 14px;border-radius:12px;font-size:14px;font-weight:500;color:rgba(245,245,247,.5);cursor:pointer;transition:all .25s;border:none;background:none;font-family:inherit;text-align:left;width:100%;}
.mob-tab:hover,.mob-tab.active{color:#D4AF37;background:rgba(212,175,55,.08);}
.mob-tab.active{border-left:2px solid rgba(212,175,55,.5);}
.mob-status{margin-top:10px;padding-top:12px;border-top:1px solid rgba(255,255,255,.06);font-family:'Space Mono',monospace;font-size:10px;letter-spacing:.06em;padding-left:14px;}
.mob-status.online{color:rgba(48,209,88,.6);}
.mob-status.offline{color:rgba(255,59,48,.5);}
@media(min-width:768px){.mobile-drawer{display:none!important;}}

.page{position:relative;z-index:1;padding-top:60px;min-height:100vh;}
@media(min-width:1024px){.page{padding-top:64px;}}
.eyebrow{font-family:'Space Mono',monospace;font-size:10px;text-transform:uppercase;letter-spacing:.15em;color:rgba(212,175,55,.7);margin-bottom:14px;}
.h1{font-family:'Playfair Display',serif;font-size:clamp(42px,8vw,96px);font-weight:700;line-height:.95;letter-spacing:-.04em;color:#F5F5F7;}
.h1 .gold{background:linear-gradient(135deg,#F5E679 0%,#D4AF37 40%,#C08B30 80%,#D4AF37 100%);background-size:300% 100%;-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;animation:goldFlow 5s linear infinite;}
.h1 .italic{font-style:italic;font-weight:400;}
@keyframes goldFlow{0%{background-position:0%}100%{background-position:300%}}
.h2{font-family:'Playfair Display',serif;font-size:clamp(28px,5vw,52px);font-weight:700;letter-spacing:-.03em;line-height:1.05;color:#F5F5F7;}
.h2 .gold{color:#D4AF37;font-style:italic;}
.container{max-width:1200px;margin:0 auto;padding:0 20px;}
@media(min-width:600px){.container{padding:0 32px;}}
@media(min-width:1024px){.container{padding:0 48px;}}
.section{padding:60px 0;}
@media(min-width:768px){.section{padding:90px 0;}}
.glass{background:rgba(255,255,255,.025);border:1px solid rgba(255,255,255,.08);border-radius:24px;backdrop-filter:blur(40px) saturate(180%);position:relative;overflow:hidden;transition:border-color .4s,box-shadow .4s;}
.glass::before{content:'';position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,rgba(255,255,255,.1),transparent);}
.glass:hover{border-color:rgba(212,175,55,.2);box-shadow:0 0 60px rgba(212,175,55,.05),0 20px 60px rgba(0,0,0,.4);}
.glass-pad{padding:24px;}
@media(min-width:600px){.glass-pad{padding:36px;}}
@media(min-width:1024px){.glass-pad{padding:40px;}}
.glow-pill{display:inline-flex;align-items:center;gap:8px;padding:7px 18px;background:rgba(212,175,55,.06);border:1px solid rgba(212,175,55,.2);border-radius:20px;font-family:'Space Mono',monospace;font-size:10px;text-transform:uppercase;letter-spacing:.12em;color:#D4AF37;}
.glow-dot{width:6px;height:6px;background:#D4AF37;border-radius:50%;animation:glowP 2s ease-in-out infinite;flex-shrink:0;}
@keyframes glowP{0%,100%{box-shadow:0 0 0 0 rgba(212,175,55,.5)}50%{box-shadow:0 0 0 4px rgba(212,175,55,0)}}
.btn-gold{display:inline-flex;align-items:center;justify-content:center;gap:9px;padding:14px 28px;background:linear-gradient(135deg,#D4AF37,#F5E679,#D4AF37);background-size:200% 100%;color:#050508;font-weight:600;font-size:14px;letter-spacing:-.01em;border:none;border-radius:14px;cursor:pointer;transition:all .4s cubic-bezier(.16,1,.3,1);position:relative;overflow:hidden;box-shadow:0 0 0 1px rgba(212,175,55,.3),0 8px 32px rgba(212,175,55,.22);animation:btnShine 3s ease-in-out infinite;font-family:inherit;}
.btn-gold::before{content:'';position:absolute;inset:0;background:linear-gradient(135deg,transparent 30%,rgba(255,255,255,.28) 50%,transparent 70%);transform:skewX(-20deg) translateX(-150%);transition:transform .7s;}
.btn-gold:hover::before{transform:skewX(-20deg) translateX(150%);}
.btn-gold:hover{transform:translateY(-2px) scale(1.01);box-shadow:0 0 0 1px rgba(212,175,55,.5),0 14px 44px rgba(212,175,55,.3);}
.btn-gold:active{transform:scale(.98);}
.btn-gold:disabled{opacity:.5;cursor:not-allowed;animation:none;background:#8B7942;transform:none!important;}
@keyframes btnShine{0%,100%{background-position:0%}50%{background-position:100%}}
.btn-outline{display:inline-flex;align-items:center;justify-content:center;gap:9px;padding:14px 28px;background:rgba(255,255,255,.03);color:#F5F5F7;font-weight:500;font-size:14px;border:1px solid rgba(255,255,255,.1);border-radius:14px;cursor:pointer;transition:all .3s;font-family:inherit;}
.btn-outline:hover{background:rgba(255,255,255,.07);border-color:rgba(212,175,55,.3);transform:translateY(-2px);}
.btn-sm{padding:9px 18px;font-size:13px;border-radius:11px;}
.form-label{display:block;font-family:'Space Mono',monospace;font-size:9px;text-transform:uppercase;letter-spacing:.12em;color:rgba(245,245,247,.3);margin-bottom:7px;}
.form-input{width:100%;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:12px;color:#F5F5F7;font-size:14px;padding:12px 14px;outline:none;transition:all .3s;font-family:'Space Mono',monospace;-webkit-appearance:none;appearance:none;}
.form-input:focus{border-color:#D4AF37;background:rgba(212,175,55,.04);box-shadow:0 0 0 3px rgba(212,175,55,.08);}
.form-input:hover:not(:focus){border-color:rgba(255,255,255,.15);}
.form-select{background-image:url("data:image/svg+xml,%3Csvg width='12' height='8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%23D4AF37' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 14px center;cursor:pointer;}
.form-grid{display:grid;grid-template-columns:1fr;gap:12px;}
@media(min-width:480px){.form-grid{grid-template-columns:1fr 1fr;}}
.spinner{width:17px;height:17px;border:2px solid rgba(5,5,8,.2);border-top-color:#050508;border-radius:50%;animation:spin .7s linear infinite;flex-shrink:0;}
.spinner-gold{border:2px solid rgba(212,175,55,.2);border-top-color:#D4AF37;}
@keyframes spin{to{transform:rotate(360deg)}}
.error-box{background:rgba(255,59,48,.08);border:1px solid rgba(255,59,48,.22);border-radius:12px;padding:12px 16px;color:#FF3B30;font-family:'Space Mono',monospace;font-size:12px;display:flex;align-items:flex-start;gap:9px;margin-top:14px;line-height:1.5;}
.info-box{background:rgba(48,209,88,.06);border:1px solid rgba(48,209,88,.18);border-radius:12px;padding:10px 16px;color:rgba(48,209,88,.8);font-family:'Space Mono',monospace;font-size:11px;margin-top:12px;line-height:1.5;}
.tag{display:inline-flex;align-items:center;padding:3px 9px;border-radius:5px;font-family:'Space Mono',monospace;font-size:9px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;}
.tag-fraud{color:#FF3B30;background:rgba(255,59,48,.12);border:1px solid rgba(255,59,48,.2);}
.tag-legit{color:#30D158;background:rgba(48,209,88,.1);border:1px solid rgba(48,209,88,.2);}
.tag-high{color:#FF3B30;background:rgba(255,59,48,.08);border:1px solid rgba(255,59,48,.14);}
.tag-medium{color:#FFD60A;background:rgba(255,214,10,.08);border:1px solid rgba(255,214,10,.14);}
.tag-low{color:#30D158;background:rgba(48,209,88,.06);border:1px solid rgba(48,209,88,.12);}
.card-scene{perspective:1200px;width:100%;}
.card-flipper{position:relative;transform-style:preserve-3d;transition:transform 1s cubic-bezier(.23,1,.32,1);width:100%;aspect-ratio:1.586;}
.card-flipper.flipped{transform:rotateY(180deg);}
.card-face{position:absolute;inset:0;backface-visibility:hidden;border-radius:22px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.5),0 0 0 1px rgba(255,255,255,.06);}
.card-back-face{transform:rotateY(180deg);}
.card-foil{position:absolute;inset:0;background:linear-gradient(135deg,transparent 0%,rgba(212,175,55,.04) 20%,rgba(245,230,121,.1) 35%,rgba(212,175,55,.04) 50%,rgba(255,255,255,.06) 65%,rgba(212,175,55,.04) 80%,transparent 100%);background-size:300% 300%;animation:foilShift 6s ease-in-out infinite;pointer-events:none;}
@keyframes foilShift{0%,100%{background-position:0% 0%}25%{background-position:100% 0%}50%{background-position:100% 100%}75%{background-position:0% 100%}}
.card-shimmer{position:absolute;inset:0;background:linear-gradient(105deg,transparent 40%,rgba(255,255,255,.07) 50%,transparent 60%);background-size:200% 100%;animation:sMove 3s ease-in-out infinite;pointer-events:none;}
@keyframes sMove{0%{background-position:-100%}100%{background-position:200%}}
.dropzone{border:2px dashed rgba(255,255,255,.1);border-radius:18px;padding:32px 20px;text-align:center;cursor:pointer;transition:all .3s;background:rgba(255,255,255,.01);}
.dropzone:hover,.dropzone.drag-over{border-color:rgba(212,175,55,.4);background:rgba(212,175,55,.04);}
.drop-icon{width:52px;height:52px;background:rgba(212,175,55,.08);border:1px solid rgba(212,175,55,.2);border-radius:16px;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;transition:transform .3s;}
.dropzone:hover .drop-icon{transform:scale(1.08);}
.data-table{width:100%;border-collapse:collapse;}
.data-table th{font-family:'Space Mono',monospace;font-size:9px;text-transform:uppercase;letter-spacing:.1em;color:rgba(245,245,247,.3);padding:12px 16px;text-align:left;border-bottom:1px solid rgba(255,255,255,.05);background:rgba(255,255,255,.01);white-space:nowrap;}
.data-table td{padding:12px 16px;font-size:13px;color:rgba(245,245,247,.6);border-bottom:1px solid rgba(255,255,255,.03);transition:background .2s;}
.data-table tr:hover td{background:rgba(255,255,255,.012);}
.data-table tr:last-child td{border-bottom:none;}
.kpi-card{background:rgba(255,255,255,.025);border:1px solid rgba(255,255,255,.07);border-radius:20px;padding:20px 16px;transition:all .35s;position:relative;overflow:hidden;}
@media(min-width:600px){.kpi-card{padding:24px 20px;}}
.kpi-card::after{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,var(--accent,#D4AF37),transparent);opacity:0;transition:opacity .35s;}
.kpi-card:hover{border-color:rgba(212,175,55,.2);transform:translateY(-2px);}
.kpi-card:hover::after{opacity:1;}
.kpi-val{font-family:'Playfair Display',serif;font-size:clamp(28px,4vw,38px);font-weight:700;letter-spacing:-.03em;line-height:1;margin-bottom:6px;}
.kpi-lbl{font-family:'Space Mono',monospace;font-size:9px;text-transform:uppercase;letter-spacing:.1em;color:rgba(245,245,247,.3);}
.bar-chart-wrap{display:flex;align-items:flex-end;gap:8px;height:130px;padding-bottom:4px;overflow-x:auto;}
.bar-grp{display:flex;flex-direction:column;align-items:center;flex-shrink:0;}
.bar-grp-label{font-family:'Space Mono',monospace;font-size:8px;color:rgba(245,245,247,.3);margin-top:6px;letter-spacing:.03em;}
.bar{border-radius:4px 4px 0 0;position:relative;overflow:hidden;transition:height .8s cubic-bezier(.16,1,.3,1);}
.bar::after{content:'';position:absolute;top:0;left:0;right:0;height:35%;background:linear-gradient(to bottom,rgba(255,255,255,.15),transparent);}
.bar-f{background:linear-gradient(to top,#FF3B30,#FF6B60);}
.bar-l{background:linear-gradient(to top,#30D158,#5EE87E);}
.preset-chip{padding:8px 16px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);border-radius:20px;color:rgba(245,245,247,.5);font-size:12px;font-weight:500;cursor:pointer;transition:all .3s;font-family:inherit;white-space:nowrap;}
.preset-chip:hover{background:rgba(212,175,55,.08);border-color:rgba(212,175,55,.3);color:#D4AF37;transform:translateY(-1px);}
.prob-bar-bg{height:3px;background:rgba(255,255,255,.06);border-radius:2px;overflow:hidden;margin-top:7px;}
.prob-bar-fill{height:100%;border-radius:2px;transition:width 1.2s cubic-bezier(.16,1,.3,1);}
.hero-layout{display:grid;grid-template-columns:1fr;gap:40px;align-items:center;min-height:calc(100vh - 60px);padding:36px 20px 60px;position:relative;}
@media(min-width:600px){.hero-layout{padding:40px 32px 60px;}}
@media(min-width:960px){.hero-layout{grid-template-columns:1fr 400px;gap:60px;padding:40px 48px;min-height:calc(100vh - 64px);}}
.hero-card-col{display:none;}
@media(min-width:960px){.hero-card-col{display:flex;justify-content:center;perspective:1000px;}}
.grid-bg::before{content:'';position:absolute;inset:0;background-image:linear-gradient(rgba(212,175,55,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(212,175,55,.04) 1px,transparent 1px);background-size:60px 60px;mask-image:radial-gradient(ellipse 80% 80% at 50% 50%,black 0%,transparent 100%);pointer-events:none;}
.stats-bar-inner{max-width:1200px;margin:0 auto;padding:0 20px;display:grid;grid-template-columns:repeat(3,1fr);gap:0;}
@media(min-width:600px){.stats-bar-inner{padding:0 32px;grid-template-columns:repeat(6,1fr);}}
@media(min-width:1024px){.stats-bar-inner{padding:0 48px;}}
.stat-cell{padding:20px 0;text-align:center;}
.stat-cell:not(:last-child){border-right:1px solid rgba(255,255,255,.05);}
.stat-val{font-family:'Playfair Display',serif;font-size:clamp(16px,2.5vw,22px);font-weight:700;color:#D4AF37;margin-bottom:4px;}
.stat-lbl{font-family:'Space Mono',monospace;font-size:8px;text-transform:uppercase;letter-spacing:.1em;color:rgba(245,245,247,.28);}
.steps-grid{display:grid;grid-template-columns:1fr;gap:2px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.06);border-radius:22px;overflow:hidden;margin-top:48px;}
@media(min-width:600px){.steps-grid{grid-template-columns:1fr 1fr;}}
@media(min-width:1024px){.steps-grid{grid-template-columns:repeat(4,1fr);}}
.step-card{background:#050508;padding:32px 24px;position:relative;overflow:hidden;transition:background .4s;}
.step-card::before{content:'';position:absolute;bottom:0;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,#D4AF37,transparent);transform:scaleX(0);transition:transform .5s;transform-origin:left;}
.step-card:hover::before{transform:scaleX(1);}
.step-card:hover{background:rgba(212,175,55,.02);}
.step-num{font-family:'Playfair Display',serif;font-size:64px;font-weight:700;color:rgba(212,175,55,.05);line-height:1;position:absolute;top:10px;right:14px;letter-spacing:-.05em;}
.step-icon{width:42px;height:42px;background:rgba(212,175,55,.08);border:1px solid rgba(212,175,55,.18);border-radius:13px;display:flex;align-items:center;justify-content:center;color:#D4AF37;margin-bottom:20px;transition:all .3s;}
.step-card:hover .step-icon{background:rgba(212,175,55,.14);box-shadow:0 0 18px rgba(212,175,55,.2);}
.step-title{font-size:15px;font-weight:600;color:#F5F5F7;margin-bottom:8px;letter-spacing:-.02em;}
.step-desc{font-size:13px;color:rgba(245,245,247,.38);line-height:1.6;}
.about-grid{display:grid;grid-template-columns:1fr;gap:40px;align-items:start;}
@media(min-width:900px){.about-grid{grid-template-columns:1fr 1fr;gap:72px;align-items:center;}}
.predict-cols{display:grid;grid-template-columns:1fr;gap:24px;align-items:start;}
@media(min-width:900px){.predict-cols{grid-template-columns:1fr 1fr;}}
.kpi-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px;}
@media(min-width:700px){.kpi-grid{grid-template-columns:repeat(4,1fr);gap:14px;}}
.charts-grid{display:grid;grid-template-columns:1fr;gap:14px;margin-bottom:16px;}
@media(min-width:760px){.charts-grid{grid-template-columns:1fr 1fr;}}
.batch-kpi{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px;}
@media(min-width:600px){.batch-kpi{grid-template-columns:repeat(4,1fr);gap:14px;}}
.divider{height:1px;background:linear-gradient(90deg,transparent,rgba(212,175,55,.15),transparent);}
footer{border-top:1px solid rgba(255,255,255,.05);padding:20px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;position:relative;z-index:1;}
@media(min-width:600px){footer{padding:22px 32px;}}
@media(min-width:1024px){footer{padding:24px 48px;}}
.footer-copy{font-family:'Space Mono',monospace;font-size:9px;color:rgba(245,245,247,.2);letter-spacing:.05em;}
.footer-status{font-family:'Space Mono',monospace;font-size:9px;letter-spacing:.06em;}
.footer-status.online{color:rgba(48,209,88,.55);}
.footer-status.offline{color:rgba(255,59,48,.45);}
.empty-state{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:calc(100vh - 120px);padding:40px 24px;text-align:center;}
.empty-icon-wrap{width:72px;height:72px;background:rgba(212,175,55,.06);border:1px solid rgba(212,175,55,.12);border-radius:22px;display:flex;align-items:center;justify-content:center;margin:0 auto 24px;color:rgba(212,175,55,.4);}
.empty-title{font-family:'Playfair Display',serif;font-size:clamp(22px,4vw,30px);font-weight:700;margin-bottom:10px;}
.empty-body{font-size:14px;color:rgba(245,245,247,.38);line-height:1.65;max-width:340px;margin:0 auto 28px;}
.fade-up{animation:fadeUp .65s cubic-bezier(.16,1,.3,1) both;}
.d1{animation-delay:.1s;opacity:0;}.d2{animation-delay:.2s;opacity:0;}.d3{animation-delay:.3s;opacity:0;}
@keyframes fadeUp{from{opacity:0;transform:translateY(26px)}to{opacity:1;transform:translateY(0)}}
.card-float{animation:cardFloat 8s ease-in-out infinite;}
@keyframes cardFloat{0%,100%{transform:rotateX(8deg) rotateY(-12deg) rotateZ(-2deg)}25%{transform:rotateX(4deg) rotateY(-6deg)}50%{transform:rotateX(10deg) rotateY(-18deg) rotateZ(-3deg)}75%{transform:rotateX(6deg) rotateY(-8deg) rotateZ(-1deg)}}
@keyframes badgeFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}
`;

// ─────────────────────────────────────────────────────────────────
//  HISTORY
// ─────────────────────────────────────────────────────────────────
const HK = "fg_history_v2";
const loadHistory  = () => { try { return JSON.parse(localStorage.getItem(HK) || "[]"); } catch { return []; } };
const saveHistory  = (h) => { try { localStorage.setItem(HK, JSON.stringify(h.slice(0, 500))); } catch {} };
const addToHistory = (r) => { const h = loadHistory(); h.unshift({ ...r, id: Date.now(), timestamp: new Date().toISOString() }); saveHistory(h); };
const clearHistory = () => localStorage.removeItem(HK);

// ─────────────────────────────────────────────────────────────────
//  HELPERS
// ─────────────────────────────────────────────────────────────────
const fmt$    = (n) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(n);
const fmtPct  = (n) => `${(n * 100).toFixed(1)}%`;
const riskClr = (r) => r === "HIGH" ? "#FF3B30" : r === "MEDIUM" ? "#FFD60A" : "#30D158";
const tagCls  = (r) => r === "HIGH" ? "tag-high" : r === "MEDIUM" ? "tag-medium" : "tag-low";

// ─────────────────────────────────────────────────────────────────
//  ICONS
// ─────────────────────────────────────────────────────────────────
const IShield   = ({s=16}) => <svg width={s} height={s} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>;
const IActivity = ({s=16}) => <svg width={s} height={s} fill="none" stroke="currentColor" strokeWidth="2"   viewBox="0 0 24 24"><polyline points="22,12 18,12 15,21 9,3 6,12 2,12"/></svg>;
const IFile     = ({s=16}) => <svg width={s} height={s} fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/></svg>;
const IGrid     = ({s=16}) => <svg width={s} height={s} fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>;
const IHome     = ({s=16}) => <svg width={s} height={s} fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/></svg>;
const IChart    = ({s=24}) => <svg width={s} height={s} fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6"  y1="20" x2="6"  y2="14"/></svg>;
const ICard     = ({s=24}) => <svg width={s} height={s} fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>;
const IWarn     = ()       => <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>;
const ICheck    = ()       => <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="20,6 9,17 4,12"/></svg>;

// ─────────────────────────────────────────────────────────────────
//  NAVBAR
// ─────────────────────────────────────────────────────────────────
const TABS = [
  { id: "home",      label: "Home",      icon: <IHome s={13}/> },
  { id: "predict",   label: "Predict",   icon: <IShield s={13}/> },
  { id: "batch",     label: "Batch",     icon: <IFile s={13}/> },
  { id: "dashboard", label: "Dashboard", icon: <IGrid s={13}/> },
];

function Navbar({ page, setPage, health }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen]         = useState(false);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 30);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);
  const go = (id) => { setPage(id); setOpen(false); window.scrollTo(0, 0); };
  return (
    <>
      <nav className={`navbar${scrolled ? " scrolled" : ""}`}>
        <div className="nav-logo" onClick={() => go("home")}>
          <div className="logo-mark"><svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M8 1L14 4.5V11.5L8 15L2 11.5V4.5L8 1Z" fill="#050508"/></svg></div>
          <span className="logo-text">Card<span>Guard</span></span>
        </div>
        <div className="nav-tabs">
          {TABS.map(t => (
            <button key={t.id} className={`nav-tab${page === t.id ? " active" : ""}`} onClick={() => go(t.id)}>
              <span style={{ display:"flex",alignItems:"center",gap:6 }}>{t.icon}{t.label}</span>
            </button>
          ))}
        </div>
        <div style={{ display:"flex",alignItems:"center",gap:10 }}>
          <div className={`nav-status-pill ${health ? "online" : "offline"}`}>
            {health ? `LIVE · v${health.model_version || "1.0"}` : "OFFLINE"}
          </div>
          <div className={`hamburger${open ? " open" : ""}`} onClick={() => setOpen(o => !o)}>
            <span/><span/><span/>
          </div>
        </div>
      </nav>
      <div className={`mobile-drawer${open ? " open" : ""}`}>
        {TABS.map(t => (
          <button key={t.id} className={`mob-tab${page === t.id ? " active" : ""}`} onClick={() => go(t.id)}>
            {t.icon} {t.label}
          </button>
        ))}
        <div className={`mob-status ${health ? "online" : "offline"}`}>
          {health ? `Model Online · v${health.model_version || "1.0"}` : "API Offline"}
        </div>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────
//  CREDIT CARD FACES
// ─────────────────────────────────────────────────────────────────
function PremiumCard({ amount, txType, isAnalyzing }) {
  return (
    <div style={{ width:"100%",aspectRatio:"1.586",borderRadius:22,position:"relative",overflow:"hidden",background:"linear-gradient(135deg,#1C1C1E 0%,#0D0D10 60%,#1A1420 100%)",boxShadow:"0 2px 0 rgba(255,255,255,.07) inset,0 40px 120px rgba(0,0,0,.8),0 0 0 1px rgba(255,255,255,.05),0 20px 60px rgba(212,175,55,.1)" }}>
      <div className="card-foil"/><div className="card-shimmer"/>
      <div style={{ position:"absolute",top:0,left:0,right:0,height:3,background:"linear-gradient(90deg,transparent,#D4AF37,transparent)",opacity:.6 }}/>
      <div style={{ position:"absolute",top:22,left:22,width:42,height:32,background:"linear-gradient(135deg,#D4AF37,#F5E679,#C9A84C)",borderRadius:6,display:"grid",gridTemplateColumns:"1fr 1fr",gridTemplateRows:"1fr 8px 1fr",gap:2,padding:5,boxShadow:"0 2px 8px rgba(0,0,0,.4),inset 0 1px 0 rgba(255,255,255,.3)" }}>
        <div style={{ background:"rgba(0,0,0,.15)",borderRadius:2 }}/><div style={{ background:"rgba(0,0,0,.15)",borderRadius:2 }}/>
        <div style={{ gridColumn:"1/-1",background:"rgba(0,0,0,.1)",borderRadius:2 }}/>
        <div style={{ background:"rgba(0,0,0,.15)",borderRadius:2 }}/><div style={{ background:"rgba(0,0,0,.15)",borderRadius:2 }}/>
      </div>
      <div style={{ position:"absolute",top:22,right:22,width:26,height:26,display:"flex",alignItems:"center",justifyContent:"center" }}>
        {[9,17,25].map(s => <div key={s} style={{ position:"absolute",width:s,height:s,border:"1.5px solid rgba(255,255,255,.16)",borderRadius:"50%",borderLeft:"1.5px solid transparent",borderBottom:"1.5px solid transparent",transform:"rotate(-45deg)" }}/>)}
      </div>
      <div style={{ position:"absolute",bottom:56,left:22 }}>
        <div style={{ fontFamily:"'Space Mono',monospace",fontSize:9,letterSpacing:".1em",color:"rgba(255,255,255,.28)",textTransform:"uppercase",marginBottom:3 }}>Amount</div>
        <div style={{ fontFamily:"'Playfair Display',serif",fontSize:22,fontWeight:700,color:"#D4AF37",letterSpacing:"-.02em" }}>{amount ? fmt$(amount) : "$ 0.00"}</div>
      </div>
      <div style={{ position:"absolute",bottom:20,left:22,right:22,display:"flex",justifyContent:"space-between",alignItems:"center" }}>
        <span style={{ fontFamily:"'Space Mono',monospace",fontSize:9,letterSpacing:".1em",color:"rgba(255,255,255,.3)",textTransform:"uppercase" }}>{txType || "TRANSACTION"}</span>
        <span style={{ fontFamily:"'Space Mono',monospace",fontSize:8,color:isAnalyzing?"#D4AF37":"rgba(255,255,255,.18)",animation:isAnalyzing?"glowP 1.5s ease-in-out infinite":"none" }}>
          {isAnalyzing ? "ANALYZING..." : "AWAITING DATA"}
        </span>
      </div>
      <div style={{ position:"absolute",bottom:16,right:16,display:"flex" }}>
        <div style={{ width:28,height:28,borderRadius:"50%",background:"radial-gradient(circle at 40%,#FF6B35,#E53E1E)",opacity:.7,marginRight:-8 }}/>
        <div style={{ width:28,height:28,borderRadius:"50%",background:"radial-gradient(circle at 60%,#FFD700,#FFA500)",opacity:.7 }}/>
      </div>
    </div>
  );
}

function CardBack({ result }) {
  const c  = riskClr(result.risk_level);
  const bg = result.is_fraud
    ? "linear-gradient(135deg,#2D0A14 0%,#1A0508 60%,#2D1520 100%)"
    : "linear-gradient(135deg,#0A2D14 0%,#051A08 60%,#102D15 100%)";
  return (
    <div style={{ width:"100%",height:"100%",background:bg,borderRadius:22,position:"relative",overflow:"hidden" }}>
      <div className="card-foil"/>
      <div style={{ position:"absolute",top:0,left:0,right:0,height:3,background:`linear-gradient(90deg,transparent,${c},transparent)` }}/>
      <div style={{ position:"absolute",top:18,left:18,right:18,display:"flex",justifyContent:"space-between",alignItems:"center" }}>
        <div style={{ display:"flex",alignItems:"center",gap:6 }}>
          <div style={{ width:7,height:7,borderRadius:"50%",background:c,boxShadow:`0 0 6px ${c}`,animation:"glowP 2s ease-in-out infinite" }}/>
          <span style={{ fontFamily:"'Space Mono',monospace",fontSize:8,textTransform:"uppercase",letterSpacing:".12em",color:c }}>{result.risk_level} RISK</span>
        </div>
        <span style={{ fontFamily:"'Space Mono',monospace",fontSize:8,color:"rgba(255,255,255,.2)" }}>CARDGUARD AI</span>
      </div>
      <div style={{ position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:8 }}>
        <div style={{ fontSize:44 }}>{result.is_fraud ? "⚠️" : "✅"}</div>
        <div style={{ fontFamily:"'Playfair Display',serif",fontSize:26,fontWeight:700,color:c,letterSpacing:"-.02em" }}>{result.prediction}</div>
        <div style={{ fontFamily:"'Space Mono',monospace",fontSize:8,color:"rgba(255,255,255,.22)",textTransform:"uppercase",letterSpacing:".14em" }}>Analysis Complete</div>
      </div>
      <div style={{ position:"absolute",bottom:16,left:18,right:18 }}>
        <div style={{ display:"flex",justifyContent:"space-between",marginBottom:5 }}>
          <span style={{ fontFamily:"'Space Mono',monospace",fontSize:8,color:"rgba(255,255,255,.28)" }}>Probability</span>
          <span style={{ fontFamily:"'Space Mono',monospace",fontSize:10,fontWeight:700,color:c }}>{fmtPct(result.fraud_probability)}</span>
        </div>
        <div className="prob-bar-bg"><div className="prob-bar-fill" style={{ width:`${result.fraud_probability*100}%`,background:`linear-gradient(90deg,${c}50,${c})` }}/></div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
//  HOME PAGE
// ─────────────────────────────────────────────────────────────────
const TECH_STATS = [
  { val:"XGBoost",   lbl:"Model"    },
  { val:"99.98%",    lbl:"ROC-AUC"  },
  { val:"6.3M",      lbl:"Trained"  },
  { val:"FastAPI",   lbl:"Backend"  },
  { val:"React",     lbl:"Frontend" },
  { val:"HF+Vercel", lbl:"Deploy"   },
];
const STEPS = [
  { n:"01", title:"Input Transaction", desc:"Enter transaction details through our precision-crafted interface or upload a CSV batch.", icon:<ICard s={20}/> },
  { n:"02", title:"AI Processing",     desc:"XGBoost model analyzes 9 engineered features with 99.98% ROC-AUC accuracy in milliseconds.", icon:<svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4"/></svg> },
  { n:"03", title:"Card Flip Result",  desc:"Watch the verdict reveal — FRAUD or LEGIT — with confidence probability in a 3D card flip.", icon:<IShield s={20}/> },
  { n:"04", title:"Track & Analyze",   desc:"Every prediction saved automatically. View live trends and insights on the Dashboard.", icon:<IChart s={20}/> },
];

function HomePage({ setPage, health }) {
  return (
    <div className="page" style={{ position:"relative" }}>
      <div className="hero-layout grid-bg">
        <div className="fade-up">
          <div style={{ marginBottom:24 }}>
            <div className="glow-pill">
              <div className="glow-dot"/>
              {health ? `Model Online · Threshold ${health.threshold}` : "XGBoost · 99.98% ROC-AUC"}
            </div>
          </div>
          <h1 className="h1" style={{ marginBottom:24 }}>
            <span style={{ display:"block" }}>Protect Every</span>
            <span className="gold" style={{ display:"block" }}>Transaction.</span>
            <span className="italic" style={{ display:"block" }}>Instantly.</span>
          </h1>
          <p style={{ fontSize:"clamp(15px,2.5vw,18px)",color:"rgba(245,245,247,.48)",fontWeight:300,lineHeight:1.65,marginBottom:36,maxWidth:520 }}>
            Production-grade fraud detection powered by a model trained on{" "}
            <strong style={{ color:"rgba(245,245,247,.82)",fontWeight:500 }}>6.3 million real transactions</strong>.
          </p>
          <div style={{ display:"flex",gap:12,flexWrap:"wrap" }}>
            <button className="btn-gold" style={{ width:"auto" }} onClick={() => setPage("predict")}><IShield/> Try Detection</button>
            <button className="btn-outline" style={{ width:"auto" }} onClick={() => setPage("batch")}><IFile/> Batch Upload</button>
          </div>
        </div>
        <div className="hero-card-col fade-up d3">
          <div style={{ width:380,position:"relative" }}>
            <div style={{ position:"absolute",top:36,left:18,width:360,aspectRatio:"1.586",borderRadius:22,background:"linear-gradient(135deg,#101012,#070709)",border:"1px solid rgba(255,255,255,.02)",transform:"rotateX(8deg) rotateY(-12deg) rotateZ(-2deg)",opacity:.3 }}/>
            <div style={{ position:"absolute",top:18,left:9,width:370,aspectRatio:"1.586",borderRadius:22,background:"linear-gradient(135deg,#161618,#0A0A0E)",border:"1px solid rgba(255,255,255,.03)",transform:"rotateX(8deg) rotateY(-12deg) rotateZ(-2deg)",opacity:.5 }}/>
            <div className="card-float" style={{ position:"relative",zIndex:1 }}><PremiumCard amount={9839.64} txType="TRANSFER"/></div>
            <div style={{ position:"absolute",top:-12,right:-12,zIndex:10,background:"rgba(255,59,48,.1)",border:"1px solid rgba(255,59,48,.28)",backdropFilter:"blur(20px)",borderRadius:12,padding:"8px 13px",display:"flex",alignItems:"center",gap:6,fontFamily:"'Space Mono',monospace",fontSize:9,color:"#FF3B30",whiteSpace:"nowrap",animation:"badgeFloat 4s ease-in-out infinite" }}>
              <IWarn/> FRAUD DETECTED
            </div>
            <div style={{ position:"absolute",bottom:-12,left:-12,zIndex:10,background:"rgba(48,209,88,.08)",border:"1px solid rgba(48,209,88,.22)",backdropFilter:"blur(20px)",borderRadius:12,padding:"8px 13px",display:"flex",alignItems:"center",gap:6,fontFamily:"'Space Mono',monospace",fontSize:9,color:"#30D158",whiteSpace:"nowrap",animation:"badgeFloat 4s ease-in-out infinite 1.5s" }}>
              <ICheck/> SAFE
            </div>
          </div>
        </div>
      </div>
      <div style={{ background:"rgba(212,175,55,.03)",borderTop:"1px solid rgba(212,175,55,.08)",borderBottom:"1px solid rgba(212,175,55,.08)" }}>
        <div className="stats-bar-inner">
          {TECH_STATS.map(t => <div key={t.lbl} className="stat-cell"><div className="stat-val">{t.val}</div><div className="stat-lbl">{t.lbl}</div></div>)}
        </div>
      </div>
      <div className="container section" style={{ position:"relative",zIndex:1 }}>
        <div className="eyebrow fade-up">Process</div>
        <h2 className="h2 fade-up d1">How It <span className="gold">Works</span></h2>
        <div className="steps-grid fade-up d2">
          {STEPS.map(s => (
            <div key={s.n} className="step-card">
              <div className="step-num">{s.n}</div>
              <div className="step-icon">{s.icon}</div>
              <div className="step-title">{s.title}</div>
              <div className="step-desc">{s.desc}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="divider"/>
      <div className="container section" style={{ position:"relative",zIndex:1 }}>
        <div className="about-grid">
          <div>
            <div className="eyebrow fade-up">About</div>
            <h2 className="h2 fade-up d1" style={{ marginBottom:20 }}>What is <span className="gold">CardGuard?</span></h2>
            {["CardGuard is an end-to-end ML application detecting fraudulent credit card transactions in real time, powered by XGBoost trained on 6.3 million PaySim transactions.","The model achieves ROC-AUC of 0.9998 with a tuned threshold of 0.49, prioritizing recall to catch every fraudulent transaction.","Deployed on HuggingFace Spaces (FastAPI + Docker) and Vercel (React) — a fully production-ready full-stack AI application."].map((t,i) => (
              <p key={i} className="fade-up" style={{ fontSize:14,color:"rgba(245,245,247,.45)",fontWeight:300,lineHeight:1.7,marginBottom:14 }}>{t}</p>
            ))}
          </div>
          <div className="glass glass-pad fade-up d2">
            <div style={{ display:"flex",alignItems:"center",gap:14,marginBottom:20 }}>
              <div style={{ width:52,height:52,borderRadius:16,background:"linear-gradient(135deg,rgba(212,175,55,.12),rgba(212,175,55,.3))",border:"1px solid rgba(212,175,55,.22)",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Playfair Display',serif",fontSize:18,fontWeight:700,color:"#D4AF37",flexShrink:0 }}>NG</div>
              <div>
                <div style={{ fontFamily:"'Playfair Display',serif",fontSize:18,fontWeight:700,marginBottom:2 }}>Nitin Gupta</div>
                <div style={{ fontFamily:"'Space Mono',monospace",fontSize:9,color:"rgba(245,245,247,.28)",textTransform:"uppercase",letterSpacing:".08em" }}>ML Engineer · Full Stack</div>
              </div>
            </div>
            <p style={{ fontSize:13,color:"rgba(245,245,247,.42)",lineHeight:1.6,marginBottom:20 }}>Passionate about building real-world ML applications. CardGuard is a full-stack AI project — from data preprocessing to cloud deployment.</p>
            <div style={{ display:"flex",flexWrap:"wrap",gap:7,marginBottom:20 }}>
              {["Python","XGBoost","FastAPI","React","scikit-learn","Docker"].map(t => (
                <span key={t} style={{ padding:"4px 10px",background:"rgba(212,175,55,.05)",border:"1px solid rgba(212,175,55,.14)",borderRadius:18,fontFamily:"'Space Mono',monospace",fontSize:9,color:"rgba(212,175,55,.55)" }}>{t}</span>
              ))}
            </div>
            <div style={{ display:"flex",gap:10 }}>
              <a href="https://github.com/NitinGupta04" target="_blank" rel="noreferrer" style={{ flex:1,padding:"10px",background:"rgba(255,255,255,.03)",border:"1px solid rgba(255,255,255,.07)",borderRadius:11,color:"rgba(245,245,247,.38)",fontSize:13,textAlign:"center",textDecoration:"none",display:"block" }}>↗ GitHub</a>
              <a href="https://huggingface.co/NitinGupta04" target="_blank" rel="noreferrer" style={{ flex:1,padding:"10px",background:"rgba(212,175,55,.03)",border:"1px solid rgba(212,175,55,.18)",borderRadius:11,color:"rgba(212,175,55,.55)",fontSize:13,textAlign:"center",textDecoration:"none",display:"block" }}>↗ HuggingFace</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
//  PREDICT PAGE
// ─────────────────────────────────────────────────────────────────
const PRESETS = {
  "Suspicious Transfer": { step:1, type:"TRANSFER",  amount:181,     oldbalanceOrg:181,    newbalanceOrig:0,         oldbalanceDest:0,     newbalanceDest:0 },
  "Normal Payment":      { step:1, type:"PAYMENT",   amount:9839.64, oldbalanceOrg:170136, newbalanceOrig:160296.36, oldbalanceDest:0,     newbalanceDest:0 },
  "Large Cash Out":      { step:3, type:"CASH_OUT",  amount:500000,  oldbalanceOrg:500000, newbalanceOrig:0,         oldbalanceDest:21182, newbalanceDest:0 },
};
const TX_TYPES = ["TRANSFER","PAYMENT","CASH_OUT","CASH_IN","DEBIT"];
const FIELDS = [
  { key:"step",           label:"Step",                 ph:"1" },
  { key:"amount",         label:"Amount ($)",           ph:"10000.00" },
  { key:"oldbalanceOrg",  label:"Sender Old Balance",   ph:"50000.00" },
  { key:"newbalanceOrig", label:"Sender New Balance",   ph:"40000.00" },
  { key:"oldbalanceDest", label:"Receiver Old Balance", ph:"0.00" },
  { key:"newbalanceDest", label:"Receiver New Balance", ph:"0.00" },
];

function PredictPage() {
  const [form,    setForm]    = useState({ step:1, type:"TRANSFER", amount:"", oldbalanceOrg:"", newbalanceOrig:"", oldbalanceDest:"", newbalanceDest:"" });
  const [result,  setResult]  = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");
  const [flipped, setFlipped] = useState(false);
  const flipRef = useRef();
  const onChange   = e => { const{name,value}=e.target; setForm(p => ({...p,[name]:name==="type"?value:value===""?"":Number(value)})); };
  const loadPreset = d => { setForm(d); setResult(null); setFlipped(false); setError(""); };
  const submit = async () => {
    setError(""); setLoading(true); setResult(null); setFlipped(false);
    try {
      const res = await apiPredict(form);
      setResult(res);
      addToHistory({ ...res, type:form.type, amount:form.amount });
      setTimeout(() => setFlipped(true), 200);
    } catch(e) { setError(e.message); }
    finally { setLoading(false); }
  };
  const onTilt = e => {
    if (!flipRef.current) return;
    const rect = flipRef.current.getBoundingClientRect();
    const x=(e.clientX-rect.left)/rect.width-.5, y=(e.clientY-rect.top)/rect.height-.5;
    flipRef.current.style.transform=`rotateX(${-y*8}deg) rotateY(${(flipped?180:0)+x*12}deg)`;
    flipRef.current.style.transition="transform 0.05s ease";
  };
  const onTiltEnd = () => {
    if (!flipRef.current) return;
    flipRef.current.style.transition="transform 1s cubic-bezier(.23,1,.32,1)";
    flipRef.current.style.transform=flipped?"rotateY(180deg)":"rotateY(0deg)";
  };
  return (
    <div className="page">
      <div className="container" style={{ paddingTop:40,paddingBottom:60 }}>
        <div className="eyebrow fade-up">Single Transaction</div>
        <h1 className="h2 fade-up d1" style={{ marginBottom:6 }}>Fraud <span className="gold">Analysis</span></h1>
        <p className="fade-up d2" style={{ color:"rgba(245,245,247,.38)",fontSize:14,marginBottom:36 }}>Enter transaction details for an instant AI-powered verdict.</p>
        <div className="predict-cols">
          <div className="glass glass-pad fade-up d2">
            <label className="form-label">Quick Presets</label>
            <div style={{ display:"flex",gap:8,flexWrap:"wrap",marginBottom:24 }}>
              {Object.entries(PRESETS).map(([lbl,data]) => <button key={lbl} className="preset-chip" onClick={() => loadPreset(data)}>{lbl}</button>)}
            </div>
            <div style={{ marginBottom:14 }}>
              <label className="form-label">Transaction Type</label>
              <select name="type" value={form.type} onChange={onChange} className="form-input form-select">
                {TX_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="form-grid" style={{ marginBottom:24 }}>
              {FIELDS.map(f => (
                <div key={f.key}>
                  <label className="form-label">{f.label}</label>
                  <input name={f.key} type="number" value={form[f.key]} onChange={onChange} placeholder={f.ph} className="form-input" min="0" step="any"/>
                </div>
              ))}
            </div>
            <button className="btn-gold" onClick={submit} disabled={loading}>
              {loading ? <><div className="spinner"/> Analyzing...</> : <><IShield/> Analyze Transaction</>}
            </button>
            {error && <div className="error-box"><span>⚠</span>{error}</div>}
          </div>
          <div className="fade-up d3" style={{ display:"flex",flexDirection:"column",alignItems:"center" }}>
            <div className="card-scene" style={{ maxWidth:380 }}>
              <div ref={flipRef} className={`card-flipper${flipped?" flipped":""}`} onClick={() => result && setFlipped(f=>!f)} onMouseMove={onTilt} onMouseLeave={onTiltEnd}>
                <div className="card-face"><PremiumCard amount={form.amount} txType={form.type} isAnalyzing={loading}/></div>
                {result && <div className="card-face card-back-face"><CardBack result={result}/></div>}
                {loading && !result && (
                  <div className="card-face" style={{ display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:12,background:"linear-gradient(135deg,#1A2035,#0C1525)" }}>
                    <div className="spinner spinner-gold" style={{ width:26,height:26 }}/>
                    <span style={{ fontFamily:"'Space Mono',monospace",fontSize:9,color:"rgba(255,255,255,.28)",textTransform:"uppercase",letterSpacing:".12em" }}>Processing...</span>
                  </div>
                )}
              </div>
            </div>
            {result && (
              <>
                <p style={{ fontFamily:"'Space Mono',monospace",fontSize:9,color:"rgba(245,245,247,.22)",textTransform:"uppercase",letterSpacing:".1em",marginTop:12,textAlign:"center" }}>
                  {flipped ? "Tap card to see input" : "Tap card to see result"}
                </p>
                <div style={{ width:"100%",maxWidth:380,display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginTop:14 }}>
                  <div style={{ background:"rgba(255,255,255,.025)",border:"1px solid rgba(255,255,255,.07)",borderRadius:14,padding:"16px 14px" }}>
                    <div className="kpi-lbl" style={{ marginBottom:5 }}>Probability</div>
                    <div style={{ fontFamily:"'Playfair Display',serif",fontSize:26,fontWeight:700,color:riskClr(result.risk_level) }}>{fmtPct(result.fraud_probability)}</div>
                    <div className="prob-bar-bg"><div className="prob-bar-fill" style={{ width:`${result.fraud_probability*100}%`,background:`linear-gradient(90deg,${riskClr(result.risk_level)}50,${riskClr(result.risk_level)})` }}/></div>
                  </div>
                  <div style={{ background:"rgba(255,255,255,.025)",border:"1px solid rgba(255,255,255,.07)",borderRadius:14,padding:"16px 14px" }}>
                    <div className="kpi-lbl" style={{ marginBottom:5 }}>Risk Level</div>
                    <div style={{ fontFamily:"'Playfair Display',serif",fontSize:26,fontWeight:700,color:riskClr(result.risk_level) }}>{result.risk_level}</div>
                    <div style={{ marginTop:6 }}><span className={`tag tag-${result.risk_level.toLowerCase()}`}>{result.prediction}</span></div>
                  </div>
                </div>
                <button className="btn-outline btn-sm" style={{ marginTop:14,maxWidth:380 }} onClick={() => { setResult(null); setFlipped(false); setError(""); }}>← New Analysis</button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
//  BATCH PAGE — uses PapaParse npm import + built-in fallback
// ─────────────────────────────────────────────────────────────────
const REQ_COLS = ["step","type","amount","oldbalanceOrg","newbalanceOrig","oldbalanceDest","newbalanceDest"];

function BatchPage() {
  const [rows,     setRows]    = useState([]);
  const [fileName, setFN]      = useState("");
  const [parseErr, setPErr]    = useState("");
  const [parseInfo,setPInfo]   = useState("");
  const [dragging, setDrag]    = useState(false);
  const [loading,  setLoading] = useState(false);
  const [error,    setError]   = useState("");
  const [result,   setResult]  = useState(null);
  const inputRef = useRef();

  const handleFile = async (file) => {
    if (!file) return;
    setPErr(""); setPInfo(""); setRows([]); setFN(file.name);
    const text = await file.text();

    // ── Try PapaParse (npm import, already imported at top of file) ──
    try {
      const { data, meta, errors } = Papa.parse(text, {
        header: true, skipEmptyLines: true, dynamicTyping: true,
      });
      // Check all required columns are real separate columns
      const hasCols = meta.fields && REQ_COLS.every(c => meta.fields.includes(c));
      if (hasCols && data.length > 0) {
        if (data.length > 500) { setPErr("Max 500 rows allowed."); return; }
        setRows(data);
        setPInfo(`✓ Parsed with PapaParse · ${data.length} rows loaded`);
        return;
      }
      // PapaParse parsed it but columns are wrong — fall through to built-in
    } catch (_) {
      // Should not happen since Papa is imported directly, but safety net
    }

    // ── Built-in parser for non-standard "quoted-row" format ──
    try {
      const { headers, rows: parsed } = parseCSVBuiltIn(text);
      const miss = REQ_COLS.filter(c => !headers.includes(c));
      if (miss.length) {
        setPErr(`Missing columns: ${miss.join(", ")}. Found: ${headers.join(", ")}`);
        return;
      }
      if (parsed.length > 500) { setPErr("Max 500 rows allowed."); return; }
      if (!parsed.length) { setPErr("No data rows found."); return; }
      setRows(parsed);
      setPInfo(`✓ Built-in parser used (non-standard CSV format) · ${parsed.length} rows loaded`);
    } catch (e) {
      setPErr(`Parse error: ${e.message}`);
    }
  };

  const onFile = e => { const f=e.target.files?.[0]; if (f) handleFile(f); };
  const onDrop = e => { e.preventDefault(); setDrag(false); const f=e.dataTransfer.files?.[0]; if (f) handleFile(f); };
  const clear  = () => { setRows([]); setFN(""); setPErr(""); setPInfo(""); if (inputRef.current) inputRef.current.value=""; };

  const submit = async () => {
    setError(""); setLoading(true); setResult(null);
    try {
      const res = await apiBatchPredict(rows);
      setResult(res);
      res.results.forEach(r => addToHistory({ ...r }));
    } catch(e) { setError(e.message); }
    finally { setLoading(false); }
  };

  if (result) return (
    <div className="page">
      <div className="container" style={{ paddingTop:40,paddingBottom:60 }}>
        <div className="eyebrow">Batch Results</div>
        <h1 className="h2" style={{ marginBottom:36 }}>Analysis <span className="gold">Complete</span></h1>
        <div className="batch-kpi">
          {[
            { lbl:"Total",          val:result.total_transactions, c:"#E5E4E2", acc:"#E5E4E2" },
            { lbl:"Fraud Detected", val:result.fraud_count,        c:"#FF3B30", acc:"#FF3B30" },
            { lbl:"Legitimate",     val:result.legit_count,        c:"#30D158", acc:"#30D158" },
            { lbl:"Fraud Rate",     val:`${result.fraud_percentage}%`, c:"#D4AF37", acc:"#D4AF37" },
          ].map(k => (
            <div key={k.lbl} className="kpi-card" style={{ "--accent":k.acc, textAlign:"center" }}>
              <div className="kpi-val" style={{ color:k.c }}>{k.val}</div>
              <div className="kpi-lbl">{k.lbl}</div>
            </div>
          ))}
        </div>
        <div className="glass" style={{ overflow:"hidden",marginBottom:16 }}>
          <div style={{ padding:"16px 20px",borderBottom:"1px solid rgba(255,255,255,.05)",display:"flex",justifyContent:"space-between" }}>
            <span style={{ fontWeight:500,fontSize:13 }}>Transaction Results</span>
            <span style={{ fontFamily:"'Space Mono',monospace",fontSize:9,color:"rgba(245,245,247,.28)" }}>{result.results.length} rows</span>
          </div>
          <div style={{ overflowX:"auto",maxHeight:480,overflowY:"auto" }}>
            <table className="data-table">
              <thead><tr><th>#</th><th>Type</th><th>Amount</th><th>Prediction</th><th>Probability</th><th>Risk</th></tr></thead>
              <tbody>
                {result.results.map((r,i) => (
                  <tr key={i}>
                    <td style={{ color:"rgba(245,245,247,.22)",fontFamily:"'Space Mono',monospace",fontSize:10 }}>{i+1}</td>
                    <td>{r.type}</td>
                    <td style={{ fontFamily:"'Space Mono',monospace" }}>{fmt$(r.amount)}</td>
                    <td><span className={`tag ${r.is_fraud?"tag-fraud":"tag-legit"}`}>{r.prediction}</span></td>
                    <td style={{ fontFamily:"'Space Mono',monospace",color:riskClr(r.risk_level) }}>{fmtPct(r.fraud_probability)}</td>
                    <td><span className={`tag ${tagCls(r.risk_level)}`}>{r.risk_level}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <button className="btn-outline" onClick={() => { setResult(null); setRows([]); setFN(""); }}>← Upload Another File</button>
      </div>
    </div>
  );

  return (
    <div className="page">
      <div className="container" style={{ paddingTop:40,paddingBottom:60,maxWidth:720 }}>
        <div className="eyebrow fade-up">Batch Analysis</div>
        <h1 className="h2 fade-up d1" style={{ marginBottom:6 }}>Bulk <span className="gold">Detection</span></h1>
        <p className="fade-up d2" style={{ color:"rgba(245,245,247,.38)",fontSize:14,marginBottom:32 }}>
          Upload a CSV up to 500 rows. Supports standard CSV and the quoted-row format of the test file.
        </p>
        <div className="glass glass-pad fade-up d2">
          <div className={`dropzone${dragging?" drag-over":""}`}
            onDragOver={e=>{e.preventDefault();setDrag(true);}} onDragLeave={()=>setDrag(false)}
            onDrop={onDrop} onClick={()=>inputRef.current?.click()}>
            <input ref={inputRef} type="file" accept=".csv" onChange={onFile} style={{ display:"none" }}/>
            <div className="drop-icon"><IFile s={22}/></div>
            <p style={{ fontWeight:500,fontSize:14,color:"#F5F5F7",marginBottom:5 }}>{fileName || "Drop CSV file here"}</p>
            <p style={{ fontFamily:"'Space Mono',monospace",fontSize:10,color:"rgba(245,245,247,.28)" }}>
              {fileName ? `${rows.length} rows loaded` : "or click to browse · max 500 rows"}
            </p>
          </div>
          {parseInfo && <div className="info-box">{parseInfo}</div>}
          {parseErr  && <div className="error-box"><span>⚠</span>{parseErr}</div>}
          {rows.length > 0 && (
            <div style={{ marginTop:20 }}>
              <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10 }}>
                <span style={{ fontFamily:"'Space Mono',monospace",fontSize:9,textTransform:"uppercase",letterSpacing:".1em",color:"rgba(245,245,247,.28)" }}>Preview — {rows.length} rows</span>
                <button style={{ fontFamily:"'Space Mono',monospace",fontSize:9,color:"#FF3B30",background:"none",border:"1px solid rgba(255,59,48,.2)",borderRadius:7,padding:"4px 10px",cursor:"pointer" }} onClick={clear}>Clear</button>
              </div>
              <div style={{ overflowX:"auto",border:"1px solid rgba(255,255,255,.06)",borderRadius:12 }}>
                <table className="data-table" style={{ fontSize:11 }}>
                  <thead><tr>{REQ_COLS.map(c => <th key={c}>{c}</th>)}</tr></thead>
                  <tbody>
                    {rows.slice(0,5).map((r,i) => <tr key={i}>{REQ_COLS.map(c => <td key={c}>{r[c]}</td>)}</tr>)}
                    {rows.length>5 && <tr><td colSpan={REQ_COLS.length} style={{ textAlign:"center",color:"rgba(245,245,247,.18)" }}>+{rows.length-5} more rows...</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          <button className="btn-gold" style={{ marginTop:20 }} onClick={submit} disabled={loading||!rows.length}>
            {loading ? <><div className="spinner"/> Processing {rows.length} Transactions...</> : <><IActivity/> Run Batch Analysis</>}
          </button>
          {error && <div className="error-box"><span>⚠</span>{error}</div>}
          <div style={{ marginTop:18,background:"rgba(212,175,55,.03)",border:"1px solid rgba(212,175,55,.1)",borderRadius:12,padding:"12px 16px" }}>
            <div style={{ fontFamily:"'Space Mono',monospace",fontSize:9,textTransform:"uppercase",letterSpacing:".1em",color:"rgba(212,175,55,.55)",marginBottom:5 }}>Required CSV Columns</div>
            <div style={{ fontFamily:"'Space Mono',monospace",fontSize:10,color:"rgba(212,175,55,.35)" }}>{REQ_COLS.join(", ")}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
//  DASHBOARD PAGE
// ─────────────────────────────────────────────────────────────────
function DashboardPage({ health, setPage }) {
  const [history, setHistory] = useState(loadHistory());
  useEffect(() => { const id=setInterval(()=>setHistory(loadHistory()),3000); return ()=>clearInterval(id); }, []);
  const total      = history.length;
  const fraudCount = history.filter(h=>h.is_fraud).length;
  const legitCount = total - fraudCount;
  const fraudRate  = total ? ((fraudCount/total)*100).toFixed(1) : "0.0";
  const byType = ["PAYMENT","TRANSFER","CASH_OUT","CASH_IN","DEBIT"].map(type => ({
    type, short:type==="CASH_OUT"?"C-OUT":type==="CASH_IN"?"C-IN":type.slice(0,4),
    fraud:history.filter(h=>h.type===type&&h.is_fraud).length,
    legit:history.filter(h=>h.type===type&&!h.is_fraud).length,
  })).filter(d=>d.fraud+d.legit>0);
  const maxBar = Math.max(...byType.map(d=>d.fraud+d.legit),1);

  if (total === 0) return (
    <div className="page">
      <div className="empty-state">
        <div className="empty-icon-wrap"><IChart s={30}/></div>
        <h2 className="empty-title">No Data Yet</h2>
        <p className="empty-body">Run some predictions first — every result is saved here automatically in real time.</p>
        <button className="btn-gold" style={{ width:"auto",padding:"13px 28px" }} onClick={() => setPage("predict")}>
          <IShield s={15}/> Start Predicting
        </button>
      </div>
    </div>
  );

  return (
    <div className="page">
      <div className="container" style={{ paddingTop:40,paddingBottom:60 }}>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:28,flexWrap:"wrap",gap:14 }}>
          <div><div className="eyebrow">Live</div><h1 className="h2">Fraud <span className="gold">Dashboard</span></h1></div>
          <div style={{ display:"flex",gap:10,alignItems:"center",flexWrap:"wrap" }}>
            {health && <div style={{ fontFamily:"'Space Mono',monospace",fontSize:9,color:"rgba(48,209,88,.6)",background:"rgba(48,209,88,.07)",border:"1px solid rgba(48,209,88,.18)",borderRadius:16,padding:"5px 12px" }}>Model · threshold {health.threshold}</div>}
            <button className="btn-outline btn-sm" style={{ width:"auto",color:"#FF3B30",borderColor:"rgba(255,59,48,.2)" }} onClick={() => { clearHistory(); setHistory([]); }}>Clear History</button>
          </div>
        </div>
        <div className="kpi-grid">
          {[
            { lbl:"Total Analyzed", val:total,      c:"#E5E4E2", acc:"#E5E4E2" },
            { lbl:"Fraud Detected", val:fraudCount, c:"#FF3B30", acc:"#FF3B30" },
            { lbl:"Legitimate",     val:legitCount, c:"#30D158", acc:"#30D158" },
            { lbl:"Fraud Rate",     val:`${fraudRate}%`, c:"#D4AF37", acc:"#D4AF37" },
          ].map(k => (
            <div key={k.lbl} className="kpi-card" style={{ "--accent":k.acc }}>
              <div className="kpi-val" style={{ color:k.c }}>{k.val}</div>
              <div className="kpi-lbl">{k.lbl}</div>
            </div>
          ))}
        </div>
        <div className="charts-grid">
          <div className="glass" style={{ padding:24 }}>
            <div style={{ fontWeight:500,fontSize:13,marginBottom:20,letterSpacing:"-.02em" }}>Fraud by Transaction Type</div>
            {byType.length > 0 ? (
              <>
                <div className="bar-chart-wrap">
                  {byType.map(d => (
                    <div key={d.type} className="bar-grp">
                      <div style={{ display:"flex",gap:3,alignItems:"flex-end" }}>
                        <div className="bar bar-f" style={{ height:Math.max(6,(d.fraud/maxBar)*110)+"px",width:13 }}/>
                        <div className="bar bar-l" style={{ height:Math.max(6,(d.legit/maxBar)*110)+"px",width:13 }}/>
                      </div>
                      <div className="bar-grp-label">{d.short}</div>
                    </div>
                  ))}
                </div>
                <div style={{ display:"flex",gap:14,marginTop:14 }}>
                  {[["#FF3B30","Fraud"],["#30D158","Legit"]].map(([c,l]) => (
                    <div key={l} style={{ display:"flex",alignItems:"center",gap:5,fontSize:11,color:"rgba(245,245,247,.35)" }}>
                      <div style={{ width:7,height:7,borderRadius:2,background:c }}/>{l}
                    </div>
                  ))}
                </div>
              </>
            ) : <div style={{ height:120,display:"flex",alignItems:"center",justifyContent:"center",color:"rgba(245,245,247,.18)",fontSize:11,fontFamily:"'Space Mono',monospace" }}>No data</div>}
          </div>
          <div className="glass" style={{ padding:24 }}>
            <div style={{ fontWeight:500,fontSize:13,marginBottom:20,letterSpacing:"-.02em" }}>Fraud vs Legitimate Split</div>
            <div style={{ display:"flex",alignItems:"center",gap:24,flexWrap:"wrap" }}>
              <svg width="120" height="120" viewBox="0 0 120 120" style={{ flexShrink:0 }}>
                <circle cx="60" cy="60" r="44" fill="none" stroke="rgba(255,255,255,.04)" strokeWidth="13"/>
                {total > 0 && <>
                  <circle cx="60" cy="60" r="44" fill="none" stroke="#30D158" strokeWidth="13" strokeDasharray={`${(legitCount/total)*276.5} 276.5`} strokeLinecap="round" transform="rotate(-90 60 60)" style={{ filter:"drop-shadow(0 0 5px rgba(48,209,88,.4))",transition:"stroke-dasharray .8s" }}/>
                  <circle cx="60" cy="60" r="44" fill="none" stroke="#FF3B30" strokeWidth="13" strokeDasharray={`${(fraudCount/total)*276.5} 276.5`} strokeLinecap="round" transform={`rotate(${-90+(legitCount/total)*360} 60 60)`} style={{ filter:"drop-shadow(0 0 5px rgba(255,59,48,.4))",transition:"stroke-dasharray .8s" }}/>
                </>}
                <text x="60" y="56" textAnchor="middle" fontFamily="'Playfair Display',serif" fontSize="17" fontWeight="700" fill="#D4AF37">{total>0?((legitCount/total)*100).toFixed(0):0}%</text>
                <text x="60" y="69" textAnchor="middle" fontFamily="'Space Mono',monospace" fontSize="7" fill="rgba(255,255,255,.28)" letterSpacing="1">LEGIT</text>
              </svg>
              <div>
                {[{c:"#30D158",l:"Legitimate",n:legitCount},{c:"#FF3B30",l:"Fraud",n:fraudCount}].map(d => (
                  <div key={d.l} style={{ marginBottom:14 }}>
                    <div style={{ display:"flex",alignItems:"center",gap:7,marginBottom:3 }}>
                      <div style={{ width:9,height:9,borderRadius:"50%",background:d.c,boxShadow:`0 0 6px ${d.c}50`,flexShrink:0 }}/>
                      <span style={{ fontSize:13,fontWeight:500 }}>{d.n} {d.l}</span>
                    </div>
                    <div style={{ fontFamily:"'Space Mono',monospace",fontSize:9,color:"rgba(245,245,247,.28)",paddingLeft:16 }}>{total>0?((d.n/total)*100).toFixed(1):0}%</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="glass" style={{ overflow:"hidden",marginBottom:20 }}>
          <div style={{ padding:"16px 20px",borderBottom:"1px solid rgba(255,255,255,.05)",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8 }}>
            <span style={{ fontWeight:500,fontSize:13 }}>Recent Predictions</span>
            <span style={{ fontFamily:"'Space Mono',monospace",fontSize:9,color:"rgba(245,245,247,.22)" }}>{Math.min(history.length,20)} of {total}</span>
          </div>
          <div style={{ overflowX:"auto" }}>
            <table className="data-table">
              <thead><tr><th>Time</th><th>Type</th><th>Amount</th><th>Result</th><th>Prob</th><th>Risk</th></tr></thead>
              <tbody>
                {history.slice(0,20).map((r,i) => (
                  <tr key={r.id||i}>
                    <td style={{ fontFamily:"'Space Mono',monospace",fontSize:10,color:"rgba(245,245,247,.22)",whiteSpace:"nowrap" }}>
                      {new Date(r.timestamp).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit",second:"2-digit"})}
                    </td>
                    <td style={{ whiteSpace:"nowrap" }}>{r.type}</td>
                    <td style={{ fontFamily:"'Space Mono',monospace",whiteSpace:"nowrap" }}>{fmt$(r.amount)}</td>
                    <td><span className={`tag ${r.is_fraud?"tag-fraud":"tag-legit"}`}>{r.prediction}</span></td>
                    <td style={{ fontFamily:"'Space Mono',monospace",color:riskClr(r.risk_level),whiteSpace:"nowrap" }}>{fmtPct(r.fraud_probability)}</td>
                    <td><span className={`tag ${tagCls(r.risk_level)}`}>{r.risk_level}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
//  ROOT APP
// ─────────────────────────────────────────────────────────────────
export default function App() {
  const [page,   setPage]   = useState("home");
  const [health, setHealth] = useState(null);
  const cursorRef = useRef(); const ringRef = useRef();
  const rxRef=useRef(0); const ryRef=useRef(0); const mxRef=useRef(0); const myRef=useRef(0);

  useEffect(() => {
    if (!document.getElementById("fg-styles")) {
      const s=document.createElement("style"); s.id="fg-styles"; s.textContent=STYLES; document.head.appendChild(s);
    }
  }, []);
  useEffect(() => {
    if (!window.matchMedia("(pointer:fine)").matches) return;
    const move=e=>{mxRef.current=e.clientX;myRef.current=e.clientY;if(cursorRef.current){cursorRef.current.style.left=e.clientX-4+"px";cursorRef.current.style.top=e.clientY-4+"px";}};
    window.addEventListener("mousemove",move,{passive:true});
    return ()=>window.removeEventListener("mousemove",move);
  }, []);
  useEffect(() => {
    if (!window.matchMedia("(pointer:fine)").matches) return;
    let raf;
    const loop=()=>{rxRef.current+=(mxRef.current-rxRef.current)*.12;ryRef.current+=(myRef.current-ryRef.current)*.12;if(ringRef.current){ringRef.current.style.left=rxRef.current-17+"px";ringRef.current.style.top=ryRef.current-17+"px";}raf=requestAnimationFrame(loop);};
    raf=requestAnimationFrame(loop);
    return ()=>cancelAnimationFrame(raf);
  }, []);
  useEffect(() => {
    const check=()=>apiHealth().then(setHealth).catch(()=>setHealth(null));
    check(); const id=setInterval(check,30000); return ()=>clearInterval(id);
  }, []);
  useEffect(() => { window.scrollTo(0,0); }, [page]);

  return (
    <>
      <div id="fg-cursor" ref={cursorRef}/><div id="fg-ring" ref={ringRef}/>
      <div className="noise-overlay"/>
      <div className="orb orb-1"/><div className="orb orb-2"/><div className="orb orb-3"/>
      <Navbar page={page} setPage={setPage} health={health}/>
      {page==="home"      && <HomePage      setPage={setPage} health={health}/>}
      {page==="predict"   && <PredictPage/>}
      {page==="batch"     && <BatchPage/>}
      {page==="dashboard" && <DashboardPage health={health} setPage={setPage}/>}
      <footer>
        <div style={{ display:"flex",alignItems:"center",gap:9 }}>
          <div className="logo-mark" style={{ width:26,height:26,borderRadius:7,flexShrink:0 }}>
            <svg width="11" height="11" viewBox="0 0 16 16" fill="none"><path d="M8 1L14 4.5V11.5L8 15L2 11.5V4.5L8 1Z" fill="#050508"/></svg>
          </div>
          <span className="logo-text" style={{ fontSize:14 }}>Card<span>Guard</span></span>
        </div>
        <span className="footer-copy">Built by Nitin Gupta · XGBoost · FastAPI · React · 2026</span>
        <span className={`footer-status ${health?"online":"offline"}`}>{health?"Model Online":"API Offline"}</span>
      </footer>
    </>
  );
}