import{o as e}from"./chunk-Dlc7tRH4.js";import{n as t,t as n}from"./jsx-runtime-B5JQDDyH.js";import{$t as r,Gn as i,Qt as a,T as o,X as s,er as c,fn as l,gn as u,pn as d,q as f}from"./useActiveWallet-sNKafE2N-C3fgjDG3.js";import"./index-__IDXchu.js";import{t as p}from"./check-D8MPuYyp.js";import{t as m}from"./copy-CifAj5ta.js";import{t as h}from"./ModalHeader-D7u2VQIH-Vo9Je83z.js";import{t as g}from"./ScreenLayout-BgwOsyLd-DFsHdVO5.js";import{t as _}from"./shouldProceedtoEmbeddedWalletCreationFlow-BTsQS1ZO-BVqiOm4j.js";import{n as v,t as y}from"./QrCode-CiR-JXcV-D9B9P4GI.js";import{t as b}from"./farcaster-DPlSjvF5-VdEdmR4W.js";import{t as x}from"./LabelXs-oqZNqbm_-CIj981jV.js";import{t as S}from"./OpenLink-DZHy38vr-Qec2R-v2.js";var C=n(),w=e(t(),1),T=e(s(),1);v();var E=f.div`
  width: 100%;
`,D=f.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.75rem;
  height: 56px;
  background: ${e=>e.$disabled?`var(--privy-color-background-2)`:`var(--privy-color-background)`};
  border: 1px solid var(--privy-color-foreground-4);
  border-radius: var(--privy-border-radius-md);

  &:hover {
    border-color: ${e=>e.$disabled?`var(--privy-color-foreground-4)`:`var(--privy-color-foreground-3)`};
  }
`,O=f.div`
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
`,k=f.span`
  display: block;
  font-size: 16px;
  line-height: 24px;
  color: ${e=>e.$disabled?`var(--privy-color-foreground-2)`:`var(--privy-color-foreground)`};
  overflow: hidden;
  text-overflow: ellipsis;
  /* Use single-line truncation without nowrap to respect container width */
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  word-break: break-all;

  @media (min-width: 441px) {
    font-size: 14px;
    line-height: 20px;
  }
`,A=f(k)`
  color: var(--privy-color-foreground-3);
  font-style: italic;
`,j=f(x)`
  margin-bottom: 0.5rem;
`,M=f(h)`
  && {
    gap: 0.375rem;
    font-size: 14px;
    flex-shrink: 0;
  }
