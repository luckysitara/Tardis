import{o as e}from"./chunk-Dlc7tRH4.js";import{n as t,t as n}from"./jsx-runtime-B5JQDDyH.js";import{m as r}from"./usePrivy-6U9r0dlE-BOXQqO9T.js";import{G as i,Qt as a,X as o,b as s,fn as c,pn as l,q as u,xn as d}from"./useActiveWallet-sNKafE2N-C3fgjDG3.js";import{t as f}from"./createLucideIcon-CJmnQoHX.js";import{t as p}from"./circle-check-big-Cf1y1GFi.js";import{t as m}from"./fingerprint-pattern-CVQLvJxF.js";import{n as h,t as g}from"./TodoList-CgrU7uwu-DqO-Rohd.js";import{t as _}from"./ScreenLayout-BgwOsyLd-DFsHdVO5.js";var v=f(`trash-2`,[[`path`,{d:`M10 11v6`,key:`nco0om`}],[`path`,{d:`M14 11v6`,key:`outv1u`}],[`path`,{d:`M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6`,key:`miytrc`}],[`path`,{d:`M3 6h18`,key:`d0wm0j`}],[`path`,{d:`M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2`,key:`e791ji`}]]),y=n(),b=e(t(),1);o();var x=({passkeys:e,isLoading:t,errorReason:n,success:r,expanded:i,onLinkPasskey:a,onUnlinkPasskey:o,onExpand:s,onBack:c,onClose:l})=>(0,y.jsx)(_,r?{title:`Passkeys updated`,icon:p,iconVariant:`success`,primaryCta:{label:`Done`,onClick:l},onClose:l,watermark:!0}:i?{icon:m,title:`Your passkeys`,onBack:c,onClose:l,watermark:!0,children:(0,y.jsx)(C,{passkeys:e,expanded:i,onUnlink:o,onExpand:s})}:{icon:m,title:`Set up passkey verification`,subtitle:`Verify with passkey`,primaryCta:{label:`Add new passkey`,onClick:a,loading:t},onClose:l,watermark:!0,helpText:n||void 0,children:e.length===0?(0,y.jsx)(w,{}):(0,y.jsx)(S,{children:(0,y.jsx)(C,{passkeys:e,expanded:i,onUnlink:o,onExpand:s})})}),S=u.div`
  margin-bottom: 12px;
`,C=({passkeys:e,expanded:t,onUnlink:n,onExpand:r})=>{let[i,a]=(0,b.useState)([]),o=t?e.length:2;return(0,y.jsxs)(`div`,{children:[(0,y.jsx)(A,{children:`Your passkeys`}),(0,y.jsxs)(k,{children:[e.slice(0,o).map((e=>{return(0,y.jsxs)(N,{children:[(0,y.jsxs)(`div`,{children:[(0,y.jsx)(j,{children:(t=e,t.authenticatorName?t.createdWithBrowser?`${t.authenticatorName} on ${t.createdWithBrowser}`:t.authenticatorName:t.createdWithBrowser?t.createdWithOs?`${t.createdWithBrowser} on ${t.createdWithOs}`:`${t.createdWithBrowser}`:`Unknown device`)}),(0,y.jsxs)(M,{children:[`Last used:`,` `,(e.latestVerifiedAt??e.firstVerifiedAt)?.toLocaleString()??`N/A`]})]}),(0,y.jsx)(F,{disabled:i.includes(e.credentialId),onClick:()=>(async e=>{a((t=>t.concat([e]))),await n(e),a((t=>t.filter((t=>t!==e))))})(e.credentialId),children:i.includes(e.credentialId)?(0,y.jsx)(s,{}):(0,y.jsx)(v,{size:16})})]},e.credentialId);var t})),e.length>2&&!t&&(0,y.jsx)(O,{onClick:r,children:`View all`})]})]})},w=()=>(0,y.jsxs)(g,{style:{color:`var(--privy-color-foreground)`},children:[(0,y.jsx)(h,{children:`Verify with Touch ID, Face ID, PIN, or hardware key`}),(0,y.jsx)(h,{children:`Takes seconds to set up and use`}),(0,y.jsx)(h,{children:`Use your passkey to verify transactions and login to your account`})]}),T={component:()=>{let{user:e}=a(),{unlink:t}=r(),{linkWithPasskey:n,closePrivyModal:i}=l(),o=e?.linkedAccounts.filter((e=>e.type===`passkey`)),[s,u]=(0,b.useState)(!1),[f,p]=(0,b.useState)(``),[m,h]=(0,b.useState)(!1),[g,_]=(0,b.useState)(!1);return(0,b.useEffect)((()=>{o.length===0&&_(!1)}),[o.length]),(0,y.jsx)(x,{passkeys:o,isLoading:s,errorReason:f,success:m,expanded:g,onLinkPasskey:()=>{u(!0),n().then((()=>h(!0))).catch((e=>{if(e instanceof d){if(e.privyErrorCode===c.CANNOT_LINK_MORE_OF_TYPE)return void p(`Cannot link more passkeys to account.`);if(e.privyErrorCode===c.PASSKEY_NOT_ALLOWED)return void p(`Passkey request timed out or rejected by user.`)}p(`Unknown error occurred.`)})).finally((()=>{u(!1)}))},onUnlinkPasskey:async e=>(u(!0),await t({credentialId:e}).then((()=>h(!0))).catch((e=>{e instanceof d&&e.privyErrorCode===c.MISSING_MFA_CREDENTIALS?p(`Cannot unlink a passkey enrolled in MFA`):p(`Unknown error occurred.`)})).finally((()=>{u(!1)}))),onExpand:()=>_(!0),onBack:()=>_(!1),onClose:()=>i()})}},E=u.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 180px;
  height: 90px;
  border-radius: 50%;
  svg + svg {
    margin-left: 12px;
  }
  > svg {
    z-index: 2;
    color: var(--privy-color-accent) !important;
    stroke: var(--privy-color-accent) !important;
    fill: var(--privy-color-accent) !important;
  }
