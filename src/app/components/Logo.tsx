import logoImg from "../../assets/logo.png";

type LogoProps = {
  className?: string;
};

export function Logo({ className = "w-10 h-10" }: LogoProps) {
  return (
    <img
      src={logoImg}
      alt="HomePilot"
      className={className}
      width={40}
      height={40}
    />
  );
}
