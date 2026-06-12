import 'server-only';

const rot13 = (s: string) =>
  s.replaceAll(/[a-z]/gi, (c) =>
    // eslint-disable-next-line unicorn/prefer-code-point
    String.fromCharCode(c.charCodeAt(0) + (c.toLowerCase() < 'n' ? 13 : -13)),
  );

export const RAW_AVOID: string = rot13(
  `nany nahf nefr nefrf obbo obbof penc qvpx qvpxf jvyyl jvyyvrf cravf cbbc cbea encr encrf encrq encvat encvfg frzra fuvg fuvgf fyhg fyhgf fzhg gvgf gheq gheqf jnax jnaxf pbpx pbpxf phag phagf shpx shpxf shpxrq shpxvat cvff cvffrq ovgpu onfgneq anmv anmvf vaprfg juber juberf`,
);
