const b=(r,c,s)=>{const n=e=>e==null?'""':`"${String(e).replace(/"/g,'""')}"`,i=c.map(n).join(","),d=s.map(e=>e.map(n).join(",")).join(`
`),a=`${i}
${d}`,l=new Blob(["\uFEFF"+a],{type:"text/csv;charset=utf-8;"}),o=URL.createObjectURL(l),t=document.createElement("a");t.setAttribute("href",o),t.setAttribute("download",r),t.style.visibility="hidden",document.body.appendChild(t),t.click(),document.body.removeChild(t),URL.revokeObjectURL(o)};export{b as e};
