import logoUrl from "../assets/logo.png";

// Imported rather than referenced by path, so Vite bundles the file into the package and the Root client never fetches it
export const Logo = ({ size = 64 }: { size?: number }) => <img className="logo-image" src={logoUrl} width={size} height={size} alt="" />;
