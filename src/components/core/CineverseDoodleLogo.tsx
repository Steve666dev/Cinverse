import 'css-doodle';

export function CineverseDoodleLogo() {
  const doodleCode = `
    @grid: 5x1 / 240px 40px;
    @content: CINEVERSE;
    @place: center;
    @size: 100% 0;
    color: @pn(#fff8ec, #feb944, #fe6842, #df5584, #5a5ca8);
    z-index: @I(-@i);
    font-weight: bold;
    font-size: 1.8rem;
    letter-spacing: .18em;
    line-height: 0;
    -webkit-text-stroke: 1px #0a0a0a;
    transition: @i(*.05s) ease-out;
    scale: calc(1 - .05 * @i);
    rotate: calc(15deg / @uw * (@ux - @uw/2) * @dx(-2));
    translate: 0 calc(10vh / @uh * (@uy - @uh/2) * @dx(-2));
  `;

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '240px', height: '40px', cursor: 'pointer' }}>
      {/* @ts-ignore: custom element */}
      <css-doodle click-to-update>{doodleCode}</css-doodle>
    </div>
  );
}
