import{o as e}from"./chunk-Dlc7tRH4.js";import{n as t,t as n}from"./jsx-runtime-B5JQDDyH.js";import{$t as r,G as i,Qt as a,X as o,pn as s,q as c,sn as l,vn as u}from"./useActiveWallet-sNKafE2N-C3fgjDG3.js";import{d}from"./index-__IDXchu.js";import{c as f}from"./ModalHeader-D7u2VQIH-Vo9Je83z.js";import{t as p}from"./Screen-yabWN6I5-CdTK1ewC.js";import{a as m,d as h,n as g,o as _,s as v}from"./shared-CaZpHIpv-C7auk6l9.js";import{t as y}from"./ShieldCheckIcon-DBES9yEc.js";import{a as b}from"./Layouts-BlFm53ED-Lk8lbxCl.js";var x=n(),S=e(t(),1);o();var C={component:()=>{let[e,t]=(0,S.useState)(!0),{authenticated:n,user:i}=a(),{walletProxy:o,closePrivyModal:c,createAnalyticsEvent:f,client:C}=s(),{navigate:D,data:O,onUserCloseViaDialogOrKeybindRef:k}=r(),[A,j]=(0,S.useState)(void 0),[M,N]=(0,S.useState)(``),[P,F]=(0,S.useState)(!1),{entropyId:I,entropyIdVerifier:L,onCompleteNavigateTo:R,onSuccess:z,onFailure:B}=O.recoverWallet,V=(e=`User exited before their wallet could be recovered`)=>{c({shouldCallAuthOnSuccess:!1}),B(typeof e==`string`?new u(e):e)};return k.current=V,(0,S.useEffect)((()=>{if(!n)return V(`User must be authenticated and have a Privy wallet before it can be recovered`)}),[n]),(0,x.jsxs)(p,{children:[(0,x.jsx)(p.Header,{icon:y,title:`Enter your password`,subtitle:`Please provision your account on this new device. To continue, enter your recovery password.`,showClose:!0,onClose:V}),(0,x.jsx)(p.Body,{children:(0,x.jsx)(w,{children:(0,x.jsxs)(`div`,{children:[(0,x.jsxs)(m,{children:[(0,x.jsx)(_,{type:e?`password`:`text`,onChange:e=>(e=>{e&&j(e)})(e.target.value),disabled:P,style:{paddingRight:`2.3rem`}}),(0,x.jsx)(h,{style:{right:`0.75rem`},children:e?(0,x.jsx)(g,{onClick:()=>t(!1)}):(0,x.jsx)(v,{onClick:()=>t(!0)})})]}),!!M&&(0,x.jsx)(T,{children:M})]})})}),(0,x.jsxs)(p.Footer,{children:[(0,x.jsx)(p.HelpText,{children:(0,x.jsxs)(b,{children:[(0,x.jsx)(`h4`,{children:`Why is this necessary?`}),(0,x.jsx)(`p`,{children:`You previously set a password for this wallet. This helps ensure only you can access it`})]})}),(0,x.jsx)(p.Actions,{children:(0,x.jsx)(E,{loading:P||!o,disabled:!A,onClick:async()=>{F(!0);let e=await C.getAccessToken(),t=l(i,I);if(!e||!t||A===null)return V(`User must be authenticated and have a Privy wallet before it can be recovered`);try{f({eventName:`embedded_wallet_recovery_started`,payload:{walletAddress:t.address}}),await o?.recover({accessToken:e,entropyId:I,entropyIdVerifier:L,recoveryPassword:A}),N(``),R?D(R):c({shouldCallAuthOnSuccess:!1}),z?.(t),f({eventName:`embedded_wallet_recovery_completed`,payload:{walletAddress:t.address}})}catch(e){d(e)?N(`Invalid recovery password, please try again.`):N(`An error has occurred, please try again.`)}finally{F(!1)}},$hideAnimations:!I&&P,children:`Recover your account`})}),(0,x.jsx)(p.Watermark,{})]})]})}},w=c.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`,T=c.div`
  line-height: 20px;
  height: 20px;
  font-size: 13px;
  color: var(--privy-color-error);
  text-align: left;
  margin-top: 0.5rem;
`,E=c(f)`
  ${({$hideAnimations:e})=>e&&i`
      && {
        // Remove animations because the recoverWallet task on the iframe partially
        // blocks the renderer, so the animation stutters and doesn't look good
        transition: none;
      }
    `}
`;export{C as PasswordRecoveryScreen,C as default};