import { mkdirSync, writeFileSync } from 'node:fs';
const dir = new URL('../public/images/', import.meta.url);
mkdirSync(dir, { recursive: true });
const defs = `<defs><linearGradient id="bg" x2="1" y2="1"><stop stop-color="#4c5034"/><stop offset="1" stop-color="#1b251b"/></linearGradient><linearGradient id="glass" x2="1" y2="1"><stop stop-color="#ffffff" stop-opacity=".5"/><stop offset=".5" stop-color="#ffffff" stop-opacity=".04"/><stop offset="1" stop-color="#ffffff" stop-opacity=".25"/></linearGradient><linearGradient id="amber" x2="0" y2="1"><stop stop-color="#d99137"/><stop offset="1" stop-color="#633114"/></linearGradient><linearGradient id="bun" x2="0" y2="1"><stop stop-color="#e3af61"/><stop offset="1" stop-color="#a65e27"/></linearGradient><radialGradient id="light"><stop stop-color="#b4c87a" stop-opacity=".25"/><stop offset="1" stop-color="#b4c87a" stop-opacity="0"/></radialGradient><filter id="shadow"><feGaussianBlur stdDeviation="12"/></filter><pattern id="grain" width="7" height="7" patternUnits="userSpaceOnUse"><circle cx="2" cy="3" r=".6" fill="#ffffff" opacity=".05"/></pattern></defs>`;
const base = (art, bg = '#38402a') =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 650">${defs}<rect width="800" height="650" fill="${bg}"/><rect width="800" height="650" fill="url(#bg)"/><ellipse cx="500" cy="220" rx="400" ry="350" fill="url(#light)"/><path d="M0 520L800 470V650H0Z" fill="#20271c"/><ellipse cx="410" cy="540" rx="220" ry="30" fill="#10170d" opacity=".7" filter="url(#shadow)"/>${art}<rect width="800" height="650" fill="url(#grain)"/></svg>`;
const tumbler = `<path d="M260 250H510L485 500Q385 545 282 500Z" fill="url(#glass)" stroke="#dcdfc4" stroke-opacity=".5" stroke-width="3"/><path d="M274 350H495L481 492Q387 530 288 492Z" fill="url(#amber)" opacity=".9"/><ellipse cx="385" cy="350" rx="110" ry="16" fill="#d4a35b"/><g fill="#dbe2cb" fill-opacity=".3" stroke="#eef3d9" stroke-opacity=".4" stroke-width="2"><rect x="295" y="300" width="69" height="68" rx="10" transform="rotate(-12 330 330)"/><rect x="389" y="318" width="74" height="70" rx="10" transform="rotate(16 425 350)"/><rect x="347" y="392" width="69" height="67" rx="10" transform="rotate(-8 380 425)"/></g><path d="M278 270L299 489" stroke="#f4f3d6" stroke-opacity=".5" stroke-width="6"/><ellipse cx="385" cy="250" rx="125" ry="20" fill="none" stroke="#dde2ce" stroke-opacity=".55" stroke-width="3"/><path d="M452 241Q498 175 544 231L502 288Z" fill="#d5ab4d"/><path d="M465 241Q497 198 530 234L501 274Z" fill="#ded89b"/>`;
const burger = `<ellipse cx="400" cy="515" rx="255" ry="39" fill="#cbc9aa"/><ellipse cx="400" cy="505" rx="225" ry="29" fill="#9d9c7a"/><path d="M215 450Q400 490 585 450L570 490Q400 538 230 490Z" fill="url(#bun)"/><path d="M215 419Q270 398 320 420T420 417T520 415L590 427L565 458Q399 483 225 455Z" fill="#57311e"/><path d="M220 395L312 407L367 452L441 400L580 390L555 424L466 419L390 449L319 420L230 425Z" fill="#e6b142"/><path d="M217 380Q260 361 300 380T390 375T480 376T586 377L583 403Q530 389 495 406T400 404T310 402T220 409Z" fill="#769d40"/><path d="M210 367Q213 225 400 213Q581 225 590 367Q400 399 210 367Z" fill="url(#bun)"/><path d="M233 325Q300 240 395 240" fill="none" stroke="#f4cd8c" stroke-opacity=".3" stroke-width="10"/><g fill="#eed39e"><ellipse cx="290" cy="293" rx="6" ry="2" transform="rotate(-20 290 293)"/><ellipse cx="350" cy="258" rx="6" ry="2"/><ellipse cx="413" cy="275" rx="6" ry="2"/><ellipse cx="479" cy="294" rx="6" ry="2" transform="rotate(20 479 294)"/><ellipse cx="390" cy="325" rx="6" ry="2"/><ellipse cx="530" cy="337" rx="6" ry="2"/></g>`;
writeFileSync(new URL('burger.svg', dir), base(burger));
writeFileSync(new URL('rum.svg', dir), base(tumbler));
writeFileSync(
  new URL('whisky.svg', dir),
  base(
    `<g transform="translate(-30 20)">${tumbler}</g><path d="M575 110H625V210L650 245V485Q609 510 556 485V245L575 210Z" fill="#67502c" stroke="#b5ac77" stroke-opacity=".5"/><rect x="573" y="100" width="56" height="50" rx="3" fill="#1b221a"/><rect x="565" y="285" width="76" height="105" fill="#c6c59d"/><text x="603" y="336" fill="#3c4429" text-anchor="middle" font-family="serif" font-size="15">RESERVA</text>`,
  ),
);
writeFileSync(
  new URL('beer.svg', dir),
  base(
    `<path d="M353 98H434L440 235Q489 266 488 320V520Q405 548 316 520V320Q316 269 348 235Z" fill="#8c6729" stroke="#c8ad63" stroke-width="3"/><path d="M365 125V245Q335 280 335 325V500" fill="none" stroke="#efd79a" stroke-opacity=".4" stroke-width="10"/><rect x="349" y="86" width="90" height="35" rx="6" fill="#b6c17d"/><path d="M317 324Q403 344 488 324V455Q401 477 317 455Z" fill="#dbe3bc"/><text x="402" y="377" font-family="Arial" font-weight="bold" font-size="26" text-anchor="middle" fill="#3f512d">LOCAL</text><text x="402" y="406" font-family="Arial" font-size="12" letter-spacing="3" text-anchor="middle" fill="#3f512d">CRAFT BEER</text><path d="M370 423H432" stroke="#5e7642"/><circle cx="402" cy="287" r="15" fill="#c6b363"/>`,
  ),
);
const plate = `<ellipse cx="400" cy="460" rx="270" ry="95" fill="#a5a78a"/><ellipse cx="400" cy="450" rx="245" ry="82" fill="#51593c"/>`;
let nachos = plate;
for (let i = 0; i < 20; i++) {
  const x = 210 + ((i * 79) % 340),
    y = 310 + ((i * 43) % 120);
  nachos += `<path d="M${x} ${y}l90 25-65 63Z" fill="${['#d4a74b', '#bc8834', '#e7bb5b'][i % 3]}" stroke="#af7a2e" stroke-width="2"/>`;
}
nachos += `<path d="M270 350Q340 385 385 350T500 370L480 405Q420 380 360 420T260 388Z" fill="#e2bc60"/><g fill="#a0442e"><circle cx="322" cy="368" r="11"/><circle cx="457" cy="390" r="9"/><circle cx="415" cy="350" r="10"/></g><g fill="#71913f"><path d="M365 330l15 5-8 20-15-5Z"/><path d="M420 400l18 8-10 19-14-4Z"/><path d="M300 414l19 3-10 15Z"/></g>`;
writeFileSync(new URL('nachos.svg', dir), base(nachos));
let wings = plate;
for (let i = 0; i < 8; i++) {
  const x = 250 + ((i * 93) % 260),
    y = 300 + ((i * 59) % 140);
  wings += `<g transform="rotate(${i * 23} ${x} ${y})"><path d="M${x} ${y}q-20-40 20-50t55 25q2 32-37 44Z" fill="#994b27" stroke="#71381e" stroke-width="4"/><path d="M${x + 8} ${y - 8}q30-20 38-1" fill="none" stroke="#cd7d43" stroke-width="8" stroke-linecap="round"/></g>`;
}
writeFileSync(new URL('wings.svg', dir), base(wings));
writeFileSync(
  new URL('hero.svg', dir),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 850">${defs}<rect width="800" height="850" fill="#373e2d"/><circle cx="390" cy="270" r="300" fill="url(#light)"/><path d="M580 0V430M640 0V430M700 0V430M760 0V430" stroke="#81915a" stroke-opacity=".13" stroke-width="18"/><path d="M0 640L800 500V850H0Z" fill="#65533a"/><path d="M0 720L800 570M0 800L800 650M280 850L800 730" stroke="#b59965" stroke-opacity=".12" stroke-width="3"/><ellipse cx="400" cy="730" rx="290" ry="40" fill="#10170d" opacity=".6" filter="url(#shadow)"/><g transform="translate(-60 195) scale(.94)">${tumbler}</g><g transform="translate(120 280) scale(.8)">${burger}</g><path d="M130 0Q65 100 95 220M170 0Q150 110 95 220" fill="none" stroke="#8b9b65" stroke-width="5"/><path d="M100 200Q5 140 20 70Q100 90 100 200M110 150Q100 60 175 50Q184 100 110 150" fill="#5a7141"/><circle cx="175" cy="60" r="42" fill="#e8d8a1" opacity=".12" filter="url(#shadow)"/><text x="80" y="365" fill="#b6c298" opacity=".45" font-family="serif" font-style="italic" font-size="26" transform="rotate(-8 80 365)">servir, compartir, repetir.</text><rect width="800" height="850" fill="url(#grain)"/></svg>`,
);
