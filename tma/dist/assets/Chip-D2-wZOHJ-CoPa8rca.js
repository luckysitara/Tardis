import{t as e}from"./jsx-runtime-B5JQDDyH.js";import{G as t,W as n,q as r}from"./useActiveWallet-sNKafE2N-C3fgjDG3.js";import{t as i}from"./LoadingSkeleton-U6-3yFwI-DmdCB9qA.js";var a=e(),o=({children:e,color:t,isLoading:n,isPulsing:r,...i})=>(0,a.jsx)(s,{$color:t,$isLoading:n,$isPulsing:r,...i,children:e}),s=r.span`
  padding: 0.25rem;
  font-size: 0.75rem;
  font-weight: 500;
  line-height: 1rem; /* 150% */
  border-radius: var(--privy-border-radius-xs);
  display: flex;
  align-items: center;
  ${e=>{let r,i;e.$color===`green`&&(r=`var(--privy-color-success-dark)`,i=`var(--privy-color-success-light)`),e.$color===`red`&&(r=`var(--privy-color-error)`,i=`var(--privy-color-error-light)`),e.$color===`gray`&&(r=`var(--privy-color-foreground-2)`,i=`var(--privy-color-background-2)`);let a=n`
      from, to {
        background-color: ${i};
      }

      50% {
        background-color: rgba(${i}, 0.8);
      }
    `;return t`
      color: ${r};
      background-color: ${i};
      ${e.$isPulsing&&t`
        animation: ${a} 3s linear infinite;
      `};
    `}}

  ${i}
`;export{o as t};