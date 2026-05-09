import{o as e}from"./chunk-Dlc7tRH4.js";import{n as t,t as n}from"./jsx-runtime-B5JQDDyH.js";import{q as r}from"./useActiveWallet-sNKafE2N-C3fgjDG3.js";import{t as i}from"./check-D8MPuYyp.js";import{t as a}from"./copy-CifAj5ta.js";import{t as o}from"./ModalHeader-D7u2VQIH-Vo9Je83z.js";import{t as s}from"./ErrorMessage-D8VaAP5m-cg9QnN6Z.js";import{t as c}from"./shared-FM0rljBt-DvaWsMaO.js";import{t as l}from"./Address-DF9G842N-KFn7hZMs.js";import{t as u}from"./LabelXs-oqZNqbm_-CIj981jV.js";var d=n(),f=e(t(),1),p=r(c)`
  && {
    padding: 0.75rem;
    height: 56px;
  }
`,m=r.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
`,h=r.div`
  display: flex;
  flex-direction: column;
  gap: 0;
`,g=r.div`
  font-size: 12px;
  line-height: 1rem;
  color: var(--privy-color-foreground-3);
`,_=r(u)`
  text-align: left;
  margin-bottom: 0.5rem;
`,v=r(s)`
  margin-top: 0.25rem;
`,y=r(o)`
  && {
    gap: 0.375rem;
    font-size: 14px;
  }
`,b=({errMsg:e,balance:t,address:n,className:r,title:o,showCopyButton:s=!1})=>{let[c,u]=(0,f.useState)(!1);return(0,f.useEffect)((()=>{if(c){let e=setTimeout((()=>u(!1)),3e3);return()=>clearTimeout(e)}}),[c]),(0,d.jsxs)(`div`,{children:[o&&(0,d.jsx)(_,{children:o}),(0,d.jsx)(p,{className:r,$state:e?`error`:void 0,children:(0,d.jsxs)(m,{children:[(0,d.jsxs)(h,{children:[(0,d.jsx)(l,{address:n,showCopyIcon:!1}),t!==void 0&&(0,d.jsx)(g,{children:t})]}),s&&(0,d.jsx)(y,{onClick:function(e){e.stopPropagation(),navigator.clipboard.writeText(n).then((()=>u(!0))).catch(console.error)},size:`sm`,children:(0,d.jsxs)(d.Fragment,c?{children:[`Copied`,(0,d.jsx)(i,{size:14})]}:{children:[`Copy`,(0,d.jsx)(a,{size:14})]})})]})}),e&&(0,d.jsx)(v,{children:e})]})};export{b as t};