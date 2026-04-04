import{r as l,j as e}from"./index-WZ2t0s88.js";const n={success:{bg:"bg-emerald-500/15",border:"border-emerald-500/40",text:"text-emerald-300",icon:"✅"},error:{bg:"bg-red-500/15",border:"border-red-500/40",text:"text-red-300",icon:"❌"},warning:{bg:"bg-yellow-500/15",border:"border-yellow-500/40",text:"text-yellow-300",icon:"⏰"},info:{bg:"bg-blue-500/15",border:"border-blue-500/40",text:"text-blue-300",icon:"ℹ️"}};function h({message:s,type:o="info",duration:i=5e3,onClose:t}){const[c,a]=l.useState(!1),[d,x]=l.useState(!1),r=n[o]||n.info;return l.useEffect(()=>{if(!s)return;const m=requestAnimationFrame(()=>a(!0)),b=setTimeout(()=>{x(!0),a(!1)},i-400),u=setTimeout(()=>{t==null||t()},i);return()=>{cancelAnimationFrame(m),clearTimeout(b),clearTimeout(u)}},[s,i,t]),s?e.jsxs("div",{className:"fixed inset-0 z-[100] flex items-center justify-center pointer-events-none px-4",children:[e.jsxs("div",{className:`
                    pointer-events-auto max-w-md w-full rounded-2xl border ${r.border} ${r.bg}
                    backdrop-blur-xl shadow-2xl px-6 py-5
                    transition-all duration-400 ease-out
                    ${c&&!d?"opacity-100 scale-100 translate-y-0":"opacity-0 scale-95 translate-y-4"}
                `,children:[e.jsxs("div",{className:"flex items-start gap-3",children:[e.jsx("span",{className:"text-2xl flex-shrink-0 mt-0.5",children:r.icon}),e.jsx("div",{className:"flex-1 min-w-0",children:e.jsx("p",{className:`text-sm font-semibold ${r.text} leading-relaxed`,children:s})}),e.jsx("button",{onClick:()=>t==null?void 0:t(),className:"text-white/40 hover:text-white/80 transition-colors text-lg flex-shrink-0 mt-0.5","aria-label":"Close",children:"✕"})]}),e.jsx("div",{className:"mt-3 h-0.5 rounded-full bg-white/10 overflow-hidden",children:e.jsx("div",{className:`h-full rounded-full ${r.text.replace("text-","bg-")}`,style:{animation:`toast-progress ${i}ms linear forwards`}})})]}),e.jsx("style",{children:`
                @keyframes toast-progress {
                    from { width: 100%; }
                    to { width: 0%; }
                }
            `})]}):null}export{h as T};