`,N=({value:e,title:t,placeholder:n,className:r,showCopyButton:i=!0,truncate:a,maxLength:o=40,disabled:s=!1})=>{let[c,l]=(0,w.useState)(!1),u=a&&e?((e,t,n)=>{if((e=e.startsWith(`https://`)?e.slice(8):e).length<=n)return e;if(t===`middle`){let t=Math.ceil(n/2)-2,r=Math.floor(n/2)-1;return`${e.slice(0,t)}...${e.slice(-r)}`}return`${e.slice(0,n-3)}...`})(e,a,o):e;return(0,w.useEffect)((()=>{if(c){let e=setTimeout((()=>l(!1)),3e3);return()=>clearTimeout(e)}}),[c]),(0,C.jsxs)(E,{className:r,children:[t&&(0,C.jsx)(j,{children:t}),(0,C.jsxs)(D,{$disabled:s,children:[(0,C.jsx)(O,{children:e?(0,C.jsx)(k,{$disabled:s,title:e,children:u}):(0,C.jsx)(A,{$disabled:s,children:n||`No value`})}),i&&e&&(0,C.jsx)(M,{onClick:function(t){t.stopPropagation(),navigator.clipboard.writeText(e).then((()=>l(!0))).catch(console.error)},size:`sm`,children:(0,C.jsxs)(C.Fragment,c?{children:[`Copied`,(0,C.jsx)(p,{size:14})]}:{children:[`Copy`,(0,C.jsx)(m,{size:14})]})})]})]})},P=({connectUri:e,loading:t,success:n,errorMessage:r,onBack:i,onClose:a,onOpenFarcaster:s})=>(0,C.jsx)(g,T.isMobile||t?T.isIOS?{title:r?r.message:`Sign in with Farcaster`,subtitle:r?r.detail:`To sign in with Farcaster, please open the Farcaster app.`,icon:b,iconVariant:`loading`,iconLoadingStatus:{success:n,fail:!!r},primaryCta:e&&s?{label:`Open Farcaster app`,onClick:s}:void 0,onBack:i,onClose:a,watermark:!0}:{title:r?r.message:`Signing in with Farcaster`,subtitle:r?r.detail:`This should only take a moment`,icon:b,iconVariant:`loading`,iconLoadingStatus:{success:n,fail:!!r},onBack:i,onClose:a,watermark:!0,children:e&&T.isMobile&&(0,C.jsx)(I,{children:(0,C.jsx)(S,{text:`Take me to Farcaster`,url:e,color:`#8a63d2`})})}:{title:`Sign in with Farcaster`,subtitle:`Scan with your phone's camera to continue.`,onBack:i,onClose:a,watermark:!0,children:(0,C.jsxs)(L,{children:[(0,C.jsx)(R,{children:e?(0,C.jsx)(y,{url:e,size:275,squareLogoElement:b}):(0,C.jsx)(V,{children:(0,C.jsx)(o,{})})}),(0,C.jsxs)(z,{children:[(0,C.jsx)(B,{children:`Or copy this link and paste it into a phone browser to open the Farcaster app.`}),e&&(0,C.jsx)(N,{value:e,truncate:`end`,maxLength:30,showCopyButton:!0,disabled:!0})]})]})}),F={component:()=>{let{authenticated:e,logout:t,ready:n,user:o}=a(),{lastScreen:s,navigate:f,navigateBack:p,setModalData:m}=r(),h=c(),{getAuthFlow:g,loginWithFarcaster:v,closePrivyModal:y,createAnalyticsEvent:b}=d(),[x,S]=(0,w.useState)(void 0),[T,E]=(0,w.useState)(!1),[D,O]=(0,w.useState)(!1),k=(0,w.useRef)([]),A=g(),j=A?.meta.connectUri;return(0,w.useEffect)((()=>{let e=Date.now(),t=setInterval((async()=>{let n=await A.pollForReady.execute(),r=Date.now()-e;if(n){clearInterval(t),E(!0);try{await v(),O(!0)}catch(e){let t={retryable:!1,message:`Authentication failed`};if(e?.privyErrorCode===l.ALLOWLIST_REJECTED)return void f(`AllowlistRejectionScreen`);if(e?.privyErrorCode===l.USER_LIMIT_REACHED)return console.error(new u(e).toString()),void f(`UserLimitReachedScreen`);if(e?.privyErrorCode===l.USER_DOES_NOT_EXIST)return void f(`AccountNotFoundScreen`);if(e?.privyErrorCode===l.LINKED_TO_ANOTHER_USER)t.detail=e.message??`This account has already been linked to another user.`;else{if(e?.privyErrorCode===l.ACCOUNT_TRANSFER_REQUIRED&&e.data?.data?.nonce)return m({accountTransfer:{nonce:e.data?.data?.nonce,account:e.data?.data?.subject,displayName:e.data?.data?.account?.displayName,linkMethod:`farcaster`,embeddedWalletAddress:e.data?.data?.otherUser?.embeddedWalletAddress,farcasterEmbeddedAddress:e.data?.data?.otherUser?.farcasterEmbeddedAddress}}),void f(`LinkConflictScreen`);e?.privyErrorCode===l.INVALID_CREDENTIALS?(t.retryable=!0,t.detail=`Something went wrong. Try again.`):e?.privyErrorCode===l.TOO_MANY_REQUESTS&&(t.detail=`Too many requests. Please wait before trying again.`)}S(t)}}else r>12e4&&(clearInterval(t),S({retryable:!0,message:`Authentication failed`,detail:`The request timed out. Try again.`}))}),2e3);return()=>{clearInterval(t),k.current.forEach((e=>clearTimeout(e)))}}),[]),(0,w.useEffect)((()=>{if(n&&e&&D&&o){if(h?.legal.requireUsersAcceptTerms&&!o.hasAcceptedTerms){let e=setTimeout((()=>{f(`AffirmativeConsentScreen`)}),i);return()=>clearTimeout(e)}D&&(_(o,h.embeddedWallets)?k.current.push(setTimeout((()=>{m({createWallet:{onSuccess:()=>{},onFailure:e=>{console.error(e),b({eventName:`embedded_wallet_creation_failure_logout`,payload:{error:e,screen:`FarcasterConnectStatusScreen`}}),t()},callAuthOnSuccessOnClose:!0}}),f(`EmbeddedWalletOnAccountCreateScreen`)}),1400)):k.current.push(setTimeout((()=>y({shouldCallAuthOnSuccess:!0,isSuccess:!0})),1400)))}}),[D,n,e,o]),(0,C.jsx)(P,{connectUri:j,loading:T,success:D,errorMessage:x,onBack:s?p:void 0,onClose:y,onOpenFarcaster:()=>{j&&(window.location.href=j)}})}},I=f.div`
  margin-top: 24px;
`,L=f.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
`,R=f.div`
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 275px;
`,z=f.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
`,B=f.div`
  font-size: 0.875rem;
  text-align: center;
  color: var(--privy-color-foreground-2);
`,V=f.div`
  position: relative;
  width: 82px;
  height: 82px;
`;export{F as FarcasterConnectStatusScreen,F as default,P as FarcasterConnectStatusView};