import { mkdir, writeFile } from 'node:fs/promises';
const directory = new URL('../public/images/', import.meta.url);
await mkdir(directory, { recursive: true });
const wrap = (content) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 650"><defs><linearGradient id="bg" x2="1" y2="1"><stop stop-color="#514033"/><stop offset="1" stop-color="#211A16"/></linearGradient><linearGradient id="foil" x2="1" y2="1"><stop stop-color="#FFCF8A"/><stop offset=".45" stop-color="#F5A623"/><stop offset="1" stop-color="#C26D38"/></linearGradient></defs><rect width="800" height="650" fill="url(#bg)"/><ellipse cx="400" cy="545" rx="230" ry="30" fill="#121110" opacity=".5"/>${content}</svg>\n`;
await writeFile(
  new URL('cola.svg', directory),
  wrap(
    `<path d="M350 100h100l-10 80 18 70 22 90-10 180q-70 35-140 0l-10-180 22-90 18-70Z" fill="#3C201A" stroke="#85634D" stroke-width="4"/><rect x="348" y="87" width="104" height="32" rx="9" fill="#C26D38"/><path d="M324 325q76 18 152 0l-5 118q-72 20-143 0Z" fill="#C26D38"/><text x="400" y="380" text-anchor="middle" fill="#FFF3DE" font-family="Arial,sans-serif" font-size="25" font-weight="bold">COCA-COLA</text><path d="M364 140l-13 144" stroke="#E5B77D" stroke-opacity=".4" stroke-width="9" stroke-linecap="round"/>`,
  ),
);
await writeFile(
  new URL('chifrijo.svg', directory),
  wrap(
    `<ellipse cx="400" cy="470" rx="250" ry="70" fill="#302A24" stroke="#8C7560" stroke-width="7"/><path d="M150 420q250 140 500 0l-40 100q-210 100-420 0Z" fill="#49392C"/><ellipse cx="400" cy="408" rx="246" ry="105" fill="#CDB491"/><path d="M180 399q120-130 260-20l-30 90q-180 10-230-70Z" fill="#E8D9B9"/><path d="M360 360q140-65 245 30l-25 65q-120 75-220-20Z" fill="#6A3325"/><g fill="#C26D38" stroke="#91552C" stroke-width="4"><rect x="315" y="329" width="70" height="55" rx="12" transform="rotate(-18 350 350)"/><rect x="395" y="350" width="75" height="55" rx="12" transform="rotate(12 430 370)"/><rect x="455" y="305" width="70" height="60" rx="12"/></g><g fill="#B44732"><circle cx="339" cy="420" r="15"/><circle cx="417" cy="439" r="14"/><circle cx="477" cy="410" r="13"/></g><g fill="#7B8748"><path d="M310 407l35-10-9 22Z"/><path d="M435 416l31-10-7 28Z"/><path d="M365 453l28-25 6 27Z"/></g><path d="M225 340l-35-95 110 48Z" fill="#F5A623"/><path d="M530 315l75-80 25 110Z" fill="#D99B26"/>`,
  ),
);
await writeFile(
  new URL('carne-surtida.svg', directory),
  wrap(
    `<ellipse cx="400" cy="445" rx="275" ry="100" fill="#C8B49B"/><ellipse cx="400" cy="435" rx="245" ry="77" fill="#3D3027"/><g fill="#A85A32" stroke="#69371F" stroke-width="5"><path d="M210 390q60-100 130-25l-10 86q-100 45-120-61Z"/><path d="M360 360q100-48 143 40l-53 74q-115 4-90-114Z"/><path d="M465 375q65-50 113 30l-17 54q-90 35-96-84Z"/></g><g stroke="#512D1B" stroke-width="9" stroke-linecap="round"><path d="M230 387l75 25m-65-55 74 24m75 4 66 34m-80-5 65 31m60-48 45 21"/></g><g fill="#D99B26"><path d="M260 315l90-45 13 24-90 45Z"/><path d="M290 304l86-15 5 25-86 15Z"/><path d="M250 285l92 13-4 25-92-13Z"/></g><g fill="#6D7C43"><ellipse cx="552" cy="354" rx="40" ry="18" transform="rotate(-25 550 350)"/><ellipse cx="585" cy="375" rx="39" ry="16" transform="rotate(25 585 375)"/></g>`,
  ),
);
for (const [filename, label, food] of [
  [
    'snack-tronaditas.svg',
    'TRONADITAS',
    '<g fill="#F9CF79" stroke="#C78732" stroke-width="3"><path d="M318 408l52-38 47 52-72 25Z"/><path d="M410 390l45-35 39 50-60 27Z"/><path d="M363 449l56-31 29 54-65 10Z"/></g>',
  ],
  [
    'snack-chicharrones.svg',
    'CHICHARRONES',
    '<g fill="#E0AC64" stroke="#AE723B" stroke-width="4"><path d="M320 400q-15-40 20-32t42 15q20 35-12 42t-50-25Z"/><path d="M407 405q-5-47 33-36t37 35q-5 32-38 23Z"/><path d="M366 456q-10-35 24-37t49 25q-15 40-45 27Z"/></g>',
  ],
  [
    'snack-platanos.svg',
    'PLATANITOS',
    '<g fill="#F4C650" stroke="#D99B26" stroke-width="3"><ellipse cx="350" cy="396" rx="38" ry="20" transform="rotate(-30 350 396)"/><ellipse cx="431" cy="400" rx="38" ry="20" transform="rotate(30 431 400)"/><ellipse cx="387" cy="450" rx="42" ry="22"/><path d="M320 454q40 5 55-22" fill="none" stroke-width="15"/></g>',
  ],
])
  await writeFile(
    new URL(filename, directory),
    wrap(
      `<path d="M265 153h270l-15 45 18 300-18 32H280l-18-32 18-300Z" fill="url(#foil)"/><path d="M265 153h270v30H265Zm13 349h245v28H278Z" fill="#B7782A"/><path d="M291 202h216v113H291Z" fill="#2C231B"/><text x="400" y="255" text-anchor="middle" font-family="Arial,sans-serif" font-size="22" font-weight="bold" fill="#FFD08A">${label}</text><text x="400" y="286" text-anchor="middle" font-family="Arial,sans-serif" font-size="12" letter-spacing="2" fill="#D7C3AB">PARA COMPARTIR</text>${food}<path d="M288 197l-11 280" stroke="#FFF1D6" stroke-width="6" opacity=".3"/>`,
    ),
  );
console.log('6 local SVG menu illustrations generated.');