`,D=i`
  && {
    width: 100%;
    font-size: 0.875rem;
    line-height: 1rem;

    /* Tablet and Up */
    @media (min-width: 440px) {
      font-size: 14px;
    }

    display: flex;
    gap: 12px;
    justify-content: center;

    padding: 6px 8px;
    background-color: var(--privy-color-background);
    transition: background-color 200ms ease;
    color: var(--privy-color-accent) !important;

    :focus {
      outline: none;
      box-shadow: none;
    }
  }
`,O=u.button`
  ${D}
`,k=u.div`
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 0.8rem;
  padding: 0.5rem 0rem 0rem;
  flex-grow: 1;
  width: 100%;
`,A=u.div`
  line-height: 20px;
  height: 20px;
  font-size: 1em;
  font-weight: 450;
  display: flex;
  justify-content: flex-beginning;
  width: 100%;
`,j=u.div`
  font-size: 1em;
  line-height: 1.3em;
  font-weight: 500;
  color: var(--privy-color-foreground-2);
  padding: 0.2em 0;
`,M=u.div`
  font-size: 0.875rem;
  line-height: 1rem;
  color: #64668b;
  padding: 0.2em 0;
`,N=u.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1em;
  gap: 10px;
  font-size: 0.875rem;
  line-height: 1rem;
  text-align: left;
  border-radius: 8px;
  border: 1px solid #e2e3f0 !important;
  width: 100%;
  height: 5em;
`,P=i`
  :focus,
  :hover,
  :active {
    outline: none;
  }
  display: flex;
  width: 2em;
  height: 2em;
  justify-content: center;
  align-items: center;
  svg {
    color: var(--privy-color-error);
  }
  svg:hover {
    color: var(--privy-color-foreground-3);
  }
`,F=u.button`
  ${P}
`;export{E as DoubleIconWrapper,O as LinkButton,T as LinkPasskeyScreen,T as default,x as LinkPasskeyView};