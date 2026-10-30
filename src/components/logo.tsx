const SIZES = {
  sm: { box: 26, word: 'text-sm' },
  md: { box: 36, word: 'text-base sm:text-xl' },
};

export function LogoMark({ size = 36, labelled = false }: { size?: number; labelled?: boolean }) {
  return (
    <img
      src="/logo.svg"
      width={size}
      height={size}
      alt={labelled ? 'CityMarket' : ''}
      className="shrink-0"
    />
  );
}

export function Logo({ size = 'md' }: { size?: keyof typeof SIZES }) {
  const { box, word } = SIZES[size];
  return (
    <span className="inline-flex items-center gap-2">
      <LogoMark size={box} />
      <span className={`font-display font-bold tracking-tight text-brand ${word}`}>CityMarket</span>
    </span>
  );
}
